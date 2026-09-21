# Cloudflare Integration Audit

Status: pre-deployment audit; no Cloudflare resources are modified by this document.

## Verified repository findings

- Worker entrypoint: `backend/src/index.js`.
- Expected D1 binding: `DB`.
- Expected R2 binding: `MEDIA_BUCKET`.
- Brevo secret contract: `BREVO_API_KEY` must be configured outside Git history.
- Frontend origin configuration: `FRONTEND_ORIGIN`.
- Authentication uses database-backed users and hashed session tokens.
- The Worker currently exposes health, authentication, feed, post, social, and profile routes.

## Deployment blockers requiring correction

1. Two migration files use the same `0003` prefix:
   - `0003_profile_messaging_notifications.sql`
   - `0003_social_messaging_notifications.sql`
2. These migrations define overlapping tables and columns with incompatible details. They must not both be applied blindly.
3. A canonical migration sequence must be selected, reviewed, and tested against a clean SQLite/D1-compatible database before deployment.
4. Brevo password-reset tables and routes are not yet present in the current Worker route contract.
5. Production smoke tests must verify that failed writes do not mutate the feed and that authentication/session cookies work across the configured Netlify origin.

## Safe implementation order

1. Consolidate and renumber migrations without deleting existing history until the intended baseline is confirmed.
2. Add password-reset persistence and Brevo delivery using Worker secrets only.
3. Add Worker contract tests for authentication, authorization, persistence, CORS, and error behavior.
4. Validate Wrangler configuration using actual Cloudflare resource identifiers supplied through protected configuration.
5. Apply migrations to a non-production D1 database first.
6. Run smoke tests, then deploy through a protected GitHub Actions workflow.

## Explicit exclusions

- No invented Cloudflare IDs, tokens, domains, or Brevo credentials.
- No localStorage-based substitute for server persistence.
- No Earn/rewards implementation in this phase.
- No claim of production readiness until live Worker and D1/R2 behavior is verified.
