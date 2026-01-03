-- ===================================================
-- RESET PACKAGE LIMITS FOR TESTING
-- Run this in Supabase SQL Editor
-- ===================================================

-- Step 1: Reset all package purchase limits to original values
UPDATE package_types
SET purchase_limit = CASE package_amount
    WHEN 10000 THEN 10    -- 10,000 NMXp: 10 purchases per user
    WHEN 25000 THEN 8     -- 25,000 NMXp: 8 purchases per user  
    WHEN 50000 THEN 7     -- 50,000 NMXp: 7 purchases per user
    WHEN 100000 THEN 5    -- 100,000 NMXp: 5 purchases per user
    WHEN 250000 THEN 4    -- 250,000 NMXp: 4 purchases per user
    WHEN 500000 THEN 3    -- 500,000 NMXp: 3 purchases per user
    WHEN 1000000 THEN 2   -- 1,000,000 NMXp: 2 purchases per user
    ELSE 10               -- Default: 10 purchases per user
END
WHERE is_active = true;

-- Step 2: (OPTIONAL) Delete all test pending transactions if you want fresh start
-- UNCOMMENT THE LINES BELOW ONLY IF YOU WANT TO DELETE ALL PENDING PURCHASES
-- WARNING: This will delete ALL pending transactions for ALL users!
-- 
-- DELETE FROM pending_transactions 
-- WHERE status = 'pending';

-- Step 3: Show updated package configuration
SELECT 
    id,
    package_name,
    package_amount,
    price_usd,
    purchase_limit,
    is_active,
    created_at
FROM package_types
ORDER BY package_amount;

-- Step 4: Show current purchase counts per user (for verification)
SELECT 
    user_id,
    package_amount,
    status,
    COUNT(*) as purchase_count
FROM pending_transactions
GROUP BY user_id, package_amount, status
ORDER BY user_id, package_amount;
