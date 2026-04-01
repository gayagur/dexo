-- DEXO - Login-first auth flow support
-- Keeps active_role as the source of truth while adding a durable
-- business capability flag for dual-role switching.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_business boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET active_role = role
WHERE active_role IS DISTINCT FROM role
  AND coalesce(is_business, false) = false;

UPDATE public.profiles
SET is_business = true
WHERE coalesce(is_business, false) = false
  AND (
    coalesce(is_creator, false) = true
    OR role = 'business'
    OR active_role = 'business'
  );
