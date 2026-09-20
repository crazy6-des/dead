import fs from "node:fs";

const checks = [
  ["src/services/apiClient.js", ["export class ApiError", "credentials: \"include\"", "apiRequest"]],
  ["src/services/authService.js", ["getSession", "signIn", "signUp", "signOut"]],
  ["src/services/feedService.js", ["createDevFeedAdapter", "createApiFeedAdapter", "createFeedAdapter"]],
  ["src/services/postService.js", ["createPostRequest", "createApiPostAdapter", "createDevPostAdapter"]],
  ["src/features/auth/authContract.js", ["AUTH_MODES", "AUTH_STATUSES", "createAuthRequest"]],
  ["src/features/auth/authState.js", ["useAuthState", "refreshSession", "signIn", "signOut"]],
  ["src/features/feed/feedContract.js", ["FEED_MODES", "FEED_PAGE_SIZE", "createFeedRequest", "createFeedPage"]],
];

for (const [file, markers] of checks) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      throw new Error(`Verification failed: ${file} is missing ${marker}`);
    }
  }
  console.log(`PASS ${file}`);
}

console.log("Service boundary verification completed.");
