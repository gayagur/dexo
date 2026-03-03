-- ============================================================
-- 004: AI Usage Logging + Image Version Tracking
-- ============================================================

-- AI usage log: tracks every AI API call for budget monitoring
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,          -- 'design-chat' | 'generate-image' | 'edit-image'
  model       text NOT NULL,
  tokens_in   int DEFAULT 0,
  tokens_out  int DEFAULT 0,
  cost_usd    numeric(10,6) DEFAULT 0,
  metadata    jsonb DEFAULT '{}',       -- project_id, prompt preview, etc.
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_user  ON ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_date  ON ai_usage_log(created_at);

-- Image versions: edit history per project image
CREATE TABLE IF NOT EXISTS image_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_version_id uuid REFERENCES image_versions(id) ON DELETE SET NULL,
  image_url         text NOT NULL,
  prompt            text,               -- generation prompt (for gen) or NULL (for edits)
  edit_instruction  text,               -- edit instruction (for edits) or NULL (for gen)
  version_number    int NOT NULL DEFAULT 1,
  is_current        boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_image_versions_project ON image_versions(project_id);
CREATE INDEX idx_image_versions_current ON image_versions(project_id, is_current) WHERE is_current = true;

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_versions ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users read own usage"
  ON ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Edge functions insert via service role (no user INSERT policy needed)
-- But we add one for the edge function's authenticated insert
CREATE POLICY "Authenticated users insert usage"
  ON ai_usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Image versions: project owner can read
CREATE POLICY "Project owner reads image versions"
  ON image_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = image_versions.project_id
        AND projects.customer_id = auth.uid()
    )
  );

-- Image versions: project owner can insert
CREATE POLICY "Project owner inserts image versions"
  ON image_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = image_versions.project_id
        AND projects.customer_id = auth.uid()
    )
  );

-- Image versions: project owner can update (mark is_current = false)
CREATE POLICY "Project owner updates image versions"
  ON image_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = image_versions.project_id
        AND projects.customer_id = auth.uid()
    )
  );

-- ─── Helper Functions ────────────────────────────────────────

-- Count generated images for a project (version_number = 1 means original generation)
CREATE OR REPLACE FUNCTION count_project_images(p_project_id uuid)
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT count(*)::int
  FROM image_versions
  WHERE project_id = p_project_id
    AND parent_version_id IS NULL;
$$;

-- Count edits on a specific image chain
CREATE OR REPLACE FUNCTION count_image_edits(p_version_id uuid)
RETURNS int
LANGUAGE sql STABLE
AS $$
  WITH RECURSIVE chain AS (
    SELECT id, parent_version_id FROM image_versions WHERE id = p_version_id
    UNION ALL
    SELECT iv.id, iv.parent_version_id
    FROM image_versions iv
    JOIN chain c ON iv.parent_version_id = c.id
  )
  SELECT (count(*) - 1)::int FROM chain;
$$;

-- Daily usage count per user per function
CREATE OR REPLACE FUNCTION daily_usage_count(p_user_id uuid, p_function_name text)
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT count(*)::int
  FROM ai_usage_log
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND created_at >= date_trunc('day', now());
$$;
