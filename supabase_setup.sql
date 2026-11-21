-- ============================================================================
-- The Salvation Army Community Meals (Butler, PA) — Unified KMS Database
-- Recreated Relational PostgreSQL / Supabase Schema
-- Run this in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Users & Role-Based Access
create table if not exists public.kms_users (
  id text primary key,
  name text not null,
  role text not null check (role in ('ADMIN', 'MANAGER', 'STAFF', 'VOLUNTEER')),
  initials text not null,
  pin_hash text not null,
  pin_salt text not null,
  must_change_pin boolean not null default false,
  active boolean not null default true,
  onboarding_completed boolean not null default false,
  completed_training_ids jsonb not null default '[]'::jsonb,
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

-- Row Level Security (Open Kitchen Tablet Policy — Replace with Supabase Auth JWTs if moving to per-user cloud auth)
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
    execute format('create policy "Allow kitchen app access" on public.%I for all using (true) with check (true);', tbl);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    end if;
  end loop;
end $$;