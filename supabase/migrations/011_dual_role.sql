-- ============================================
-- DEXO — Dual Role Support
-- ============================================
-- Allows users to have both client and creator profiles.
-- active_role tracks which mode they're currently using.

-- 1. ADD active_role TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role text;

-- Initialize active_role to match existing role for all users
UPDATE public.profiles SET active_role = role WHERE active_role IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN active_role SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN active_role SET DEFAULT 'customer';

-- Add check constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_active_role_check
  CHECK (active_role IN ('customer', 'business'));

-- 2. UPDATE handle_new_user TRIGGER — set active_role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, active_role, name, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, '')
  );
  RETURN new;
END;
$$;

-- 3. ALLOW USERS TO UPDATE THEIR OWN active_role
-- (existing policy "Users can update own profile" already covers this)

-- 4. RLS: Allow dual-role users to read projects as customer even if registered as business
-- Customer project access: allow if user is the project owner (regardless of role)
-- This is already the case: "Customer can read own projects" uses customer_id = auth.uid()
-- No change needed — ownership-based, not role-based.

-- 5. RLS: Allow dual-role users to insert projects as customer
-- The existing insert policy checks auth.uid() = customer_id — role-agnostic. Good.

-- 6. ALLOW business-role users to browse businesses when in customer mode
-- Existing policy "Anyone can read approved businesses" already allows any authenticated user.
-- No change needed.
