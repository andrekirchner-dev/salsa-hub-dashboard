-- SalsaHub Dashboard - Initial Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Helper: updated_at trigger ───────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  cargo_code   text,
  role         text not null default 'Analista',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_role_idx on profiles(role);
alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (auth.uid() is not null);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();

-- ─── cargo_codes ──────────────────────────────────────────────────────────
create table if not exists cargo_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  role       text not null,
  used       boolean not null default false,
  used_by    uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table cargo_codes enable row level security;
create policy "Anyone authenticated can read cargo codes" on cargo_codes for select using (auth.uid() is not null);
create policy "Only admins can insert cargo codes" on cargo_codes for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor'))
);
create policy "Users can mark code as used" on cargo_codes for update using (auth.uid() is not null);

-- ─── teams ────────────────────────────────────────────────────────────────
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table teams enable row level security;
create policy "Authenticated users can view teams" on teams for select using (auth.uid() is not null);
create policy "C-Level can create teams" on teams for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor'))
);
create policy "C-Level can update teams" on teams for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor'))
);
create trigger teams_updated_at before update on teams for each row execute function update_updated_at();

-- ─── team_members ─────────────────────────────────────────────────────────
create table if not exists team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role       text not null default 'Membro',
  joined_at  timestamptz not null default now(),
  unique(team_id, profile_id)
);
create index if not exists team_members_team_idx on team_members(team_id);
create index if not exists team_members_profile_idx on team_members(profile_id);
alter table team_members enable row level security;
create policy "Authenticated users can view team members" on team_members for select using (auth.uid() is not null);
create policy "Managers can manage team members" on team_members for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor','Gerente','Coordenador'))
);

-- ─── products ─────────────────────────────────────────────────────────────
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  status       text not null default 'ativo',
  product_code text unique,
  team_id      uuid references teams(id),
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_status_idx on products(status);
create index if not exists products_code_idx on products(product_code);
alter table products enable row level security;
create policy "Authenticated users can view products" on products for select using (auth.uid() is not null);
create policy "Managers can create products" on products for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor','Gerente'))
);
create policy "Managers can update products" on products for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor','Gerente'))
);
create trigger products_updated_at before update on products for each row execute function update_updated_at();

-- ─── product_access ───────────────────────────────────────────────────────
create table if not exists product_access (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  access_level text not null default 'view',
  granted_at   timestamptz not null default now(),
  unique(product_id, user_id)
);
alter table product_access enable row level security;
create policy "Users can view own access" on product_access for select using (auth.uid() = user_id);
create policy "Users can insert own access" on product_access for insert with check (auth.uid() = user_id);

-- ─── tasks ────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'PENDENTE',
  priority    text default 'Media',
  product_id  uuid references products(id) on delete cascade,
  team_id     uuid references teams(id),
  assigned_to uuid references profiles(id),
  due_date    date,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_product_idx on tasks(product_id);
create index if not exists tasks_assigned_idx on tasks(assigned_to);
create index if not exists tasks_status_idx on tasks(status);
alter table tasks enable row level security;
create policy "Authenticated users can view tasks" on tasks for select using (auth.uid() is not null);
create policy "Authenticated users can create tasks" on tasks for insert with check (auth.uid() is not null);
create policy "Users can update assigned or created tasks" on tasks for update using (
  auth.uid() = assigned_to or auth.uid() = created_by or
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor','Gerente','Coordenador'))
);
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();

-- ─── task_comments ────────────────────────────────────────────────────────
create table if not exists task_comments (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks(id) on delete cascade,
  user_id   uuid references profiles(id),
  content   text not null,
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on task_comments(task_id);
alter table task_comments enable row level security;
create policy "Authenticated users can view comments" on task_comments for select using (auth.uid() is not null);
create policy "Authenticated users can add comments" on task_comments for insert with check (auth.uid() is not null);

-- ─── product_files ────────────────────────────────────────────────────────
create table if not exists product_files (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name       text not null,
  file_type  text,
  file_url   text not null,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);
alter table product_files enable row level security;
create policy "Authenticated users can view product files" on product_files for select using (auth.uid() is not null);
create policy "Authenticated users can upload files" on product_files for insert with check (auth.uid() is not null);

-- ─── product_activity ─────────────────────────────────────────────────────
create table if not exists product_activity (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id    uuid references profiles(id),
  action     text not null,
  created_at timestamptz not null default now()
);
create index if not exists product_activity_product_idx on product_activity(product_id);
alter table product_activity enable row level security;
create policy "Authenticated users can view activity" on product_activity for select using (auth.uid() is not null);
create policy "Authenticated users can log activity" on product_activity for insert with check (auth.uid() is not null);

-- ─── tools_library ────────────────────────────────────────────────────────
create table if not exists tools_library (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  function   text not null,
  type       text not null default 'Site',
  url        text not null,
  added_by   uuid references profiles(id),
  validated  boolean not null default false,
  created_at timestamptz not null default now()
);
alter table tools_library enable row level security;
create policy "Authenticated users can view tools" on tools_library for select using (auth.uid() is not null);
create policy "Managers can add tools" on tools_library for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor','Coordenador'))
);
create policy "Managers can delete tools" on tools_library for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('CEO','CFO','CMO','COO','Diretor','Coordenador'))
);

-- ─── marketing_campaigns ──────────────────────────────────────────────────
create table if not exists marketing_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  status      text not null default 'rascunho',
  description text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table marketing_campaigns enable row level security;
create policy "Authenticated users can view campaigns" on marketing_campaigns for select using (auth.uid() is not null);

-- ─── calendar_events ──────────────────────────────────────────────────────
create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  start_time  timestamptz not null,
  end_time    timestamptz,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists calendar_events_start_idx on calendar_events(start_time);
alter table calendar_events enable row level security;
create policy "Authenticated users can view events" on calendar_events for select using (auth.uid() is not null);
