# S backend foundation

This document defines the first persistent backend boundary for the Cloudflare Worker + D1 + R2 architecture without introducing mock persistence or coupling React to Cloudflare runtime APIs.

## Implementation rules

- The frontend uses service contracts and real API responses.
- No browser localStorage/sessionStorage substitutes for server persistence.
- Development fixtures are limited to explicitly development-scoped adapters.
- D1 migrations must be reviewed, applied to a non-production database first, tested, and then promoted.
- Credentials and API keys must be supplied through Cloudflare/GitHub secret management and never committed.

## Initial D1 entities

1. `users` — identity and account lifecycle metadata.
2. `sessions` — hashed/rotatable session records with expiry and revocation.
3. `posts` — author, body, visibility, reply/quote relationships, timestamps, and deletion state.
4. `post_media` — ordered R2 object references and durable metadata; never credentials.
5. `relationships` — directed follow/block/mute relationships.
6. `post_reactions` — unique user/post reaction rows for likes and reposts.
7. `bookmarks` — unique user/post saves.
8. `notifications` — durable user notifications with read state.
9. Messaging tables — conversations, members, and messages.
10. `reports` — moderation reports and audit timestamps.

## Worker slices

Deliver vertical slices in this order:

1. Health, CORS, stable error envelope, and request validation.
2. Authentication/session lifecycle.
3. Feed read and post publishing.
4. R2 upload reservation and completion.
5. Relationships, reactions, and bookmarks.
6. Notifications and messaging.
7. Search, moderation, and discovery.
8. Earn/ledger integration only after identity and event integrity are stable.

Every slice requires authentication/authorization where applicable, validation, pagination for collections, stable error codes, and contract tests.

## Current status

- Worker scaffold exists at `backend/src/index.js`.
- Health routes are available at `/health` and `/api/health`.
- Health routes enforce GET and return a stable JSON error for unsupported methods.
- CORS is restricted to the configured `FRONTEND_ORIGIN` value.
- D1 schema preparation exists at `backend/migrations/0001_initial.sql` and has not been claimed as applied.
- No production credentials or bindings are stored in the repository.

## Next implementation gate

Before adding authenticated or persistent routes, verify a non-production D1 binding, R2 binding, frontend origin, and secret configuration through the deployment environment. Then add Worker contract tests and wire one vertical slice end to end.
