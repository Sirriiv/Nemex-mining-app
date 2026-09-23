# Environment Variables

All secrets are supplied via the environment (`.env` locally, host env in production). **Never hardcode keys in source or commit `.env` to git.**

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | server, frontend | Project URL; frontend receives it via `GET /app-config.js` |
| `SUPABASE_SERVICE_KEY` | server (admin, trade, treasury, finance) | Privileged service-role key — server only |
| `SUPABASE_ANON_KEY` | frontend via `/app-config.js` | Public anon key, safe to expose in browser |
| `ADMIN_SECRET_TOKEN` | `backend/admin-routes.js` | Bearer token for `/api/admin/*`; access fails closed when unset |
| `TONCENTER_API_KEY` | wallet/settlement routes | TON Center RPC key |
| `TON_CONSOLE_API_KEY` | wallet/treasury sync | TonAPI bearer token |
| `TREASURY_WALLET_ADDRESS` | settlement engine | Treasury master wallet (UQ/EQ, public) |
| `TREASURY_MNEMONIC_ENCRYPTED` | settlement engine | AES-256-GCM encrypted mnemonic (see `scripts/encrypt-treasury-mnemonic.js`) |
| `ENCRYPTION_KEY` | settlement engine | Decrypts `TREASURY_MNEMONIC_ENCRYPTED` (argon2id KDF) |
| `PORT` | server.js | Defaults to 3000 |
| `NODE_ENV` | server.js | `development` / `production` |

## How the frontend gets its credentials

`server.js` exposes `GET /app-config.js`, which serves:

```js
window.APP_CONFIG = { supabaseUrl: "...", supabaseAnonKey: "..." };
```

Pages load `<script src="/app-config.js"></script>` **before** the Supabase CDN/module scripts, then read `window.APP_CONFIG.supabaseUrl` / `window.APP_CONFIG.supabaseAnonKey`. No secrets live in HTML/JS source.

## Rotation checklist (if a key ever leaks)

1. Rotate the key at the provider (Supabase dashboard / tonconsole / toncenter).
2. Update the value in `.env` (local) and the hosting provider's env settings.
3. Restart/redeploy. There are no hardcoded fallbacks anymore — missing keys fail fast at startup.
