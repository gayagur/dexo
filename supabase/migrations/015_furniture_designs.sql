-- ============================================
-- Furniture Designs table
-- ============================================

create table public.furniture_designs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('furniture', 'decorative')),
  space_type text not null check (space_type in ('home', 'commercial')),
  room_id text not null,
  furniture_id text not null,
  panels jsonb not null default '[]',
  dimensions jsonb not null default '{}',
  style text not null default 'Modern',
  created_at timestamptz not null default now()
);

alter table public.furniture_designs enable row level security;

-- Indexes
create index idx_furniture_designs_customer on public.furniture_designs(customer_id);

-- RLS: customers can manage their own designs
create policy "Customer can read own designs"
  on public.furniture_designs for select
  using (auth.uid() = customer_id);

create policy "Customer can insert own designs"
  on public.furniture_designs for insert
  with check (auth.uid() = customer_id);

create policy "Customer can update own designs"
  on public.furniture_designs for update
  using (auth.uid() = customer_id);

create policy "Customer can delete own designs"
  on public.furniture_designs for delete
  using (auth.uid() = customer_id);

-- Add optional FK from projects to furniture_designs
alter table public.projects
  add column furniture_design_id uuid references public.furniture_designs(id) on delete set null;
