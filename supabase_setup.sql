-- Supabase Setup for Salvation Army Community Meals — Inventory & Kitchen OS
-- Run this in your Supabase Dashboard -> SQL Editor

create table if not exists public.kitchen_records (
  id text primary key,
  data jsonb not null,
  updated_by text,
  updated_at timestamptz default now()
);

alter table public.kitchen_records enable row level security;

drop policy if exists "Allow kitchen app access" on public.kitchen_records;
create policy "Allow kitchen app access"
  on public.kitchen_records
  for all
  using (true)
  with check (true);

-- Enable Realtime sync across kitchen tablets and devices
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kitchen_records'
  ) then
    alter publication supabase_realtime add table public.kitchen_records;
  end if;
end $$;
