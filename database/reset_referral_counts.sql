-- =====================================================
-- RESET REFERRAL COUNTS TO MATCH ACTUAL DATA
-- =====================================================
-- Run this after deleting test accounts to recalculate
-- used_slots and total_earned_from_refs based on 
-- actual entries in referral_network table
-- =====================================================

-- Update ALL users to sync with actual referral_network data
UPDATE public.profiles p
SET 
    used_slots = COALESCE((
        SELECT COUNT(*)
        FROM public.referral_network rn
        WHERE rn.referrer_id = p.id
        AND rn.level = 1
    ), 0),
    total_earned_from_refs = COALESCE((
        SELECT COUNT(*) * 30  -- 30 NMXp per referral
        FROM public.referral_network rn
        WHERE rn.referrer_id = p.id
        AND rn.level = 1
    ), 0);

-- Show updated counts
SELECT 
    p.id,
    p.username,
    p.email,
    p.used_slots,
    p.total_earned_from_refs,
    COUNT(rn.id) AS actual_referrals_in_network
FROM public.profiles p
LEFT JOIN public.referral_network rn ON rn.referrer_id = p.id AND rn.level = 1
GROUP BY p.id, p.username, p.email, p.used_slots, p.total_earned_from_refs
ORDER BY p.total_earned_from_refs DESC;

-- =====================================================
-- NOTES:
-- - Safe to run multiple times
-- - Resets to 0 if no referrals exist
-- - Use this after deleting test accounts
-- =====================================================
