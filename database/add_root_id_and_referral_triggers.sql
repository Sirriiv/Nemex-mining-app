BEGIN;

-- Add root_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS root_id uuid;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_root_id ON public.profiles(root_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_network_pair ON public.referral_network(referrer_id, referred_id);

-- Backfill root_id using current tree (root = first ancestor with no referrer)
WITH RECURSIVE roots AS (
    SELECT p.id AS user_id, p.id AS root_id
    FROM public.profiles p
    WHERE p.referred_by IS NULL
    UNION ALL
    SELECT child.id AS user_id, roots.root_id
    FROM public.profiles child
    JOIN roots ON child.referred_by = roots.user_id
)
UPDATE public.profiles p
SET root_id = roots.root_id
FROM roots
WHERE p.id = roots.user_id
  AND p.root_id IS NULL;

-- Ensure root_id set for existing root users
UPDATE public.profiles
SET root_id = id
WHERE referred_by IS NULL AND root_id IS NULL;

-- Trigger to keep root_id in sync
CREATE OR REPLACE FUNCTION public.set_profile_root_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    found_root uuid;
BEGIN
    -- If no referrer, root is self
    IF NEW.referred_by IS NULL THEN
        NEW.root_id := COALESCE(NEW.root_id, NEW.id);
        RETURN NEW;
    END IF;

    -- Find highest ancestor (breaks after 10 levels to avoid cycles)
    WITH RECURSIVE chain AS (
        SELECT p.id, p.referred_by, 0 AS depth
        FROM public.profiles p
        WHERE p.id = NEW.referred_by
        UNION ALL
        SELECT parent.id, parent.referred_by, chain.depth + 1
        FROM public.profiles parent
        JOIN chain ON parent.id = chain.referred_by
        WHERE chain.depth < 10
    )
    SELECT id INTO found_root
    FROM chain
    WHERE referred_by IS NULL
    ORDER BY depth DESC
    LIMIT 1;

    NEW.root_id := COALESCE(NEW.root_id, found_root, NEW.referred_by);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_root_id ON public.profiles;
CREATE TRIGGER trg_set_profile_root_id
BEFORE INSERT OR UPDATE OF referred_by
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_root_id();

-- Trigger to expand referral_network for ancestor links
CREATE OR REPLACE FUNCTION public.expand_referral_network()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only expand for direct links
    IF NEW.level IS DISTINCT FROM 1 THEN
        RETURN NEW;
    END IF;

    WITH RECURSIVE ancestors AS (
        SELECT p.id, p.referred_by, 0 AS depth
        FROM public.profiles p
        WHERE p.id = NEW.referrer_id
        UNION ALL
        SELECT parent.id, parent.referred_by, ancestors.depth + 1
        FROM public.profiles parent
        JOIN ancestors ON parent.id = ancestors.referred_by
        WHERE ancestors.depth < 10
    )
    INSERT INTO public.referral_network (referrer_id, referred_id, level, bonus_given, created_at)
    SELECT a.id, NEW.referred_id, a.depth + 1, false, COALESCE(NEW.created_at, now())
    FROM ancestors a
    WHERE a.depth > 0
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expand_referral_network ON public.referral_network;
CREATE TRIGGER trg_expand_referral_network
AFTER INSERT ON public.referral_network
FOR EACH ROW
EXECUTE FUNCTION public.expand_referral_network();

COMMIT;
