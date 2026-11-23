-- ============================================================================
-- The Salvation Army Community Meals (Butler, PA) — Unified KMS Database
-- Recreated Relational PostgreSQL / Supabase Schema
-- Run this in your Supabase Dashboard -> SQL Editor (safe to re-run)
-- SECURITY MODEL (Option C): the database requires a signed-in Supabase Auth
-- "kitchen tablet" account (RLS = authenticated only). PINs are stored ONLY in
-- kms_user_secrets (bcrypt, never readable by the app) and are checked by the
-- kms_login / kms_set_pin functions, with lockout after 5 wrong attempts.
-- ============================================================================

-- 1. Users & Role-Based Access
create table if not exists public.kms_users (
  id text primary key,
  name text not null,
  role text not null check (role in ('ADMIN', 'MANAGER', 'STAFF', 'VOLUNTEER')),
  initials text not null,
  must_change_pin boolean not null default false,
  active boolean not null default true,
  onboarding_completed boolean not null default false,
  completed_training_ids jsonb not null default '[]'::jsonb,
  email text not null default '',
  updated_at timestamptz not null default now()
);

-- 2. Inventory Items (Living Stock, Auto-Learning Pars & Cadence)
create table if not exists public.kms_inventory_items (
  id text primary key,
  sku text not null,
  name text not null,
  location text not null,
  category text not null default 'General',
  unit text not null default 'cases',
  pack_label text not null default 'case',
  units_per_pack numeric not null default 1,
  on_hand numeric not null default 0,
  par numeric not null default 1,
  par_manual boolean not null default false,
  par_learned boolean not null default false,
  cadence text not null default 'M' check (cadence in ('W', 'M')),
  vendor text not null default 'Jordan Banana',
  unit_price numeric,
  usage_log jsonb not null default '[]'::jsonb,
  discontinued boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 3. Standardized Recipes (with Allergens, Steps & Stock Mapping)
create table if not exists public.kms_recipes (
  id text primary key,
  name text not null,
  category text not null default 'Main Entree',
  base_servings numeric not null default 65,
  prep_min integer not null default 20,
  cook_min integer not null default 35,
  allergens jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  ingredients jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 4. Menu Plan & Service History (Forecasting + Auto-Deduction)
create table if not exists public.kms_menu_plan (
  id text primary key,
  service_date text not null,
  recipe_id text,
  custom_title text,
  menu_type text not null default 'RECIPE',
  planned_portions integer not null default 65,
  served_portions integer,
  status text not null default 'PLANNED' check (status in ('PLANNED', 'CONFIRMED', 'DEDUCTED', 'SERVED', 'CLOSED')),
  circumstance text not null default 'Normal Day',
  note text,
  logged_by text,
  prep_checked_items jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 5. Purchase Orders (Request -> Management Approval -> Delivery Reconciliation)
create table if not exists public.kms_purchase_orders (
  id text primary key,
  po_number text not null,
  vendor text not null,
  cadence text not null default 'M',
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'ordered', 'closed')),
  requested_by text,
  requested_date text,
  approved_by text,
  approved_date text,
  expected_arrival text,
  vendor_conf text,
  notes text,
  lines jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 6. Inventory Transactions (Receiving, Expiry Tracking, Usage, Waste, Audit Adjustments)
create table if not exists public.kms_transactions (
  id text primary key,
  tx_date text not null,
  tx_type text not null check (tx_type in ('RECEIVE', 'USAGE', 'WASTE', 'ADJUST', 'INIT')),
  item_id text,
  item_name text not null,
  unit text not null default 'units',
  qty numeric not null default 0,
  source text,
  exp_date text,
  cleared boolean not null default false,
  reason text,
  cost numeric not null default 0,
  po_number text,
  staff_name text,
  note text,
  created_at timestamptz not null default now()
);

-- 7. Daily Food Safety Logs (6-Point Temps + 7-Point Cleaning)
create table if not exists public.kms_safety_logs (
  log_date text primary key,
  temps jsonb not null default '{}'::jsonb,
  cleaning jsonb not null default '{}'::jsonb,
  logged_by text,
  updated_at timestamptz not null default now()
);

-- 8. Storage & ServSafe Date-Marking Tags (Meal Leftovers vs. Daily Salad Bar)
create table if not exists public.kms_storage_tags (
  id text primary key,
  item_name text not null,
  tag_category text not null default 'LEFTOVER' check (tag_category in ('LEFTOVER', 'SALAD_BAR')),
  zone text not null default 'Walk-in cooler',
  qty_label text,
  prep_date text not null,
  prep_time text,
  use_by_date text not null,
  temp_f numeric,
  notes text,
  tagged_by text,
  status text not null default 'STORED' check (status in ('STORED', 'USED', 'DISCARDED')),
  closed_by text,
  closed_at text,
  updated_at timestamptz not null default now()
);

-- 9. Operational Checklists (Daily / Weekly / Monthly + Priority Carryover)
create table if not exists public.kms_checklists (
  id text primary key,
  freq text not null check (freq in ('daily', 'weekly', 'monthly')),
  category text not null default 'Cleaning',
  title text not null,
  done boolean not null default false,
  done_by text,
  done_at text,
  priority_carryover boolean not null default false,
  carryover_from_date text,
  updated_at timestamptz not null default now()
);

-- 10. Blind Physical Audits
create table if not exists public.kms_blind_audits (
  id text primary key,
  audit_date text not null,
  auditor text not null,
  zone text not null default 'ALL',
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 11. Announcements & Scheduled Reminders
create table if not exists public.kms_announcements (
  id text primary key,
  priority text not null default 'reminder' check (priority in ('urgent', 'reminder', 'info')),
  title text not null,
  body text not null,
  alert_at text,
  repeat_rule text not null default 'none',
  repeat_days jsonb not null default '[]'::jsonb,
  expires_at text,
  author text,
  dismissed_by jsonb not null default '{}'::jsonb,
  created_at text not null
);

-- 12. Kitchen Instant Messaging
create table if not exists public.kms_messages (
  id text primary key,
  sender_id text not null,
  sender_name text not null,
  sender_role text not null,
  recipient_id text not null default 'ALL',
  recipient_name text not null default 'Everyone',
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  body text not null,
  created_at_ms bigint not null,
  timestamp_label text not null
);

-- 13. Real-Time Accountability Feed
create table if not exists public.kms_activity_logs (
  id text primary key,
  actor_name text not null,
  actor_role text,
  category text not null,
  detail text not null,
  timestamp_label text not null,
  created_at_ms bigint not null
);

-- 14. System Settings & Metadata (Learning Start Date, Auto-Lock, Zones, Training Modules)
create table if not exists public.kms_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Helpful Indexes
create index if not exists idx_kms_menu_date on public.kms_menu_plan (service_date);
create index if not exists idx_kms_tx_date on public.kms_transactions (tx_date);
create index if not exists idx_kms_tags_status on public.kms_storage_tags (status, use_by_date);
create index if not exists idx_kms_activity_ms on public.kms_activity_logs (created_at_ms desc);

-- Row Level Security: ONLY the signed-in kitchen-tablet account may touch data.
-- (anon = anyone holding the public key = no access at all)
do $$
declare
  tbl text;
  tables text[] := array[
    'kms_users', 'kms_inventory_items', 'kms_recipes', 'kms_menu_plan',
    'kms_purchase_orders', 'kms_transactions', 'kms_safety_logs', 'kms_storage_tags',
    'kms_checklists', 'kms_blind_audits', 'kms_announcements', 'kms_messages',
    'kms_activity_logs', 'kms_settings'
  ];
begin
  foreach tbl in array tables loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('drop policy if exists "Allow kitchen app access" on public.%I;', tbl);
    execute format('drop policy if exists "Kitchen tablets only" on public.%I;', tbl);
    execute format('create policy "Kitchen tablets only" on public.%I for all to authenticated using (true) with check (true);', tbl);
    execute format('revoke all on public.%I from anon;', tbl);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    end if;
  end loop;
end $$;

-- Idempotent Upgrades for Existing Databases
alter table public.kms_users add column if not exists email text not null default '';
alter table public.kms_users drop constraint if exists kms_users_role_check;
update public.kms_users set role = case
  when upper(role) = 'ADMIN' then 'ADMIN'
  when upper(role) in ('MANAGER', 'MANAGEMENT') then 'MANAGER'
  when upper(role) = 'STAFF' then 'STAFF'
  else 'VOLUNTEER'
end
where role is distinct from case
  when upper(role) = 'ADMIN' then 'ADMIN'
  when upper(role) in ('MANAGER', 'MANAGEMENT') then 'MANAGER'
  when upper(role) = 'STAFF' then 'STAFF'
  else 'VOLUNTEER'
end;
alter table public.kms_users add constraint kms_users_role_check check (role in ('ADMIN', 'MANAGER', 'STAFF', 'VOLUNTEER'));

alter table public.kms_messages add column if not exists recipient_id text not null default 'ALL';
alter table public.kms_messages add column if not exists recipient_name text not null default 'Everyone';
alter table public.kms_messages add column if not exists priority text not null default 'normal';

alter table public.kms_recipes add column if not exists photo_url text not null default '';
alter table public.kms_recipes add column if not exists notes text not null default '';

-- ============================================================================
-- SERVER-SIDE PINS (Option C)
-- ============================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.kms_user_secrets (
  user_id text primary key references public.kms_users(id) on delete cascade,
  pin_hash text,                 -- bcrypt hash (current)
  legacy_hash text,              -- old browser SHA-256 hash, upgraded to bcrypt on first good login
  legacy_salt text,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.kms_user_secrets enable row level security;   -- no policies = no direct access
revoke all on public.kms_user_secrets from anon, authenticated;

-- Move existing PIN hashes out of kms_users (existing databases), then drop the columns
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'kms_users' and column_name = 'pin_hash') then
    insert into public.kms_user_secrets (user_id, legacy_hash, legacy_salt)
      select id, pin_hash, pin_salt from public.kms_users
      on conflict (user_id) do nothing;
    alter table public.kms_users drop column pin_hash;
    alter table public.kms_users drop column pin_salt;
  end if;
end $$;

-- Starting accounts for a brand-new database (PINs are forced to change at first login)
insert into public.kms_users (id, name, role, initials, must_change_pin) values
  ('usr-1', 'William Clark',   'ADMIN',     'WC', true),
  ('usr-2', 'Kitchen Manager', 'MANAGER',   'KM', true),
  ('usr-3', 'Sabrina',         'STAFF',     'SB', true),
  ('usr-4', 'Volunteer Team',  'VOLUNTEER', 'VT', true)
on conflict (id) do nothing;
insert into public.kms_user_secrets (user_id, pin_hash)
  select v.id, extensions.crypt(v.pin, extensions.gen_salt('bf', 8))
  from (values ('usr-1', '1234'), ('usr-2', '1111'), ('usr-3', '2222'), ('usr-4', '0000')) as v(id, pin)
  where exists (select 1 from public.kms_users u where u.id = v.id)
on conflict (user_id) do nothing;

-- Internal: verify a PIN, handle legacy upgrade + lockout (5 misses = 5 minute lock)
create or replace function public.kms__check_pin(p_user_id text, p_pin text)
returns boolean
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  s public.kms_user_secrets%rowtype;
  ok boolean := false;
  h text;
  i integer;
begin
  if p_pin is null or length(p_pin) = 0 then return false; end if;
  select * into s from public.kms_user_secrets where user_id = p_user_id for update;
  if not found then return false; end if;
  if s.locked_until is not null and s.locked_until > now() then return false; end if;

  if s.pin_hash is not null then
    ok := (s.pin_hash = crypt(p_pin, s.pin_hash));
  elsif s.legacy_hash is not null and s.legacy_salt is not null then
    h := encode(digest(convert_to(s.legacy_salt || '|' || p_pin, 'UTF8'), 'sha256'), 'hex');
    for i in 1..2000 loop
      h := encode(digest(convert_to(h || s.legacy_salt || p_pin, 'UTF8'), 'sha256'), 'hex');
    end loop;
    ok := (h = s.legacy_hash);
    if ok then
      update public.kms_user_secrets
         set pin_hash = crypt(p_pin, gen_salt('bf', 8)), legacy_hash = null, legacy_salt = null
       where user_id = p_user_id;
    end if;
  end if;

  if ok then
    update public.kms_user_secrets set failed_count = 0, locked_until = null, updated_at = now()
     where user_id = p_user_id;
  else
    update public.kms_user_secrets
       set failed_count = case when failed_count >= 4 then 0 else failed_count + 1 end,
           locked_until = case when failed_count >= 4 then now() + interval '5 minutes' else locked_until end,
           updated_at = now()
     where user_id = p_user_id;
  end if;
  return ok;
end $$;

-- Sign in: returns {ok, role, must_change_pin} or {ok:false, error:'bad_pin'|'locked'|'unknown', retry_seconds}
create or replace function public.kms_login(p_user_id text, p_pin text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  u public.kms_users%rowtype;
  lu timestamptz;
begin
  select * into u from public.kms_users where id = p_user_id and active = true;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;

  select locked_until into lu from public.kms_user_secrets where user_id = p_user_id;
  if lu is not null and lu > now() then
    return jsonb_build_object('ok', false, 'error', 'locked',
                              'retry_seconds', ceil(extract(epoch from (lu - now())))::int);
  end if;

  if public.kms__check_pin(p_user_id, p_pin) then
    return jsonb_build_object('ok', true, 'role', u.role, 'must_change_pin', u.must_change_pin);
  end if;

  select locked_until into lu from public.kms_user_secrets where user_id = p_user_id;
  if lu is not null and lu > now() then
    return jsonb_build_object('ok', false, 'error', 'locked',
                              'retry_seconds', ceil(extract(epoch from (lu - now())))::int);
  end if;
  return jsonb_build_object('ok', false, 'error', 'bad_pin');
end $$;

-- Set / reset a PIN. The ACTING user proves who they are with their own PIN.
--   self-change: actor = target.  ADMIN: any account.  MANAGER: STAFF and VOLUNTEER only.
create or replace function public.kms_set_pin(
  p_actor_id text, p_actor_pin text, p_target_id text, p_new_pin text, p_must_change boolean
)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  actor public.kms_users%rowtype;
  target public.kms_users%rowtype;
  allowed boolean := false;
begin
  if p_new_pin is null or length(p_new_pin) < 6
     or p_new_pin in ('000000', '111111', '123456', '1234567', '12345678', 'password', 'qwerty') then
    return jsonb_build_object('ok', false, 'error', 'weak_pin');
  end if;

  select * into actor from public.kms_users where id = p_actor_id and active = true;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  if not public.kms__check_pin(p_actor_id, p_actor_pin) then
    return jsonb_build_object('ok', false, 'error', 'bad_actor_pin');
  end if;

  select * into target from public.kms_users where id = p_target_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown_target'); end if;

  if actor.id = target.id then allowed := true;
  elsif actor.role = 'ADMIN' then allowed := true;
  elsif actor.role = 'MANAGER' and target.role in ('STAFF', 'VOLUNTEER') then allowed := true;
  end if;
  if not allowed then return jsonb_build_object('ok', false, 'error', 'not_allowed'); end if;

  insert into public.kms_user_secrets (user_id, pin_hash, failed_count, locked_until)
    values (target.id, crypt(p_new_pin, gen_salt('bf', 8)), 0, null)
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, legacy_hash = null, legacy_salt = null,
        failed_count = 0, locked_until = null, updated_at = now();

  update public.kms_users
     set must_change_pin = coalesce(p_must_change, false), updated_at = now()
   where id = target.id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.kms__check_pin(text, text) from public, anon, authenticated;
revoke all on function public.kms_login(text, text) from public, anon;
revoke all on function public.kms_set_pin(text, text, text, text, boolean) from public, anon;
grant execute on function public.kms_login(text, text) to authenticated;
grant execute on function public.kms_set_pin(text, text, text, text, boolean) to authenticated;

-- ============================================================================
-- EMERGENCY ADMIN PIN RECOVERY (run manually in the SQL Editor if the admin
-- forgets their PIN; there is intentionally no app-side bypass):
--
--   insert into public.kms_user_secrets (user_id, pin_hash)
--     values ('usr-1', extensions.crypt('TempPin2026', extensions.gen_salt('bf', 8)))
--   on conflict (user_id) do update set pin_hash = excluded.pin_hash,
--     legacy_hash = null, legacy_salt = null, failed_count = 0, locked_until = null;
--   update public.kms_users set must_change_pin = true where id = 'usr-1';
-- ============================================================================
