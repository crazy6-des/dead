import assert from "node:assert/strict";
import { sendMessage } from "../src/messages.js";
import { createNotification, listNotifications, markNotificationRead, markAllNotificationsRead } from "../src/notifications.js";

function db(rows = {}) {
  const calls = [];
  const make = (sql) => ({
    bind(...args) { calls.push({ sql, args }); return this; },
    async first() { return rows.first?.(sql, calls.at(-1)?.args) ?? null; },
    async all() { return { results: rows.all?.(sql, calls.at(-1)?.args) || [] }; },
    async run() { return { meta: { changes: 1 }, changes: 1 }; },
  });
  return { prepare: make, batch: async () => ({}) , calls };
}
const env = { DB: db({ first: (sql,args) => {
  if (sql.includes("conversation_members") && sql.includes("user_id = ?2")) return { 1: 1 };
  if (sql.includes("conversation_members") && sql.includes("user_id <> ?2")) return { user_id:"recipient-1" };
  if (sql.includes("post_media")) return { id:"media-1", media_type:"image", mime_type:"image/png", byte_size:1234, metadata_json:'{"name":"pic.png"}' };
  if (sql.includes("FROM messages m")) return { id:"message-1", conversation_id:"conv-1", sender_id:"user-1", message_type:"image", body:"hello", created_at:"2026-09-22T00:00:00.000Z", deleted_at:null, media_id:"media-1", media_type:"image", mime_type:"image/png", media_size:1234, media_name:"pic.png" };
  return null;
}), MEDIA_BUCKET:{}, };
const request = (body) => new Request("https://api.test/api/messages",{method:"POST",headers:{origin:"https://app.test","content-type":"application/json"},body:JSON.stringify(body)});
const sessionModule = await import("../src/auth.js");
const originalResolve = sessionModule.resolveSession;
sessionModule.resolveSession = async () => ({ user_id:"user-1" });
const result = await sendMessage(request, env);
assert.equal(result.error, null);
assert.equal(result.response.type, "image");
assert.equal(result.response.media.mediaId, "media-1");

const nenv = { DB: db({ all: () => [{id:"n1",event_type:"share",payload:'{"text":"shared a post with their followers"}',target_type:"post",target_id:"post-1",conversation_id:null,read_at:null,created_at:"2026-09-22T00:00:00.000Z",actor_username:"maya",actor_display_name:"Maya",actor_verified:0}] }) };
const nrequest = new Request("https://api.test/api/notifications");
const page = await listNotifications(nrequest, nenv);
assert.equal(page.error, null);
assert.equal(page.response.items[0].target, "/post/post-1");
assert.equal(page.response.items[0].read, false);
const read = await markNotificationRead(new Request("https://api.test/api/notifications/read",{method:"POST",body:JSON.stringify({id:"n1"})}), nenv);
assert.equal(read.response.ok, true);
const allRead = await markAllNotificationsRead(new Request("https://api.test/api/notifications/read-all",{method:"POST"}), nenv);
assert.equal(allRead.response.ok, true);
sessionModule.resolveSession = originalResolve;
console.log("message image + notification semantics: PASS");
