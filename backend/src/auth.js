const SESSION_COOKIE = "s_session";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key || !value) continue;
    try { cookies[key] = decodeURIComponent(value); } catch { cookies[key] = value; }
  }
  return cookies;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function getSessionToken(request) {
  return parseCookies(request.headers.get("Cookie") || "")[SESSION_COOKIE] || null;
}

export async function sha256Hex(value) {
  const bytes = new globalThis.TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await globalThis.crypto.subtle.importKey("raw", new globalThis.TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await globalThis.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256);
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, storedHash) {
  const [prefix, iterationsValue, saltValue, digestValue] = String(storedHash || "").split("$");
  const iterations = Number(iterationsValue);
  if (prefix !== PASSWORD_HASH_PREFIX || !Number.isInteger(iterations) || iterations < 100000 || !saltValue || !digestValue) return false;
  const key = await globalThis.crypto.subtle.importKey("raw", new globalThis.TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await globalThis.crypto.subtle.deriveBits({ name: "PBKDF2", salt: base64ToBytes(saltValue), iterations, hash: "SHA-256" }, key, 256);
  const actual = new Uint8Array(bits);
  const expected = base64ToBytes(digestValue);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function validateCredentials({ username, email, password } = {}) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const errors = {};
  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) errors.username = "Username must be 3-30 characters using letters, numbers, or underscores.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = "A valid email is required.";
  if (typeof password !== "string" || password.length < 10 || password.length > 128) errors.password = "Password must be 10-128 characters.";
  return { valid: Object.keys(errors).length === 0, errors, username: normalizedUsername, email: normalizedEmail };
}

export async function resolveSession(request, env) {
  const token = getSessionToken(request);
  if (!token || !env?.DB) return null;
  const tokenHash = await sha256Hex(token);
  return await env.DB.prepare("SELECT s.id, s.user_id, s.expires_at, u.username, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') AND u.deleted_at IS NULL LIMIT 1").bind(tokenHash).first() || null;
}

export function createSessionToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_TTL = SESSION_TTL_SECONDS;
