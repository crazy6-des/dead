import { apiClient, hasApiBaseUrl } from "./apiClient.js";

export function createApiSearchAdapter(client = apiClient) {
  return { search(query, type = "all", cursor = null, niche = "") { return client.get("/api/search", { query: { q: String(query || "").trim(), type, cursor, niche: String(niche || "").trim(), limit: 30 } }); } };
}
export function createDevSearchAdapter({ posts = [] } = {}) {
  return {
    search(query, type = "all", cursor = null, niche = "") {
      const q = String(query || "").trim().toLowerCase();
      const nicheTerms = { Tech: ["tech", "technology", "software", "developer", "coding", "programming", "app", "ai", "artificial intelligence", "startup", "cybersecurity", "cloud"], Comedy: ["comedy", "funny", "joke", "jokes", "meme", "memes", "laugh", "hilarious", "skit", "satire"], Finance: ["finance", "money", "bank", "banking", "investment", "investing", "stocks", "forex", "crypto", "savings", "loan", "economy", "business"], News: ["news", "breaking", "headline", "report", "update", "updates", "current affairs", "politics", "election", "government"] }[niche] || [];
      const matchesNiche = (post) => !nicheTerms.length || nicheTerms.some((term) => [post?.a, post?.h, post?.x, post?.topic].filter(Boolean).join(" ").toLowerCase().includes(term));
      const people = [...new Map(posts.map((post) => [post.u || post.username, { name: post.a || post.displayName || post.username, username: post.u || post.username }]).filter(([username]) => username)).values()];
      return Promise.resolve({
        items: {
          people: people.filter((p) => !q || (p.name + " " + p.username).toLowerCase().includes(q)),
          posts: posts.filter((p) => (!q || [p.a, p.h, p.x, p.topic].join(" ").toLowerCase().includes(q)) && matchesNiche(p)).slice(0, 30),
          topics: [...new Set(posts.map((p) => p.topic).filter(Boolean))].filter((topic) => !q || topic.toLowerCase().includes(q)),
        },
        type,
        query: q,
      });
    },
  };
}
export function createSearchAdapter({ client = apiClient, posts = [] } = {}) {
  return hasApiBaseUrl() ? createApiSearchAdapter(client) : createDevSearchAdapter({ posts });
}
