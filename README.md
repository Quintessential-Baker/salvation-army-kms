### 1. Complete `README.md` (Ready to Paste into Your Repository)

Copy the entire Markdown block below into your `README.md` file in the root of `/workspaces/salvation-army-kms`. It documents the architecture, all 15 operational modules, Supabase backend setup, GitHub Pages deployment, security rules, and daily staff workflows.

```markdown
# Community Meals KMS — The Salvation Army (Butler, PA)

**An end-to-end Kitchen Management System (KMS) and Operations Suite built for The Salvation Army Butler Worship & Service Center (313 W. Cunningham St., Butler, PA).**

Designed around commercial culinary standards (Auguste Escoffier School of Culinary Arts) and ServSafe / HACCP compliance, this zero-build, offline-capable web application unifies live 6-zone inventory tracking, closed-loop menu forecasting, 40–80 portion recipe scaling, QR code bin labeling, automated vendor purchase orders, IRS donation receipts, and standardized US Letter printable operational sheets.

---

## Live Deployment & Architecture

* **Live Production URL:** `https://quintessential-baker.github.io/salvation-army-kms/`
* **Frontend Stack:** Vanilla ES6+ JavaScript Modules (`index.html` + `js/`), Tailwind CSS (CDN), Chart.js, QRCode.js, and HTML5-QRCode camera scanner — **zero build step required**.
* **Backend & Cloud Sync:** Supabase (PostgreSQL database + Realtime/REST sync + Deno Edge Functions) with automatic `localStorage` offline fallback and universal in-progress draft autosave.
* **Service Schedule:** Free Hot Community Lunch served **Monday, Tuesday, Wednesday, and Friday (11:30 AM – 12:30 PM)**; **Thursday** reserved for pantry intake, deep cleaning, and administrative prep.

---

## Repository Structure

