# The Salvation Army Community Meals — Inventory & Kitchen OS

A standalone, zero-build, real-time synced Kitchen Management & Inventory Operating System built for **The Salvation Army Community Meals** (Butler, PA — Monday, Tuesday, Wednesday & Friday lunch service, 11:30 AM–12:30 PM).

## Key Capabilities

- **Living Running Stock & Official Initialization**:
  - Displays all quantities in **Volume (Cups, Quarts, Gallons, Tbsp, Tsp), Vendor Packs/Cases, #10 Cans, and Pieces** (zero metric grams/kg shown in the UI).
  - **Official Inventory Init (+10% Par)**: Management can enter an official physical count (Full Packs + `1/4`, `1/2`, `3/4` open partials) to reset all stock and auto-set `Par = Count + 10%`.
  - **25% / 10% / 5% Staple Reorder Alerts**: Tiered alerts on the Home Dashboard and Living Stock as staples drop below Par.
- **210 Standardized Recipes & Auto-Rescaling**:
  - 210 standardized recipes, including dedicated special holiday feast recipes for every US Federal Holiday.
  - Every recipe automatically rescales to the **predicted portions** for its scheduled service day.
- **Menu Planner, Next-Day Prep & Ordering**:
  - **Weekly** (`Marberger` Dairy & `Produce`) and **Monthly** (3rd Friday `Jordan Banana` Dry Goods & Frozen) ordering cadence with a 3-step **Request → Management Approval → Expected Delivery Reconciliation** workflow.
  - **Auto-Schedule Pre-Holiday Feasts** schedules dedicated Holiday Feast meals on the open MTWF service day before each US Federal Holiday (+25% Peak-Day baseline).
- **Food Safety, Storage & Leftover Tracking**:
  - **Serving-Day-Only Time & Temp Logs**: 6 daily checks (**Walk-In Cooler**, **Walk-In Freezer**, **Kitchen Cooler**, **Kitchen Freezer**, **Main Entree**, **Steam Table Well #1**) required only on open serving days (MTWF non-holidays), resetting automatically at midnight.
  - **Storage & Date Labels (>24 Hours)**: Variable shelf-life rules (`7d` cooked entrees, `3d` cut greens/fruit, `4d` dairy/yogurt/pudding/deli salads, `90d` freezer) with **1-Tap Presets** and separate FIFO tables for **Meal Leftovers** and **Daily Salad Bar & Cold Prep**.
  - **Leftover Predictor**: Automatically predicts leftovers from **Planned vs. Actual Served**, generates the exact ServSafe Date Tag, adds it to the Daily Checklist, and logs it into Meal Leftover Inventory.
- **Role-Based PIN Security & Mandatory Training**:
  - **Management / Admin**, **Staff**, **Volunteer**, and **Other** roles with strict access boundaries, 5-minute shared-tablet auto-lock, and 7 mandatory first-login training modules.
- **Live Multi-Device Sync (Supabase)**:
  - Real-time synchronization across kitchen tablets, office computers, and phones.

---

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g., `salvation-army-kitchen-os`).
2. Upload **`index.html`**, **`README.md`**, **`.nojekyll`**, and **`supabase_setup.sql`** to the root of the `main` branch (or unzip `salvation_army_kms_github_bundle.zip` and push).
3. In your GitHub repository, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, select **Deploy from a branch**.
5. Choose **`main`** and **`/ (root)`**, then click **Save**.
6. Your live URL will be published at:
   `https://<your-github-username>.github.io/<repo-name>/`

---

## Supabase Setup (Live Multi-Device Sync)

Run the included **`supabase_setup.sql`** in your Supabase **SQL Editor** to ensure the `kitchen_records` table, open kitchen sync policy, and Realtime publication are active.

---

## Go-Live Checklist (First Day of Service)

1. Open the GitHub Pages URL on your kitchen tablet/computer and sign in as **Management**.
2. Complete the initial PIN update and **Mandatory Training** walkthrough.
3. Go to **Inventory & Orders → Living Stock** and click **Official Inventory Init (+10% Par)** to enter your starting physical count.
4. On the **Home Dashboard**, tap **Today's Recipe & To-Do** to review today's scaled meal, Daily Salad Bar setup, and Daily Checklist.
5. After lunch service, log **People / Meals Served** in **Safety & Tasks → Served & Forecasting** to update forecasts and generate leftover date tags.
