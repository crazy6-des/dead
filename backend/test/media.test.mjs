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
          if (query.startsWith("SELECT id, object_key")) return rows.get(values[0]) || null;
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
const media=await getMedia(new Request("https://example.test/api/media/"+mediaId),env,mediaId);
assert.equal(media.error,null);
assert.equal(media.response.headers.get("content-type"),"image/jpeg");
console.log("R2 media upload and delivery contracts: PASS");
