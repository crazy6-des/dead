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

const firstView = await request("/api/posts/" + encodeURIComponent(postId) + "/view", { method: "POST", body: JSON.stringify({}) });
if (firstView.viewed !== true || !Number.isInteger(Number(firstView.viewCount)) || Number(firstView.viewCount) < 1) {
  throw new Error("Post view persistence contract failed on first event: " + JSON.stringify(firstView));
}
const secondView = await request("/api/posts/" + encodeURIComponent(postId) + "/view", { method: "POST", body: JSON.stringify({}) });
if (secondView.viewed !== true || Number(secondView.viewCount) !== Number(firstView.viewCount) + 1) {
  throw new Error("Post view event counting contract failed: " + JSON.stringify({ firstView, secondView }));
}
const viewedPost = await request("/api/posts/" + encodeURIComponent(postId));
if (Number(viewedPost.post?.views) !== Number(secondView.viewCount) || Number(viewedPost.post?.viewCount) !== Number(secondView.viewCount)) {
  throw new Error("Post view detail serialization contract failed: " + JSON.stringify(viewedPost.post));
}

const updatedPost = await request("/api/posts/" + encodeURIComponent(postId), {
  method: "PATCH",
  body: JSON.stringify({ text: "S live persistence E2E edited" }),
});
if (updatedPost.post?.text !== "S live persistence E2E edited") throw new Error("Post edit persistence contract failed.");

const deletedCreated = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "S live delete E2E",
    kind: "text",
    media: [],
    audio: null,
    background: null,
    poll: null,
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const deletedPostId = deletedCreated.post?.id;
if (!deletedPostId) throw new Error("Delete-test post creation contract failed.");
await request("/api/posts/" + encodeURIComponent(deletedPostId), { method: "DELETE" });
let deleteReadFailed = false;
try {
  await request("/api/posts/" + encodeURIComponent(deletedPostId));
} catch (error) {
  deleteReadFailed = String(error?.message || error).includes("404");
}
if (!deleteReadFailed) throw new Error("Post delete persistence contract failed: deleted post remained readable.");



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
      musicId: "e2e-catalog-track-" + username,
      url: baseUrl + "/api/music/stream/e2e-catalog-track-" + encodeURIComponent(username),
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
if (!musicPostId || musicCreated.post?.audio?.musicId !== "e2e-catalog-track-" + username) {
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
      musicId: "e2e-mixed-track-" + username,
      url: baseUrl + "/api/music/stream/e2e-mixed-track-" + encodeURIComponent(username),
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
if (!mixedPostId || mixedCreated.post?.media?.[0]?.id !== mixedMediaId || mixedCreated.post?.audio?.musicId !== "e2e-mixed-track-" + username) {
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
if (mixedFeedPost?.audio?.musicId !== "e2e-mixed-track-" + username || mixedFeedPost?.background?.value !== "#654321") {
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
  body: JSON.stringify({
    displayName: "Live E2E Identity",
    bio: "Live E2E",
    website: "https://lastime22.netlify.app",
    location: "E2E",
  }),
});
if (updatedProfile.profile?.displayName !== "Live E2E Identity" ||
    updatedProfile.profile?.bio !== "Live E2E" ||
    updatedProfile.profile?.website !== "https://lastime22.netlify.app" ||
    updatedProfile.profile?.location !== "E2E") {
  throw new Error("Profile field update persistence contract failed: " + JSON.stringify(updatedProfile.profile));
}
const persistedProfile = await request("/api/profile/me");
if (persistedProfile.profile?.displayName !== "Live E2E Identity" ||
    persistedProfile.profile?.bio !== "Live E2E" ||
    persistedProfile.profile?.website !== "https://lastime22.netlify.app" ||
    persistedProfile.profile?.location !== "E2E" ||
    persistedProfile.profile?.username !== username) {
  throw new Error("Profile reload persistence contract failed: " + JSON.stringify(persistedProfile.profile));
}
const avatarUploadUrl = uploadedMedia.media?.url;
if (!avatarUploadUrl) throw new Error("Profile avatar URL persistence fixture is unavailable.");
const avatarUpdatedProfile = await request("/api/profile/me", {
  method: "PATCH",
  body: JSON.stringify({ avatarUrl: avatarUploadUrl }),
});
if (avatarUpdatedProfile.profile?.avatarUrl !== avatarUploadUrl) throw new Error("Profile avatar persistence contract failed.");
const persistedAvatarProfile = await request("/api/profile/me");
if (persistedAvatarProfile.profile?.avatarUrl !== avatarUploadUrl) throw new Error("Profile avatar reload persistence contract failed.");

const primaryCookie = cookie;

const signup2 = await request("/api/auth/sign-up", {
  method: "POST",
  body: JSON.stringify({ username: username2, email: email2, password: password2, displayName: "Live E2E Partner" }),
});
if (!signup2.authenticated || signup2.user?.username !== username2) throw new Error("Moderation target sign-up contract failed.");

const partnerCookie = cookie;

cookie = primaryCookie;
const pollCreated = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "S live poll E2E",
    kind: "text",
    media: [],
    audio: null,
    background: null,
    poll: { question: "Which choice persists?", options: ["Alpha", "Beta"] },
    audience: "public",
    replyPolicy: "everyone",
  }),
});
const pollPostId = pollCreated.post?.id;
if (!pollPostId || JSON.stringify(pollCreated.post?.poll?.options) !== JSON.stringify(["Alpha", "Beta"])) {
  throw new Error("Poll creation persistence contract failed.");
}
if (JSON.stringify(pollCreated.post?.poll?.optionVotes) !== JSON.stringify([0, 0])) {
  throw new Error("Poll initial vote-count contract failed.");
}

