# Backend implementation readiness

This checklist is the handoff boundary between the frontend and the Cloudflare Worker/D1/R2 implementation.

## Confirmed routes in source

- `GET /api/health`
- `GET /api/auth/session`
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `GET /api/profile/:username`
- `GET /api/feed`
- `POST /api/posts`
- `POST /api/social/relationships`
- `POST|DELETE /api/social/posts/:id/:action`

## Cloudflare bindings

- `DB`: D1 database
- `MEDIA_BUCKET`: R2 bucket
- `FRONTEND_ORIGIN`: exact Netlify origin
- Brevo configuration/secrets, if email flows are enabled

## R2 implementation requirements

1. Authenticate before accepting uploads.
2. Validate MIME type, byte size, and declared media category server-side.
3. Generate object keys server-side; never trust client-supplied storage paths.
4. Persist object metadata in D1 only after a successful R2 write.
5. Remove orphaned R2 objects when database persistence fails.
6. Enforce ownership before replacement or deletion.
7. Return stable media records containing an opaque ID, object key or delivery URL, type, size, and timestamps.

## Profile implementation requirements

- Frontend uses `profileService` as the API boundary.
- Backend owns username uniqueness and authorization.
- Avatar and cover values must eventually be produced by the R2 upload flow, not browser object URLs.
- Profile counts must be calculated from persisted relationships/posts, not hardcoded UI values.
- Privacy settings require persisted columns or a dedicated settings table and server-side enforcement.

## Verification gate

Do not mark the backend as production-ready until all of the following are run against a configured test environment:

- frontend lint
- frontend production build
- frontend contract tests
- backend tests
- D1 migration apply and rollback/recovery review
- authenticated profile read/update test
- unauthorized profile update test
- username conflict test
- R2 upload, ownership, size, MIME, and orphan-cleanup tests
- CORS and cookie/session smoke tests

No Cloudflare IDs, credentials, bucket URLs, or production claims belong in this document or source control.
