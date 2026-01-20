# RLS SETUP INSTRUCTIONS - SAFE DEPLOYMENT

## ⚠️ IMPORTANT: Read Before Running

Your backend uses **SERVICE ROLE KEY** which bypasses RLS automatically. Only your frontend (anon key) will be restricted by these policies.

## 📋 STEP-BY-STEP PROCESS

### Step 1: Backup Current State
```sql
-- Save current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Step 2: Run Main RLS Script
Run the file: `comprehensive_rls_policies.sql`

This will:
- Enable RLS on all 25 tables
- Create policies so users can only access their own data
- Allow public read for: settings, token_prices, vip_benefits
- Block direct access to admin_settings and rejection_reasons

### Step 3: Verify Setup
```sql
-- Check all tables have RLS enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Step 4: Test Website
1. Open your website
2. Login as a regular user
3. Check if dashboard loads
4. Try mining, wallet, transactions
5. Check if users can only see their own data

### Step 5: If Website Hangs
**IMMEDIATELY RUN:** `disable_rls_emergency.sql`

This will disable RLS on all tables and restore normal access.

## 🔑 How RLS Works

### Backend (Server)
- Uses **SERVICE ROLE KEY** from environment variables
- Bypasses ALL RLS policies automatically
- Full database access for admin operations

### Frontend (Browser)
- Uses **ANON KEY** from supabase-config.js
- Subject to RLS policies
- Can only access own data through policies

## 📊 Policy Summary

| Table | Access Rule |
|-------|------------|
| profiles | Own profile only |
| referral_network | Own referrals + referrer |
| pending_transactions | Own transactions only |
| admin_settings | **Backend only** |
| approved_transactions | Own transactions only |
| balance_history | Own history only |
| chain_transactions | Own transactions only |
| conversions | Own conversions only |
| mining_sessions | Own sessions only |
| nmx_daily_limits | Own limits only |
| nmx_trades | Own trades only |
| notifications | Own notifications (CRUD) |
| pending_payments | Own payments only |
| rejection_reasons | **Backend only** |
| settings | **Public read** |
| token_prices | **Public read** |
| transactions | Own transactions only |
| user_purchase_history | Own history only |
| user_sessions | Own sessions (CRUD) |
| user_tasks | Own tasks only |
| user_wallets | Own wallets only |
| vip_benefits | **Public read** |
| vip_customers | Own VIP status only |
| wallet_sessions | Own sessions (CRUD) |
| wallet_transactions | Own transactions only |

## 🛡️ Why Your Backend Won't Break

Your backend uses service role in these places:

**server.js:**
```javascript
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Middleware:**
```javascript
req.supabase = supabase; // This bypasses RLS
```

Service role = Full access, no RLS restrictions.

## ⚠️ Common Issues & Solutions

### Issue: "Cannot access table"
**Solution:** Make sure your backend uses SERVICE_ROLE_KEY, not ANON_KEY

### Issue: Website hangs on load
**Solution:** Run `disable_rls_emergency.sql` immediately

### Issue: Users can see other users' data
**Solution:** Check if auth.user_id() returns correct value:
```sql
SELECT auth.user_id();
```

### Issue: Backend API errors
**Solution:** Verify environment variable:
```bash
echo $SUPABASE_SERVICE_ROLE_KEY
```

## 🧪 Testing Individual Policies

To test one table at a time:

```sql
-- Enable RLS on one table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "test_policy" ON profiles
  FOR SELECT USING (id = auth.user_id());

-- Test website
-- If it works, move to next table
-- If it breaks, disable and investigate:

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

## 📝 Notes

1. **Service Role Key:** Never expose this in frontend code
2. **Anon Key:** Safe to use in frontend (public)
3. **auth.user_id():** Returns UUID from JWT token
4. **Backend Queries:** Always use req.supabase (has service role)
5. **Frontend Queries:** Uses anon key from supabase-config.js

## 🚀 Ready to Deploy?

1. ✅ Backup database
2. ✅ Run `comprehensive_rls_policies.sql`
3. ✅ Test website thoroughly
4. ✅ Keep `disable_rls_emergency.sql` ready
5. ✅ Monitor for any errors

If something goes wrong, you can always disable RLS and investigate.
