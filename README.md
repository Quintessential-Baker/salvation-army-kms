# The Salvation Army Community Meals — Unified Kitchen Management System (KMS)

**Butler, PA · Mon / Tue / Wed / Fri Lunch Service (11:30 AM – 12:30 PM)**

A unified, mobile- and tablet-ready Kitchen Management System combining living stockroom inventory, whole-case purchase orders, 40–80 portion recipe scaling with culinary unit conversions, food-safety logging, patron forecasting, and real-time multi-device cloud sync via Supabase.

---

## Repository Files

| File | Purpose | Where to Deploy |
| :--- | :--- | :--- |
| `index.html` | Complete single-file KMS web application | GitHub Pages (`main` branch, root `/`) |
| `.nojekyll` | Disables Jekyll processing on GitHub Pages | GitHub Pages (`main` branch, root `/`) |
| `README.md` | System overview, security model, roles, and deployment guide | GitHub repository root |
| `supabase_setup.sql` | 14-table schema + `kms_user_secrets`, sign-in-only RLS, server-side PIN functions (`kms_login`, `kms_set_pin`), Realtime publication, and safe re-runnable migrations | Supabase Dashboard → **SQL Editor** |
| `supabase_edge_notify.ts` | `notify-alert` Edge Function (sign-in required; sends only to saved KMS user emails) for automated email alerts via Resend | Supabase Dashboard → **Edge Functions** (`notify-alert`) |
| `supabase_edge_scrape_recipe.ts` | `scrape-recipe` Edge Function (sign-in required; blocks internal/private addresses) for multi-site recipe search & URL import (with reader-proxy fallback) | Supabase Dashboard → **Edge Functions** (`scrape-recipe`) |

---

## Key Capabilities

### 1. Living Inventory, Whole-Case POs & Receiving
- **Butler, PA Stockroom Seed**: Organized across `Walk-in cooler`, `Walk-in freezer`, and `Stockroom` with vendor cadences (`W` = Weekly Marberger & Produce; `M` = Monthly Jordan Banana).
- **8-Week Auto-Learning Pars**: Calculates `par = avg weekly use × cycle weeks × 1.25` (rounded to `0.01`) after 7+ days of usage; manual edits lock that item's par.
- **Whole-Case Ordering & Par Guardrails**: PO suggestions only trigger when `>= 1` whole case is needed (or `on_hand <= 0` after subtracting open POs), with selectable/editable lines, custom `PO #` / `Vendor Invoice #`, and brand-new item creation inside **Edit PO / Invoice #**.
- **Order Workflow & Delivery Reminders**: `STAFF` can request, edit, and delete `requested` POs; `ADMIN`/`MANAGER` approve, reject, mark ordered (with optional **Expected Delivery Date** and automatic 8:00 AM system reminder), and reconcile full delivery slips under **Receive & Scan**.
- **Fast Scan Terminal & Blind Audits**: Camera QR/barcode scanning (`html5-qrcode`), USB/Bluetooth SKU entry, printable 2-column Shelf QR Labels, and Blind Physical Counts.

### 2. Standardized Recipes (40–80 Portions) & Menu Planning
- **Kitchen-Friendly Measurements & Background Stock Accuracy**: Recipes display culinary units (`cups`, `tbsp`, `tsp`, `fl oz`, `oz`, `lbs`, `quarts`, `gallons`, `pieces`, `to taste`) with fractions (`¼`, `½`, `¾`, etc.) while automatically converting to inventory stock units (`cases`, `cans`, `boxes`, `packs`) in the background (`1 stock unit = X recipe units`).
- **40–80 Portion Scaling & Quick-Scan Table**: Interactive slider, `40–80` presets, `Predicted` turnout button, and a 5-column `40/50/60/70/80` Quick-Scan Table.
- **Web Search, URL Import & Photo Support**: Search recipes across Budget Bytes, Skinnytaste, Sally's Baking Addiction, TheMealDB, and DummyJSON; import from any recipe URL (with automatic Jina Reader fallback for `403`-protected sites); paste raw text; or upload/link recipe photos.
- **Staff Suggestions & Menu Deduction**: `STAFF` submit recipe and menu suggestions for `ADMIN`/`MANAGER` approval; marking a scheduled meal **Served** deducts mapped ingredients from Living Stock and logs leftovers.

