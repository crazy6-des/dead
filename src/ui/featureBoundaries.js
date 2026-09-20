/**
 * S feature boundaries.
 *
 * These contracts keep the current prototype surfaces aligned while the
 * application is gradually extracted from App.jsx. They are intentionally
 * framework-agnostic so the future API layer can reuse the same vocabulary.
 */
export const featureBoundaries = Object.freeze({
  home: ["feed", "composer", "post-actions"],
  discover: ["search", "trends", "people", "music"],
  profile: ["identity", "posts", "replies", "media", "likes"],
  inbox: ["notifications", "messages"],
  account: ["settings", "privacy", "security"],
  monetization: ["earn", "wallet", "ledger"],
});

export const interactionStates = Object.freeze([
  "idle",
  "loading",
  "success",
  "error",
  "empty",
]);

export const contentKinds = Object.freeze([
  "text",
  "image",
  "music",
  "background",
]);

export function isSupportedContentKind(kind) {
  return contentKinds.includes(kind);
}
