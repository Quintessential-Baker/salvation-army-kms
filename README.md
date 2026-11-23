# Community Meals Kitchen Management System (KMS)
**The Salvation Army · Butler Worship & Service Center (Butler, PA)**

A zero-build, multi-role web application built with vanilla ES Modules, Tailwind CSS, Chart.js, and Supabase PostgreSQL for managing daily community lunch operations (Monday, Tuesday, Wednesday, and Friday service).

---

## Key Capabilities
- **Living Stock & Bulk Manager (`js/views/stock.js`):** Real-time inventory tracking across 6 storage zones (`Walk-in cooler`, `Walk-in freezer`, `Stockroom`, `Kitchen Cooler`, `Kitchen Freezer`, `Kitchen Dry Goods`), standardized units/spelling normalization, 8-week auto-learning par levels (+25% safety stock), and 1-click Undo.
- **Orders & Purchase Orders (`js/views/orders.js`):** Separates Weekly orders (*Marberger Dairy & Produce*) from Monthly orders (*3rd Friday Jordan Banana*), enforcing whole-case rounding and 4-tier approval workflows.
- **PO Check-In & In-Kind Donations (`js/views/receive.js`):** Mandatory blind quantity verification for arriving PO deliveries and in-kind food donation logging with printable Letter-size IRS Contemporaneous Written Acknowledgments (`IRC § 170(f)(8)`).
- **Menu Planner & Print Suite (`js/views/menu.js`):** Bulk past/future menu entry (CSV paste or grid editor), automated stock deduction when marked *Served*, leftover tagging, and formatted Letter printouts for **Daily**, **Weekly**, and **Monthly** menus.
- **40–80 Portion Recipe Scaling (`js/views/recipes.js`):** Proportional scaling slider and quick-scan matrix with automatic culinary-to-stock unit conversions, FDA Big 9 allergen detection, QR code scanning, and URL/text recipe importing.
- **HACCP Food Safety & FIFO (`js/views/safety.js`, `js/views/storage.js`):** 6-point temperature checks (`≤41°F` cold, `≤0°F` frozen, `≥165°F` cook, `≥135°F` hot hold), daily sanitizing checklists, and 1-tap shelf-life date labels (3d salad bar, 4d dairy, 7d cooked leftovers, 90d freezer).
- **Section Blind Physical Audits (`js/views/records.js`):** Unbiased shelf counting by storage section in either **Live Tablet Mode** or **Hard-Copy Sheet Entry Mode**, with variance review before updating stock, waste logging, and CSV/JSON backups.
- **Patron Turnout Forecasting (`js/views/forecasting.js`):** Predicts service portions using historical attendance, day-of-week patterns, dish popularity, federal holidays, and weather notes.
- **4-Tier Role-Based Access & Auto-Lock (`js/state.js`, `js/views/users.js`):** Enforces `ADMIN`, `MANAGER`, `STAFF`, and `VOLUNTEER` permissions with bcrypt-hashed PIN authentication, 5-minute shared-tablet auto-lock, scheduled announcements, and a real-time accountability feed.

---

## Project Architecture

```text
├── .nojekyll                  # Prevents Jekyll processing on GitHub Pages
├── README.md                  # Project documentation & setup guide
├── index.html                 # Lightweight HTML shell & print stylesheet
├── js/
│   ├── app.js                 # Main router, boot sequence & global event handlers
│   ├── state.js               # State store, RBAC, forecasting math & Supabase sync
│   ├── utils.js               # Date helpers, unit/spelling normalizers & modals
│   └── views/                 # Isolated UI modules for all 15 application tabs
└── supabase/
    ├── schema.sql             # Complete PostgreSQL tables, RLS policies & PIN RPCs
    └── functions/             # Edge Functions for email alerts & recipe scraping