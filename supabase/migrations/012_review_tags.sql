-- Add tags array column to reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
