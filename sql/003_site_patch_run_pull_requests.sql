alter table public.site_patch_runs
  add column if not exists pull_request_number integer null,
  add column if not exists pull_request_url text null,
  add column if not exists pull_request_branch text null;

create index if not exists idx_site_patch_runs_pull_request_number
  on public.site_patch_runs(pull_request_number);
