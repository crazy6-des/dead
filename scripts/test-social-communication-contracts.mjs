import assert from "node:assert/strict";
import { createNotificationRequest, normalizeNotification } from "../src/features/notifications/notificationContract.js";
import { createMessageRequest, normalizeMessage } from "../src/features/messages/messageContract.js";
assert.deepEqual(createNotificationRequest({ filter:"Mentions" }), { cursor:null, filter:"Mentions", limit:30 });
assert.equal(normalizeNotification({ id:7, name:"Maya" }).actor, "Maya");
assert.deepEqual(createMessageRequest({ conversationId:"c1", text:" hello " }), { conversationId:"c1", type:"text", text:"hello" });
assert.equal(normalizeMessage({ id:2, conversationId:"c1" }).status, "sent");
console.log("Social communication contracts: PASS");
