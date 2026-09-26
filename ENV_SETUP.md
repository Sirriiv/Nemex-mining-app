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
| `TREASURY_WALLET_ADDRESS` | treasury sync, settlement engine, finance routes | Treasury master wallet (UQ/EQ, public). Required — missing it disables treasury sync and settlement |
| `NMX_JETTON_MASTER` | treasury sync, settlement engine | NMX jetton master address; public token config. Optional — defaults to the deployed NMX master |
| `TREASURY_MNEMONIC_ENCRYPTED` | settlement engine | AES-256-GCM encrypted mnemonic (see `scripts/encrypt-treasury-mnemonic.js`) |
| `ENCRYPTION_KEY` | settlement engine | Decrypts `TREASURY_MNEMONIC_ENCRYPTED` (argon2id KDF) |
| `APP_ENCRYPTION_KEY` | wallet-routes (email password reset) | Server-side key encrypting the recovery envelope. Generate with `openssl rand -base64 48` (min 32 chars). **Required for email recovery** — without it, users fall back to the 24-word phrase |
| `BREVO_API_KEY` | wallet-routes (reset OTP + notifications) | **Required for email recovery.** Brevo → Settings → SMTP & API → API tab → Generate a new API key (`xkeysib-...`) |
| `BREVO_FROM_EMAIL` | wallet-routes (reset OTP + notifications) | **Required.** Sender address; must be verified in Brevo (Senders, or authenticate your domain) or Brevo rejects the send |
| `BREVO_FROM_NAME` | wallet-routes (reset OTP + notifications) | Optional sender name shown in the inbox. Defaults to `NemexCoin` |
| `RESEND_API_KEY` | wallet-routes (email password reset) | Optional legacy fallback: sends the "password changed" notification via Resend when Brevo is not configured |
| `RESEND_FROM_EMAIL` | wallet-routes (email password reset) | Optional: custom "From" address for the Resend fallback (requires a verified Resend domain). Defaults to `onboarding@resend.dev` |

## How email password reset works

The 6-digit code is generated and verified by **our own backend** and delivered by **Brevo** - Supabase Auth is not involved in the reset step at all:

1. `POST /api/wallet/recover-password-otp` - backend looks up `profiles.email`, generates a 6-digit code with `crypto.randomInt`, stores only its SHA-256 hash (peppered with `APP_ENCRYPTION_KEY`) in `password_reset_codes` with a 10 minute expiry, and emails it through the Brevo API. The response is identical whether or not the email is registered, so the endpoint cannot be used to discover accounts.
2. `POST /api/wallet/recover-password-verify` - compares the submitted code against the stored hash in constant time, burns the code on success, and returns a 15 minute HMAC-signed reset token.
3. `POST /api/wallet/recover-password-email` - verifies that token, decrypts the recovery envelope with `APP_ENCRYPTION_KEY`, re-wraps the mnemonic with the new password, and kills all wallet sessions.

**Setup:** create `password_reset_codes` by running `database/create_password_reset_codes_table.sql` in the Supabase SQL editor, then set `BREVO_API_KEY` and `BREVO_FROM_EMAIL` on Render. Without them the UI falls back to the 24-word recovery phrase.
| `PORT` | server.js | Defaults to 3000 |
| `NODE_ENV` | server.js | `development` / `production` |

## How the frontend gets its credentials

`server.js` exposes `GET /app-config.js`, which serves:

```js
window.APP_CONFIG = { supabaseUrl: "...", supabaseAnonKey: "..." };
```

Pages load `<script src="/app-config.js"></script>` **before** the Supabase CDN/module scripts, then read `window.APP_CONFIG.supabaseUrl` / `window.APP_CONFIG.supabaseAnonKey`. No secrets live in HTML/JS source.

### Treasury page wiring

The Treasury page (`frontend/treasury.html`) reads the treasury address dynamically from `GET /api/treasury/sync-config` (`treasuryTonWallet`), which is sourced from `TREASURY_WALLET_ADDRESS` — nothing is hardcoded in the HTML.

On server boot, `backend/treasury-sync.js` auto-seeds missing `treasury_wallets` rows (TON + NMX) using the configured address, so balances sync into the DB even on a fresh `create_treasury_tables.sql` database (the schema ships with an empty `treasury_wallets` table — that was the root cause of the Treasury page showing wallets as disconnected).

## Rotation checklist (if a key ever leaks)

1. Rotate the key at the provider (Supabase dashboard / tonconsole / toncenter).
2. Update the value in `.env` (local) and the hosting provider's env settings.
3. Restart/redeploy. There are no hardcoded fallbacks anymore — missing keys fail fast at startup.
