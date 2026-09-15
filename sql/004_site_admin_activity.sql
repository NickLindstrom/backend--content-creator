create table public.site_admin_activity (
  site_admin_activity_id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  user_id uuid not null,
  status text not null check (
    status in (
      'Ska skickas',
      'Skickad',
      'Ringt',
      'Inte intresserad',
      'Ta bort all info',
      'Återkom',
      'Vill köpa'
    )
  ),
  comment text not null default '',
  actor_user_id uuid null,
  actor_email text null,
  created_at timestamptz not null default now(),
  foreign key (site_id, user_id)
    references public.site_members(site_id, user_id)
    on delete cascade
);

create index idx_site_admin_activity_membership
  on public.site_admin_activity(site_id, user_id, created_at desc);

create index idx_site_admin_activity_status
  on public.site_admin_activity(status, created_at desc);
