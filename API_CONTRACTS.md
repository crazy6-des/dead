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

## Posts and feed

The first server-backed social vertical is text publishing and feed retrieval.

### Create post

- `POST /api/posts`
- Requires an authenticated session.
- Mutation requests must originate from the configured frontend origin.
- Current backend release supports text-only posts.

Request shape:

```json
{
  "text": "Hello S",
  "kind": "text",
  "media": [],
  "audio": null,
  "background": null,
  "poll": null,
  "audience": "public",
  "replyPolicy": "everyone"
}
```

Successful response:

```json
{
  "post": {
    "id": "…",
    "author": {
      "id": "…",
      "username": "…",
      "displayName": "…"
    },
    "text": "Hello S",
    "kind": "text",
    "audience": "public",
    "replyPolicy": "everyone",
    "createdAt": "…",
    "updatedAt": "…",
    "stats": {
      "likes": 0,
      "reposts": 0,
      "replies": 0,
      "bookmarks": 0
    }
  },
  "status": "created"
}
```

### Feed

- `GET /api/feed?mode=For%20You&limit=20&cursor=…`
- Requires an authenticated session.
- Supported modes are `For You`, `Following`, and `Latest`.
- `limit` is bounded by the backend.
- Cursor pagination returns `nextCursor` when another page exists.
- Visibility is enforced server-side.

Response shape:

```json
{
  "items": [],
  "nextCursor": null
}
```

Unsupported post content returns `400` with `UNSUPPORTED_POST_CONTENT` until media, polls, and other publishing capabilities receive their own backend contracts.

## Social relationships

- `POST /api/social/relationships`
- Requires an authenticated session and the configured frontend origin.
- Supported relationships: `follow`, `block`, and `mute`.
- The target is identified by normalized username.
- `enabled: true` uses an idempotent insert; `enabled: false` removes the relationship.
- Self-relationships are rejected.

Request shape:

```json
{
  "username": "someone",
  "relationship": "follow",
  "enabled": true
}
```

Successful response:

```json
{
  "ok": true,
  "username": "someone",
  "relationship": "follow",
  "enabled": true
}
```

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
