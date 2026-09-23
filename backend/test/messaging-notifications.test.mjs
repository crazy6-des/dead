import assert from "node:assert/strict";
import worker from "../src/index.js";
import { sha256Hex } from "../src/auth.js";
import { createNotification } from "../src/notifications.js";

const state = {
  users: [
    { id: "user-1", username: "alice", display_name: "Alice", avatar_url: null, deleted_at: null },
    { id: "user-2", username: "bob", display_name: "Bob", avatar_url: null, deleted_at: null },
  ],
  conversations: [],
  members: [],
  messages: [],
  media: [{ id:"image-1", media_type:"image", mime_type:"image/png", byte_size:1234, metadata_json:JSON.stringify({name:"photo.png"}), post_id:null, owner_id:"user-1" }],
  notifications: [],
};

const db = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async first() {
            if (query.startsWith("SELECT s.id")) {
              return values[0] === await sha256Hex("session-1")
                ? { id: "session-1", user_id: "user-1", username: "alice", display_name: "Alice" }
                : null;
            }
            if (query.startsWith("SELECT id, username, display_name, avatar_url FROM users")) return state.users.find((u) => u.username === values[0] && !u.deleted_at) || null;
            if (query.startsWith("SELECT c.id FROM conversations")) {
              const match = state.conversations.find((c) => !c.deleted_at && state.members.some((m) => m.conversation_id === c.id && m.user_id === values[0]) && state.members.some((m) => m.conversation_id === c.id && m.user_id === values[1]));
              return match ? { id: match.id } : null;
            }
            if (query.startsWith("SELECT 1 FROM conversation_members")) return state.members.find((m) => m.conversation_id === values[0] && m.user_id === values[1]) || null;
            if (query.startsWith("SELECT user_id FROM conversation_members")) return state.members.find((m) => m.conversation_id === values[0] && m.user_id !== values[1]) || null;
            if (query.startsWith("SELECT id, conversation_id, sender_id, message_type")) return state.messages.find((m) => m.id === values[0]) || null;
            if (query.startsWith("SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.body, m.created_at, m.deleted_at, m.media_id")) { const message = state.messages.find((m) => m.id === values[0]); const media = message?.media_id ? state.media.find((m) => m.id === message.media_id) : null; return message ? { ...message, media_type: media?.media_type || null, mime_type: media?.mime_type || null, media_size: media?.byte_size || 0, media_name: "photo.png" } : null; }
            if (query.startsWith("SELECT id, media_type, mime_type, byte_size, metadata_json FROM post_media")) return state.media.find((m) => m.id === values[0] && m.post_id === null && m.owner_id === values[1]) || null;
            if (query.startsWith("SELECT COUNT(*)")) return { count: 0 };
            return null;
          },
          async all() {
            if (query.startsWith("SELECT c.id, c.updated_at")) {
              return { results: state.conversations.filter((c) => state.members.some((m) => m.conversation_id === c.id && m.user_id === values[0])).map((c) => {
                const other = state.members.find((m) => m.conversation_id === c.id && m.user_id !== values[0]);
                const user = state.users.find((u) => u.id === other?.user_id);
                const last = state.messages.filter((m) => m.conversation_id === c.id).sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
                return { id:c.id, updated_at:c.updated_at, other_id:user.id, other_username:user.username, other_display_name:user.display_name, other_avatar_url:user.avatar_url, last_body:last?.body || "", last_message_at:last?.created_at || null, unread_count:0 };
              }) };
            }
            if (query.startsWith("SELECT m.id, m.conversation_id")) return { results: state.messages.filter((m) => m.conversation_id === values[0]).sort((a,b) => b.created_at.localeCompare(a.created_at)) };
            if (query.startsWith("SELECT n.id, n.event_type")) return { results: state.notifications.filter((n) => n.recipient_id === values[0]).sort((a,b) => b.created_at.localeCompare(a.created_at)).map((n) => {
              const actor = state.users.find((u) => u.id === n.actor_id);
              return {...n, actor_username:actor?.username || null, actor_display_name:actor?.display_name || null};
            }) };
            return { results: [] };
          },
          async run() {
            if (query.startsWith("INSERT INTO conversations")) state.conversations.push({ id:values[0], created_by:values[1], updated_at:"2026-09-22T12:00:00.000Z", deleted_at:null });
            else if (query.startsWith("INSERT INTO conversation_members")) state.members.push({ conversation_id:values[0], user_id:values[1] });
            else if (query.startsWith("INSERT INTO messages")) state.messages.push({ id:values[0], conversation_id:values[1], sender_id:values[2], message_type:values[3], body:values[4], media_id:values[5] || null, created_at:"2026-09-22T12:00:00.000Z", deleted_at:null });
            else if (query.startsWith("UPDATE post_media SET metadata_json")) { const media=state.media.find((m)=>m.id===values[0]); if(media) media.metadata_json=JSON.stringify({name:"photo.png",messageId:values[0]}); }
            else if (query.startsWith("UPDATE conversations SET")) { const c=state.conversations.find((x)=>x.id===values[0]); if(c)c.updated_at="2026-09-22T12:01:00.000Z"; }
            else if (query.includes("INSERT OR IGNORE INTO notifications")) state.notifications.push({ id:values[0], recipient_id:values[1], actor_id:values[2], event_type:values[3], target_type:values[4], target_id:values[5], payload:values[6], conversation_id:values[7], read_at:null, created_at:"2026-09-22T12:01:00.000Z" });
            else if (query.startsWith("UPDATE notifications SET read_at")) state.notifications.filter((n)=>n.id===values[0] && n.recipient_id===values[1]).forEach((n)=>n.read_at="2026-09-22T12:02:00.000Z");
            return { success:true, meta:{changes:1} };
          },
        };
      },
      async all() { return { results:[] }; },
    };
  },
  async batch(statements) {
    for (const statement of statements) await statement.run();
    return statements.map(() => ({ success:true }));
  },
};

