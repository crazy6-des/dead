# Engineering Next Step: Publishing Truthfulness

## Objective
Ensure S never presents a locally fabricated object as a successfully published server post.

## Verified finding
`src/App.jsx` contains a publish fallback that creates a local post when the callback receives a value without a valid `kind`.

## Required change
- Accept only a server-created post response with a valid `id` and `kind`.
- Remove the `Date.now()`/hardcoded David fallback.
- Keep demo seed content clearly separate from real publishing.
- Preserve the existing create integration validation.

## Verification requirements
- Re-fetch the changed file from GitHub.
- Run lint and the complete verification suite in CI.
- Confirm that failed publishing does not update the feed or show a success message.

## Scope guardrails
Do not add a fake backend, local persistence, invented Cloudflare configuration, or unverified deployment behavior.
