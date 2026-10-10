const TOPIC_KEYWORDS = Object.freeze({
  tech: ["tech", "technology", "software", "developer", "coding", "programming", "app", "ai", "artificial intelligence", "startup", "cybersecurity", "cloud", "phone", "computer"],
  finance: ["finance", "money", "bank", "banking", "investment", "investing", "stocks", "forex", "crypto", "savings", "loan", "economy", "business", "wealth", "market"],
  comedy: ["comedy", "funny", "joke", "jokes", "meme", "memes", "laugh", "hilarious", "skit", "satire"],
  news: ["news", "breaking", "headline", "report", "update", "updates", "current affairs", "politics", "election", "government", "world"],
  sports: ["football", "soccer", "basketball", "tennis", "sports", "match", "league", "goal", "player", "team"],
  music: ["music", "song", "album", "artist", "afrobeats", "beat", "producer", "lyrics", "concert"],
  lifestyle: ["life", "lifestyle", "health", "fitness", "food", "travel", "relationship", "family", "motivation", "career"],
  education: ["learn", "education", "study", "school", "science", "history", "tutorial", "guide", "research"],
});

function textOf(row) {
  return [row?.body, row?.topic, row?.post_kind].filter(Boolean).join(" ").toLowerCase();
}

function topicOf(row) {
  const text = textOf(row);
  const matches = Object.entries(TOPIC_KEYWORDS)
    .map(([topic, words]) => ({ topic, hits: words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0) }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.topic.localeCompare(b.topic));
  return matches[0]?.topic || "general";
}

function stableNoise(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function rankForYouPosts(rows, { userId = "", interestSignals = [], now = Date.now() } = {}) {
  const interests = new Map();
  for (const signal of interestSignals) {
    const text = String(signal?.body || "").toLowerCase();
    const weight = Math.max(0, Number(signal?.weight || 1));
    for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
      const hits = words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
      if (hits) interests.set(topic, (interests.get(topic) || 0) + Math.min(hits, 3) * weight);
    }
  }

  const scored = rows.map((row) => {
    const ageHours = Math.max(0, (now - Date.parse(row.created_at || 0)) / 3600000);
    const freshness = 24 / (1 + ageHours / 12);
    const relationship = Number(row.following) ? 100 : 0;
    const affinity = (row.likedAuthor ? 55 : 0) + (row.repostedAuthor ? 42 : 0) + (row.savedAuthor ? 35 : 0);
    const engagement = Math.log1p(Number(row.like_count || 0)) * 8
      + Math.log1p(Number(row.repost_count || 0)) * 11
      + Math.log1p(Number(row.reply_count || 0)) * 6
      + Math.log1p(Number(row.bookmark_count || 0)) * 5;
    const personal = Number(row.liked) ? 14 : 0;
    const topic = topicOf(row);
    const topicAffinity = Math.min(24, (interests.get(topic) || 0) * 2.5);
    // A small stable exploration bonus keeps ties from always favouring the same items,
    // while remaining deterministic across paginated requests for the same user/window.
    const exploration = stableNoise(userId + ":" + row.id) * 4;
    return { row, topic, score: relationship + affinity + engagement + freshness + personal + topicAffinity + exploration };
  }).sort((a, b) => b.score - a.score || String(b.row.created_at || "").localeCompare(String(a.row.created_at || "")));

  // Greedy reranking: relevance remains the main signal, but repeated authors and
  // topics are gently pushed apart so one popular creator/niche cannot fill a page.
  const ranked = [];
  const remaining = [...scored];
  while (remaining.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const recent = ranked.slice(-4);
      const sameAuthor = recent.filter((item) => item.row.author_id === candidate.row.author_id).length;
      const sameTopic = recent.filter((item) => item.topic === candidate.topic).length;
      const diversityScore = candidate.score - sameAuthor * 34 - sameTopic * 10;
      if (diversityScore > bestScore) {
        bestScore = diversityScore;
        bestIndex = index;
      }
    }
    ranked.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ranked.map((entry) => entry.row);
}
