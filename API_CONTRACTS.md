# S API contract conventions

## Transport

The Netlify frontend talks to the Cloudflare Worker API over HTTPS.

- JSON for normal request/response bodies.
- `credentials: include` for cookie-based sessions.
- API errors expose a stable `code`, HTTP `status`, human-readable `message`, and optional `details`.
- Cursor pagination uses `cursor` and `nextCursor`.
- Mutations should be safe to retry where practical and should eventually support idempotency keys for publishing, payments, and other non-trivial writes.
- CORS must allow only the configured Netlify frontend origin; credentials are enabled only for that origin.

## Baseline health contract

- `GET /health`
- `GET /api/health`

Successful response:

```json
{ "ok": true, "service": "sss-api", "version": "0.1.0" }
```

Unsupported methods return `405` with the standard error envelope. Unknown routes return `404`.

## Authentication

Session endpoints are owned by the Cloudflare API:

- `GET /api/auth/session`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-out`

The frontend must treat authentication as server state.

## Storage

Media uploads use a two-step API contract:

1. frontend requests an upload target from `/api/media/uploads`;
2. browser uploads directly to the signed target;
3. frontend sends the resulting media identifier when publishing.

Cloudflare R2 credentials must never be shipped to Netlify.

## Realtime

Messages, live Spaces, and notification events should use explicit realtime contracts. Durable Objects are the planned stateful coordination layer; React consumes events through a service rather than importing Cloudflare runtime APIs.

## Backend portability

React components must import service modules, never Worker bindings, database clients, R2 SDKs, Durable Object stubs, or Cloudflare environment objects.