cookie = partnerCookie;
const partnerPollVote = await request("/api/polls/" + encodeURIComponent(pollPostId) + "/votes", {
  method: "POST",
  body: JSON.stringify({ optionIndex: 1 }),
});
if (JSON.stringify(partnerPollVote.poll?.options) !== JSON.stringify(["Alpha", "Beta"]) ||
    JSON.stringify(partnerPollVote.poll?.optionVotes) !== JSON.stringify([0, 1]) ||
    partnerPollVote.poll?.totalVotes !== 1 ||
    partnerPollVote.optionIndex !== 1) {
  throw new Error("Poll vote persistence/count contract failed: " + JSON.stringify(partnerPollVote));
}

cookie = primaryCookie;
const persistedPollResponse = await request("/api/posts/" + encodeURIComponent(pollPostId));
const persistedPoll = persistedPollResponse.post;
if (!persistedPoll?.poll ||
    JSON.stringify(persistedPoll.poll.options) !== JSON.stringify(["Alpha", "Beta"]) ||
    JSON.stringify(persistedPoll.poll.optionVotes) !== JSON.stringify([0, 1]) ||
    persistedPoll.poll.totalVotes !== 1) {
  throw new Error("Poll cross-session persistence contract failed: " + JSON.stringify(persistedPoll?.poll));
}


cookie = primaryCookie;
const conversationCreated = await request("/api/messages/conversations", {
  method: "POST",
  body: JSON.stringify({ username: username2 }),
});
const conversationId = conversationCreated.conversation?.id;
if (!conversationId) throw new Error("Live messaging conversation creation failed.");

const sentMessage = await request("/api/messages", {
  method: "POST",
  body: JSON.stringify({ conversationId, type: "text", text: "S live E2E message" }),
});
if (sentMessage.direction !== "out" || sentMessage.text !== "S live E2E message") {
  throw new Error("Live messaging outbound direction contract failed.");
}
const primaryMessagesAfterText = await request("/api/messages/conversations/" + encodeURIComponent(conversationId));
if (!primaryMessagesAfterText.items?.some((item) => item.id === sentMessage.id && item.text === "S live E2E message" && item.direction === "out")) {
  throw new Error("Live messaging text persistence failed before image send: " + JSON.stringify({ sentMessage, items: primaryMessagesAfterText.items }));
}

const messageImageForm = new FormData();
messageImageForm.append("file", new Blob([imageBytes], { type: "image/png" }), "e2e-message.png");
const messageMedia = await request("/api/media/upload", { method: "POST", body: messageImageForm });
const messageMediaId = messageMedia.media?.mediaId;
if (!messageMediaId) throw new Error("Live messaging image upload failed.");

