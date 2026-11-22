# The Salvation Army Community Meals — Unified Kitchen Management System (KMS)

**Butler, PA · Mon / Tue / Wed / Fri Lunch Service (11:30 AM – 12:30 PM)**

A unified, mobile- and tablet-ready Kitchen Management System combining living stockroom inventory, whole-case purchase orders, 40–80 portion recipe scaling with culinary unit conversions, food-safety logging, patron forecasting, and real-time multi-device cloud sync via Supabase.

---

## Repository Files

| File | Purpose | Where to Deploy |
| :--- | :--- | :--- |
| `index.html` | Complete single-file KMS web application | GitHub Pages (`main` branch, root `/`) |
| `.nojekyll` | Disables Jekyll processing on GitHub Pages | GitHub Pages (`main` branch, root `/`) |
| `README.md` | System overview, roles, and deployment guide | GitHub repository root |
| `supabase_setup.sql` | 14-table PostgreSQL schema, RLS policies, Realtime publication, and idempotent migrations | Supabase Dashboard → **SQL Editor** |
| `supabase_edge_notify.ts` | `notify-alert` Edge Function for automated background email alerts via Resend | Supabase Dashboard → **Edge Functions** (`notify-alert`) |
| `supabase_edge_scrape_recipe.ts` | `scrape-recipe` Edge Function for multi-site recipe search & URL import (with reader-proxy fallback) | Supabase Dashboard → **Edge Functions** (`scrape-recipe`) |

---

## Key Capabilities

### 1. Living Inventory, Whole-Case POs & Receiving
- **6 Storage Locations**: Organized across `Walk-in cooler`, `Walk-in freezer`, `Stockroom`, `Kitchen Cooler`, `Kitchen Freezer`, and `Kitchen Dry Goods` with inline location reassignment and vendor cadences (`W` = Weekly Marberger & Produce; `M` = Monthly Jordan Banana).
- **8-Week Auto-Learning Pars**: Calculates `par = avg weekly use × cycle weeks × 1.25` (rounded to `0.01`) after 7+ days of usage; manual edits lock that item's par.
- **Whole-Case Ordering & Par Guardrails**: PO suggestions only trigger when `>= 1` whole case is needed (or `on_hand <= 0` after subtracting open POs), with selectable/editable lines, custom `PO #` / `Vendor Invoice #`, and brand-new item creation inside **Edit PO / Invoice #**.
- **Order Workflow & Delivery Reminders**: `STAFF` can request, edit, and delete `requested` POs; `ADMIN`/`MANAGER` approve, reject, mark ordered (with optional **Expected Delivery Date** and automatic 8:00 AM system reminder), and reconcile full delivery slips under **Receive & Scan**.
- **Fast Scan Terminal & Blind Audits**: Camera QR/barcode scanning (`html5-qrcode`), USB/Bluetooth SKU entry, printable 2-column Shelf QR Labels, and Blind Physical Counts.

### 2. Standardized Recipes (40–80 Portions) & Menu Planning
- **Kitchen-Friendly Measurements & Background Stock Accuracy**: Recipes display culinary units (`cups`, `tbsp`, `tsp`, `fl oz`, `oz`, `lbs`, `quarts`, `gallons`, `pieces`, `to taste`) with fractions (`¼`, `½`, `¾`, etc.) while automatically converting to inventory stock units (`cases`, `cans`, `boxes`, `packs`) in the background (`1 stock unit = X recipe units`).
- **40–80 Portion Scaling & Quick-Scan Table**: Interactive slider, `40–80` presets, `Predicted` turnout button, and a 5-column `40/50/60/70/80` Quick-Scan Table.
- **Web Search, URL Import, Bulk Add/Edit & Photo Support**: Search recipes across Budget Bytes, Skinnytaste, Sally's Baking Addiction, TheMealDB, and DummyJSON; import from any recipe URL (with automatic Jina Reader fallback for `403`-protected sites); bulk-edit or bulk-import multiple recipes/URLs at once; or upload/link recipe photos.
- **Staff Suggestions & Pre-Approval Editing**: `STAFF` submit recipe URLs or text for approval; `ADMIN`/`MANAGER` can **Review & Edit** all fields before approving into the recipe book. Marking a scheduled meal **Served** deducts mapped ingredients from Living Stock and logs leftovers.

