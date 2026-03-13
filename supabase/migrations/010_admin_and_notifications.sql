-- ============================================
-- DEXO — Admin Panel + Notifications + Reviews
-- ============================================

-- 1. ADD is_admin TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';

-- 2. ADD STATUS TO BUSINESSES (creator approval flow)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('creator_approved', 'creator_rejected', 'system', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC)
  WHERE read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 4. CREATE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reviews_business ON public.reviews(business_id, created_at DESC);
CREATE INDEX idx_reviews_project ON public.reviews(project_id);
CREATE INDEX idx_businesses_status ON public.businesses(status);

-- 5. ADMIN HELPER FUNCTION (matches my_business_id() pattern from 005)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 6. ADMIN RLS POLICIES

-- Profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Businesses
CREATE POLICY "Admins can read all businesses"
  ON public.businesses FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all businesses"
  ON public.businesses FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete all businesses"
  ON public.businesses FOR DELETE
  USING (public.is_admin());

-- Projects
CREATE POLICY "Admins can read all projects"
  ON public.projects FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all projects"
  ON public.projects FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete all projects"
  ON public.projects FOR DELETE
  USING (public.is_admin());

-- Offers
CREATE POLICY "Admins can read all offers"
  ON public.offers FOR SELECT
  USING (public.is_admin());

-- Messages
CREATE POLICY "Admins can read all messages"
  ON public.messages FOR SELECT
  USING (public.is_admin());

-- Notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- Reviews
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Customers can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING (public.is_admin());

-- 7. UPDATE BUSINESS SELECT POLICY — only show approved businesses to non-admins
DROP POLICY IF EXISTS "Anyone can read businesses" ON public.businesses;
CREATE POLICY "Anyone can read approved businesses"
  ON public.businesses FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (status = 'approved' OR user_id = auth.uid())
  );

-- 8. GRANDFATHER EXISTING BUSINESSES AS APPROVED
UPDATE public.businesses SET status = 'approved' WHERE status = 'pending';
