import { resolveSession } from "./auth.js";
import { serializePost } from "./posts.js";

const MAX_LIMIT = 30;
const NICHE_KEYWORDS = Object.freeze({
  Tech: ["tech", "technology", "software", "developer", "coding", "programming", "app", "ai", "artificial intelligence", "startup", "cybersecurity", "cloud"],
  Comedy: ["comedy", "funny", "joke", "jokes", "meme", "memes", "laugh", "hilarious", "skit", "satire"],
  Finance: ["finance", "money", "bank", "banking", "investment", "investing", "stocks", "forex", "crypto", "savings", "loan", "economy", "business"],
  News: ["news", "breaking", "headline", "report", "update", "updates", "current affairs", "politics", "election", "government"],
});
function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function normalizeLimit(value) { const n = Number(value); return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_LIMIT) : 20; }
function normalizeNiche(value) { const name = String(value || "").trim(); return Object.prototype.hasOwnProperty.call(NICHE_KEYWORDS, name) ? name : ""; }
function decodePeopleCursor(value) {
  if (!value) return 0;
  try {
    const raw = String(value).replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const offset = Number(globalThis.atob(padded));
    return Number.isInteger(offset) && offset >= 0 ? offset : 0;
  } catch { return 0; }
}
function encodePeopleCursor(offset) {
  return globalThis.btoa(String(Math.max(0, Number(offset) || 0))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function buildNicheClause(niche, column = "p.body") {
  const terms = NICHE_KEYWORDS[niche] || [];
  if (!terms.length) return { sql: "1=1", values: [] };
  return { sql: "(" + terms.map(() => "LOWER(COALESCE(" + column + ",'')) LIKE ?").join(" OR ") + ")", values: terms.map((term) => "%" + term.toLowerCase() + "%") };
}

export async function search(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return failure("UNAUTHORIZED", 401, "Authentication is required.");
  if (!env?.DB) return failure("SERVICE_UNAVAILABLE", 503, "Search service is not configured.");
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 120);
  const type = String(url.searchParams.get("type") || "all");
  const niche = normalizeNiche(url.searchParams.get("niche"));
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const peopleOffset = decodePeopleCursor(url.searchParams.get("cursor"));
  const like = "%" + query.replace(/[%_]/g, "\\$&") + "%";
  const nicheFilter = buildNicheClause(niche);

  const people = (type === "all" || type === "people")
    ? await env.DB.prepare(
      "SELECT u.id,u.username,u.display_name,u.avatar_url," +
      "(SELECT COUNT(*) FROM relationships f WHERE f.target_user_id=u.id AND f.relationship_type='follow') AS follower_count," +
      "EXISTS (SELECT 1 FROM relationships mef WHERE mef.source_user_id=?1 AND mef.target_user_id=u.id AND mef.relationship_type='follow') AS following " +
      "FROM users u WHERE u.deleted_at IS NULL AND u.id <> ?1 " +
      "AND NOT EXISTS (SELECT 1 FROM relationships existing_follow WHERE existing_follow.source_user_id=?1 AND existing_follow.target_user_id=u.id AND existing_follow.relationship_type='follow') " +
      (query ? "AND (LOWER(u.username) LIKE LOWER(?2) ESCAPE '\\\\' OR LOWER(u.display_name) LIKE LOWER(?2) ESCAPE '\\\\') " : "") +
      "ORDER BY follower_count DESC,u.created_at DESC,u.username ASC LIMIT ?" +
      (query ? "3" : "2") + " OFFSET ?" 
    ).bind(...(query ? [session.user_id, like, limit + 1, peopleOffset] : [session.user_id, limit + 1, peopleOffset])).all()
    : { results: [] };

  let postRows = { results: [] };
  if (type === "all" || type === "posts") {
    const conditions = ["p.deleted_at IS NULL", "u.deleted_at IS NULL", "(p.author_id = ? OR p.visibility = 'public')", nicheFilter.sql];
    const values = [session.user_id, ...nicheFilter.values];
    if (query) { conditions.push("(LOWER(p.body) LIKE LOWER(?) ESCAPE '\\\\' OR LOWER(u.username) LIKE LOWER(?) ESCAPE '\\\\' OR LOWER(u.display_name) LIKE LOWER(?) ESCAPE '\\\\')"); values.push(like, like, like); }
    values.push(limit);
    postRows = await env.DB.prepare(
      "SELECT p.id,p.author_id,p.body,p.visibility,p.reply_policy,p.post_kind,p.background_json,p.quoted_post_id,p.view_count,p.created_at,p.updated_at,u.username,u.display_name,u.avatar_url,(p.author_id=?1) AS is_owner," +
      "(SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url,'/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id=p.id ORDER BY m.position) AS media," +
      "(SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='like') AS like_count," +
      "(SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='repost') AS repost_count," +
      "(SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id=p.id AND rp.deleted_at IS NULL) AS reply_count," +
      "(SELECT COUNT(*) FROM bookmarks b WHERE b.post_id=p.id) AS bookmark_count " +
      "FROM posts p JOIN users u ON u.id=p.author_id WHERE " + conditions.join(" AND ") +
      " ORDER BY p.created_at DESC,p.id DESC LIMIT ?"
    ).bind(...values).all();
  }

  const topicRows = (type === "all" || type === "topics")
    ? await env.DB.prepare(
      "SELECT body,p.created_at FROM posts p JOIN users u ON u.id=p.author_id WHERE p.deleted_at IS NULL AND p.visibility='public' AND u.deleted_at IS NULL " +
      (query ? "AND LOWER(p.body) LIKE LOWER(?1) ESCAPE '\\\\' " : "") +
      "ORDER BY p.created_at DESC,p.id DESC LIMIT ?"
    ).bind(...(query ? [like, Math.max(limit * 8, 50)] : [Math.max(limit * 8, 50)])).all()
    : { results: [] };
  const topicStats = new Map();
  for (const row of topicRows.results || []) {
    const createdAt = String(row.created_at || "");
    for (const match of String(row.body || "").matchAll(/#[a-z0-9_]+/gi)) {
      const tag = match[0];
      const key = tag.toLowerCase();
      const current = topicStats.get(key);
      topicStats.set(key, {
        tag: current?.tag || tag,
        count: (current?.count || 0) + 1,
        latest: current?.latest && current.latest > createdAt ? current.latest : createdAt,
      });
    }
  }
  const recentTopics = [...topicStats.values()]
    .sort((a, b) => String(b.latest).localeCompare(String(a.latest)))
    .slice(0, limit)
    .map(({ tag, count }) => ({ tag, count }));

  let musicRows = { results: [] };
  if (type === "music" || type === "all") {
    musicRows = await env.DB.prepare(
      "SELECT DISTINCT p.id,p.author_id,p.body,p.visibility,p.reply_policy,p.post_kind,p.background_json,p.quoted_post_id,p.view_count,p.created_at,p.updated_at,u.username,u.display_name,u.avatar_url," +
      "(SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url,'/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id=p.id ORDER BY m.position) AS media " +
      "FROM posts p JOIN users u ON u.id=p.author_id JOIN post_media pm ON pm.post_id=p.id " +
      "WHERE p.deleted_at IS NULL AND p.visibility='public' AND u.deleted_at IS NULL AND (LOWER(pm.media_type)='audio' OR LOWER(COALESCE(pm.mime_type,'')) LIKE 'audio/%') " +
      (query ? "AND (LOWER(p.body) LIKE LOWER(?) OR LOWER(COALESCE(pm.metadata_json,'')) LIKE LOWER(?)) " : "") +
      "ORDER BY p.created_at DESC,p.id DESC LIMIT ?"
    ).bind(...(query ? [like, like, limit] : [limit])).all();
  }

  let nicheCount = 0;
  if (niche) {
    const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM posts WHERE deleted_at IS NULL AND visibility='public' AND " + nicheFilter.sql.replaceAll("p.body", "body")).bind(...nicheFilter.values).first();
    nicheCount = Number(countRow?.count || 0);
  }

  return { response: {
    items: {
      people: (people.results || []).slice(0, limit).map((p) => ({ id:p.id, username:p.username, name:p.display_name, avatarUrl:p.avatar_url || null, followerCount:Number(p.follower_count || 0), following:false })),
      peopleNextCursor: (people.results || []).length > limit ? encodePeopleCursor(peopleOffset + limit) : null,
      posts: (postRows.results || []).map(serializePost),
      topics: recentTopics,
      music: (musicRows.results || []).map(serializePost),
    },
    query, type, niche, nicheCount,
  }, error: null };
}
