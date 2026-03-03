-- ============================================
-- DEXO — Performance: indexes + optimized RLS
-- ============================================
-- This migration:
-- 1. Adds STABLE helper functions to cache per-session lookups
-- 2. Adds composite indexes for common sorted queries
-- 3. Rewrites the most expensive RLS policies to use helpers

-- ─── 1. STABLE HELPER FUNCTIONS ─────────────
-- These are SECURITY DEFINER so they bypass RLS on businesses,
-- and STABLE so the planner can cache them within a statement.

create or replace function public.my_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.businesses where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_business_categories()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(categories, '{}') from public.businesses where user_id = auth.uid() limit 1;
$$;

-- ─── 2. COMPOSITE INDEXES ────────────────────
-- These support the most common query patterns in the hooks.

-- useMessages: WHERE project_id = ? ORDER BY created_at ASC
create index if not exists idx_messages_project_created
  on public.messages(project_id, created_at);

-- useOffers: WHERE project_id = ? ORDER BY created_at DESC
create index if not exists idx_offers_project_created
  on public.offers(project_id, created_at desc);

-- useBusinessOffers: WHERE business_id = ? ORDER BY created_at DESC
create index if not exists idx_offers_business_created
  on public.offers(business_id, created_at desc);

-- useProjects: WHERE customer_id = ? ORDER BY created_at DESC
create index if not exists idx_projects_customer_created
  on public.projects(customer_id, created_at desc);

-- ─── 3. OPTIMIZED RLS POLICIES ───────────────

-- == PROJECTS: business read ==
-- OLD: subquery with JOIN on businesses per row
-- NEW: uses cached my_business_categories()
drop policy if exists "Businesses can read matching projects" on public.projects;

create policy "Businesses can read matching projects"
  on public.projects for select
  using (
    status <> 'draft'
    and public.my_business_categories() && array[category]
  );

-- == OFFERS: business read ==
-- OLD: EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.user_id = auth.uid())
-- NEW: direct comparison with cached helper
drop policy if exists "Business can read own offers" on public.offers;

create policy "Business can read own offers"
  on public.offers for select
  using (business_id = public.my_business_id());

-- == OFFERS: business insert ==
-- OLD: two EXISTS subqueries, one with nested businesses join
-- NEW: uses helpers
drop policy if exists "Business can insert offers" on public.offers;

create policy "Business can insert offers"
  on public.offers for insert
  with check (
    business_id = public.my_business_id()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.status <> 'draft'
        and public.my_business_categories() && array[p.category]
    )
  );

-- == OFFERS: business update ==
drop policy if exists "Business can update own offers" on public.offers;

create policy "Business can update own offers"
  on public.offers for update
  using (business_id = public.my_business_id());

-- == MESSAGES: business read ==
-- OLD: EXISTS (JOIN offers + businesses) — the most expensive policy
-- NEW: uses cached my_business_id() with direct offers lookup
drop policy if exists "Business can read messages on offered projects" on public.messages;

create policy "Business can read messages on offered projects"
  on public.messages for select
  using (
    exists (
      select 1 from public.offers
      where offers.project_id = messages.project_id
        and offers.business_id = public.my_business_id()
    )
  );

-- == MESSAGES: business insert ==
-- OLD: EXISTS (JOIN offers + businesses)
-- NEW: uses cached my_business_id()
drop policy if exists "Business can insert messages on offered projects" on public.messages;

create policy "Business can insert messages on offered projects"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.offers
      where offers.project_id = messages.project_id
        and offers.business_id = public.my_business_id()
    )
  );
