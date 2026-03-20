-- ============================================
-- DEXO — Business Page View Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.business_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_page_views ENABLE ROW LEVEL SECURITY;

-- Indexes for fast aggregation
CREATE INDEX idx_bpv_business ON public.business_page_views(business_id, viewed_at DESC);
CREATE INDEX idx_bpv_viewer ON public.business_page_views(viewer_id) WHERE viewer_id IS NOT NULL;

-- Anyone authenticated can insert (tracks their visit)
CREATE POLICY "Authenticated users can log page views"
  ON public.business_page_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Business owners can read their own page views
CREATE POLICY "Business owners can read own page views"
  ON public.business_page_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = business_page_views.business_id
      AND businesses.user_id = auth.uid()
    )
  );

-- Admins can read all
CREATE POLICY "Admins can read all page views"
  ON public.business_page_views FOR SELECT
  USING (public.is_admin());
