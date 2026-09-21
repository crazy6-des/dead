# Cloudflare Handoff Contract

## Purpose

This document defines the frontend/backend boundary before any Cloudflare resources or credentials are supplied. It does not create a backend, mock one, or claim deployment readiness.

## Required API boundary

- Frontend transport must use the existing API client boundary.
- Publishing must accept only a server-created post containing a valid `id` and `kind`.
- Failed requests must not mutate the feed or display a success message.
- Media references must be server-acceptable; local-only object URLs and unuploaded files must be rejected.
- Authentication state must come from the session/auth service, not hardcoded identity values.
- Demo fixtures must remain explicitly development-only and must never be treated as persisted user data.

## Cloudflare implementation inputs still required

- Worker/API base URL
- Authentication/session design
- D1 schema and binding names
- R2 bucket and upload policy, if media is enabled
- CORS and allowed-origin policy
- Environment variable names and deployment configuration

Until these inputs are provided, the application must fail clearly at the service boundary rather than simulate successful backend behavior.
