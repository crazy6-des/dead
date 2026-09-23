import assert from "node:assert/strict";
import { uploadMedia, getMedia } from "../src/media.js";
import { sha256Hex } from "../src/auth.js";

const stored = new Map();
const rows = new Map();
const db = {
  prepare(query) {
    return { bind(...values) {
      return {
        async first() {
          if (query.startsWith("SELECT s.id")) return values[0] === await sha256Hex("session-1") ? { id:"session-1", user_id:"user-1", username:"alice", display_name:"Alice" } : null;
          if (query.includes("FROM post_media pm")) {
            const row = rows.get(values[0]);
            return row ? {
              ...row,
              owner_id: row.owner_id ?? "user-1",
              post_id: row.post_id ?? null,
              post_author_id: row.post_author_id ?? null,
              post_deleted_at: row.post_deleted_at ?? null,
              post_visibility: row.post_visibility ?? null,
              post_private_account: row.post_private_account ?? 0,
              message_sender_id: row.message_sender_id ?? null,
            } : null;
          }
          return null;
        },
        async run() {
          if (query.startsWith("INSERT INTO post_media")) rows.set(values[0], { id:values[0], object_key:values[1], mime_type:values[3], byte_size:values[4] });
          return { meta:{changes:1} };
        },
      };
    }};
  },
};
const bucket = {
  async put(key, body, options) { stored.set(key, { body: await new Response(body).arrayBuffer(), options }); },
  async get(key) { const item=stored.get(key); if(!item)return null; return { body:item.body, httpEtag:"etag-test" }; },
};
const env={DB:db,MEDIA_BUCKET:bucket};
const request=new Request("https://example.test/api/media/upload",{method:"POST",headers:{Cookie:"s_session=session-1",Origin:"https://sphereis.netlify.app"},body:(()=>{const f=new FormData();f.append("file",new File(["hello"],"photo.jpg",{type:"image/jpeg"}));return f;})()});
const uploaded=await uploadMedia(request,env);
assert.equal(uploaded.error,null);
assert.equal(uploaded.response.media.mediaType,"image");
assert.equal(uploaded.response.media.mimeType,"image/jpeg");
assert.equal(rows.size,1);
const mediaId=uploaded.response.media.mediaId;
const media=await getMedia(new Request("https://example.test/api/media/"+mediaId,{headers:{Cookie:"s_session=session-1"}}),env,mediaId);
assert.equal(media.error,null);
assert.equal(media.response.headers.get("content-type"),"image/jpeg");

rows.set("public-media", {
  id:"public-media",
  object_key:"public/photo.jpg",
  mime_type:"image/jpeg",
  byte_size:5,
  owner_id:"user-2",
  post_id:"post-public",
  post_author_id:"user-2",
  post_deleted_at:null,
  post_visibility:"public",
  post_private_account:0,
  message_sender_id:null,
});
stored.set("public/photo.jpg", { body:new TextEncoder().encode("hello").buffer, options:{} });
const publicMedia = await getMedia(new Request("https://example.test/api/media/public-media"),env,"public-media");
assert.equal(publicMedia.error,null);
assert.equal(publicMedia.response.headers.get("content-type"),"image/jpeg");
console.log("R2 media upload, persistence, and public delivery contracts: PASS");
