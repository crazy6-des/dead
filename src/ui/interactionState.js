/**
 * Shared interaction-state helpers for S surfaces.
 * Keeps loading, error, empty and success handling consistent while the API layer
 * is introduced incrementally.
 */

export const INITIAL_INTERACTION_STATE = Object.freeze({
  status: "idle",
  error: null,
});

export function createInteractionState(status = "idle", error = null) {
  return { status, error };
}

export function isInteractionBusy(state) {
  return state?.status === "loading";
}

export function hasInteractionError(state) {
  return state?.status === "error";
}

export function getInteractionMessage(state, fallback = "Something went wrong.") {
  if (!hasInteractionError(state)) return null;
  return state.error || fallback;
}
