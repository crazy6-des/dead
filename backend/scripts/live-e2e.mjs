const baseUrl = String(process.env.LIVE_API_BASE_URL || "").replace(/\/$/, "");
const origin = String(process.env.TEST_ORIGIN || "");
const username = String(process.env.TEST_USERNAME || "");
const email = String(process.env.TEST_EMAIL || "");
const password = String(process.env.TEST_PASSWORD || "");
const username2 = String(process.env.TEST_USERNAME_2 || "");
const email2 = String(process.env.TEST_EMAIL_2 || "");
const password2 = String(process.env.TEST_PASSWORD_2 || "");

if (!baseUrl || !origin || !username || !email || !password || !username2 || !email2 || !password2) throw new Error("Live E2E environment is incomplete.");

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

const musicCreated = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "",
    kind: "music",
    media: [],
    audio: {
      source: "catalog",
      musicId: "e2e-catalog-track",
      url: "https://cdn.example.invalid/e2e-catalog-track.mp3",
      title: "E2E Catalog Track",
      artist: "S E2E",
      type: "audio/mpeg",
      durationMs: 1000,
    },
    background: null,
    poll: null,
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const musicPostId = musicCreated.post?.id;
if (!musicPostId || musicCreated.post?.audio?.musicId !== "e2e-catalog-track") {
  throw new Error("Music-only catalog post persistence contract failed.");
}

const backgroundCreated = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "",
    kind: "background",
    media: [],
    audio: null,
    background: { type: "color", value: "#123456" },
    poll: null,
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const backgroundPostId = backgroundCreated.post?.id;
if (!backgroundPostId || backgroundCreated.post?.background?.value !== "#123456") {
  throw new Error("Background-only post persistence contract failed.");
}

const mixedMediaForm = new FormData();
mixedMediaForm.append("file", new Blob([imageBytes], { type: "image/png" }), "e2e-mixed.png");
const mixedUploadedMedia = await request("/api/media/upload", { method: "POST", body: mixedMediaForm });
const mixedMediaId = mixedUploadedMedia.media?.mediaId;
if (!mixedMediaId) throw new Error("Mixed-post media upload persistence contract failed.");

const mixedCreated = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "S rich mixed post E2E",
    kind: "image",
    media: [{ mediaId: mixedMediaId }],
    audio: {
      source: "catalog",
      musicId: "e2e-mixed-track",
      url: "https://cdn.example.invalid/e2e-mixed-track.mp3",
      title: "E2E Mixed Track",
      artist: "S E2E",
      type: "audio/mpeg",
      durationMs: 2000,
    },
    background: { type: "color", value: "#654321" },
    poll: null,
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const mixedPostId = mixedCreated.post?.id;
if (!mixedPostId || mixedCreated.post?.media?.[0]?.id !== mixedMediaId || mixedCreated.post?.audio?.musicId !== "e2e-mixed-track") {
  throw new Error("Mixed rich post persistence contract failed.");
}

const feed = await request("/api/feed?mode=Latest&limit=20");
if (!feed.items?.some((item) => item.id === postId)) throw new Error("Feed persistence contract failed.");
const richFeedPost = feed.items?.find((item) => item.id === richPostId);
if (!richFeedPost?.media?.some((item) => item.id === mediaId && String(item.url || "").includes("/api/media/"))) throw new Error("Server-backed media feed rendering contract failed.");
for (const [label, id] of [["music-only", musicPostId], ["background-only", backgroundPostId], ["mixed", mixedPostId]]) {
  if (!feed.items?.some((item) => item.id === id)) throw new Error(label + " post feed persistence contract failed.");
}
const mixedFeedPost = feed.items?.find((item) => item.id === mixedPostId);
if (mixedFeedPost?.audio?.musicId !== "e2e-mixed-track" || mixedFeedPost?.background?.value !== "#654321") {
  throw new Error("Mixed post server-backed fields feed contract failed: music=" + String(mixedFeedPost?.audio?.musicId) + " bg=" + String(mixedFeedPost?.background?.value));
}

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

const primaryCookie = cookie;

const signup2 = await request("/api/auth/sign-up", {
  method: "POST",
  body: JSON.stringify({ username: username2, email: email2, password: password2, displayName: "Live E2E Partner" }),
});
if (!signup2.authenticated || signup2.user?.username !== username2) throw new Error("Moderation target sign-up contract failed.");

const partnerCookie = cookie;
const reportTarget = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "S live moderation E2E target", kind: "text", media: [], audio: null, background: null,
    poll: null, audience: "public", replyPolicy: "everyone",
  }),
});
const reportTargetPostId = reportTarget.post?.id;
if (!reportTargetPostId) throw new Error("Moderation target post creation failed.");

cookie = primaryCookie;
const report = await request("/api/moderation/actions", {
  method: "POST",
  body: JSON.stringify({ action: "report", targetType: "post", targetId: reportTargetPostId, reason: "spam", note: "S live moderation email E2E" }),
});
if (!report.ok || !report.submitted || report.emailStatus !== "sent" || !report.reportId) {
  throw new Error("Production moderation report email contract failed: " + JSON.stringify(report));
}

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
  reportId: report.reportId,
  emailStatus: report.emailStatus,
  checks: ["sign-up", "session", "media-upload", "media-delivery", "text-only-post", "image-only-post", "music-only-post", "background-only-post", "mixed-post", "feed", "server-media-feed", "like", "bookmark", "profile-read", "profile-update", "sign-out", "sign-in"],
}));