### 3. Food Safety, Forecasting, Chat & Automated Alerts
- **6-Point Temperature & 7-Point Cleaning Logs**: Daily pass/fail checks (`≤41°F` coolers, `≤0°F` freezers, `≥135°F` hot hold/steam table) with printable single-page safety logs.
- **Date Labels (>24 Hours) & Operational Checklists**: FIFO tracking for cooked leftovers (`7d`) and Daily Salad Bar (`3d`/`4d`), plus Daily/Weekly/Monthly checklists with Priority Carryover.
- **Federal Holiday & Order Schedule Alerts**: Automatic 14-day lookahead for all 11 US federal holidays + Thanksgiving Friday, shifting Friday order deadlines to the preceding open business day when a holiday falls on or near Friday.
- **Multi-Factor Patron Forecasting**: Predicts turnout across Days, Weeks, Months, and Years using weekday, meal popularity, and holiday/weather factors with a What-If simulator.
- **Forecast-Driven Portions**: Menu Planner, Daily Sheets, Next-Day Prep, Recipe Scaling, Order Demand, and the Patrons Served form all default to the live attendance prediction (`predictedPortions()`), not a fixed 65. A manually entered count always wins. 65 is used only when there is no attendance history yet.
- **Team Chat & Email Alerts**: Real-time **Alert All (Broadcast)** and **Private DMs** with unread badges, automated background emails via Resend (`notify-alert`), and `mailto:` fallback on PO submissions and urgent messages.

### 4. Role-Based Access Control (RBAC), Accountability & Printing
- **4 Strict Roles**: `ADMIN`, `MANAGER`, `STAFF`, and `VOLUNTEER` with **server-verified bcrypt PINs** (5 wrong attempts = 5-minute lockout), mandatory first-login PIN change, role-specific onboarding training, **Interactive Guided Tour**, and auto-lock on idle or tab close/reopen.
- **User Hierarchy**: `ADMIN` can create, edit, promote (up to `ADMIN`), deactivate, and delete accounts; `MANAGER` can manage `STAFF` and `VOLUNTEER` accounts.
- **Cloud-Synced Accountability Feed**: Tracks sign-ins, failed/locked-out PINs, PIN resets, manual/auto logouts, stock/PO updates, recipe edits, and safety logs in `kms_activity_logs` with category and keyword filters.
- **Standardized Letter-Size Printing**: Clean `@media print` pagination (`0.45in` Letter margins, `break-inside: avoid`, repeated table headers) for Daily Sheets, Recipe + QR cards, Next-Day Prep lists, Safety Logs, Shelf QR Labels, and Executive Monthly Reports.

---

## Setup & Deployment Guide

### Step 1: Supabase Database (`supabase_setup.sql`)
1. Open your **Supabase Dashboard → SQL Editor**.
2. Paste and run the entire contents of **`supabase_setup.sql`**.
   - Creates (or safely migrates) all **14 normalized tables**: `kms_users`, `kms_inventory_items`, `kms_recipes`, `kms_menu_plan`, `kms_purchase_orders`, `kms_transactions`, `kms_safety_logs`, `kms_storage_tags`, `kms_checklists`, `kms_blind_audits`, `kms_announcements`, `kms_messages`, `kms_activity_logs`, and `kms_settings`.
   - Enables Row Level Security and adds all tables to the `supabase_realtime` publication.

