const UPSTREAM = "https://api.freetouse.com/v3/music/tracks";

function error(code, status, message) {
  return { code, status, message };
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 12;
  return Math.min(Math.max(parsed, 1), 50);
}

function normalizeOffset(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 100000);
}

const ALLOWED_ORDERS = new Set(["release_date", "views", "plays", "downloads", "staff_order", "random"]);
const ALLOWED_SORTS = new Set(["asc", "desc"]);

async function upstream(path, params) {
  const url = new URL(`${UPSTREAM}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return { error: error("MUSIC_UPSTREAM_ERROR", 502, "Music catalog is temporarily unavailable.") };
  let payload;
  try { payload = await response.json(); } catch { return { error: error("MUSIC_UPSTREAM_INVALID", 502, "Music catalog returned invalid data.") }; }
  if (payload?.ok === false) return { error: error("MUSIC_UPSTREAM_ERROR", 502, payload.error || "Music catalog request failed.") };
  return { response: payload };
}

function catalogParams(url) {
  return {
    limit: normalizeLimit(url.searchParams.get("limit")),
    offset: normalizeOffset(url.searchParams.get("offset")),
    order: ALLOWED_ORDERS.has(url.searchParams.get("order")) ? url.searchParams.get("order") : "release_date",
    sort: ALLOWED_SORTS.has(url.searchParams.get("sort")) ? url.searchParams.get("sort") : "desc",
  };
}

export async function searchMusic(request) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get("query") || "").trim();
  if (!query) return { response: null, error: error("VALIDATION_ERROR", 400, "A music search query is required.") };
  return upstream("search", { query, ...catalogParams(url) });
}

export async function browseMusic(request) {
  const url = new URL(request.url);
  return upstream("all", catalogParams(url));
}
