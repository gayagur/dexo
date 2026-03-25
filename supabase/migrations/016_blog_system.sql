-- DEXO blog: posts, FAQs, storage bucket, RLS (public reads published only; admins full access)
--
-- Prerequisites: migration 010 (or any migration that defines public.is_admin()) must already be applied.
--
-- Safe to re-run: policies are dropped before recreate; tables use IF NOT EXISTS.

-- ─── Tables ─────────────────────────────────────────────────

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_format text not null default 'json',
  cover_image_url text,
  cover_image_alt text,
  meta_title text,
  meta_description text,
  keywords text[] not null default '{}',
  category text,
  tags text[] not null default '{}',
  status text not null default 'draft',
  featured boolean not null default false,
  author_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_status_check check (status in ('draft', 'published', 'archived'))
);

create index if not exists idx_blog_posts_status_published_at
  on public.blog_posts (status, published_at desc nulls last);

create index if not exists idx_blog_posts_featured_published
  on public.blog_posts (featured, published_at desc)
  where featured = true and status = 'published';

create index if not exists idx_blog_posts_category on public.blog_posts (category);

create index if not exists idx_blog_posts_updated_at on public.blog_posts (updated_at desc);

create or replace function public.set_blog_post_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_blog_post_updated_at();

create table if not exists public.blog_faqs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_blog_faqs_post_sort on public.blog_faqs (post_id, sort_order);

-- ─── RLS ────────────────────────────────────────────────────

alter table public.blog_posts enable row level security;
alter table public.blog_faqs enable row level security;

drop policy if exists "Anyone can read published blog posts" on public.blog_posts;
drop policy if exists "Admins can manage blog posts" on public.blog_posts;

create policy "Anyone can read published blog posts"
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'published');

create policy "Admins can manage blog posts"
  on public.blog_posts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read FAQs for published posts" on public.blog_faqs;
drop policy if exists "Admins can manage blog FAQs" on public.blog_faqs;

create policy "Anyone can read FAQs for published posts"
  on public.blog_faqs for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = blog_faqs.post_id and p.status = 'published'
    )
  );

create policy "Admins can manage blog FAQs"
  on public.blog_faqs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Storage: blog images (public read; admin-only write) ─────

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "blog-images: public read" on storage.objects;
drop policy if exists "blog-images: admin insert" on storage.objects;
drop policy if exists "blog-images: admin update" on storage.objects;
drop policy if exists "blog-images: admin delete" on storage.objects;
-- Also drop old names in case migration was partially applied before
drop policy if exists "Public read blog images" on storage.objects;
drop policy if exists "Admins upload blog images" on storage.objects;
drop policy if exists "Admins update blog images" on storage.objects;
drop policy if exists "Admins delete blog images" on storage.objects;

create policy "blog-images: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

create policy "blog-images: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());

create policy "blog-images: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());

create policy "blog-images: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());
