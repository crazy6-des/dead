export const DISCOVER_NICHES = Object.freeze({
  Tech: ["tech", "technology", "software", "developer", "coding", "programming", "app", "ai", "artificial intelligence", "startup", "cybersecurity", "cloud"],
  Comedy: ["comedy", "funny", "joke", "jokes", "meme", "memes", "laugh", "hilarious", "skit", "satire"],
  Finance: ["finance", "money", "bank", "banking", "investment", "investing", "stocks", "forex", "crypto", "savings", "loan", "economy", "business"],
  News: ["news", "breaking", "headline", "report", "update", "updates", "current affairs", "politics", "election", "government"],
});

function searchablePostText(post) {
  return [post?.text, post?.a, post?.x, post?.topic, post?.h, post?.authorName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function detectPostNiches(post) {
  const text = searchablePostText(post);
  return Object.entries(DISCOVER_NICHES)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([niche]) => niche);
}

export function getNicheStats(posts = []) {
  return Object.keys(DISCOVER_NICHES).map((niche) => ({
    niche,
    count: posts.filter((post) => detectPostNiches(post).includes(niche)).length,
  }));
}

export function getNichePosts(posts = [], niche) {
  if (!DISCOVER_NICHES[niche]) return [];
  return posts.filter((post) => detectPostNiches(post).includes(niche));
}

const HASHTAG_PATTERN = /(^|\s)#([\p{L}\p{N}_]{2,50})/gu;

export function extractHashtags(posts = []) {
  const counts = new Map();

  posts.forEach((post) => {
    const text = [post?.text, post?.a, post?.x, post?.topic].filter(Boolean).join(" ");
    const seenInPost = new Set();

    for (const match of text.matchAll(HASHTAG_PATTERN)) {
      const tag = `#${match[2]}`;
      const key = tag.toLowerCase();
      if (seenInPost.has(key)) continue;
      seenInPost.add(key);
      const current = counts.get(key) || { tag, count: 0 };
      current.count += 1;
      counts.set(key, current);
    }
  });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 8);
}

export function getSuggestedPeople(posts = [], followingUsers = new Set()) {
  const people = new Map();

  posts.forEach((post) => {
    const rawHandle = post?.h || post?.username || post?.handle;
    if (!rawHandle) return;
    const username = String(rawHandle).replace(/^@/, "").trim().toLowerCase();
    if (!username || username === "me" || followingUsers.has(username)) return;

    const existing = people.get(username) || {
      username,
      name: post?.authorName || post?.name || username,
      location: post?.location || null,
      interests: Array.isArray(post?.interests) ? post.interests : [],
      score: 0,
    };
    existing.score += 1;
    people.set(username, existing);
  });

  return [...people.values()].sort((a, b) => b.score - a.score || a.username.localeCompare(b.username)).slice(0, 6);
}

export function matchesDiscoverQuery(post, query) {
  if (!query.trim()) return true;
  const haystack = [post?.text, post?.a, post?.x, post?.topic, post?.h, post?.authorName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}