### Step 2: Create the Shared Kitchen-Tablet Account (Required)
The database only answers to a signed-in Supabase Auth account, so the public key in `index.html` is useless on its own.
1. Open **Supabase Dashboard → Authentication → Users → Add User** (tick *Auto Confirm User*).
2. Create one account, for example `kitchen-tablets@yourdomain` with a strong password. Do **not** put this password in any file.
3. Optional hardening: **Authentication → Sign In / Providers**: turn off *Allow new users to sign up* so nobody can create their own account.
4. On each tablet, open the app → lock screen → **Connect This Tablet (one-time setup)** and sign in with that account. The tablet stays connected; staff then sign in with their own PINs.
5. If the tablet password is ever shared too widely, change it in Supabase and reconnect each tablet.

### Step 3: Deploy Edge Functions (Free Tier)
1. **Automated Email Alerts (`notify-alert`)**:
   - Create a free **Resend** account (`resend.com`, 3,000 emails/month free) and copy your API key.
   - In **Supabase Dashboard → Edge Functions**, create a function named **`notify-alert`** using **`supabase_edge_notify.ts`**.
   - Under **Edge Functions → Secrets**, add `RESEND_API_KEY` (and optionally `FROM_EMAIL`).
   - Add each team member's email address in **Admin & Reports → Users & Activity**. Alerts are sent **only** to emails saved on active KMS accounts.
   - Leave **Verify JWT** enabled (default). The function also checks for a signed-in tablet session.
2. **Recipe Web Search & URL Scraper (`scrape-recipe`)**:
   - In **Supabase Dashboard → Edge Functions**, create a function named **`scrape-recipe`** using **`supabase_edge_scrape_recipe.ts`** (no external API keys required; included in Supabase's free 500,000 invocations/month tier). Leave **Verify JWT** enabled.
3. *(Optional)* Add secret `ALLOWED_ORIGIN` = `https://YOUR-USER.github.io` to both functions so only your site can call them from a browser.

### Step 4: GitHub Pages Hosting
1. Upload **`index.html`**, **`.nojekyll`**, **`README.md`**, and the backend reference files to your GitHub repository (`main` branch).
2. In **Repository Settings → Pages**, set **Source** to `Deploy from a branch`, **Branch** to `main` / `/ (root)`, and save.
3. After updating `index.html`, **hard-refresh** all kitchen tablets/browsers so every device runs the latest version and syncs identically.

### Step 5: Initial Sign-In
1. Connect the tablet (Step 2.4).
2. Pick your name and sign in with the starting PIN; you are forced to choose a personal PIN (6+ characters, nothing obvious):
   - **William Clark (`ADMIN`)**: `1234`
   - **Kitchen Manager (`MANAGER`)**: `1111`
   - **Sabrina (`STAFF`)**: `2222`
   - **Volunteer Team (`VOLUNTEER`)**: `0000`
3. **Upgrading an existing database?** Just re-run `supabase_setup.sql`. Existing PINs keep working and are upgraded to bcrypt automatically at each person's next sign-in.

### Resetting PINs
- **Admin/Manager resetting someone:** Users & Activity → **Reset PIN**. The app generates a random temporary PIN and shows it once; the person must set a new one at sign-in. Managers can reset STAFF and VOLUNTEER accounts only (enforced in the database).
- **Admin forgot their own PIN:** there is deliberately no in-app bypass. Run the *Emergency Admin PIN Recovery* snippet at the bottom of `supabase_setup.sql` in the SQL Editor.

---

## Security Model & Known Limitations
- **What is protected:** Without the tablet account, the public key can read and write nothing. PIN hashes are never sent to browsers, and PIN checks and lockouts happen in the database.
- **Shared account:** everyone who knows the tablet password has database-level access. A technically skilled person with that password could edit tables directly (including roles) while bypassing the app's PIN screen. Keep the password to management and rotate it if staff leave. Full per-person database accounts would be the next level up.
- **Internet needed to sign in:** PINs are verified in the cloud, so a tablet that is offline cannot sign anyone in (people already signed in keep working until auto-lock).
- **Sync model:** each save pushes the tablet's full state ("last write wins"). Two people editing the same record at the same moment on different tablets can overwrite each other; hard-refresh tablets after updates.
- **Not in this version:** the donation-intake form and bulk recipe/menu editors described in earlier drafts are not present in this `index.html`.
