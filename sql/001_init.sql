create extension if not exists pgcrypto;

create table if not exists public.sites (
  site_id uuid primary key,
  company_name text not null,
  display_name text not null,
  repo_name text not null unique,
  repo_owner text not null,
  branch text not null default 'main',
  domain text null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_members (
  site_member_id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(site_id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  unique (site_id, user_id)
);

create index if not exists idx_site_members_user_id on public.site_members(user_id);
create index if not exists idx_site_members_site_id on public.site_members(site_id);
