# S backend

Cloudflare Worker backend boundary for S.

## Status

This directory is a preparation scaffold. It is not deployed and does not claim that any Cloudflare binding is configured.

## Planned bindings

- `DB`: D1 database binding (`sss`)
- `MEDIA_BUCKET`: R2 bucket binding (`sss`)
- `BREVO_API_KEY`: Worker secret, never committed
- `BREVO_SENDER_EMAIL`: non-secret configuration
- `BREVO_SENDER_NAME`: non-secret configuration

## Local workflow

1. Install Wrangler locally.
2. Configure bindings in `wrangler.toml` using your actual Cloudflare resource IDs.
3. Apply reviewed D1 migrations to a non-production database first.
4. Run Worker contract tests.
5. Deploy only after the bindings and secrets are verified.

No credentials belong in this directory or in Git history.
