# S — Serverless architecture

S is a serious social platform designed around a decoupled serverless stack.

## Deployment topology

- **Frontend:** Netlify
- **Backend/API:** Cloudflare Workers
- **Database:** PostgreSQL accessed from Workers through Hyperdrive
- **Object storage:** Cloudflare R2
- **Realtime:** Durable Objects / WebSockets where stateful realtime behavior is required
- **Async jobs:** Cloudflare Queues
- **Communications:** Brevo
- **Frontend ↔ backend:** HTTPS API with environment-driven `VITE_API_BASE_URL`

The frontend must never depend on Cloudflare-specific runtime APIs. It communicates through service boundaries in `src/services/`.

## Rules

1. Keep production credentials and secrets out of the frontend.
2. Keep API paths/contracts explicit and versionable.
3. Use development adapters only when no API base URL is configured.
4. Do not put database access in React components.
5. Keep upload/storage logic behind media services; browser clients receive signed upload targets rather than storage credentials.
6. Design realtime features around explicit event contracts rather than UI state assumptions.
7. Keep Netlify deployment independent from Cloudflare deployment.

## Planned backend domains

`/api/auth`, `/api/feed`, `/api/posts`, `/api/users`, `/api/social`, `/api/search`, `/api/messages`, `/api/notifications`, `/api/moderation`, `/api/bookmarks`, `/api/lists`, `/api/polls`, `/api/spaces`, `/api/media`, and `/api/earn`.

The frontend should continue to build and function in development without the Cloudflare backend being connected.
