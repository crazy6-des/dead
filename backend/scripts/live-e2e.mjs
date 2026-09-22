const baseUrl = String(process.env.LIVE_API_BASE_URL || "").replace(/\/$/, "");
const origin = String(process.env.TEST_ORIGIN || "");
const username = String(process.env.TEST_USERNAME || "");
const email = String(process.env.TEST_EMAIL || "");
const password = String(process.env.TEST_PASSWORD || "");

if (!baseUrl || !origin || !username || !email || !password) throw new Error("Live E2E environment is incomplete.");

let cookie = "";

function readCookie(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/(?:^|,\s*)s_session=([^;]+)/);
  if (match) cookie = "s_session=" + match[1];
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Origin", origin);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(baseUrl + path, { ...options, headers });
  readCookie(response);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error((options.method || "GET") + " " + path + " -> " + response.status + ": " + JSON.stringify(body));
  return body;
}

const signup = await request("/api/auth/sign-up", {
  method: "POST",
  body: JSON.stringify({ username, email, password, displayName: "Live E2E User" }),
});
if (!signup.authenticated || signup.user?.username !== username) throw new Error("Sign-up persistence contract failed.");

const session = await request("/api/auth/session");
if (!session.authenticated || session.user?.username !== username) throw new Error("Session persistence contract failed.");

const created = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "S live persistence E2E test",
    kind: "text",
    media: [],
    audio: null,
    background: null,
    poll: null,
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const postId = created.post?.id;
if (!postId) throw new Error("Post creation persistence contract failed.");

const feed = await request("/api/feed?mode=Latest&limit=20");
if (!feed.items?.some((item) => item.id === postId)) throw new Error("Feed persistence contract failed.");

const liked = await request("/api/social/posts/" + encodeURIComponent(postId) + "/like", {
  method: "POST",
  body: JSON.stringify({ enabled: true }),
});
if (!liked.enabled || liked.count !== 1) throw new Error("Like persistence contract failed.");

const bookmarked = await request("/api/social/posts/" + encodeURIComponent(postId) + "/bookmark", {
  method: "POST",
  body: JSON.stringify({ enabled: true }),
});
if (!bookmarked.enabled || bookmarked.count !== 1) throw new Error("Bookmark persistence contract failed.");

const profile = await request("/api/profile/me");
if (profile.profile?.username !== username) throw new Error("Profile read persistence contract failed.");

const updatedProfile = await request("/api/profile/me", {
  method: "PATCH",
  body: JSON.stringify({ bio: "Live E2E", website: "https://sphereis.netlify.app", location: "E2E" }),
});
if (updatedProfile.profile?.bio !== "Live E2E") throw new Error("Profile update persistence contract failed.");

await request("/api/auth/sign-out", { method: "POST" });
const signedOut = await request("/api/auth/session");
if (signedOut.authenticated) throw new Error("Sign-out persistence contract failed.");

const signedIn = await request("/api/auth/sign-in", {
  method: "POST",
  body: JSON.stringify({ identifier: email, password }),
});
if (!signedIn.authenticated || signedIn.user?.username !== username) throw new Error("Sign-in persistence contract failed.");

console.log(JSON.stringify({
  ok: true,
  username,
  postId,
  checks: ["sign-up", "session", "post", "feed", "like", "bookmark", "profile-read", "profile-update", "sign-out", "sign-in"],
}));
