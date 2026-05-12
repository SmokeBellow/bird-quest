-- Bird observations
create table if not exists bird_observations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  bird jsonb not null,
  observed_at text not null,
  location jsonb,
  method text,
  image_url text,
  confidence float,
  notes text,
  created_at timestamptz default now()
);

alter table bird_observations enable row level security;

create policy "Users manage own bird obs" on bird_observations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Plant observations
create table if not exists plant_observations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plant jsonb not null,
  observed_at text not null,
  location jsonb,
  image_url text,
  confidence float,
  created_at timestamptz default now()
);

alter table plant_observations enable row level security;

create policy "Users manage own plant obs" on plant_observations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fungus observations
create table if not exists fungus_observations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  fungus jsonb not null,
  observed_at text not null,
  location jsonb,
  image_url text,
  confidence float,
  created_at timestamptz default now()
);

alter table fungus_observations enable row level security;

create policy "Users manage own fungus obs" on fungus_observations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
