-- supabase/schema.sql — The Salvation Army Community Meals KMS (Butler, PA)
-- Run in Supabase SQL Editor to initialize tables, bcrypt PIN RPCs, and Realtime sync.

create extension if not exists pgcrypto;

-- 1. Inventory Items
create table if not exists public.kms_inventory_items (
  id text primary key,
  sku text not null,
  name text not null,
  location text not null,
  category text default 'General',
  unit text not null,
  pack_label text not null,
  units_per_pack numeric default 1,
  on_hand numeric default 0,
  par numeric default 1,
  par_manual boolean default false,
  par_learned boolean default false,
  cadence text default 'M',
  vendor text default '',
  unit_price numeric,
  usage_log jsonb default '[]'::jsonb,
  discontinued boolean default false,
  updated_at timestamptz default now()
);

-- 2. Standardized Recipes
create table if not exists public.kms_recipes (
  id text primary key,
  name text not null,
  category text default 'Main Entree',
  base_servings integer default 65,
  prep_min integer default 20,
  cook_min integer default 35,
  allergens jsonb default '[]'::jsonb,
  steps jsonb default '[]'::jsonb,
  ingredients jsonb default '[]'::jsonb,
  photo_url text default '',
  notes text default '',
  updated_at timestamptz default now()
);

-- 3. Menu Plan & Patron Attendance History
create table if not exists public.kms_menu_plan (
  id text primary key,
  service_date text not null,
  recipe_id text default '',
  custom_title text default '',
  menu_type text default 'RECIPE',
  planned_portions integer default 0,
  served_portions integer,
  status text default 'PLANNED',
  circumstance text default 'Normal Day',
  note text default '',
  logged_by text default '',
  prep_checked_items jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 4. Purchase Orders
create table if not exists public.kms_purchase_orders (
  id text primary key,
  po_number text not null,
  vendor text not null,
  cadence text default 'W',
  status text default 'requested',
  requested_by text default '',
  requested_date text default '',
  approved_by text default '',
  approved_date text default '',
  expected_arrival text default '',
  vendor_conf text default '',
  notes text default '',
  lines jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 5. Inventory Transactions (Receives & Waste)
create table if not exists public.kms_transactions (
  id text primary key,
  tx_date text not null,
  tx_type text not null,
  item_id text default '',
  item_name text not null,
  unit text not null,
  qty numeric not null,
  source text default '',
  exp_date text default '',
  cleared boolean default false,
  reason text default '',
  cost numeric default 0,
  po_number text default '',
  staff_name text default '',
  note text default '',
  created_at timestamptz default now()
);

-- 6. FIFO Storage & Date Labels
create table if not exists public.kms_storage_tags (
  id text primary key,
  item_name text not null,
  tag_category text default 'LEFTOVER',
  zone text not null,
  qty_label text default '',
  prep_date text not null,
  prep_time text default '',
  use_by_date text not null,
  temp_f numeric,
  notes text default '',
  tagged_by text default '',
  status text default 'STORED',
  closed_by text default '',
  closed_at text default ''
);

-- 7. Operational Checklists
create table if not exists public.kms_checklists (
  id text primary key,
  freq text not null,
  category text default 'Food Safety / Cleaning',
  title text not null,
  done boolean default false,
  done_by text default '',
  done_at text default '',
  priority_carryover boolean default false
);

-- 8. Users & Server-Side Bcrypt PIN Hashes
create table if not exists public.kms_users (
  id text primary key,
  name text not null,
  role text not null default 'VOLUNTEER',
  initials text not null,
  active boolean default true,
  onboarding_completed boolean default false,
  completed_training_ids jsonb default '[]'::jsonb,
  email text default '',
  pin_bcrypt text,
  must_change_pin boolean default true,
  failed_attempts integer default 0,
  locked_until timestamptz
);

-- 9. Kitchen Announcements & Scheduled Reminders
create table if not exists public.kms_announcements (
  id text primary key,
  priority text default 'info',
  title text not null,
  body text not null,
  alert_at text default '',
  repeat_rule text default 'none',
  repeat_days jsonb default '[]'::jsonb,
  expires_at text default '',
  author text default '',
  dismissed_by jsonb default '{}'::jsonb,
  created_at text default ''
);

-- 10. Kitchen Alerts & Private DMs
create table if not exists public.kms_messages (
  id text primary key,
  sender_id text not null,
  sender_name text not null,
  sender_role text default '',
  recipient_id text default 'ALL',
  recipient_name text default 'Everyone',
  priority text default 'normal',
  body text not null,
  created_at_ms bigint not null,
  timestamp_label text default ''
);

-- 11. Daily HACCP Safety Logs
create table if not exists public.kms_safety_logs (
  log_date text primary key,
  temps jsonb default '{}'::jsonb,
  cleaning jsonb default '{}'::jsonb,
  logged_by text default '',
  updated_at timestamptz default now()
);

-- 12. Real-Time Accountability Feed
create table if not exists public.kms_activity_logs (
  id text primary key,
  actor_name text not null,
  actor_role text default '',
  category text default 'ACTION',
  detail text default '',
  timestamp_label text default '',
  created_at_ms bigint not null
);

-- 13. Blind Physical Audit History
create table if not exists public.kms_blind_audits (
  id text primary key,
  audit_date text not null,
  auditor text default '',
  zone text default 'ALL',
  rows jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 14. App Settings, Recipe Suggestions & In-Kind Donations Archive
create table if not exists public.kms_settings (
  key text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS) with Public Anon Policies (PIN RPCs guard auth)
alter table public.kms_inventory_items enable row level security;
alter table public.kms_recipes enable row level security;
alter table public.kms_menu_plan enable row level security;
alter table public.kms_purchase_orders enable row level security;
alter table public.kms_transactions enable row level security;
alter table public.kms_storage_tags enable row level security;
alter table public.kms_checklists enable row level security;
alter table public.kms_users enable row level security;
alter table public.kms_announcements enable row level security;
alter table public.kms_messages enable row level security;
alter table public.kms_safety_logs enable row level security;
alter table public.kms_activity_logs enable row level security;
alter table public.kms_blind_audits enable row level security;
alter table public.kms_settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kms_inventory_items','kms_recipes','kms_menu_plan','kms_purchase_orders',
    'kms_transactions','kms_storage_tags','kms_checklists','kms_users',
    'kms_announcements','kms_messages','kms_safety_logs','kms_activity_logs',
    'kms_blind_audits','kms_settings'
  ] loop
    execute format('drop policy if exists "kms_all_%s" on public.%I', t, t);
    execute format('create policy "kms_all_%s" on public.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- Protect pin_bcrypt column from direct client reads
revoke select (pin_bcrypt) on public.kms_users from anon, authenticated;

-- RPC 1: Verify User PIN with Rate-Limiting Lockout
create or replace function public.kms_login(p_user_id text, p_pin text)
returns jsonb
language plpgsql
security definer
as $$
declare
  u record;
begin
  select * into u from public.kms_users where id = p_user_id and active = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if u.locked_until is not null and u.locked_until > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'locked',
      'retry_seconds', extract(epoch from (u.locked_until - now()))::int
    );
  end if;

  if u.pin_bcrypt is null or u.pin_bcrypt = crypt(p_pin, u.pin_bcrypt) then
    update public.kms_users
      set failed_attempts = 0, locked_until = null
      where id = p_user_id;
    return jsonb_build_object(
      'ok', true,
      'role', u.role,
      'must_change_pin', coalesce(u.must_change_pin, false)
    );
  else
    update public.kms_users
      set failed_attempts = coalesce(failed_attempts, 0) + 1,
          locked_until = case when coalesce(failed_attempts, 0) + 1 >= 5 then now() + interval '5 minutes' else null end
      where id = p_user_id;
    return jsonb_build_object('ok', false, 'error', 'bad_pin');
  end if;
end;
$$;

-- RPC 2: Set or Reset PIN (Self-Service or Role-Authorized Manager/Admin)
create or replace function public.kms_set_pin(
  p_actor_id text,
  p_actor_pin text,
  p_target_id text,
  p_new_pin text,
  p_must_change boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  actor record;
  target record;
  actor_rank int;
  target_rank int;
begin
  if length(trim(coalesce(p_new_pin, ''))) < 6
     or p_new_pin in ('000000','111111','123456','654321','password') then
    return jsonb_build_object('ok', false, 'error', 'weak_pin');
  end if;

  select * into actor from public.kms_users where id = p_actor_id and active = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'bad_actor_pin');
  end if;

  if actor.pin_bcrypt is not null and actor.pin_bcrypt <> crypt(p_actor_pin, actor.pin_bcrypt) then
    return jsonb_build_object('ok', false, 'error', 'bad_actor_pin');
  end if;

  select * into target from public.kms_users where id = p_target_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_actor_id <> p_target_id then
    actor_rank := case upper(actor.role) when 'ADMIN' then 4 when 'MANAGER' then 3 when 'STAFF' then 2 else 1 end;
    target_rank := case upper(target.role) when 'ADMIN' then 4 when 'MANAGER' then 3 when 'STAFF' then 2 else 1 end;
    if actor_rank < 3 or (upper(actor.role) <> 'ADMIN' and target_rank >= actor_rank) then
      return jsonb_build_object('ok', false, 'error', 'not_allowed');
    end if;
  end if;

  update public.kms_users
    set pin_bcrypt = crypt(p_new_pin, gen_salt('bf', 10)),
        must_change_pin = p_must_change,
        failed_attempts = 0,
        locked_until = null
    where id = p_target_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Enable Realtime on all KMS tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'kms_inventory_items','kms_recipes','kms_menu_plan','kms_purchase_orders',
    'kms_transactions','kms_storage_tags','kms_checklists','kms_users',
    'kms_announcements','kms_messages','kms_safety_logs','kms_activity_logs',
    'kms_blind_audits','kms_settings'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;