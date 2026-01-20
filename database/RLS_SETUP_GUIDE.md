# RLS Policy Setup Guide

## ⚠️ IMPORTANT: Read Before Running

Your backend uses the **service_role** key which **BYPASSES RLS automatically**. This means:
- Your backend API will continue working normally
- RLS only affects direct database access and frontend queries
- Your website should NOT hang if you follow these steps

## Why Your Website Hung Last Time

Most likely because you:
1. Enabled RLS without creating policies first
2. This blocked ALL access to tables (even for authenticated users)
3. Frontend queries failed, causing the website to hang

## Safe Installation Steps

### Step 1: Backup First
```sql
-- No actual backup needed, just know you can disable RLS anytime
-- using disable_rls_emergency.sql
```

### Step 2: Test One Table First
```sql
-- Test with a non-critical table first
ALTER TABLE token_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view token prices"
ON token_prices FOR SELECT
USING (true);

-- Test your website - if it works, proceed
```

### Step 3: Run Full Setup
In Supabase SQL Editor, run:
```sql
-- Copy and paste contents of setup_rls_policies.sql
```

### Step 4: Verify
Check that RLS is enabled:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
```

Check policies created:
```sql
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 5: Test Your Website
1. Open your website
2. Test login/registration
3. Test wallet connection
4. Test trading modal
5. Test admin panel
6. Check browser console for errors

## If Something Goes Wrong

### Emergency Disable
Run `disable_rls_emergency.sql` to disable RLS on all tables:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- etc...
```

### Gradual Re-enable
Enable RLS table by table to identify the problem:
```sql
-- Start with public tables
ALTER TABLE token_prices ENABLE ROW LEVEL SECURITY;
-- Test website

ALTER TABLE vip_benefits ENABLE ROW LEVEL SECURITY;
-- Test website

-- Then user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Test website
```

## Policy Explanation

### User Data Tables (Most Tables)
```sql
CREATE POLICY "Users can view own data"
ON table_name FOR SELECT
USING (auth.uid()::text = user_id);
```
- Users can only see rows where `user_id` matches their auth ID
- Backend bypasses this with service_role key

### Public Tables
```sql
CREATE POLICY "Anyone can view"
ON table_name FOR SELECT
USING (true);
```
- Anyone can read (token_prices, vip_benefits, rejection_reasons)
- Good for data that needs to be publicly accessible

### Admin Tables
```sql
-- No policies created
```
- RLS enabled but no user policies
- Only accessible via service_role (your backend)
- Complete protection from direct access

## Key Points

1. **Backend is Safe**: Your server.js uses service_role which bypasses RLS
2. **Frontend Protected**: Direct Supabase queries from frontend are restricted
3. **No Data Loss**: RLS only affects access, not data storage
4. **Reversible**: Can disable RLS anytime without losing data
5. **Gradual**: Enable table by table if concerned

## Verification Checklist

After running setup_rls_policies.sql:

- [ ] All 25 tables have RLS enabled
- [ ] Public tables (3) allow anonymous read
- [ ] User tables (20+) restrict to user_id
- [ ] Admin tables (1) have no user policies
- [ ] Backend API still works
- [ ] Frontend loads correctly
- [ ] Login/registration works
- [ ] Wallet operations work
- [ ] Trading works
- [ ] Admin panel works

## Common Issues

### Issue: "permission denied for table"
**Cause**: No policy allows the operation
**Fix**: Check if policy exists for that operation (SELECT/INSERT/UPDATE/DELETE)

### Issue: Website hangs on load
**Cause**: Frontend query blocked by RLS
**Fix**: Run disable_rls_emergency.sql, identify failing query

### Issue: "new row violates row-level security policy"
**Cause**: INSERT/UPDATE policy WITH CHECK fails
**Fix**: Ensure user_id in new row matches auth.uid()

## Testing Queries

Test if you can access your own data:
```sql
-- Should return your profile
SELECT * FROM profiles WHERE user_id = auth.uid()::text;

-- Should return your trades
SELECT * FROM nmx_trades WHERE user_id = auth.uid()::text;

-- Should return token prices (public)
SELECT * FROM token_prices;
```

## Support

If you encounter issues:
1. Check browser console for specific errors
2. Check Supabase logs for denied queries
3. Run disable_rls_emergency.sql to restore access
4. Enable RLS table by table to isolate the problem
