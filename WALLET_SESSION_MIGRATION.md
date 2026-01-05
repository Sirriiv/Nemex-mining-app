# Wallet Session Persistence - Migration Instructions

## Overview
This update adds persistent wallet sessions so users stay logged in after refreshing the page.

## What's New
- **Session Table**: New `wallet_sessions` table stores active sessions
- **Session Endpoints**: `/session/create`, `/session/check`, `/session/delete`
- **Lock Wallet Button**: Added to settings for manually locking wallet
- **Auto-restore**: Wallet automatically unlocks on page refresh if valid session exists

## Database Migration

You need to run the SQL migration to create the `wallet_sessions` table.

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `database/create_wallet_sessions_table.sql`
5. Click "Run" to execute

### Option 2: Supabase CLI
```bash
# If you have supabase CLI installed
supabase db push

# Or run the migration file directly
psql <your-database-connection-string> -f database/create_wallet_sessions_table.sql
```

## Testing the Feature

1. **Deploy the changes** to your server
2. **Run the SQL migration** (see above)
3. **Test the flow**:
   - Login to your mining account
   - Create or unlock your wallet with password
   - Refresh the page → Should stay logged in ✅
   - Close tab and reopen → Should stay logged in ✅
   - Click "Lock Wallet" in settings → Should require password ✅
   - Wait 7 days → Session expires, requires password ✅

## How It Works

### On Login:
1. User enters wallet password
2. Backend validates password
3. Backend creates session token and stores in database
4. Frontend stores token in `localStorage`

### On Page Load:
1. Frontend checks `localStorage` for session token
2. Sends token to backend `/session/check`
3. Backend validates token and expiry from database
4. If valid: wallet unlocks automatically
5. If invalid/expired: shows password prompt

### On Lock/Logout:
1. User clicks "Lock Wallet" in settings
2. Session deleted from database
3. localStorage cleared
4. Page reloads to welcome screen

## Session Details

- **Duration**: 7 days
- **Storage**: Supabase `wallet_sessions` table
- **Token**: 32-byte random hex string
- **Auto-cleanup**: Expired sessions checked on each validation

## Security Features

- Session tokens are cryptographically random (32 bytes)
- Tokens expire after 7 days
- Sessions validated against database on every page load
- Manual lock option available in settings
- No wallet password stored (only session token)

## Troubleshooting

### Session not persisting:
- Check browser localStorage (should have `nemex_wallet_session`)
- Check database `wallet_sessions` table exists
- Check browser console for errors
- Verify backend endpoints are accessible

### Session expires immediately:
- Check system clock (server vs client time)
- Check database timezone settings
- Verify `expires_at` column is set correctly (7 days future)

### Can't create session:
- Verify Supabase credentials in `.env`
- Check `wallet_sessions` table exists
- Check RLS policies allow service role access
- Check backend logs for errors

## Files Modified

- `backend/wallet-routes.js`: Added session endpoints
- `frontend/assets/js/wallet.js`: Updated logout endpoint
- `frontend/wallet.html`: Added lock wallet button and function
- `database/create_wallet_sessions_table.sql`: New migration file

## Reverting

If you need to revert this feature:

```sql
DROP TABLE IF EXISTS wallet_sessions CASCADE;
```

Then remove the localStorage item on frontend:
```javascript
localStorage.removeItem('nemex_wallet_session');
```
