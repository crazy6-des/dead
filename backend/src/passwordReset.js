import { hashPassword, sha256Hex } from "./auth.js";

const RESET_TTL_MS = 30 * 60 * 1000;
const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

function jsonError(code, status, message) {
  return { error: { code, status, message } };
}

function makeToken() {
  return `${globalThis.crypto.randomUUID()}${globalThis.crypto.randomUUID()}`;
}

function resetUrl(env, token) {
  const origin = String(env?.FRONTEND_ORIGIN || "").replace(/\/$/, "");
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendBrevoEmail(env, recipient, resetLink) {
  const apiKey = String(env?.BREVO_API_KEY || "").trim();
  const senderEmail = String(env?.BREVO_SENDER_EMAIL || "").trim();
  const senderName = String(env?.BREVO_SENDER_NAME || "S").trim() || "S";
  if (!apiKey || !senderEmail) throw new Error("Brevo email configuration is missing.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: recipient }],
      subject: "Reset your S password",
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Reset your S password</h2><p>Use the secure link below to choose a new password. It expires in 30 minutes and can only be used once.</p><p><a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#9b7cff;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p></div>`,
      textContent: `Reset your S password: ${resetLink}\n\nThis link expires in 30 minutes and can only be used once.`,
    }),
  });
  if (!response.ok) throw new Error(`Brevo request failed with status ${response.status}.`);
}

export async function requestPasswordReset(request, env) {
  if (!env?.DB || !env?.BREVO_API_KEY || !env?.BREVO_SENDER_EMAIL) {
    return jsonError("SERVICE_UNAVAILABLE", 503, "Password reset email is not configured.");
  }
  let body;
  try { body = await request.json(); } catch { return jsonError("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const email = String(body?.email || "").trim().toLowerCase();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return jsonError("VALIDATION_ERROR", 400, "Enter a valid email address.");
  const user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?1 AND deleted_at IS NULL LIMIT 1").bind(email).first();
  if (!user?.id) return { response: { ok: true, message: GENERIC_MESSAGE } };
  const token = makeToken();
  await env.DB.prepare("DELETE FROM password_resets WHERE user_id = ?1 OR expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(user.id).run();
  await env.DB.prepare("INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?1, ?2, ?3, ?4)").bind(globalThis.crypto.randomUUID(), user.id, await sha256Hex(token), new Date(Date.now() + RESET_TTL_MS).toISOString()).run();
  try {
    await sendBrevoEmail(env, user.email, resetUrl(env, token));
  } catch (error) {
    await env.DB.prepare("DELETE FROM password_resets WHERE token_hash = ?1").bind(await sha256Hex(token)).run();
    console.error("PASSWORD_RESET_EMAIL_FAILED", error);
    return jsonError("EMAIL_DELIVERY_FAILED", 502, "We could not send the reset email. Please try again.");
  }
  return { response: { ok: true, message: GENERIC_MESSAGE } };
}

export async function confirmPasswordReset(request, env) {
  if (!env?.DB) return jsonError("SERVICE_UNAVAILABLE", 503, "Password reset is not configured.");
  let body;
  try { body = await request.json(); } catch { return jsonError("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const token = String(body?.token || "").trim();
  const password = body?.password;
  if (!token || typeof password !== "string" || password.length < 10 || password.length > 128) {
    return jsonError("VALIDATION_ERROR", 400, "Password must be 10-128 characters.");
  }
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare("SELECT id, user_id FROM password_resets WHERE token_hash = ?1 AND used_at IS NULL AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') LIMIT 1").bind(tokenHash).first();
  if (!row) return jsonError("INVALID_RESET_TOKEN", 400, "This reset link is invalid or has expired.");
  await env.DB.prepare("UPDATE users SET password_hash = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?2 AND deleted_at IS NULL").bind(await hashPassword(password), row.user_id).run();
  await env.DB.prepare("UPDATE password_resets SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?1").bind(row.id).run();
  await env.DB.prepare("UPDATE sessions SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ?1 AND revoked_at IS NULL").bind(row.user_id).run();
  return { response: { ok: true, message: "Password updated. You can now sign in." } };
}
