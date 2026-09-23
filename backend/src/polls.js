import { resolveSession } from "./auth.js";

const MAX_QUESTION = 280;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

function failure(code, status, message) {
  return { response: null, error: { code, status, message } };
}

async function requireSession(request, env) {
  const session = await resolveSession(request, env);
  if (!session?.user_id) return { session: null, failure: failure("UNAUTHORIZED", 401, "Authentication is required.") };
  if (!env?.DB) return { session: null, failure: failure("SERVICE_UNAVAILABLE", 503, "Poll service is not configured.") };
  return { session, failure: null };
}

function normalizePoll(input) {
  const question = String(input?.question || "").trim();
  const options = Array.isArray(input?.options)
    ? input.options.map((value) => typeof value === "object" ? value?.text ?? value?.label ?? value?.title ?? "" : value).map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const unique = [...new Set(options)];
  if (!question || question.length > MAX_QUESTION) throw Object.assign(new Error("Poll question must contain 1-280 characters."), { code: "VALIDATION_ERROR" });
  if (unique.length < MIN_OPTIONS || unique.length > MAX_OPTIONS) throw Object.assign(new Error("A poll must contain 2-4 unique options."), { code: "VALIDATION_ERROR" });
  if (unique.some((option) => option.length > 100)) throw Object.assign(new Error("Poll options must contain 100 characters or fewer."), { code: "VALIDATION_ERROR" });
  return { question, options: unique, multipleChoice: false, totalVotes: 0, optionVotes: unique.map(() => 0), votedOptionIndex: null };
}

function normalizeStoredPoll(input) {
  return normalizePoll(input);
}

async function getPollResults(db, pollId, optionCount) {
  const counts = await db.prepare("SELECT option_index, COUNT(*) AS count FROM poll_votes WHERE poll_id=?1 GROUP BY option_index").bind(pollId).all();
  const optionVotes = Array.from({ length: optionCount }, () => 0);
  for (const row of counts.results || []) {
    const index = Number(row.option_index);
    if (Number.isInteger(index) && index >= 0 && index < optionVotes.length) optionVotes[index] = Number(row.count || 0);
  }
  return { optionVotes, totalVotes: optionVotes.reduce((sum, count) => sum + count, 0) };
}

function withPollResults(poll, results, votedOptionIndex = null) {
  return { ...poll, options: poll.options.map((option) => String(option)), optionVotes: results.optionVotes, totalVotes: results.totalVotes, votedOptionIndex };
}

export function validatePoll(input) {
  try { return { poll: normalizePoll(input), error: null }; }
  catch (error) { return { poll: null, error: failure(error.code || "VALIDATION_ERROR", 400, error.message) }; }
}

export async function votePoll(request, env, pollId) {
  const { session, failure: authFailure } = await requireSession(request, env);
  if (authFailure) return authFailure;
  const id = String(pollId || "").trim();
  if (!id) return failure("VALIDATION_ERROR", 400, "A poll id is required.");

  const post = await env.DB.prepare("SELECT id, author_id, deleted_at, poll_json FROM posts WHERE id = ?1 LIMIT 1").bind(id).first();
  if (!post || post.deleted_at || !post.poll_json) return failure("POLL_NOT_FOUND", 404, "Poll was not found.");
  if (post.author_id !== session.user_id) {
    const blocked = await env.DB.prepare("SELECT 1 FROM relationships WHERE relationship_type='block' AND ((source_user_id=?1 AND target_user_id=?2) OR (source_user_id=?2 AND target_user_id=?1)) LIMIT 1").bind(session.user_id, post.author_id).first();
    if (blocked) return failure("FORBIDDEN", 403, "This poll is not available.");
  }

  let body;
  try { body = await request.json(); } catch { return failure("INVALID_JSON", 400, "Request body must be valid JSON."); }
  const optionIndex = Number(body?.optionIndex);
  let poll;
  try { poll = normalizeStoredPoll(JSON.parse(post.poll_json)); } catch { return failure("POLL_INVALID", 500, "Poll data is invalid."); }
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) return failure("VALIDATION_ERROR", 400, "A valid poll option is required.");

  const existing = await env.DB.prepare("SELECT option_index FROM poll_votes WHERE poll_id=?1 AND user_id=?2 LIMIT 1").bind(id, session.user_id).first();
  if (existing) {
    const results = await getPollResults(env.DB, id, poll.options.length);
    const currentPoll = withPollResults(poll, results, Number(existing.option_index));
    await env.DB.prepare("UPDATE posts SET poll_json=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(JSON.stringify(currentPoll), id).run();
    return { response: { ok: true, alreadyVoted: true, pollId: id, optionIndex: Number(existing.option_index), poll: currentPoll }, error: null };
  }

  const insert = await env.DB.prepare("INSERT OR IGNORE INTO poll_votes (poll_id,user_id,option_index) VALUES (?1,?2,?3)").bind(id, session.user_id, optionIndex).run();
  if (!Number(insert?.meta?.changes || 0)) {
    const results = await getPollResults(env.DB, id, poll.options.length);
    const currentPoll = withPollResults(poll, results, optionIndex);
    return { response: { ok: true, alreadyVoted: true, pollId: id, optionIndex, poll: currentPoll }, error: null };
  }

  const results = await getPollResults(env.DB, id, poll.options.length);
  const nextPoll = withPollResults(poll, results, optionIndex);
  await env.DB.prepare("UPDATE posts SET poll_json=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(JSON.stringify(nextPoll), id).run();
  return { response: { ok: true, alreadyVoted: false, pollId: id, optionIndex, poll: nextPoll }, error: null };
}
