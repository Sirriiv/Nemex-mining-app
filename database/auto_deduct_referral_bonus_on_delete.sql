-- Automatically deduct referral bonus when a referral is HARD DELETED from database
-- This is for admin-level deletions, not for UI "remove referral" actions
-- UI removals should use the /api/admin/orphan-referral endpoint instead

BEGIN;

-- Create function to deduct bonus when referral is permanently deleted
CREATE OR REPLACE FUNCTION public.deduct_referral_bonus_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    BONUS_AMOUNT CONSTANT numeric := 30;
    current_balance numeric;
    current_earned numeric;
    current_slots integer;
BEGIN
    -- Only process level 1 (direct) referrals
    IF OLD.level != 1 THEN
        RETURN OLD;
    END IF;

    -- Get referrer's current stats
    SELECT balance, total_earned_from_refs, used_slots
    INTO current_balance, current_earned, current_slots
    FROM public.profiles
    WHERE id = OLD.referrer_id;

    -- If referrer not found, just return
    IF NOT FOUND THEN
        RETURN OLD;
    END IF;

    -- Calculate new values (prevent going negative)
    UPDATE public.profiles
    SET 
        balance = GREATEST(0, COALESCE(balance, 0) - BONUS_AMOUNT),
        total_earned_from_refs = GREATEST(0, COALESCE(total_earned_from_refs, 0) - BONUS_AMOUNT),
        used_slots = GREATEST(0, COALESCE(used_slots, 0) - 1)
    WHERE id = OLD.referrer_id;

    RAISE NOTICE 'Deducted % NMXp bonus from referrer % (hard deleted referral: %)', 
        BONUS_AMOUNT, OLD.referrer_id, OLD.referred_id;

    RETURN OLD;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_deduct_referral_bonus_on_delete ON public.referral_network;

-- Create the trigger
-- NOTE: This trigger fires on DELETE from referral_network table
-- For UI "remove referral", use /api/admin/orphan-referral endpoint instead
CREATE TRIGGER trg_deduct_referral_bonus_on_delete
BEFORE DELETE ON public.referral_network
FOR EACH ROW
EXECUTE FUNCTION public.deduct_referral_bonus_on_delete();

-- Verify the trigger was created
SELECT 
    tgname AS trigger_name, 
    tgenabled AS enabled,
    tgtype AS trigger_type
FROM pg_trigger 
WHERE tgname = 'trg_deduct_referral_bonus_on_delete';

COMMIT;
