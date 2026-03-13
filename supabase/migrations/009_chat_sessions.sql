-- ============================================================
-- 009 — Chat session persistence for project brief flow
-- ============================================================

create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  messages    jsonb not null default '[]'::jsonb,       -- DisplayMessage[]
  llm_messages jsonb not null default '[]'::jsonb,      -- ChatMessage[] (LLM context)
  phase       text not null default 'chatting',
  brief_data  jsonb,                                     -- InternalBriefData | null
  progress_overrides jsonb not null default '{}'::jsonb, -- manual sidebar edits
  additional_details jsonb not null default '{}'::jsonb,
  uploaded_images text[] not null default '{}',
  concept_image_url text,
  category    text,                                      -- quick label for the banner
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Each user has at most one active session
create unique index if not exists idx_chat_sessions_user
  on public.chat_sessions (user_id);

-- RLS
alter table public.chat_sessions enable row level security;

create policy "Users can manage own chat sessions"
  on public.chat_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_chat_session_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_chat_session_updated_at
  before update on public.chat_sessions
  for each row
  execute function public.set_chat_session_updated_at();

-- Cleanup: delete sessions older than 3 days with no activity
-- (To be called via pg_cron or a scheduled edge function)
create or replace function public.cleanup_stale_chat_sessions()
returns void as $$
begin
  delete from public.chat_sessions
  where updated_at < now() - interval '3 days';
end;
$$ language plpgsql security definer;