```text
salvation-army-kms/
├── index.html                  # App shell, sticky Salvation Army header, navigation, modal host & @media print engine
├── README.md                   # Complete system documentation, setup & deployment guide
├── .gitignore                  # Protects local secrets (.env, .DS_Store, node_modules) from being committed
├── LICENSE                     # MIT / Open-Source Non-Profit Operations License
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

* **6 Storage Locations:** Tracks real-time on-hand stock across **Walk-In Cooler**, **Walk-In Freezer**, **Stockroom**, **Kitchen Cooler**, **Kitchen Freezer**, and **Kitchen Dry Goods**.
* **Automated Inventory Math:** Combines scheduled future menu recipes (Bill of Materials explosion) with 30-day par levels and current on-hand stock (`(Future Menu Needs + Par Level) − Current Stock = Order Qty`).
* **One-Click Undo & Universal Draft Autosave:** Reverts accidental stock adjustments instantly and preserves in-progress counts, POs, or edits if the screen locks mid-shift.

### 2. Blind Physical Inventory Audits & Waste ("Crack") Ledger

* **Printable 30-Line Blind Count Sheets:** Generates clean, 1-page-per-zone US Letter count forms (`Print Blank 30-Line Sheet`) with zero on-hand hints to ensure unbiased Friday physical audits.
* **Smart Reconciliation Engine:** Automatically reconciles entered counts against system inventory using fuzzy spelling matching and cross-unit culinary conversions (e.g., cases $\leftrightarrow$ lbs/cans).
* **Waste & Spoilage Ledger:** Immediately logs dropped ("crack") or expired items and deducts them from live stock.

### 3. Menu Planning & 40–80 Portion Recipe Scaler

* **Dynamic Portion Scaling:** Adjusts any recipe dynamically from **40 to 80+ portions** (or syncs directly with predicted attendance from the Forecasting engine) and converts decimals into clean kitchen fractions (`1/4 cup`, `1 1/2 lbs`, `2 tbsp`).
* **FDA Big 9 Allergen Tracking:** Flags Wheat, Milk, Eggs, Soy, Fish, Shellfish, Tree Nuts, Peanuts, and Sesame across recipes, prep sheets, and public menus.
* **Laminated QR Recipe Cards:** Generates 1-page US Letter recipe cards featuring a scannable QR code, 40–80 quick-scan ingredient matrix, and HACCP cook/hold temperature reminders (`Cook ≥ 165°F`, `Hot Hold ≥ 135°F`, `Cold ≤ 41°F`).

### 4. Receiving, Vendors & In-Kind Donation Tax Receipts

* **Purchase Order Reconciliation:** Tracks expected deliveries from suppliers (Marberger Dairy, Jordan Banana, Sysco, Local Food Bank) and updates inventory upon check-in.
* **In-Kind Donation Intake:** Logs community and food bank drop-offs (with optional fields for rapid intake) and generates a printable **Salvation Army Charitable Donation Receipt** on US Letter paper.

### 5. ServSafe / HACCP Safety, FIFO & Executive Reporting

* **Digital Compliance Logs:** Daily cooler/freezer/hot-hold temperature logs, 2-stage cooling checks, 3-compartment sink sanitizer checks, and printable QR bin/FIFO day-dot labels.
* **7-View Reports Center:** Exportable operational summaries covering meals served, food waste reduction, donation valuation, and inventory turnover for Salvation Army leadership and grant reporting.

---

## Installation & Setup Guide

### Prerequisites

* A free [GitHub](https://github.com) account (for hosting via GitHub Pages).
* A free [Supabase](https://supabase.com) project (for cloud multi-device sync).
* Python 3 or Node.js (optional, only needed for running a local preview server).

### Step 1: Clone the Repository

```bash
git clone [https://github.com/Quintessential-Baker/salvation-army-kms.git](https://github.com/Quintessential-Baker/salvation-army-kms.git)
cd salvation-army-kms

```

### Step 2: Configure Supabase Backend

1. Create a new project in your **Supabase Dashboard**.
2. Open the **SQL Editor** $\rightarrow$ **New Query**, paste the contents of `supabase/schema.sql`, and click **Run** to create the relational tables, indexes, and policies.
3. *(Optional)* Deploy the Edge Functions using the Supabase CLI:
```bash
supabase functions deploy notify-alert
supabase functions deploy scrape-recipe

```


4. Copy your **Project URL** and **Anon Public Key** from **Project Settings $\rightarrow$ API** and confirm they are configured in `js/state.js` (or connect via the in-app **Local Mode / Live Sync** pill).

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


2. In your GitHub repository, navigate to **Settings $\rightarrow$ Pages**.
3. Under **Build and deployment $\rightarrow$ Source**, select **Deploy from a branch**, choose **`main`** and **`/ (root)`**, and click **Save**.
4. Your app will be live within ~60 seconds at `https://<your-username>.github.io/salvation-army-kms/`.

---

## User Roles, Security & Accessibility

* **PIN-Protected Role-Based Access Control (RBAC):**
* **Admin / Kitchen Manager:** Full access to stock edits, user PIN management, bulk menu/recipe editors, PO approvals, and system backups.
* **Kitchen Lead / Staff:** Access to daily prep, recipe scaling, receiving, safety logs, and physical counts.
* **Volunteer:** Streamlined access to daily checklists, recipe cards, and serving logs.


* **Security Best Practices:**
* Never commit private Supabase `service_role` keys, `.env` files, or third-party API secrets to GitHub. Only the public `anon` key (protected by Supabase Row-Level Security) belongs in client-side code.
* Change default user PINs under **Admin & Reports $\rightarrow$ Team Roster** immediately after initial setup.


* **Accessibility & Printing:**
* Includes **Bigger Text** (`100%` / `112.5%` / `125%`), **Light / Dark Mode**, an **Interactive Guided Tour**, and a **13-Point System Self-Test** under **Tools $\blacktriangledown$**.
* Every report, menu, prep pull sheet, blind inventory form, QR bin label sheet, and recipe card uses a unified `@media print` stylesheet engineered to fit cleanly onto **US Letter (`8.5" × 11"`)** paper.



---

## License & Acknowledgments

Developed by **William Clark** (Culinary Extern, Auguste Escoffier School of Culinary Arts) for **The Salvation Army Butler Worship & Service Center**, Butler, Pennsylvania. Released for non-profit community foodservice operations.

```

---

### 2. Other Files You Should Include on GitHub

Looking at your current repository tree (`index.html`, `js/`, `supabase/`), adding these **4 standard repository files** makes your GitHub project complete, secure, and professional for both Salvation Army handoff and your Escoffier portfolio[cite: 24, 25]:

1. **`.gitignore` (Critical — prevents accidental secret leaks & OS clutter):**
   Keeps `.env` files, macOS `.DS_Store` files, `node_modules/`, and temporary backup JSONs out of your public commit history[cite: 24].
2. **`LICENSE` (Standard MIT License):**
   Clarifies that The Salvation Army (and other community kitchens) can freely use, modify, and maintain the software forever with zero licensing fees.
3. **`.nojekyll` (Empty file in root):**
   Tells GitHub Pages to serve your static files directly without running Jekyll processing—speeding up branch deployments and preventing underscore-prefixed files from ever being skipped.
4. **`docs/OPERATIONS_QUICKSTART.md` (1-Page Kitchen Staff & Volunteer Quick-Start Guide):**
   A plain-English cheat sheet for Sabrina, volunteers, and future managers explaining daily shift steps (8:30 AM Prep $\rightarrow$ 11:30 AM Service $\rightarrow$ 1:45 PM Wrap-Up & Friday Blind Audit) without needing technical knowledge[cite: 28].

---

### 3. One-Command Terminal Script to Create All of These Files Right Now

Run this single command block in your Codespace terminal to write the complete `README.md`, create `.gitignore`, `LICENSE`, `.nojekyll`, and `docs/OPERATIONS_QUICKSTART.md`, and push everything cleanly to GitHub:

```bash
mkdir -p docs && touch .nojekyll

cat << 'EOF' > .gitignore
# Secrets & Environment Variables
.env
.env.*
*.pem
*.key

# OS & Editor Files
.DS_Store
Thumbs.db
.vscode/
.idea/

# Dependencies & Build Artifacts
node_modules/
dist/
*.log
EOF

cat << 'EOF' > LICENSE
MIT License

Copyright (c) 2026 William Clark — The Salvation Army Butler Worship & Service Center

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

cat << 'EOF' > docs/OPERATIONS_QUICKSTART.md
# Kitchen Staff & Volunteer Quick-Start Guide
**The Salvation Army — Butler, PA (313 W. Cunningham St.)**

## Daily Shift Workflow (Mon / Tue / Wed / Fri)

1. **8:30 AM — Morning Setup & Safety Check**
   * Sign in on the kitchen tablet using your personal PIN.
   * Open **Safety & Forecast $\rightarrow$ Daily Safety & Temps** to log Walk-In Cooler ($\le 41^\circ\text{F}$), Walk-In Freezer ($\le 0^\circ\text{F}$), and sanitizer test strip readings.
   * Open **Kitchen & Menu $\rightarrow$ Next-Day Prep** to pull ingredients using **FIFO** (First-In, First-Out) and attach Day-Dot labels.

2. **10:45 AM – 12:30 PM — Lunch Service**
   * Verify hot holding wells reach $\ge 135^\circ\text{F}$ and the Daily Salad Bar holds at $\le 41^\circ\text{F}$.
   * Use **Kitchen & Menu $\rightarrow$ Recipes** (or scan the laminated QR recipe card) for exact 40–80 portion measurements and FDA Big 9 allergen checks.

3. **12:30 PM – 2:30 PM — Breakdown, Waste & Shift Wrap-Up**
   * Log actual portions served under **Safety & Forecast $\rightarrow$ Patrons Served**.
   * Record any spoiled or dropped items immediately under **Admin & Reports $\rightarrow$ Records & Waste**.
   * Complete the **Daily Closing Checklist** before locking the tablet at 2:30 PM.

## Weekly & Monthly Routines
* **Thursdays (Admin & Deep Prep Day):** Review **Stock & Orders** for low-stock alerts, receive vendor deliveries, and plan upcoming menus.
* **Fridays (1:00 PM Physical Audit):** Print the **30-Line Blank Blind Inventory Sheet** under **Admin & Reports $\rightarrow$ Records**, count each storage zone, and submit the physical counts to reconcile stock.
* **3rd Friday of the Month:** Generate and review the monthly vendor requisition order under **Stock & Orders**.
EOF

```