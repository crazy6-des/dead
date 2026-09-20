import { apiClient, hasApiBaseUrl } from "./apiClient.js";

export function createApiSearchAdapter(client = apiClient) {
  return { search(query, type = "all", cursor = null) { return client.get("/api/search", { q: String(query || "").trim(), type, cursor, limit: 30 }); } };
}
export function createDevSearchAdapter({ posts = [] } = {}) {
  return {
    search(query, type = "all") {
      const q = String(query || "").trim().toLowerCase();
      const people = [{ name: "Maya Okafor", username: "maya" }, { name: "Daniel Cole", username: "daniel" }, { name: "Nia James", username: "nia" }, { name: "S Team", username: "s" }];
      return Promise.resolve({
        items: {
          people: people.filter((p) => !q || (p.name + " " + p.username).toLowerCase().includes(q)),
          posts: posts.filter((p) => !q || [p.a, p.h, p.x, p.topic].join(" ").toLowerCase().includes(q)).slice(0, 30),
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
