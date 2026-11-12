-- User state persistence (the Supabase analog of the client localStorage blob).
--
-- Stores the per-user app state — saved homes, feedback, compare tray,
-- preferences, manually-entered/GIS properties, role, realtor profile, MLS
-- connection METADATA (never secrets), saved searches, and shared workspaces —
-- as one owner-scoped JSONB row. Credentials never live here; only connection
-- state/scope/flags are persisted. RLS restricts every row to its owner.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "own user_state" on public.user_state;
create policy "own user_state" on public.user_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- keep updated_at fresh
create or replace function public.touch_user_state() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch before update on public.user_state
  for each row execute function public.touch_user_state();
