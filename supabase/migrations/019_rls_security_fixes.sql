-- ═══════════════════════════════════════════════════════════
-- Migration 019: RLS Security Fixes (P0 + P1)
-- Audit date: 2026-03-27
-- ═══════════════════════════════════════════════════════════

-- ─── F01 (P0): creator_profiles — restrict anonymous access ───
-- Was: USING(true) exposing all creator user_ids to anonymous users
DROP POLICY IF EXISTS "Anyone can view creator profiles" ON public.creator_profiles;
CREATE POLICY "Authenticated users can view creator profiles"
  ON public.creator_profiles FOR SELECT
  TO authenticated
  USING (true);

-- ─── F02 (P1): project-images — add ownership check on upload ───
-- Was: any auth user could upload to any path
DROP POLICY IF EXISTS "Auth users upload project images" ON storage.objects;
CREATE POLICY "Auth users upload project images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── F03 (P1): portfolio-images — add ownership check on upload ───
DROP POLICY IF EXISTS "Auth users upload portfolio images" ON storage.objects;
CREATE POLICY "Auth users upload portfolio images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── F04 (P1): storage DELETE policies — let owners clean up files ───
CREATE POLICY "Owner can delete project images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner can delete portfolio images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── F05 (P1): profiles — add self-delete for GDPR compliance ───
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ─── F17 (P1): library_submissions — use is_admin() function ───
-- Was: direct column check `is_admin = true` instead of SECURITY DEFINER function
DROP POLICY IF EXISTS "Admins full access submissions" ON public.library_submissions;
CREATE POLICY "Admins full access submissions"
  ON public.library_submissions
  FOR ALL USING (public.is_admin());
