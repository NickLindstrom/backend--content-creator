create table public.site_patch_runs (
  site_patch_run_id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(site_id) on delete cascade,
  patch_id text not null,
  action text not null check (action in ('preview', 'apply')),
  status text not null,
  reason text null,
  commit_sha text null,
  changed_files jsonb not null default '[]'::jsonb,
  actor_user_id uuid null,
  actor_email text null,
  created_at timestamptz not null default now()
);

create index idx_site_patch_runs_site_id on public.site_patch_runs(site_id);
create index idx_site_patch_runs_patch_id on public.site_patch_runs(patch_id);
create index idx_site_patch_runs_created_at on public.site_patch_runs(created_at desc);