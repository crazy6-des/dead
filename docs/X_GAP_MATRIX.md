# S → X Capability Gap Matrix

This document keeps the product scope honest while the frontend is completed before production backend implementation.

## Product rule

S must not simulate durable social behavior. Any feature that is not backed by an API must be visibly marked as unavailable, local draft-only, or coming soon. Browser state may support temporary interaction previews, but it must never be presented as saved server state.

## Capability gaps

| Capability | Current S state | Required production boundary | Priority |
|---|---|---|---|
| Authentication | Session service and lifecycle foundation | Cloudflare API session, sign-in, sign-up, sign-out, password recovery | P0 |
| Home timeline | Frontend feed shell with local development records | Authenticated, cursor-paginated feed from API; For You/Following/Latest query contracts | P0 |
| Publishing | Composer and validation foundation | Idempotent post creation; media upload completion; server-owned timestamps and identity | P0 |
| Media | Local picker and upload-ready contract | Signed R2 upload flow, ownership checks, image/video/audio processing | P0 |
| Music | Local audio plus catalog asset contract | Explicit catalog search/select endpoint; licensed URL and metadata validation | P1 |
| Reactions | UI state and service boundaries | Durable like, repost, bookmark and undo endpoints with authorization | P0 |
| Follow graph | Optimistic UI and service contract | Durable relationship endpoints, counts, pagination and rollback-safe responses | P0 |
| Replies and threads | Detail UI foundation; draft-only reply behavior | Server-created replies, thread pagination, reply permissions and conversation context | P0 |
| Profiles | Route shell | Server profile data, profile editing, avatar/banner uploads, counts and privacy rules | P0 |
| Search | Route and overlay foundation | Auth-aware search endpoint for people, posts, topics and media; pagination and rate limits | P1 |
| Notifications | Route shell | Durable event records, read/unread state, filtering and realtime delivery | P1 |
| Direct messages | Route shell | Conversation/member/message tables, authorization, pagination and realtime events | P1 |
| Spaces/live audio | Route shell | Durable room metadata plus Durable Object coordination and moderation controls | P2 |
| Lists/bookmark folders | Route shells | Server-owned collections, membership and bookmark-folder persistence | P1 |
| Communities | Not yet implemented as a real capability | Community membership, roles, moderation and scoped timelines | P2 |
| Trust and safety | UI-level foundations only | Reports, blocks, mutes, rate limits, moderation audit trail and abuse controls | P0 |
| Monetization/Earn | Explicitly inactive | Verified creator eligibility, ledger, payout provider and immutable transaction records | P2 |

## Delivery sequence

1. Remove production-facing fabricated fallback data and label development fixtures explicitly.
2. Finish truthful loading, empty, error and unauthenticated states for every existing route.
3. Standardize API service contracts for feed, posts, relationships, reactions, profiles and search.
4. Define PostgreSQL migrations and authorization invariants before implementing Worker handlers.
5. Implement authentication and the feed as the first end-to-end vertical slice.
6. Add publishing plus signed R2 media uploads, then reactions and follow relationships.
7. Add replies, profiles, search, notifications and messaging in separate tested slices.
8. Add realtime, communities, Spaces and monetization only after their security and persistence contracts are defined.

## Non-negotiable backend invariants

- The client never supplies authoritative user identity, ownership, counts or timestamps.
- Every mutation checks authentication, authorization and resource ownership server-side.
- Cursor pagination is stable and uses an indexed ordering.
- Mutations support idempotency where retries can create duplicates or financial effects.
- Deletes, moderation actions and financial ledger entries are auditable.
- Secrets, database credentials, R2 credentials and provider tokens remain in Cloudflare secret storage.
- Tests must cover unauthorized access, cross-user access, duplicate retries, malformed payloads and empty results.

## Definition of frontend readiness

A route is ready for backend integration only when it has:

- no fabricated production data;
- explicit loading, empty and error states;
- a service boundary rather than direct network calls in components;
- stable request/response shapes documented in `API_CONTRACTS.md`;
- tests for normalization and failure behavior;
- no enabled control that silently pretends to persist data.
