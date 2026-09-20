# S foundation hardening

This phase preserves the existing UI and local behavior while introducing stable boundaries for the production build.

## Rules

- `src/data/devData.js` is development-only fixture data.
- `src/domain/models.js` is the shared vocabulary for users, posts, media, audio, notifications, messaging, and creation drafts.
- `src/services/` owns behavior that will later call the authenticated Workers API.
- UI components must not become the long-term source of truth for database contracts.
- No credentials, provider keys, or private URLs belong in the frontend.

## Next extraction order

1. Move visual primitives into `src/components/`.
2. Move Home/feed surfaces into `src/features/feed/`.
3. Move Create into `src/features/create/` and adopt `CreateDraft`.
4. Move notifications and messages into their feature folders.
5. Add route definitions without changing the current visual routes.
6. Add loading, empty, error, and optimistic mutation states.
7. Add TypeScript incrementally after the boundaries stabilize.
8. Replace the development adapters with the Cloudflare API only after the local preview remains behaviorally equivalent.
