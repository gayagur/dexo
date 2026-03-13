-- ============================================================
-- 008 — Add updated_at to projects for edit tracking
-- ============================================================

-- Add the column (nullable — NULL means "never edited after creation")
alter table public.projects
  add column if not exists updated_at timestamptz;

-- Auto-set updated_at on every UPDATE via a trigger
create or replace function public.set_project_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_project_updated_at on public.projects;
create trigger trg_project_updated_at
  before update on public.projects
  for each row
  execute function public.set_project_updated_at();

-- Index for queries that filter/sort by updated_at
create index if not exists idx_projects_updated_at
  on public.projects (updated_at desc nulls last)
  where updated_at is not null;
