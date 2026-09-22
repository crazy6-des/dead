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
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
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

const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const mediaForm = new FormData();
mediaForm.append("file", new Blob([imageBytes], { type: "image/png" }), "e2e.png");
const uploadedMedia = await request("/api/media/upload", { method: "POST", body: mediaForm });
const mediaId = uploadedMedia.media?.mediaId;
if (!mediaId) throw new Error("R2 media upload persistence contract failed.");
const mediaCheck = await fetch(baseUrl + "/api/media/" + encodeURIComponent(mediaId), {
  headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
});
if (!mediaCheck.ok || mediaCheck.headers.get("content-type") !== "image/png") {
  throw new Error("R2 media delivery contract failed.");
}

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

const richCreated = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "",
    kind: "image",
    media: [{ mediaId }],
    audio: null,
    background: null,
    poll: null,
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const richPostId = richCreated.post?.id;
if (!richPostId || richCreated.post?.media?.[0]?.id !== mediaId) {
  throw new Error("Image-only post media persistence contract failed.");
}

const feed = await request("/api/feed?mode=Latest&limit=20");
if (!feed.items?.some((item) => item.id === postId)) throw new Error("Feed persistence contract failed.");
const richFeedPost = feed.items?.find((item) => item.id === richPostId);
if (!richFeedPost?.media?.some((item) => item.id === mediaId && String(item.url || "").includes("/api/media/"))) throw new Error("Server-backed media feed rendering contract failed.");

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
  checks: ["sign-up", "session", "media-upload", "media-delivery", "image-only-post", "post", "feed", "server-media-feed", "like", "bookmark", "profile-read", "profile-update", "sign-out", "sign-in"],
}));
