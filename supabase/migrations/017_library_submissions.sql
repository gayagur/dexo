-- Community library submissions
create table if not exists public.library_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  description text not null default '',
  tags text[] not null default '{}',
  group_data jsonb not null,
  dims jsonb not null,
  thumbnail_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Approved community templates
create table if not exists public.community_templates (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.library_submissions(id) on delete set null,
  name text not null,
  category text not null,
  description text not null default '',
  tags text[] not null default '{}',
  icon text not null default '🪑',
  group_data jsonb not null,
  dims jsonb not null,
  thumbnail_url text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.library_submissions enable row level security;
alter table public.community_templates enable row level security;

-- Users can insert their own submissions
drop policy if exists "Users can insert own submissions" on public.library_submissions;
create policy "Users can insert own submissions" on public.library_submissions
  for insert to authenticated with check (auth.uid() = user_id);

-- Users can view their own submissions
drop policy if exists "Users can view own submissions" on public.library_submissions;
create policy "Users can view own submissions" on public.library_submissions
  for select to authenticated using (auth.uid() = user_id);

-- Admins can do everything
drop policy if exists "Admins full access submissions" on public.library_submissions;
create policy "Admins full access submissions" on public.library_submissions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Everyone can read approved community templates
drop policy if exists "Public read community templates" on public.community_templates;
create policy "Public read community templates" on public.community_templates
  for select to authenticated using (true);

-- Admins can manage community templates
drop policy if exists "Admins manage community templates" on public.community_templates;
create policy "Admins manage community templates" on public.community_templates
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
