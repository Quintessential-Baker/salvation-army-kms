# The Salvation Army Community Meals — Unified Kitchen Management System (KMS)

**Butler, PA · Mon / Tue / Wed / Fri Lunch Service (11:30 AM – 12:30 PM)**

This unified KMS combines the simplicity, Butler PA stockroom seed, 8-week auto-learning par levels, and printable Daily Sheets of **Community Meals Inventory** with the multi-user security, forecasting, checklists, QR scanning, and relational Supabase cloud sync of **Kitchen OS**.

## What Was Merged & Recreated

1. **Community Inventory Core (Base Architecture)**:
   - **Warm, high-contrast touch UI** (`#f6f4f0` background, `#1b365d` Salvation Army Navy, `#b3122b` Red) with **Dark Mode**, **3-step Text Size toggle**, and **Undo Last Change**.
   - **Full Butler, PA Seed Inventory** across `Walk-in cooler`, `Walk-in freezer`, and `Stockroom` with exact units (`cases`, `cans`, `boxes`, `bottles`, `jugs`, `bags`, `packs`, `crates`, `pieces`, `tubs`) and `W` (Weekly: Marberger & produce) / `M` (Monthly: Jordan Banana) cadence.
   - **8-Week Auto-Learning Par Levels**: Automatically computes `par = avg weekly use × cycle weeks × 1.25` after 7+ days of usage; typing a custom par locks that item.
   - **Smart Recipe Text/Paste Parser + Scaled Recipes**: Paste any recipe text to auto-extract servings, ingredients, steps, and major allergens—or build/edit recipes manually and map ingredients (`per 100 servings`) to Living Stock.
   - **Printable Daily Service Sheet**: Scaled ingredients, cooking directions, storage pull list grouped by location, blank temperature log, and 7-day leftover labels.
   - **Monthly Report**: Meals served, total purchases & cost per meal, food received by source, waste breakdown, food safety pass %, top-used items, and below-par summary.

2. **Merged Kitchen OS Features**:
   - **Home Dashboard**: Quick Shift Actions, *Today's Recipe & To-Do* modal, Priority Carryover alerts, Reorder alerts, Expiring Date-Tag alerts, Scheduled/Repeating Announcements, and 7-Day Menu Strip.
   - **Role-Based PIN Security & Auto-Lock**: `Management`, `Staff`, `Volunteer`, and `Other` tiers with salted SHA-256 PIN hashing, force-change-PIN on first login, 5-minute configurable inactivity auto-lock, and mandatory first-login training walkthrough.
   - **Fast Scan Terminal & Printable QR Labels**: Camera QR/barcode scanning (`html5-qrcode`), USB/Bluetooth scanner input, and printable shelf/bin QR labels (`qrcode-generator`).
   - **Next-Day Prep List**: Tomorrow's pulls grouped by storage zone with checkboxes and FIFO leftovers reminder.
   - **Operational Checklists**: Daily, Weekly, and Monthly cycles with auto-reset, Priority Carryover for unfinished tasks, and permanent completion log.
   - **Blind Physical Count**: Hides system quantities during counting, records variances, and updates Living Stock upon reconciliation.
   - **Storage & Date Labels (>24 Hours)**: Separate FIFO tracking for **Meal Leftovers** and **Daily Salad Bar & Cold Prep** with 1-tap shelf-life presets (`3d` greens/fruit, `4d` dairy/deli, `7d` cooked entrees, `90d` freezer).
   - **Multi-Horizon Forecasting (Chart.js)**: Predicts patron turnout across Days (7), Weeks (8), Months (12), and Years (3) using weekday, time-of-month, and US Federal Holiday factors.
   - **Kitchen Instant Messaging (Chat)**: Real-time team broadcast & direct messages with Urgent alerts.

3. **Recreated Relational Database (`supabase_setup.sql`)**:
   - Replaced the single JSON blob with **14 normalized PostgreSQL tables** (`kms_users`, `kms_inventory_items`, `kms_recipes`, `kms_menu_plan`, `kms_purchase_orders`, `kms_transactions`, `kms_safety_logs`, `kms_storage_tags`, `kms_checklists`, `kms_blind_audits`, `kms_announcements`, `kms_messages`, `kms_activity_logs`, `kms_settings`), complete with Row Level Security and Supabase Realtime subscriptions.

---

## Setup & Deployment

1. **Database Setup**: Open your Supabase Dashboard → **SQL Editor**, paste and run **`supabase_setup.sql`**.
2. **Hosting**: Upload **`index.html`**, **`README.md`**, and **`supabase_setup.sql`** to your GitHub Pages repository (`main` branch, `/ (root)`).
3. **First Login**: Sign in as **William Clark (`Management`)** using PIN `1234` (you will be prompted to set a personal 6+ character PIN and complete the brief role training).


## Admin / Tech-Support Login (Supabase Auth)
1. Open your **Supabase Dashboard** → **Authentication** → **Users** → **Add User**.
2. Create an email and strong password for your Admin / Tech-Support recovery account.
3. On the app's Lock Screen, expand **Admin / Tech-Support Login (Supabase Auth)** and sign in with that email and password—verified server-side by Supabase with no secrets stored in `index.html`.


## Free Automated Background Email Alerts (Supabase Edge Function + Resend)
1. Create a free **Resend** account (`resend.com`, 3,000 emails/month free) and copy your API key.
2. In **Supabase Dashboard → Edge Functions**, create a function named `notify-alert` and paste the contents of `supabase_edge_notify.ts`.
3. Under **Edge Functions → Secrets**, add `RESEND_API_KEY` with your Resend key.
4. In the KMS **Users & Activity** tab, enter each user's **Email** and (optionally) **Mobile # + Carrier**—the app will automatically send background email and email-to-SMS alerts whenever a PO is submitted for approval or an urgent Broadcast/DM is sent.
