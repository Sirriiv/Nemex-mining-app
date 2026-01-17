-- =====================================================
-- BACKFILL REFERRAL NETWORK FROM EXISTING PROFILES
-- =====================================================
-- This script migrates all existing referrals from profiles.referred_by
-- into the referral_network table as level 1 (direct) referrals.
-- The trigger will then automatically create multi-level entries.
-- =====================================================

BEGIN;

-- Step 1: Insert all direct referrals (level 1) from profiles.referred_by
INSERT INTO public.referral_network (referrer_id, referred_id, level, created_at)
SELECT 
    p.referred_by AS referrer_id,
    p.id AS referred_id,
    1 AS level,
    p.created_at AS created_at
FROM public.profiles p
WHERE p.referred_by IS NOT NULL
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

-- Step 2: Verify the counts
SELECT 
    'Total profiles with referrers' AS metric,
    COUNT(*) AS count
FROM public.profiles
WHERE referred_by IS NOT NULL

UNION ALL

SELECT 
    'Total referral_network entries (level 1)' AS metric,
    COUNT(*) AS count
FROM public.referral_network
WHERE level = 1

UNION ALL

SELECT 
    'Total referral_network entries (all levels)' AS metric,
    COUNT(*) AS count
FROM public.referral_network;

-- Step 3: Update used_slots AND total_earned_from_refs for all referrers based on actual referral_network count
UPDATE public.profiles p
SET 
    used_slots = (
        SELECT COUNT(*)
        FROM public.referral_network rn
        WHERE rn.referrer_id = p.id
        AND rn.level = 1
    ),
    total_earned_from_refs = (
        SELECT COUNT(*) * 30  -- 30 NMXp per referral
        FROM public.referral_network rn
        WHERE rn.referrer_id = p.id
        AND rn.level = 1
    );

-- Step 4: Show summary by user
SELECT 
    p.id,
    p.username,
    p.email,
    p.used_slots,
    COUNT(rn.id) AS actual_referrals
FROM public.profiles p
LEFT JOIN public.referral_network rn ON rn.referrer_id = p.id AND rn.level = 1
GROUP BY p.id, p.username, p.email, p.used_slots
HAVING COUNT(rn.id) > 0
ORDER BY actual_referrals DESC;

COMMIT;

-- =====================================================
-- NOTES:
-- - This is safe to run multiple times (ON CONFLICT DO NOTHING)
-- - The trg_expand_referral_network trigger will automatically
--   create multi-level entries after level 1 inserts
-- - used_slots will be synchronized with actual referral count
-- =====================================================
