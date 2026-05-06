create table if not exists verdicts (
  id text primary key,
  category text not null,
  verdict text not null,
  severity text not null,
  red_flags jsonb not null,
  next_steps jsonb not null,
  reasoning text not null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '90 days')
);

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_text text not null,
  category text,
  signals jsonb not null,
  verdict_id text references verdicts(id),
  created_at timestamptz default now()
);

create index if not exists interactions_session_id_idx on interactions(session_id);
create index if not exists interactions_created_at_idx on interactions(created_at);
create index if not exists verdicts_created_at_idx on verdicts(created_at);

alter table verdicts enable row level security;
create policy "verdicts_public_read" on verdicts for select using (true);

alter table interactions enable row level security;