const sentImageMessage = await request("/api/messages", {
  method: "POST",
  body: JSON.stringify({ conversationId, type: "image", text: "S live E2E image", mediaId: messageMediaId }),
});
if (sentImageMessage.direction !== "out" || sentImageMessage.type !== "image" || sentImageMessage.media?.mediaId !== messageMediaId) {
  throw new Error("Live messaging image persistence contract failed.");
}
const primaryMessagesAfterImage = await request("/api/messages/conversations/" + encodeURIComponent(conversationId) + "?limit=50");
if (!primaryMessagesAfterImage.items?.some((item) => item.id === sentMessage.id) || !primaryMessagesAfterImage.items?.some((item) => item.id === sentImageMessage.id)) {
  throw new Error("Live messaging multi-message persistence failed: " + JSON.stringify({ sentMessage, sentImageMessage, items: primaryMessagesAfterImage.items }));
}

cookie = partnerCookie;
const partnerConversations = await request("/api/messages/conversations");
if (!partnerConversations.items?.some((item) => item.id === conversationId)) {
  throw new Error("Live messaging conversation visibility contract failed.");
}
const partnerMessages = await request("/api/messages/conversations/" + encodeURIComponent(conversationId));
const inboundText = partnerMessages.items?.find((item) => item.text === "S live E2E message");
const inboundImage = partnerMessages.items?.find((item) => item.media?.mediaId === messageMediaId);
if (!inboundText || inboundText.direction !== "in" || !inboundImage || inboundImage.direction !== "in") {
  throw new Error("Live messaging inbound direction/media contract failed: " + JSON.stringify({ inboundText, inboundImage, expectedMediaId: messageMediaId, items: partnerMessages.items }));
}

const partnerNotifications = await request("/api/notifications");
const messageNotification = partnerNotifications.items?.find((item) => item.type === "system" && item.target === "/messages?conversation=" + encodeURIComponent(conversationId));
if (!messageNotification || messageNotification.read) throw new Error("Live personal message notification contract failed.");
await request("/api/notifications/read", {
  method: "POST",
  body: JSON.stringify({ id: messageNotification.id }),
});
const notificationsAfterRead = await request("/api/notifications");
const readMessageNotification = notificationsAfterRead.items?.find((item) => item.id === messageNotification.id);
if (!readMessageNotification?.read) throw new Error("Live notification read-state persistence contract failed.");

cookie = primaryCookie;
const primaryMessagesAfterPartnerRead = await request("/api/messages/conversations/" + encodeURIComponent(conversationId));
if (!primaryMessagesAfterPartnerRead.items?.some((item) => item.text === "S live E2E message" && item.direction === "out")) {
  throw new Error("Live messaging sender direction persistence contract failed.");
}
const spaceCreated = await request("/api/spaces", { method: "POST", body: JSON.stringify({ title: "S live Spaces E2E" }) });
const spaceId = spaceCreated.space?.id;
if (!spaceId || spaceCreated.space?.status !== "live" || spaceCreated.space?.role !== "host") throw new Error("Spaces creation contract failed.");
const listedSpaces = await request("/api/spaces?q=Spaces%20E2E");
if (!listedSpaces.items?.some((item) => item.id === spaceId)) throw new Error("Spaces listing contract failed.");
cookie = partnerCookie;
const joinedSpace = await request("/api/spaces/" + encodeURIComponent(spaceId) + "/join", { method: "POST" });
if (joinedSpace.space?.role !== "listener") throw new Error("Spaces join contract failed.");
const spaceMessage = await request("/api/spaces/" + encodeURIComponent(spaceId) + "/messages", { method: "POST", body: JSON.stringify({ text: "S live Spaces E2E chat" }) });
if (spaceMessage.message?.text !== "S live Spaces E2E chat") throw new Error("Spaces chat write contract failed.");
const spaceMessages = await request("/api/spaces/" + encodeURIComponent(spaceId) + "/messages");
if (!spaceMessages.items?.some((message) => message.id === spaceMessage.message?.id)) throw new Error("Spaces chat persistence contract failed.");
cookie = primaryCookie;
await request("/api/spaces/" + encodeURIComponent(spaceId) + "/end", { method: "POST" });
const endedSpace = await request("/api/spaces/" + encodeURIComponent(spaceId));
if (endedSpace.space?.status !== "ended") throw new Error("Spaces end contract failed.");
const deletedSpace = await request("/api/spaces/" + encodeURIComponent(spaceId) + "/delete", { method: "DELETE" });
if (!deletedSpace.ok) throw new Error("Spaces delete contract failed.");
const reportTarget = await request("/api/posts", {
  method: "POST",
  body: JSON.stringify({
    text: "S live moderation E2E target", kind: "text", media: [], audio: null, background: null,
    poll: null, audience: "public", replyPolicy: "everyone",
  }),
});
const reportTargetPostId = reportTarget.post?.id;
if (!reportTargetPostId) throw new Error("Moderation target post creation failed.");

