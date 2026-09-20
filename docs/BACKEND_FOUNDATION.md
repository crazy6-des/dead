# S backend foundation (design only)

This document defines the first persistent backend boundary without introducing mock persistence or coupling React to Cloudflare runtime APIs.

## Implementation rule

- The frontend must use service contracts and real API responses.
- No browser localStorage/sessionStorage is a substitute for server persistence.
- Development fixtures may exist only in explicitly development-scoped adapters.
- Database migrations must be executed against the real PostgreSQL environment, reviewed, and versioned; this document does not claim that any table has been created.

## Initial PostgreSQL entities

The first migration should establish these core entities:

1. `users` — identity and account lifecycle metadata.
2. `sessions` — hashed/rotatable session records with expiry and revocation.
3. `posts` — author, body, visibility, reply/quote relationships, timestamps, and deletion state.
4. `post_media` — ordered media references; stores R2 object keys and durable metadata, never R2 credentials.
5. `post_music` — optional uploaded or catalog-selected music metadata linked to a post.
6. `relationships` — directed user relationships with a constrained relationship type.
7. `post_reactions` — unique user/post reaction rows for likes and reposts.
8. `bookmarks` — unique user/post saves with optional folder linkage.
9. `notifications` — durable user notifications with read state and event references.
10. `conversations` and `conversation_members` — direct/group messaging membership.
11. `messages` — conversation messages with author, body, attachments, edit/delete timestamps.
12. `reports` — moderation reports with target type, target id, reason, status, and audit timestamps.

## Required integrity constraints

- Use UUID or equivalent non-sequential public identifiers.
- Foreign keys must use explicit delete behavior.
- Unique constraints must prevent duplicate relationships, reactions, bookmarks, and memberships.
- Store timestamps in UTC and index author/time, conversation/time, notification/user/time, and relationship source/target.
- Use soft deletion for user-generated content where auditability or moderation requires it.
- Never trust client-supplied author ids, counters, moderation status, or monetization state.

## API slices before implementation

The backend should be delivered in vertical slices, each with authentication, authorization, validation, pagination, error contracts, and tests:

- Authentication/session lifecycle
- Feed read + post publish
- Media upload reservation + completion
- Social relationships and reactions
- Bookmarks and folders
- Notifications
- Messaging
- Search and discovery
- Moderation/reporting
- Earn/ledger integration only after the core identity and event model is stable

## Current frontend gaps tracked

- Replace production-facing hardcoded feed, trend, and suggestion records with API-backed states.
- Add explicit loading, empty, error, and retry states to every data route.
- Connect publish, replies, reactions, reposts, follows, bookmarks, and profile edits to server mutations.
- Add online catalog music selection only after a documented catalog endpoint exists; retain local-file selection as an upload flow, not persistent browser storage.
- Add authorization-aware navigation and remove account-specific UI assumptions such as a fixed display name.

## Migration handoff

When database access is provided, create reviewed SQL migrations in a versioned migrations directory, apply them to a non-production environment first, run schema and API contract tests, and only then promote them. Credentials must be supplied through the deployment secret manager and must not be committed to GitHub.
