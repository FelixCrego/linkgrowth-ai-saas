-- Run this in Neon SQL editor.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table if not exists subscriptions (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  tier text not null default 'starter' check (tier in ('starter','pro','elite')),
  status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists onboarding_profiles (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  niche text not null,
  industry text not null,
  target_audience text not null,
  tone text not null,
  frequency text not null,
  updated_at timestamptz not null default now()
);

create table if not exists linkedin_accounts (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  linkedin_member_urn text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  prompt text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists research_queries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  query text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists voice_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  training_text text not null,
  profile_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists linkedin_post_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  content text not null,
  has_image boolean not null default false,
  post_urn text,
  created_at timestamptz not null default now()
);

alter table if exists linkedin_post_events add column if not exists post_urn text;

create index if not exists idx_workspace_members_user_id on workspace_members(user_id);
create index if not exists idx_generated_posts_workspace_id on generated_posts(workspace_id);
create index if not exists idx_research_queries_workspace_id on research_queries(workspace_id);
create index if not exists idx_voice_profiles_workspace_id on voice_profiles(workspace_id);
create index if not exists idx_linkedin_post_events_workspace_id on linkedin_post_events(workspace_id);

