-- Vastu Ready — initial schema
-- Design notes:
--   * Every Vastu datum stores value + confidence (0-1) + source + verification_status.
--     The app must never present inferred data as verified fact; these columns carry
--     the provenance the UI and AI rely on.
--   * Scores are produced by the deterministic engine (see docs/scoring.md) and stored
--     with the methodology/scoring versions that generated them, so results are auditable.
--   * RLS: a user sees and writes only their own profile/preferences/saved/feedback/etc.
--     Properties and their analyses are shared read-only catalog data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type data_source as enum ('mls','floorplan','satellite','inference','manual','unknown','url');
create type verification_status as enum ('verified','likely','needs_verification','potential_concern');
create type finding_status as enum ('strong','favorable','neutral','consideration','concern');
create type severity as enum ('none','minor','moderate','major');
create type correctability as enum ('easy','moderate','major_structural','not_practical');
create type strictness as enum ('flexible','balanced','strict');
create type verdict_level as enum ('strong_match','good_with_concerns','mixed','pass');
create type home_type as enum ('single_family','townhouse','condo','new_construction_plan');
create type feedback_kind as enum ('love','consider','pass','dealbreaker');
create type account_tier as enum ('free','premium_buyer','realtor_pro','professional_report','builder');

-- ---------------------------------------------------------------------------
-- Users (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  tier account_tier not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Buyer profile (one per user)
-- ---------------------------------------------------------------------------
create table public.buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text,
  max_budget numeric,
  min_budget numeric,
  min_beds int,
  min_baths numeric,
  min_sqft int,
  min_lot_acres numeric,
  preferred_lot_acres numeric,
  preferred_areas text[] not null default '{}',
  destination_label text,
  destination_lat double precision,
  destination_lng double precision,
  max_drive_minutes int,
  preferred_styles text[] not null default '{}',
  construction_pref text,
  renovation_tolerance text,
  pool_preference text,
  privacy_importance text,
  garage_pref text,
  priorities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Vastu preferences (one per user)
-- ---------------------------------------------------------------------------
create table public.vastu_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  strictness strictness not null default 'balanced',
  acceptable_facings text[] not null default '{}',
  preferred_entrance text,
  open_space_ne_important boolean not null default true,
  dealbreakers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Properties (shared catalog)
-- ---------------------------------------------------------------------------
create table public.properties (
  id text primary key,
  address_line1 text not null,
  city text not null,
  state text not null,
  zip text,
  neighborhood text,
  price numeric,
  estimated_value numeric,
  beds int,
  baths numeric,
  sqft int,
  lot_acres numeric,
  year_built int,
  home_type home_type,
  style text,
  new_construction boolean default false,
  pool boolean default false,
  garage_spaces int,
  garage_type text,
  privacy text,
  hero_image text,
  lat double precision,
  lng double precision,
  listing_url text,
  source data_source not null default 'mock',
  is_demo boolean not null default false,
  -- Vastu attributes: value + confidence + source each (provenance preserved).
  facing_direction text,       facing_confidence numeric, facing_source data_source,
  entrance_direction text,     entrance_confidence numeric, entrance_source data_source,
  lot_shape text,              lot_shape_confidence numeric, lot_shape_source data_source,
  road_position text,          road_position_confidence numeric, road_position_source data_source,
  open_space_ne text,          open_space_ne_confidence numeric, open_space_ne_source data_source,
  kitchen_zone text,           kitchen_confidence numeric, kitchen_source data_source,
  primary_bedroom_zone text,   primary_bedroom_confidence numeric, primary_bedroom_source data_source,
  bathroom_zones text[],       bathroom_confidence numeric, bathroom_source data_source,
  staircase_zone text,         staircase_confidence numeric, staircase_source data_source,
  brahmasthan text,            brahmasthan_confidence numeric, brahmasthan_source data_source,
  garage_zone text,            garage_confidence numeric, garage_source data_source,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  url text not null,
  position int not null default 0,
  caption text
);

create table public.property_rooms (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  room_type text not null,
  zone text,
  confidence numeric,
  source data_source not null default 'unknown'
);

create table public.water_features (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  kind text not null,
  zone text,
  confidence numeric,
  source data_source not null default 'unknown'
);

-- ---------------------------------------------------------------------------
-- Analyses (deterministic engine output; cached per property + prefs snapshot)
-- ---------------------------------------------------------------------------
create table public.property_analysis (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  overall_score int not null,
  vastu_score int not null,
  personal_match_score int not null,
  value_score int not null,
  correctability_score int not null,
  verdict_level verdict_level not null,
  verdict_headline text not null,
  scoring_version text not null,
  methodology_version text not null,
  created_at timestamptz not null default now()
);

create table public.vastu_analysis (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.property_analysis(id) on delete cascade,
  category_key text not null,
  label text not null,
  score int not null,
  finding_status finding_status not null,
  severity severity not null,
  verification verification_status not null,
  correctability correctability,
  correctable boolean not null default false,
  weight numeric not null,
  explanation text not null
);

-- Per-finding provenance (what the finding was based on + how sure).
create table public.analysis_sources (
  id uuid primary key default gen_random_uuid(),
  vastu_analysis_id uuid not null references public.vastu_analysis(id) on delete cascade,
  source data_source not null,
  confidence numeric not null,
  note text
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.property_analysis(id) on delete cascade,
  headline text not null,
  reasoning text[] not null default '{}',
  provider text not null,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-user activity
-- ---------------------------------------------------------------------------
create table public.saved_properties (
  user_id uuid not null references public.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.property_feedback (
  user_id uuid not null references public.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  kind feedback_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  criteria jsonb not null default '{}'::jsonb,
  alert_cadence text not null default 'daily',
  created_at timestamptz not null default now()
);

create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text,
  property_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.vastu_preferences enable row level security;
alter table public.saved_properties enable row level security;
alter table public.property_feedback enable row level security;
alter table public.saved_searches enable row level security;
alter table public.comparisons enable row level security;
alter table public.property_analysis enable row level security;

-- Shared catalog: readable by anyone (including anon demo), writable by service role only.
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.property_rooms enable row level security;
alter table public.water_features enable row level security;
alter table public.vastu_analysis enable row level security;
alter table public.analysis_sources enable row level security;
alter table public.recommendations enable row level security;

create policy "properties readable" on public.properties for select using (true);
create policy "property_images readable" on public.property_images for select using (true);
create policy "property_rooms readable" on public.property_rooms for select using (true);
create policy "water_features readable" on public.water_features for select using (true);
create policy "vastu_analysis readable" on public.vastu_analysis for select using (true);
create policy "analysis_sources readable" on public.analysis_sources for select using (true);
create policy "recommendations readable" on public.recommendations for select using (true);

-- Own-row policies.
create policy "own user" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own buyer_profile" on public.buyer_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own vastu_prefs" on public.vastu_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own saved" on public.saved_properties
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own feedback" on public.property_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own comparisons" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Analyses: a user sees shared analyses (user_id null) and their own.
create policy "read analyses" on public.property_analysis
  for select using (user_id is null or auth.uid() = user_id);
create policy "write own analyses" on public.property_analysis
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New-user trigger: mirror auth.users into public.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
