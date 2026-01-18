-- Fix the referral_network trigger to remove non-existent bonus_given column
-- and ensure it works for new registrations

BEGIN;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_expand_referral_network ON public.referral_network;
DROP FUNCTION IF EXISTS public.expand_referral_network();

-- Recreate the trigger function WITHOUT bonus_given column
CREATE OR REPLACE FUNCTION public.expand_referral_network()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only expand for direct links (level 1)
    IF NEW.level IS DISTINCT FROM 1 THEN
        RETURN NEW;
    END IF;

    -- Find all ancestors of the referrer and create network entries
    WITH RECURSIVE ancestors AS (
        -- Start with the direct referrer
        SELECT p.id, p.referred_by, 0 AS depth
        FROM public.profiles p
        WHERE p.id = NEW.referrer_id
        
        UNION ALL
        
        -- Recursively find ancestors up to 10 levels
        SELECT parent.id, parent.referred_by, ancestors.depth + 1
        FROM public.profiles parent
        JOIN ancestors ON parent.id = ancestors.referred_by
        WHERE ancestors.depth < 10
    )
    -- Insert multi-level referral network entries (level 2+)
    INSERT INTO public.referral_network (referrer_id, referred_id, level, created_at)
    SELECT 
        a.id,                                      -- ancestor ID becomes referrer
        NEW.referred_id,                           -- new user is referred
        a.depth + 2,                               -- level = depth + 2 (since direct ref is level 1)
        COALESCE(NEW.created_at, now())
    FROM ancestors a
    WHERE a.depth >= 0  -- Include all ancestors
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_expand_referral_network
AFTER INSERT ON public.referral_network
FOR EACH ROW
EXECUTE FUNCTION public.expand_referral_network();

-- Verify the trigger was created
SELECT 
    tgname AS trigger_name, 
    tgenabled AS enabled 
FROM pg_trigger 
WHERE tgname = 'trg_expand_referral_network';

COMMIT;
