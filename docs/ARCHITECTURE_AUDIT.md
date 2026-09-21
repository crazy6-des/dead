# S Architecture Audit Baseline

## Product boundary

S is a Twitter-like social product first. **Earn is a separate, intentionally empty extension point**, not a second product surface yet.

## Navigation contract

- Header: Notifications, Profile, Search.
- Primary: Home, Discover, Messages, Earn.
- Create: contextual action, not a route.
- Secondary: Spaces, Saved, Lists, Settings.
- Earn must remain isolated from core social state, feed actions, and navigation behavior.

## Audit classification

Every feature should be classified before modification:

1. **Working** — real state transition or API path verified.
2. **Design-only** — visible UI with no durable behavior behind it.
3. **Wired path** — route/handler/service exists but needs runtime verification.
4. **Mismatched** — UI, route, contract, API, or persistence disagree.
5. **Blocked/placeholder** — intentionally deferred, including Earn integrations.

## Safety rules for the next audit

- Do not rewrite working social actions, postbacks, auth, feed loading, or routing without a failing test or concrete mismatch.
- Verify frontend route -> handler -> service -> backend/API -> persistence before calling a feature functional.
- Keep demo data clearly separated from API-backed data; never present demo behavior as production persistence.
- Keep Earn behind its own feature boundary so offerwalls, payouts, tracking, and provider callbacks can be added later without coupling them to social actions.
- Make changes in small, reviewable commits and run contract checks, lint, build, and integration tests after each behavior change.

## Immediate next audit order

1. Inventory all routes and classify their rendered state.
2. Trace social actions: like, save, repost, follow, create, messages, notifications.
3. Trace auth and API configuration behavior in both configured and unconfigured environments.
4. Verify navigation configuration is consumed consistently on desktop and mobile.
5. Inspect Earn only for route stability and extension boundaries; do not add offers or monetization behavior yet.
6. Record mismatches with evidence before fixing them.
