/**
 * Converts an authenticated API user into safe UI presentation data.
 * This module never invents identity values and never persists anything locally.
 */

export function getUserPresentation(user) {
  if (!user || typeof user !== "object") {
    return Object.freeze({
      isAuthenticated: false,
      name: "Sign in",
      handle: "",
      avatarInitial: "?",
    });
  }

  const name = String(user.name ?? user.displayName ?? user.username ?? "").trim();
  const username = String(user.username ?? user.handle ?? "").trim().replace(/^@/, "");
  const fallback = username || name;
  const avatarInitial = (fallback || "?").slice(0, 1).toUpperCase();

  return Object.freeze({
    isAuthenticated: true,
    name: name || username || "Account",
    handle: username ? `@${username}` : "",
    avatarInitial,
  });
}
