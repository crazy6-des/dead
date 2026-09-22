import assert from "node:assert/strict";
import { createReply, listReplies } from "../src/replies.js";
import { sha256Hex } from "../src/auth.js";

const state = {
  parent: { id:"post-1", author_id:"user-2", reply_policy:"everyone", deleted_at:null },
  replies: [],
  notifications: [],
};
const db = {
  prepare(query) {
    return {
      bind(...values) {
        return {
          async first() {
            if (query.startsWith("SELECT s.id")) return values[0] === await sha256Hex("session-1") ? { id:"session-1", user_id:"user-1", username:"alice", display_name:"Alice" } : null;
            if (query.startsWith("SELECT id, author_id, reply_policy")) return state.parent;
            if (query.startsWith("SELECT 1 FROM relationships WHERE relationship_type = 'block'")) return null;
            if (query.startsWith("SELECT p.id, p.reply_to_id")) return state.replies.find((x)=>x.id===values[0]) || null;
            if (query.startsWith("SELECT id FROM posts")) return state.parent;
            return null;
          },
          async all() {
            if (query.startsWith("SELECT p.id, p.reply_to_id")) return { results: state.replies.map((r)=>({...r,username:"alice",display_name:"Alice",like_count:0})) };
            return { results:[] };
          },
          async run() {
            if (query.startsWith("INSERT INTO posts")) state.replies.push({id:values[0],reply_to_id:values[3],author_id:values[1],body:values[2],created_at:"2026-09-22T12:00:00.000Z",updated_at:"2026-09-22T12:00:00.000Z"});
            if (query.startsWith("INSERT OR IGNORE INTO notifications")) state.notifications.push({recipient_id:values[1],event_type:values[3],target_id:values[5]});
            return {meta:{changes:1}};
          },
        };
      },
    };
  },
  async batch(){ return []; },
};
const env={DB:db};
const request=(path,init={})=>new Request("https://example.test"+path,{...init,headers:{Cookie:"s_session=session-1","content-type":"application/json",...(init.headers||{})}});
const created=await createReply(request("/api/posts/post-1/replies",{method:"POST",body:JSON.stringify({text:"A real reply"})}),env);
assert.equal(created.error,null);
assert.equal(created.response.status,"created");
assert.equal(state.replies.length,1);
assert.equal(state.notifications[0].event_type,"reply");
const listed=await listReplies(request("/api/posts/post-1/replies"),env);
assert.equal(listed.error,null);
assert.equal(listed.response.items.length,1);
assert.equal(listed.response.items[0].text,"A real reply");
assert.equal((await createReply(request("/api/posts/post-1/replies",{method:"POST",body:JSON.stringify({text:""})}),env)).error.code,"VALIDATION_ERROR");
console.log("Post replies API contracts: PASS");