### 3. Food Safety, Day-by-Day Forecasting, Chat & Automated Alerts
- **6-Point Temperature & 7-Point Cleaning Logs**: Daily pass/fail checks (`≤41°F` coolers, `≤0°F` freezers, `≥135°F` hot hold/steam table) with printable single-page safety logs.
- **Date Labels (>24 Hours) & Operational Checklists**: FIFO tracking for cooked leftovers (`7d`) and Daily Salad Bar (`3d`/`4d`), plus Daily/Weekly/Monthly checklists with Priority Carryover.
- **Federal Holiday & Order Schedule Alerts**: Automatic 14-day lookahead for all 11 US federal holidays + Thanksgiving Friday, shifting Friday order deadlines to the preceding open business day when a holiday falls on or near Friday.
- **Day-by-Day Patron Forecasting**: Predicts individual service-day turnout across **Next 7 Days**, **Next 4 Weeks (Daily)**, **Next 3 Months (Daily)**, and **Next 12 Months (Daily)** using weekday, seasonal, meal popularity, and holiday/weather factors with a What-If simulator.
- **Team Chat & Email Alerts**: Real-time **Alert All (Broadcast)** and **Private DMs** with **Edit**, **Update**, **Delete**, and **Clear Thread** controls, unread badges, automated background emails via Resend (`notify-alert`), and `mailto:` fallback.

### 4. Role-Based Access Control (RBAC), Accountability & Printing
- **4 Strict Roles**: `ADMIN`, `MANAGER`, `STAFF`, and `VOLUNTEER` with salted SHA-256 PINs, mandatory first-login PIN change, role-specific onboarding training, **Interactive Guided Tour**, and auto-lock on idle or tab close/reopen.
- **Cloud Sync & Full JSON Backup/Restore**: Clickable Supabase status pill to reconnect/pull or push local changes anytime, plus full JSON backup download and file upload restore.
- **Cloud-Synced Accountability Feed**: Tracks sign-ins, failed PINs, manual/auto logouts, stock/PO updates, recipe edits, and safety logs in `kms_activity_logs` with category and keyword filters.
- **Standardized Letter-Size Printing**: Clean `@media print` pagination (`0.45in` Letter margins, `break-inside: avoid`, repeated table headers) for Daily Sheets, Recipe + QR cards, Next-Day Prep lists, Safety Logs, Shelf QR Labels, and Executive Monthly Reports.

---

## Setup & Deployment Guide

### Step 1: Supabase Database (`supabase_setup.sql`)
1. Open your **Supabase Dashboard → SQL Editor**.
2. Paste and run the entire contents of **`supabase_setup.sql`**.
   - Creates (or safely migrates) all **14 normalized tables**: `kms_users`, `kms_inventory_items`, `kms_recipes`, `kms_menu_plan`, `kms_purchase_orders`, `kms_transactions`, `kms_safety_logs`, `kms_storage_tags`, `kms_checklists`, `kms_blind_audits`, `kms_announcements`, `kms_messages`, `kms_activity_logs`, and `kms_settings`.
   - Enables Row Level Security and adds all tables to the `supabase_realtime` publication.

### Step 2: Supabase Auth Recovery Account (Optional Admin Fallback)
1. Open **Supabase Dashboard → Authentication → Users → Add User**.
2. Create an email and strong password for Admin / Tech-Support recovery.
3. On the app's Lock Screen, expand **Admin / Tech-Support Login (Supabase Auth)** to sign in server-side without storing credentials in `index.html`.

### Step 3: Deploy Edge Functions (Free Tier)
1. **Automated Email Alerts (`notify-alert`)**:
   - Create a free **Resend** account (`resend.com`, 3,000 emails/month free) and copy your API key.
   - In **Supabase Dashboard → Edge Functions**, create a function named **`notify-alert`** using **`supabase_edge_notify.ts`**.
   - Under **Edge Functions → Secrets**, add `RESEND_API_KEY` (and optionally `FROM_EMAIL`).
   - Add each team member's email address in **Admin & Reports → Users & Activity**.
2. **Recipe Web Search & URL Scraper (`scrape-recipe`)**:
   - In **Supabase Dashboard → Edge Functions**, create a function named **`scrape-recipe`** using **`supabase_edge_scrape_recipe.ts`** (no external API keys required; included in Supabase's free 500,000 invocations/month tier).

### Step 4: GitHub Pages Hosting
1. Upload **`index.html`**, **`.nojekyll`**, **`README.md`**, and the backend reference files to your GitHub repository (`main` branch).
2. In **Repository Settings → Pages**, set **Source** to `Deploy from a branch`, **Branch** to `main` / `/ (root)`, and save.
3. After updating `index.html`, **hard-refresh** all kitchen tablets/browsers so every device runs the latest version and syncs identically.

### Step 5: Initial Sign-In
- Default starting accounts (all force a personal 6+ character PIN change on first login):
  - **William Clark (`ADMIN`)**: starting PIN `1234`
  - **Kitchen Manager (`MANAGER`)**: starting PIN `1111`
  - **Sabrina (`STAFF`)**: starting PIN `2222`
  - **Volunteer Team (`VOLUNTEER`)**: starting PIN `0000`