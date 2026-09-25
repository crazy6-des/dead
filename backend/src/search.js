import { resolveSession } from "./auth.js";
import { serializePost } from "./posts.js";

const MAX_LIMIT = 30;
const DISCOVER_NICHES = Object.freeze({
  Tech: ["tech", "technology", "software", "developer", "coding", "programming", "app", "ai", "artificial intelligence", "startup", "cybersecurity", "cloud"],
  Comedy: ["comedy", "funny", "joke", "jokes", "meme", "memes", "laugh", "hilarious", "skit", "satire"],
  Finance: ["finance", "money", "bank", "banking", "investment", "investing", "stocks", "forex", "crypto", "savings", "loan", "economy", "business"],
  News: ["news", "breaking", "headline", "report", "update", "updates", "current affairs", "politics", "election", "government"],
});
function failure(code, status, message) { return { response: null, error: { code, status, message } }; }
function normalizeLimit(value) { const n = Number(value); return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_LIMIT) : 20; }
function normalizeNiche(value) { const raw = String(value || "").trim(); return Object.prototype.hasOwnProperty.call(DISCOVER_NICHES, raw) ? raw : ""; }
function nicheClause(niche, startIndex) {
  const terms = DISCOVER_NICHES[niche] || [];
  if (!terms.length) return { sql: "", params: [] };
  return {
    sql: " AND (" + terms.map((_, index) => "LOWER(p.body) LIKE ?" + (startIndex + index)).join(" OR ") + ")",
    params: terms.map((term) => "%" + term.toLowerCase().replace(/[%_]/g, "\\$&") + "%"),
  };
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
  if (!query && !niche && type !== "posts") {
    return { response: { items: { people: [], posts: [], topics: [], music: [] }, query: "", type, niche: "" }, error: null };
  }

  const like = "%" + query.replace(/[%_]/g, "\\$&") + "%";
  const nicheTerms = DISCOVER_NICHES[niche] || [];
  const nicheSql = nicheTerms.length
    ? " AND (" + nicheTerms.map((_, index) => "LOWER(p.body) LIKE ?" + (4 + index)).join(" OR ") + ")"
    : "";
  const nicheParams = nicheTerms.map((term) => "%" + term.toLowerCase().replace(/[%_]/g, "\\$&") + "%");
  const postRows = (type === "all" || type === "posts")
    ? await env.DB.prepare(
      `SELECT p.id,p.author_id,p.body,p.visibility,p.reply_policy,p.post_kind,p.background_json,p.quoted_post_id,p.created_at,p.updated_at,u.username,u.display_name,(p.author_id=?2) AS is_owner,
       (SELECT json_group_array(json_object('id',m.id,'mediaType',m.media_type,'mimeType',m.mime_type,'url',COALESCE(m.external_url,'/api/media/' || m.id),'source',m.source,'metadata',m.metadata_json,'durationMs',m.duration_ms)) FROM post_media m WHERE m.post_id=p.id ORDER BY m.position) AS media,
       (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='like') AS like_count,
       (SELECT COUNT(*) FROM post_reactions r WHERE r.post_id=p.id AND r.reaction_type='repost') AS repost_count,
       (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id=p.id AND rp.deleted_at IS NULL) AS reply_count,
       (SELECT COUNT(*) FROM bookmarks b WHERE b.post_id=p.id) AS bookmark_count
       FROM posts p JOIN users u ON u.id=p.author_id
       WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL
       AND (p.author_id=?2 OR p.visibility='public')
       ${query ? "AND p.body LIKE ?1 ESCAPE '\\\\'" : ""}
       ${nicheSql}
       ORDER BY p.created_at DESC,p.id DESC LIMIT ?3`
    ).bind(like, session.user_id, limit, ...nicheParams).all()
    : { results: [] };

  const people = (query && (type === "all" || type === "people"))
    ? await env.DB.prepare("SELECT id, username, display_name FROM users WHERE deleted_at IS NULL AND (username LIKE ?1 ESCAPE '\\\\' OR display_name LIKE ?1 ESCAPE '\\\\') ORDER BY username ASC LIMIT ?2").bind(like, limit).all()
    : { results: [] };

  const topics = (query && (type === "all" || type === "topics"))
    ? await env.DB.prepare("SELECT body FROM posts WHERE deleted_at IS NULL AND visibility='public' AND body LIKE ?1 ESCAPE '\\\\' ORDER BY created_at DESC LIMIT ?2").bind(like, limit).all()
    : { results: [] };

  const topicSet = new Set();
  for (const row of topics.results || []) {
    for (const match of String(row.body || "").matchAll(/#[a-z0-9_]+/gi)) topicSet.add(match[0]);
  }

  return {
    response: {
      items: {
        people: (people.results || []).map((p) => ({ id:p.id, username:p.username, name:p.display_name })),
        posts: (postRows.results || []).map(serializePost),
        topics: [...topicSet].slice(0, limit),
        music: [],
      },
      query,
      type,
      niche,
    },
    error: null,
  };
}
