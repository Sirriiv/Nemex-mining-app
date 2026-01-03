-- Reset all package purchase limits to original values
-- This script resets the purchase_limit for all packages in package_types table

UPDATE package_types
SET purchase_limit = CASE package_amount
    WHEN 10000 THEN 10    -- 10,000 NMXp package: 10 purchases per user
    WHEN 25000 THEN 8     -- 25,000 NMXp package: 8 purchases per user
    WHEN 50000 THEN 7     -- 50,000 NMXp package: 7 purchases per user
    WHEN 100000 THEN 5    -- 100,000 NMXp package: 5 purchases per user
    WHEN 250000 THEN 4    -- 250,000 NMXp package: 4 purchases per user
    WHEN 500000 THEN 3    -- 500,000 NMXp package: 3 purchases per user
    WHEN 1000000 THEN 2   -- 1,000,000 NMXp package: 2 purchases per user
    ELSE purchase_limit   -- Keep current value for any other packages
END
WHERE is_active = true;

-- Show updated package limits
SELECT 
    package_name,
    package_amount,
    price_usd,
    purchase_limit,
    is_active
FROM package_types
ORDER BY package_amount;
