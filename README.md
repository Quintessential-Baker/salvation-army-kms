# Community Meals KMS — The Salvation Army (Butler, PA)

**An end-to-end Kitchen Management System (KMS) and Operations Suite built for The Salvation Army Butler Worship & Service Center (313 W. Cunningham St., Butler, PA).**

Designed around commercial culinary standards (Auguste Escoffier School of Culinary Arts) and ServSafe / HACCP compliance, this zero-build, offline-capable web application unifies live 6-zone inventory tracking, closed-loop menu forecasting, 40–80 portion recipe scaling, QR code bin labeling, automated vendor purchase orders, IRS donation receipts, and standardized US Letter printable operational sheets.

---

## Live Deployment & Architecture

- **Live Production URL:** https://quintessential-baker.github.io/salvation-army-kms/
- **Frontend Stack:** Vanilla ES6+ JavaScript Modules (`index.html` + `js/`), Tailwind CSS (CDN), Chart.js, QRCode.js, and HTML5-QRCode camera scanner — **zero build step required**.
- **Backend & Cloud Sync:** Supabase (PostgreSQL database + Realtime/REST sync + Deno Edge Functions) with automatic `localStorage` offline fallback and universal in-progress draft autosave.
- **Service Schedule:** Free Hot Community Lunch served **Monday, Tuesday, Wednesday, and Friday (11:30 AM – 12:30 PM)**; **Thursday** reserved for pantry intake, deep cleaning, and administrative prep.

---

## Repository Structure

```text
salvation-army-kms/
├── index.html                  # App shell, sticky Salvation Army header, navigation, modal host & @media print engine
├── README.md                   # Complete system documentation, setup & deployment guide
├── SECURITY.md                 # Client-side key safety, RLS policies & PIN rotation guidelines
├── .gitignore                  # Protects local secrets (.env, .DS_Store, node_modules) from being committed
├── .nojekyll                   # Bypasses Jekyll processing for fast static GitHub Pages deployment
├── LICENSE                     # MIT Open-Source Non-Profit Operations License
├── docs/
│   ├── OPERATIONS_QUICKSTART.md    # 1-page daily shift & Friday physical count guide for staff/volunteers
│   ├── KITCHEN_HANDBOOK_AND_SOPS.md # ServSafe temperature limits, Day-Dot labeling & 2-stage cooling SOPs
│   └── SUPABASE_SETUP.md           # Step-by-step PostgreSQL schema & Edge Function setup guide
├── js/
│   ├── app.js                  # Main router, boot sequence, global event dispatcher & print/QR modal builders
│   ├── state.js                # State store, localStorage persistence, Supabase live sync, Undo stack & RBAC
│   ├── utils.js                # Date/service-day math, culinary unit/fraction conversions, spelling normalizer & modals
│   ├── november_menu_import.js # Pre-built November 2026 menu & standardized recipe seed bundle
│   ├── state_forecast_patch.js # Forecast-driven portion scaling patch
│   └── views/
│       ├── dashboard.js        # Home Dashboard, shift status, low-stock alerts & team announcements
│       ├── stock.js            # Living Stock across 6 storage zones & Bulk Stock Editor
│       ├── orders.js           # Vendor Purchase Orders (Marberger Dairy, Jordan Banana, Local Food Bank)
│       ├── receive.js          # PO Check-In & In-Kind Donation Intake + Printable IRS Tax Receipts
│       ├── menu.js             # Menu Planner, Bulk Past/Future Entry & Printable Daily/Weekly/Monthly Menus
│       ├── prep.js             # Next-Day Prep Pull Sheet grouped by storage zone & FIFO leftovers
│       ├── recipes.js          # Standardized Recipe Book (40–80 portion scaler, URL importer & QR recipe cards)
│       ├── safety.js           # Daily HACCP Temperature Logs & Sanitation Checklists
│       ├── storage.js          # FIFO Day-Dot Date Labels & Salad Bar Temperature Logs
│       ├── checklists.js       # Daily, Weekly & Monthly Kitchen SOP Checklists
│       ├── forecasting.js      # Patrons Served Logger & Attendance Forecasting Charts
│       ├── records.js          # 6-Zone Blank Blind Physical Inventory Count, Waste/"Crack" Ledger & Backups
│       ├── report.js           # 7-View Executive & Grant/Funding Reports Center
│       ├── users.js            # Team Roster, Role-Based Access Control (RBAC), PINs & Accountability Feed
│       └── help.js             # Interactive Guided Tour, Page Guides & 13-Point System Self-Test
└── supabase/
    ├── schema.sql              # Complete PostgreSQL schema, foreign keys, triggers & RLS policies
    └── functions/
        ├── notify-alert/
        │   └── index.ts        # Edge Function for automated low-stock & shift audit email alerts
        └── scrape-recipe/
            └── index.ts        # Edge Function for importing & parsing online recipes via URL
```

---

## Key Features & Operational Modules

### 1. Six-Zone Living Inventory & Closed-Loop Forecasting
- **6 Storage Locations:** Tracks real-time on-hand stock across **Walk-In Cooler**, **Walk-In Freezer**, **Stockroom**, **Kitchen Cooler**, **Kitchen Freezer**, and **Kitchen Dry Goods**.
- **Automated Inventory Math:** Combines scheduled future menu recipes (Bill of Materials explosion) with 30-day par levels and current on-hand stock (`(Future Menu Needs + Par Level) − Current Stock = Order Qty`).
- **One-Click Undo & Universal Draft Autosave:** Reverts accidental stock adjustments instantly and preserves in-progress counts, POs, or edits if the screen locks mid-shift.

