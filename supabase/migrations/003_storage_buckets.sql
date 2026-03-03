-- Storage buckets for image uploads
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);

-- RLS: authenticated users can upload to project-images
CREATE POLICY "Auth users upload project images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images');

-- RLS: anyone can read project images (public bucket)
CREATE POLICY "Public read project images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'project-images');

-- RLS: authenticated users can upload to portfolio-images
CREATE POLICY "Auth users upload portfolio images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio-images');

-- RLS: anyone can read portfolio images (public bucket)
CREATE POLICY "Public read portfolio images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'portfolio-images');
