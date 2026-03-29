-- ============================================
-- DEXO — Creator System (dual role enhancement)
-- ============================================
-- Adds creator application/approval flow, creator profiles,
-- and design orders connecting clients to creators.

-- 1. ADD CREATOR COLUMNS TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_creator boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_profile jsonb DEFAULT null;

-- Update active_role constraint to include 'creator' option
-- First drop old constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_active_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_active_role_check
  CHECK (active_role IN ('customer', 'business', 'creator'));

-- 2. CREATOR PROFILES TABLE (public portfolio info)
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  specialties text[] DEFAULT '{}',
  portfolio_images text[] DEFAULT '{}',
  min_order_value integer,
  lead_time_days integer,
  rating numeric(3,2) DEFAULT 0,
  total_orders integer DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can read creator profiles (for browsing)
CREATE POLICY "Anyone can view creator profiles"
  ON public.creator_profiles FOR SELECT
  USING (true);

-- RLS: creators can insert their own profile
CREATE POLICY "Creators can insert own profile"
  ON public.creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: creators can update their own profile
CREATE POLICY "Creators can update own profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS: admins can do everything
CREATE POLICY "Admins manage creator profiles"
  ON public.creator_profiles FOR ALL
  USING (public.is_admin());

-- 3. DESIGN ORDERS TABLE (connects clients to creators)
CREATE TABLE IF NOT EXISTS public.design_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid REFERENCES public.furniture_designs(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES auth.users(id),
  creator_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'quote_requested'
    CHECK (status IN ('quote_requested', 'quoted', 'accepted', 'in_production', 'completed', 'cancelled')),
  quote_amount integer,
  quote_currency text DEFAULT 'ILS',
  quote_message text,
  client_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.design_orders ENABLE ROW LEVEL SECURITY;

-- RLS: clients can view their own orders
CREATE POLICY "Clients can view own orders"
  ON public.design_orders FOR SELECT
  USING (auth.uid() = client_id);

-- RLS: creators can view orders assigned to them
CREATE POLICY "Creators can view assigned orders"
  ON public.design_orders FOR SELECT
  USING (auth.uid() = creator_id);

-- RLS: clients can create orders
CREATE POLICY "Clients can create orders"
  ON public.design_orders FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- RLS: creators can update orders assigned to them (add quote, change status)
CREATE POLICY "Creators can update assigned orders"
  ON public.design_orders FOR UPDATE
  USING (auth.uid() = creator_id);

-- RLS: clients can update their own orders (accept/cancel)
CREATE POLICY "Clients can update own orders"
  ON public.design_orders FOR UPDATE
  USING (auth.uid() = client_id);

-- RLS: admins see and manage all orders
CREATE POLICY "Admins manage all orders"
  ON public.design_orders FOR ALL
  USING (public.is_admin());

-- 4. DESIGNS: allow creators to view designs shared with them via orders
-- Drop existing policy if it exists to avoid conflict
DROP POLICY IF EXISTS "Creators can view shared designs" ON public.furniture_designs;
CREATE POLICY "Creators can view shared designs"
  ON public.furniture_designs FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.design_orders
      WHERE design_orders.design_id = furniture_designs.id
      AND design_orders.creator_id = auth.uid()
    )
  );

-- 5. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_creator()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_creator = true
    AND creator_approved = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.active_role()
RETURNS text AS $$
  SELECT active_role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. UPDATE handle_new_user TO SET creator defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, active_role, name, email, is_creator, creator_approved)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    false,
    false
  );
  RETURN new;
END;
$$;

-- 7. INDEX for fast order lookups
CREATE INDEX IF NOT EXISTS idx_design_orders_client ON public.design_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_design_orders_creator ON public.design_orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_design_orders_status ON public.design_orders(status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON public.creator_profiles(user_id);
