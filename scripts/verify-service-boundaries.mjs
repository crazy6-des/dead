import fs from "node:fs";

const checks = [
  ["src/services/apiClient.js", ["export class ApiError", "credentials: \"include\"", "REQUEST_TIMEOUT", "REQUEST_ABORTED", "apiRequest"]],
  ["src/services/authService.js", ["getSession", "signIn", "signUp", "signOut", "requestPasswordReset", "resetPassword"]],
  ["src/services/feedService.js", ["createDevFeedAdapter", "createApiFeedAdapter", "createFeedAdapter"]],
  ["src/services/postService.js", ["createPostRequest", "createApiPostAdapter", "createDevPostAdapter", "createPostAdapter"]],
  ["src/services/index.js", ["apiClient", "authService", "createFeedAdapter", "createPostAdapter"]],
  ["src/features/auth/authContract.js", ["AUTH_MODES", "AUTH_STATUSES", "createAuthRequest"]],
  ["src/features/auth/authState.js", ["useAuthState", "refreshSession", "signIn", "signOut"]],
  ["src/features/feed/feedContract.js", ["FEED_MODES", "FEED_PAGE_SIZE", "createFeedRequest", "createFeedPage"]],
  ["src/features/create/postContract.js", ["POST_KINDS", "POST_AUDIENCES", "REPLY_POLICIES", "createPublishPayload"]],
  ["src/features/create/postValidation.js", ["validatePostDraft", "MAX_TEXT_LENGTH"]],
  ["src/features/create/createIntegration.js", ["createPostAdapter", "adapter.publish"]],
];

for (const [file, markers] of checks) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`Verification failed: ${file} is missing ${marker}`);
  }
  console.log(`PASS ${file}`);
}

const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
if (!appSource.includes("function Create({publish,close})")) {
  throw new Error("Verification failed: legacy Create component was not found in App.jsx");
}
if (appSource.includes("CreateModalAdapter")) {
  throw new Error("Verification failed: App.jsx already references CreateModalAdapter; review integration state manually.");
}
console.log("PASS App.jsx remains on the legacy Create path; no integration was applied.");
console.log("Service boundary verification completed.");
