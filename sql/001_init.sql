create extension pgcrypto;

create table public.sites (
  site_id uuid primary key,
  company_name text not null,
  display_name text not null,
  repo_name text not null unique,
  repo_owner text not null,
  branch text not null default 'main',
  domain text null,
  status text not null check (status in ('creating', 'active', 'draft')),
  created_at timestamptz not null default now()
);

create table public.site_members (
  site_member_id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(site_id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  unique (site_id, user_id)
);

create table public.ai_generation_logs (
  ai_generation_log_id uuid primary key default gen_random_uuid(),
  site_id uuid null,
  provider text not null,
  operation text not null,
  model text not null,
  status text not null check (status in ('success', 'error')),
  request_payload jsonb not null,
  response_text text null,
  response_json jsonb null,
  error_message text null,
  created_at timestamptz not null default now()
);

create index idx_site_members_user_id on public.site_members(user_id);
create index idx_site_members_site_id on public.site_members(site_id);
create index idx_ai_generation_logs_site_id on public.ai_generation_logs(site_id);
create index idx_ai_generation_logs_created_at on public.ai_generation_logs(created_at);

alter table public.sites
add column public_url text null;