const authRequest = (path, init = {}) => new Request(`https://example.test${path}`, {
  ...init,
  headers: { Cookie:"s_session=session-1", "content-type":"application/json", ...(init.headers || {}) },
});

assert.equal((await worker.fetch(new Request("https://example.test/api/messages/conversations"), { DB:db })).status, 401);
assert.equal((await worker.fetch(new Request("https://example.test/api/notifications"), { DB:db })).status, 401);

const createdConversation = await worker.fetch(authRequest("/api/messages/conversations", { method:"POST", body:JSON.stringify({ username:"bob" }) }), { DB:db });
assert.equal(createdConversation.status, 201);
const conversationBody = await createdConversation.json();
assert.ok(conversationBody.conversation.id);
assert.equal(conversationBody.conversation.username, "bob");

const listedConversations = await worker.fetch(authRequest("/api/messages/conversations"), { DB:db });
assert.equal(listedConversations.status, 200);
assert.equal((await listedConversations.json()).items.length, 1);

const conversationId = conversationBody.conversation.id;
const sent = await worker.fetch(authRequest("/api/messages", { method:"POST", body:JSON.stringify({ conversationId, type:"text", text:"Hello Bob" }) }), { DB:db });
assert.equal(sent.status, 201);
assert.equal((await sent.json()).text, "Hello Bob");
const imageSent = await worker.fetch(authRequest("/api/messages", { method:"POST", body:JSON.stringify({ conversationId, type:"image", text:"A photo", mediaId:"image-1" }) }), { DB:db });
assert.equal(imageSent.status, 201);
const imageBody = await imageSent.json();
assert.equal(imageBody.type, "image");
assert.equal(imageBody.media.mediaId, "image-1");
const notificationCreated = await createNotification({ DB: db }, { recipientId:"user-1", actorId:"user-2", eventType:"message", targetType:"message", targetId:"message-test", conversationId:"notification-test", payload:{ text:"Hello again" } });
assert.equal(notificationCreated, true);
assert.equal(state.notifications.some((n) => n.target_id === "message-test" && n.conversation_id === "notification-test"), true);

const listedMessages = await worker.fetch(authRequest(`/api/messages/conversations/${conversationId}`), { DB:db });
assert.equal(listedMessages.status, 200);
const listedBody = await listedMessages.json();
assert.equal(listedBody.items.length, 2);
assert.equal(listedBody.items[0].text, "A photo");
assert.equal(listedBody.items[1].text, "Hello Bob");

const notifications = await worker.fetch(authRequest("/api/notifications"), { DB:db });
assert.equal(notifications.status, 200);
const notificationPage = await notifications.json();
assert.equal(notificationPage.items.length, 1);
assert.equal(notificationPage.items[0].type, "system");
assert.equal(notificationPage.items[0].read, false);
assert.equal(notificationPage.items[0].target, "/messages?conversation=" + encodeURIComponent("notification-test"));

const notificationId = notificationPage.items[0].id;
const marked = await worker.fetch(authRequest("/api/notifications/read", { method:"POST", body:JSON.stringify({ id:notificationId }) }), { DB:db });
assert.equal(marked.status, 200);
assert.equal((await marked.json()).ok, true);

const markedAll = await worker.fetch(authRequest("/api/notifications/read-all", { method:"POST" }), { DB:db });
assert.equal(markedAll.status, 200);

console.log("Messaging and notification API contracts: PASS");
