-- ============================================
-- DEXO Marketplace — Database Schema
-- ============================================

-- 1. PROFILES (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('customer', 'business')),
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. BUSINESSES
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  location text not null default '',
  categories text[] not null default '{}',
  styles text[] not null default '{}',
  portfolio text[] not null default '{}',
  rating numeric not null default 0,
  min_price integer,
  max_price integer,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- 3. PROJECTS (customer requests)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default '',
  style_tags text[] not null default '{}',
  budget_min integer not null default 0,
  budget_max integer not null default 0,
  details jsonb not null default '{}',
  inspiration_images text[] not null default '{}',
  ai_brief text,
  ai_concept text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'offers_received', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- 4. OFFERS
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  price integer not null,
  timeline text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;

-- 5. MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'business')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- ============================================
-- INDEXES
-- ============================================

create index idx_businesses_user_id on public.businesses(user_id);
create index idx_businesses_categories on public.businesses using gin(categories);
create index idx_projects_customer_id on public.projects(customer_id);
create index idx_projects_category on public.projects(category);
create index idx_projects_status on public.projects(status);
create index idx_offers_project_id on public.offers(project_id);
create index idx_offers_business_id on public.offers(business_id);
create index idx_messages_project_id on public.messages(project_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- ── PROFILES ──

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (on signup)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── BUSINESSES ──

-- Anyone authenticated can read businesses (customers browse them)
create policy "Anyone can read businesses"
  on public.businesses for select
  using (auth.uid() is not null);

-- Business owners can insert their own business
create policy "Owner can insert business"
  on public.businesses for insert
  with check (auth.uid() = user_id);

-- Business owners can update their own business
create policy "Owner can update business"
  on public.businesses for update
  using (auth.uid() = user_id);

-- Business owners can delete their own business
create policy "Owner can delete business"
  on public.businesses for delete
  using (auth.uid() = user_id);

-- ── PROJECTS ──

-- Customers can read their own projects
create policy "Customer can read own projects"
  on public.projects for select
  using (auth.uid() = customer_id);

-- Businesses can read projects whose category matches their categories (sent+)
create policy "Businesses can read matching projects"
  on public.projects for select
  using (
    status <> 'draft'
    and exists (
      select 1 from public.businesses b
      where b.user_id = auth.uid()
        and b.categories && array[category]
    )
  );

-- Customers can insert their own projects
create policy "Customer can insert projects"
  on public.projects for insert
  with check (auth.uid() = customer_id);

-- Customers can update their own projects
create policy "Customer can update own projects"
  on public.projects for update
  using (auth.uid() = customer_id);

-- ── OFFERS ──

-- Project owner can read offers on their projects
create policy "Customer can read offers on own projects"
  on public.offers for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

-- Business can read their own offers
create policy "Business can read own offers"
  on public.offers for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.user_id = auth.uid()
    )
  );

-- Business can create offers on projects they can see
create policy "Business can insert offers"
  on public.offers for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.status <> 'draft'
        and exists (
          select 1 from public.businesses b2
          where b2.user_id = auth.uid()
            and b2.categories && array[p.category]
        )
    )
  );

-- Business can update their own offers (e.g. modify price)
create policy "Business can update own offers"
  on public.offers for update
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.user_id = auth.uid()
    )
  );

-- Customer can update offers on their projects (accept/decline)
create policy "Customer can update offers on own projects"
  on public.offers for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

-- ── MESSAGES ──

-- Project owner can read messages on their projects
create policy "Customer can read messages on own projects"
  on public.messages for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

-- Businesses with offers on the project can read messages
create policy "Business can read messages on offered projects"
  on public.messages for select
  using (
    exists (
      select 1 from public.offers o
      join public.businesses b on b.id = o.business_id
      where o.project_id = project_id and b.user_id = auth.uid()
    )
  );

-- Project owner can send messages
create policy "Customer can insert messages on own projects"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

-- Business with an offer can send messages
create policy "Business can insert messages on offered projects"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.offers o
      join public.businesses b on b.id = o.business_id
      where o.project_id = project_id and b.user_id = auth.uid()
    )
  );

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