cookie = partnerCookie;
const report = await request("/api/moderation/actions", {
  method: "POST",
  body: JSON.stringify({ action: "report", targetType: "post", targetId: reportTargetPostId, reason: "spam", note: "S live moderation email E2E" }),
});
if (!report.ok || !report.submitted || report.emailStatus !== "sent" || !report.reportId) {
  throw new Error("Production moderation report email contract failed: " + JSON.stringify(report));
}


cookie = primaryCookie;
const folder = await request("/api/bookmarks/folders", {
  method: "POST",
  body: JSON.stringify({ name: "E2E Research", description: "Live E2E bookmark folder" }),
});
if (!folder.id || folder.name !== "E2E Research") throw new Error("Bookmark folder creation persistence contract failed.");
await request("/api/bookmarks", {
  method: "POST",
  body: JSON.stringify({ postId, folderId: folder.id }),
});
const folderBookmarks = await request("/api/bookmarks?folderId=" + encodeURIComponent(folder.id));
if (!folderBookmarks.items?.some((item) => item.id === postId)) throw new Error("Bookmark folder membership persistence contract failed.");
const foldersAfterReload = await request("/api/bookmarks/folders");
const persistedFolder = foldersAfterReload.items?.find((item) => item.id === folder.id);
if (!persistedFolder || Number(persistedFolder.itemCount) < 1) throw new Error("Bookmark folder reload persistence contract failed.");

const list = await request("/api/lists", {
  method: "POST",
  body: JSON.stringify({ name: "E2E Finance " + username, description: "Live E2E list", visibility: "private" }),
});
if (!list.id || list.visibility !== "private") throw new Error("List creation persistence contract failed.");
await request("/api/lists/" + encodeURIComponent(list.id) + "/members", {
  method: "POST",
  body: JSON.stringify({ username: username2 }),
});
const listDetail = await request("/api/lists/" + encodeURIComponent(list.id));
if (!listDetail.members?.some((member) => member.username === username2)) throw new Error("List member persistence contract failed.");
const listPosts = await request("/api/lists/" + encodeURIComponent(list.id) + "/posts");
if (!Array.isArray(listPosts.items)) throw new Error("List timeline contract failed.");