### 2. Blind Physical Inventory Audits & Waste ("Crack") Ledger
- **Printable 30-Line Blind Count Sheets:** Generates clean, 1-page-per-zone US Letter count forms (`Print Blank 30-Line Sheet`) with zero on-hand hints to ensure unbiased Friday physical audits.
- **Smart Reconciliation Engine:** Automatically reconciles entered counts against system inventory using fuzzy spelling matching and cross-unit culinary conversions (e.g., cases ↔ lbs/cans).
- **Waste & Spoilage Ledger:** Immediately logs dropped ("crack") or expired items and deducts them from live stock.

### 3. Menu Planning & 40–80 Portion Recipe Scaler
- **Dynamic Portion Scaling:** Adjusts any recipe dynamically from **40 to 80+ portions** (or syncs directly with predicted attendance from the Forecasting engine) and converts decimals into clean kitchen fractions (`1/4 cup`, `1 1/2 lbs`, `2 tbsp`).
- **FDA Big 9 Allergen Tracking:** Flags Wheat, Milk, Eggs, Soy, Fish, Shellfish, Tree Nuts, Peanuts, and Sesame across recipes, prep sheets, and public menus.
- **Laminated QR Recipe Cards:** Generates 1-page US Letter recipe cards featuring a scannable QR code, 40–80 quick-scan ingredient matrix, and HACCP cook/hold temperature reminders (`Cook ≥ 165°F`, `Hot Hold ≥ 135°F`, `Cold ≤ 41°F`).

### 4. Receiving, Vendors & In-Kind Donation Tax Receipts
- **Purchase Order Reconciliation:** Tracks expected deliveries from suppliers (Marberger Dairy, Jordan Banana, Sysco, Local Food Bank) and updates inventory upon check-in.
- **In-Kind Donation Intake:** Logs community and food bank drop-offs (with optional fields for rapid intake) and generates a printable **Salvation Army Charitable Donation Receipt** on US Letter paper.

### 5. ServSafe / HACCP Safety, FIFO & Executive Reporting
- **Digital Compliance Logs:** Daily cooler/freezer/hot-hold temperature logs, 2-stage cooling checks, 3-compartment sink sanitizer checks, and printable QR bin/FIFO day-dot labels.
- **7-View Reports Center:** Exportable operational summaries covering meals served, food waste reduction, donation valuation, and inventory turnover for Salvation Army leadership and grant reporting.

---

## Installation & Setup Guide

### Prerequisites
- A free [GitHub](https://github.com) account (for hosting via GitHub Pages).
- A free [Supabase](https://supabase.com) project (for cloud multi-device sync).
- Python 3 or Node.js (optional, only needed for running a local preview server).

### Step 1: Clone the Repository
```bash
git clone https://github.com/Quintessential-Baker/salvation-army-kms.git
cd salvation-army-kms
```

### Step 2: Configure Supabase Backend
1. Create a new project in your **Supabase Dashboard**.
2. Open the **SQL Editor → New Query**, paste the contents of `supabase/schema.sql`, and click **Run** to create the relational tables, indexes, and policies.
3. *(Optional)* Deploy the Edge Functions using the Supabase CLI:
   ```bash
   supabase functions deploy notify-alert
   supabase functions deploy scrape-recipe
   ```
4. Copy your **Project URL** and **Anon Public Key** from **Project Settings → API** and confirm they are configured in `js/state.js` (or connect via the in-app **Local Mode / Live Sync** pill).

### Step 3: Run Locally (Development / Offline Testing)
Because the app uses native ES6 modules (`import` / `export`), serve it over HTTP rather than opening `index.html` via `file://`:
```bash
# Using Python 3 (built into macOS & Codespaces)
python3 -m http.server 8000

# Or using Node.js
npx serve .
```
Open `http://localhost:8000` in your browser.

### Step 4: Deploy Live to GitHub Pages
1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Deploy Community Meals KMS"
   git push origin main
   ```
2. In your GitHub repository, navigate to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **Deploy from a branch**, choose **`main`** and **`/ (root)`**, and click **Save**.
4. Your app will be live within ~60 seconds at `https://quintessential-baker.github.io/salvation-army-kms/`.

---

## User Roles, Security & Accessibility

- **PIN-Protected Role-Based Access Control (RBAC):**
  - **Admin / Kitchen Manager:** Full access to stock edits, user PIN management, bulk menu/recipe editors, PO approvals, and system backups.
  - **Kitchen Lead / Staff:** Access to daily prep, recipe scaling, receiving, safety logs, and physical counts.
  - **Volunteer:** Streamlined access to daily checklists, recipe cards, and serving logs.
- **Security Best Practices:**
  - Never commit private Supabase `service_role` keys, `.env` files, or third-party API secrets to GitHub. Only the public `anon` key (protected by Supabase Row-Level Security) belongs in client-side code.
  - Change default user PINs under **Admin & Reports → Team Roster** immediately after initial setup.
- **Accessibility & Printing:**
  - Includes **Bigger Text** (`100%` / `112.5%` / `125%`), **Light / Dark Mode**, an **Interactive Guided Tour**, and a **13-Point System Self-Test** under **Tools ▾**.
  - Every report, menu, prep pull sheet, blind inventory form, QR bin label sheet, and recipe card uses a unified `@media print` stylesheet engineered to fit cleanly onto **US Letter (`8.5" × 11"`)** paper.

---

## License & Acknowledgments

Developed by **William Clark** (Culinary Extern, Auguste Escoffier School of Culinary Arts) for **The Salvation Army Butler Worship & Service Center**, Butler, Pennsylvania. Released under the MIT License for non-profit community foodservice operations.
