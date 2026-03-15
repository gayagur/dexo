-- ============================================
-- DEXO — Milestones for Project Progress
-- ============================================

CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_number integer NOT NULL CHECK (milestone_number IN (1, 2, 3)),
  title text NOT NULL,
  percentage integer NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','submitted','approved','payment_requested','paid','released','disputed')),
  paid_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, milestone_number)
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_milestones_project ON public.milestones(project_id, milestone_number);

-- RLS Policies

-- Project owner (customer) can read milestones for their projects
CREATE POLICY "Customers can read own project milestones"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
      AND projects.customer_id = auth.uid()
    )
  );

-- Business owners can read milestones for projects they have accepted offers on
CREATE POLICY "Creators can read milestones for their projects"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.offers
      WHERE offers.project_id = milestones.project_id
      AND offers.status = 'accepted'
      AND offers.business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can read all milestones"
  ON public.milestones FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all milestones"
  ON public.milestones FOR UPDATE
  USING (public.is_admin());

-- System inserts (via service role or authenticated users creating for their own projects)
CREATE POLICY "Customers can insert milestones for own projects"
  ON public.milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
      AND projects.customer_id = auth.uid()
    )
  );

-- Customers and creators can update milestone status
CREATE POLICY "Project participants can update milestones"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = milestones.project_id
      AND projects.customer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.offers
      WHERE offers.project_id = milestones.project_id
      AND offers.status = 'accepted'
      AND offers.business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
      )
    )
  );