cookie = primaryCookie;
const bookmarkFolder = await request("/api/bookmarks/folders", {
  method: "POST",
  body: JSON.stringify({ name: "E2E Saved " + username, description: "Live persistence folder" }),
});
const bookmarkFolderId = bookmarkFolder.id;
if (!bookmarkFolderId) throw new Error("Bookmark folder creation persistence contract failed.");
const bookmarkSaved = await request("/api/bookmarks", {
  method: "POST",
  body: JSON.stringify({ postId, folderId: bookmarkFolderId }),
});
if (!bookmarkSaved.ok || bookmarkSaved.postId !== postId || bookmarkSaved.folderId !== bookmarkFolderId) {
  throw new Error("Bookmark folder save contract failed: " + JSON.stringify(bookmarkSaved));
}
const foldersAfterSave = await request("/api/bookmarks/folders");
const savedFolder = foldersAfterSave.items?.find((folder) => folder.id === bookmarkFolderId);
if (!savedFolder || Number(savedFolder.itemCount) !== 1) throw new Error("Bookmark folder count persistence failed.");
const bookmarkFolderItemsAfterSave = await request("/api/bookmarks?folderId=" + encodeURIComponent(bookmarkFolderId));
if (bookmarkFolderItemsAfterSave.folderId !== bookmarkFolderId || !bookmarkFolderItemsAfterSave.items?.some((item) => item.id === postId)) {
  throw new Error("Bookmark folder timeline persistence failed.");
}
const allBookmarks = await request("/api/bookmarks");
if (!allBookmarks.items?.some((item) => item.id === postId)) throw new Error("All-bookmarks persistence failed.");
await request("/api/bookmarks/" + encodeURIComponent(postId), { method: "DELETE" });
const removedBookmarks = await request("/api/bookmarks");
if (removedBookmarks.items?.some((item) => item.id === postId)) throw new Error("Bookmark removal persistence contract failed.");
const emptyFolderItemsAfterRemove = await request("/api/bookmarks?folderId=" + encodeURIComponent(bookmarkFolderId));
if (emptyFolderItemsAfterRemove.items?.some((item) => item.id === postId)) throw new Error("Bookmark folder removal persistence contract failed.");

const publicList = await request("/api/lists", {
  method: "POST",
  body: JSON.stringify({ name: "E2E Finance Public " + username, description: "Live list persistence", visibility: "public" }),
});
const publicListId = publicList.id;
if (!publicListId) throw new Error("Public list creation persistence contract failed.");
await request("/api/lists/" + encodeURIComponent(publicListId) + "/members", {
  method: "POST",
  body: JSON.stringify({ username: username2 }),
});
const publicListDetail = await request("/api/lists/" + encodeURIComponent(publicListId));
if (publicListDetail.name !== publicList.name || !publicListDetail.members?.some((member) => String(member.username) === String(username2))) {
  throw new Error("List member persistence contract failed: " + JSON.stringify(publicListDetail));
}
const updatedList = await request("/api/lists/" + encodeURIComponent(publicListId), {
  method: "PATCH",
  body: JSON.stringify({ name: "E2E Public Updated", description: "Updated live list", visibility: "public" }),
});
if (updatedList.name !== "E2E Public Updated" || updatedList.description !== "Updated live list") {
  throw new Error("List update persistence contract failed.");
}
cookie = partnerCookie;
const listMemberPost = await request("/api/posts", { method: "POST", body: JSON.stringify({ text: "S live list member E2E", kind: "text", media: [], audio: null, background: null, poll: null, audience: "public", replyPolicy: "everyone" }) });
const listMemberPostId = listMemberPost.post?.id;
if (!listMemberPostId) throw new Error("List member post creation contract failed.");
cookie = primaryCookie;
const listTimeline = await request("/api/lists/" + encodeURIComponent(publicListId) + "/posts");
if (!Array.isArray(listTimeline.items) || !listTimeline.items.some((item) => item.id === listMemberPostId)) throw new Error("List timeline persistence contract failed.");

const privateList = await request("/api/lists", {
  method: "POST",
  body: JSON.stringify({ name: "E2E Private " + username, description: "Private live list", visibility: "private" }),
});
const privateListId = privateList.id;
if (!privateListId) throw new Error("Private list creation persistence contract failed.");
cookie = partnerCookie;
let privateListHidden = false;
try {
  await request("/api/lists/" + encodeURIComponent(privateListId));
} catch (error) {
  privateListHidden = String(error?.message || error).includes("404");
}
if (!privateListHidden) throw new Error("Private list visibility contract failed.");
cookie = primaryCookie;

const primaryListAfterReload = await request("/api/lists/" + encodeURIComponent(publicListId));
if (primaryListAfterReload.name !== "E2E Finance Updated" || primaryListAfterReload.members?.length !== 1) {
  throw new Error("List reload persistence contract failed.");
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
  checks: ["sign-up", "session", "media-upload", "media-delivery", "text-only-post", "image-only-post", "music-only-post", "background-only-post", "mixed-post", "post-view", "post-view-idempotency", "feed", "server-media-feed", "like", "bookmark", "profile-read", "profile-update", "messages", "message-image", "message-direction", "personal-notification", "notification-read", "sign-out", "sign-in"],
}));
