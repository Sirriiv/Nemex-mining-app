-- ===================================================
-- RESET PACKAGE LIMITS FOR TESTING
-- Run this in Supabase SQL Editor
-- ===================================================

-- Step 0: First, let's see what packages exist and their current limits
SELECT 
    package_name,
    package_amount,
    purchase_limit AS current_limit,
    is_vip,
    is_active
FROM package_types
ORDER BY package_amount;

-- Step 1: Reset ALL package purchase limits to original values (including VIP)
UPDATE package_types
SET purchase_limit = CASE 
    -- Regular packages
    WHEN package_amount = 10000 THEN 10
    WHEN package_amount = 25000 THEN 8
    WHEN package_amount = 50000 THEN 7
    -- VIP and large packages
    WHEN package_amount = 100000 THEN 5
    WHEN package_amount = 250000 THEN 4
    WHEN package_amount = 500000 THEN 3
    WHEN package_amount = 1000000 THEN 2
    WHEN package_amount >= 5000000 THEN 1  -- Extra large VIP packages
    -- Any other amount defaults to 10
    ELSE 10
END
WHERE is_active = true;

-- Alternative: Set ALL packages to 10 if you want uniform limits for testing
-- UPDATE package_types SET purchase_limit = 10 WHERE is_active = true;

-- Step 2: (OPTIONAL) Delete all test pending transactions if you want fresh start
-- UNCOMMENT THE LINES BELOW ONLY IF YOU WANT TO DELETE ALL PENDING PURCHASES
-- WARNING: This will delete ALL pending transactions for ALL users!
-- 
-- DELETE FROM pending_transactions 
-- WHERE status = 'pending';

-- Step 3: Show updated package configuration (including VIP status)
SELECT 
    id,
    package_name,
    package_amount,
    price_usd,
    purchase_limit,
    is_vip,
    is_active,
    created_at
FROM package_types
ORDER BY package_amount;

-- Step 4: Show current purchase counts per user per package (for verification)
SELECT 
    pt.package_name,
    pt.package_amount,
    pt.is_vip,
    pend.user_id,
    pend.status,
    COUNT(*) as user_purchase_count
FROM pending_transactions pend
JOIN package_types pt ON pend.package_amount = pt.package_amount
GROUP BY pt.package_name, pt.package_amount, pt.is_vip, pend.user_id, pend.status
ORDER BY pt.package_amount, pend.user_id;
