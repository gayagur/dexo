-- ============================================================
-- 007: Add mask_path and edit_type to image_versions
-- ============================================================

-- Store the mask used for each edit (path in Supabase Storage)
ALTER TABLE image_versions
  ADD COLUMN IF NOT EXISTS mask_path text;

-- Classify the type of edit for analytics
ALTER TABLE image_versions
  ADD COLUMN IF NOT EXISTS edit_type text;

-- Comment for clarity
COMMENT ON COLUMN image_versions.mask_path IS 'Storage path of the mask PNG used for this edit, null for generations or global edits';
COMMENT ON COLUMN image_versions.edit_type IS 'Type of edit: masked_inpaint, global_edit, generation, resize_heal';
