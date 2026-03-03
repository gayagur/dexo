-- 006: Soft delete support for projects
-- Adds deleted_at column and updates SELECT policies to filter deleted rows.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial index for efficient filtering of non-deleted projects
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON public.projects (deleted_at)
  WHERE deleted_at IS NULL;

-- ── Update SELECT policies to exclude soft-deleted projects ──

-- Customer read: add deleted_at IS NULL filter
DROP POLICY IF EXISTS "Customer can read own projects" ON public.projects;
CREATE POLICY "Customer can read own projects" ON public.projects
  FOR SELECT USING (
    customer_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Business read: add deleted_at IS NULL filter (policy was rewritten in 005)
DROP POLICY IF EXISTS "Businesses can read matching projects" ON public.projects;
CREATE POLICY "Businesses can read matching projects" ON public.projects
  FOR SELECT USING (
    status <> 'draft'
    AND public.my_business_categories() && array[category]
    AND deleted_at IS NULL
  );

-- The existing "Customer can update own projects" policy (001) already allows
-- the owner to update any column including deleted_at. No new policy needed.
