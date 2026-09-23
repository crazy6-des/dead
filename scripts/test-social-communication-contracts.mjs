import assert from "node:assert/strict";
import { createNotificationRequest, normalizeNotification } from "../src/features/notifications/notificationContract.js";
import { createMessageRequest, normalizeMessage, MESSAGE_IMAGE_LIMITS } from "../src/features/messages/messageContract.js";

assert.deepEqual(createNotificationRequest({ filter:"Mentions" }), { cursor:null, filter:"Mentions", limit:30 });
assert.equal(normalizeNotification({ id:7, name:"Maya", target:"/post/7", targetId:"7" }).actor, "Maya");
assert.equal(normalizeNotification({ id:8, type:"share", target:"/post/8" }).target, "/post/8");
assert.deepEqual(createMessageRequest({ conversationId:"c1", text:" hello " }), { conversationId:"c1", type:"text", text:"hello" });
assert.deepEqual(createMessageRequest({ conversationId:"c1", type:"image", text:" caption ", mediaId:"m1" }), { conversationId:"c1", type:"image", text:"caption", mediaId:"m1" });
assert.equal(normalizeMessage({ id:2, conversationId:"c1", type:"image", media:{ mediaId:"m1", url:"/api/media/m1" } }).media.mediaId, "m1");
assert.equal(normalizeMessage({ id:3, conversationId:"c1", senderId:"u1", direction:"out" }).direction, "out");
assert.equal(normalizeMessage({ id:4, conversationId:"c1", senderId:"u2", direction:"in" }).direction, "in");
assert.equal(normalizeMessage({ id:5, conversationId:"c1", senderId:"u2" }).direction, null);
assert.ok(MESSAGE_IMAGE_LIMITS.TYPES.includes("image/png"));
console.log("Social communication contracts: PASS");
