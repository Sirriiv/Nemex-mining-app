BEGIN;

-- Add referred_by to profiles if missing and keep it nullable
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Helpful index for admin/referral queries
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Backfill profiles.referred_by from existing referral_network rows (direct/level 1)
UPDATE public.profiles p
SET referred_by = rn.referrer_id
FROM public.referral_network rn
WHERE rn.referred_id = p.id
  AND rn.level = 1
  AND p.referred_by IS NULL;

COMMIT;
