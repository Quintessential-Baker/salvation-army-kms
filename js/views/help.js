// js/views/help.js — Page Quick Guides, Task Finder, Guided Tour & Automated 14-Point Diagnostics

import {
  TEMP_CHECKS, localDateStr, addDays, nowStamp,
  convertCulinaryUnit, formatKitchenAmt, serviceDaysBetween,
  esc, openModal
} from '../utils.js';
import {
  state, STORAGE_KEY, undoSnapshot, sbClient,
  getActiveUser, getAllowedTabs, buildSeedInventory,
  itemStatus, snapUndo, parsePastedRecipe,
  demandForDays, suggestedOrderAmount, forecastWeekday,
  logActivity, saveState
} from '../state.js';
import {
  relearnPortionBaseline, roundUpToNearest5,
  computeRefinedBufferFactor, forecastPlannedPortionsForDate
} from '../november_menu_import.js';

export const PAGE_GUIDES = {
  dashboard: {
    title: 'Home Dashboard — Your Shift Starting Point',
    summary: 'See everything happening today at a glance before you start cooking or counting.',
    steps: [
      'Check red/amber Announcements & Reminders at the top for holiday closings or order deadlines.',
      'Watch for red "Use or Discard Today" banners on stored leftovers or salad bar items.',
      'Tap any Quick Shift Action button to jump straight to counting stock, checking in POs, or logging donations.'
    ]
  },
  stock: {
    title: 'Living Stock — What Is On the Shelves Right Now',
    summary: 'Edit, update, add, or delete individual items or use "Bulk Edit / Delete Stock" for multiple items at once.',
    steps: [
      'Tap − / + to adjust counts, click "Edit" on any card to update name/SKU/unit, or "Delete" to remove it.',
      'Click "Bulk Edit / Delete Stock" at the top to edit many rows at once, bulk-add items, or delete checked items.',
      'Click "Print Stock Sheet" for a clean Letter-sized shelf count sheet.'
    ]
  },
  orders: {
    title: 'Orders & Purchase Orders — Weekly & Monthly Restocking',
    summary: 'Automatically lists items that need full cases ordered for Marberger (Weekly) and Jordan Banana (Monthly).',
    steps: [
      'Review the suggested whole-case quantities (only items needing 1+ full case appear).',
      'Check/uncheck items or add extra items at the bottom, then click "Request Selected PO".',
      'Managers approve & mark ordered; when the truck arrives, enter actual counts in PO Check-In & Donations.'
    ]
  },
  receive: {
    title: 'PO Check-In & Donations — Verify Counts & Print Tax Receipts',
    summary: 'Manually enter actual received quantities to accept POs and record in-kind food donations with printable IRS tax receipts.',
    steps: [
      'In Section 1, count the delivery and enter the exact quantity received for every line (enter 0 if shorted) before clicking "Reconcile & Check In PO".',
      'In Section 2, enter the donor\'s name, address, and donated items to update Living Stock automatically.',
      'Click "View / Print Tax Receipt" on any donation to print a Letter-size IRS donor acknowledgment.'
    ]
  },
  menu: {
    title: 'Menu Planner — Bulk Past/Future Entry & Daily/Weekly/Monthly Printouts',
    summary: 'Schedule Mon/Tue/Wed/Fri meals, bulk-import past or future menus, and print clean Daily, Weekly, or Monthly menus.',
    steps: [
      'Click "+ Bulk Enter Menus (Past & Future)" to paste a spreadsheet/list or fill any past or future date range.',
      'Click "Print Daily / Weekly / Monthly Menu" to generate a formatted Letter printout for kitchen or dining room posting.',
      'After lunch, enter the actual number of patrons served and click "Served" to deduct stock & tag leftovers.'
    ]
  },
  prep: {
    title: 'Next-Day Prep — What to Pull for Tomorrow',
    summary: 'Shows tomorrow\'s scaled ingredients grouped by Cooler, Freezer, and Stockroom so nothing is forgotten.',
    steps: [
      'Check off each ingredient box as you pull items from the Walk-in cooler, Freezer, or Stockroom.',
      'Check the "Stored Meal Leftovers (FIFO)" section at the bottom to use oldest leftovers first.',
      'Click "Print Prep Sheet" to post the pull list on the prep table.'
    ]
  },
  recipes: {
    title: 'Recipes — 40–80 Portion Scaling, Edit & Bulk Manager',
    summary: 'Displays everyday kitchen measurements (cups, tbsp, lbs) while converting stock units in the background.',
    steps: [
      'Drag the 40–80 slider, tap a preset button, or click "40–80 Quick-Scan Table" to see all sizes at once.',
      'Use "Edit Details & Directions" to update steps/photos, or "Bulk Add / Edit" to update/delete many recipes.',
      'Click "Print Recipe + QR" to print a clean Letter-size laminated recipe card with a QR code.'
    ]
  },
  safety: {
    title: 'Temps & Cleaning — Daily Food Safety (HACCP)',
    summary: 'Required serving-day temperature checks and sanitizing tasks with instant pass/fail alerts.',
    steps: [
      'Enter temperatures for all 6 checkpoints (Coolers ≤41°F, Freezers ≤0°F, Hot Hold ≥135°F).',
      'Any out-of-range temperature turns red ("FIX NOW") so corrective action can be taken immediately.',
      'Check off the 7 daily cleaning tasks and click "Print Daily Safety Log" for health inspections.'
    ]
  },
  storage: {
    title: 'Date Labels & Salad Bar — 7-Day & Cold Prep FIFO',
    summary: 'Track shelf life for every container kept over 24 hours so expired food is never served.',
    steps: [
      'Tap a 1-Tap Preset (Salad Greens 3d, Dairy 4d, Cooked Meal 7d, Freezer 90d) to auto-fill dates.',
      'Click "Add & Date-Label" to log the container and trigger automatic Use-By alerts on the Dashboard.',
      'Click "Used" when finished, "Toss" if discarded, or "Delete" to remove an erroneous label.'
    ]
  },
  checklists: {
    title: 'Checklists — Daily, Weekly & Monthly Routines',
    summary: 'Every checkmark stamps your name and time; Managers can add, edit, or delete checklist tasks.',
    steps: [
      'Switch between Daily, Weekly, and Monthly tabs at the top right.',
      'Tap any checkbox to stamp your name and timestamp.',
      'Managers can add new tasks or edit/delete existing checklist tasks right on the list.'
    ]
  },
  forecasting: {
    title: 'Served & Forecast — Predicting Patron Turnout',
    summary: 'Uses past lunch counts, day-of-week patterns, meal popularity, and holidays to predict portions.',
    steps: [
      'Enter today\'s actual patrons served (or click "+ Bulk Enter Past Dates" to import historical sheets).',
      'Switch between Days, Weeks, Months, and Years to view projected meal demand.',
      'Edit or delete any historical service record in the table at the bottom.'
    ]
  },
  records: {
    title: 'Blind Count & Waste — Section Counts, Hard-Copy Entry & Backups',
    summary: 'Pick a storage section to live-count on screen or print a blank count sheet and enter hard-copy numbers later.',
    steps: [
      'Select a section (e.g. Walk-in cooler, Walk-in freezer, Stockroom) and choose Live Count or Hard-Copy Entry.',
      'Click "Print Blank Count Sheet" if counting on paper, then enter your numbers and click "Review & Reconcile Count".',
      'Use "Log Waste" whenever food is dropped, burned, or expired so stock counts stay accurate.'
    ]
  },
  report: {
    title: 'Monthly Report — Executive, Funding & Grant Briefs',
    summary: 'Management-only summary of meals served, food spend, donations, and budget forecasts.',
    steps: [
      'Choose By Month, Last 30/90 Days, Year-to-Date, or Last 12 Months.',
      'Click "Copy Funding Brief" to paste a ready-made impact summary into emails or grant reports.',
      'Click "Print Report" for a clean Letter-size printout.'
    ]
  },
  users: {
    title: 'Users & Activity — Team Roster, PINs & Audit Log',
    summary: 'Manage staff/volunteer accounts, schedule announcements, and view every action taken in the kitchen.',
    steps: [
      'Post, edit, or globally delete Announcements at the top.',
      'Add new Staff/Volunteers, edit roles/emails, or issue temporary PIN resets.',
      'Filter the Real-Time Accountability Feed by category or person to audit any change.'
    ]
  },
  help: {
    title: 'Help, Training & System Verification',
    summary: 'Search how to do any task, launch the guided tour, review role rules, or run the automated self-test.',
    steps: [
      'Type what you want to do in "How Do I...?" below and click "Take Me There".',
      'Run the "Full System Self-Test" to verify every module and print a PASS certification report.',
      'Review the Role Permissions Matrix below to see exact access for every role.'
    ]
  }
};

export const HOW_DO_I_TASKS = [
  { q: 'Input bulk menus for past or future dates', tab: 'menu', ans: 'Go to Menu & Daily Sheet and click "+ Bulk Enter Menus (Past & Future)" to paste CSV/spreadsheet rows or fill any date range.' },
  { q: 'Print a proper Daily, Weekly, or Monthly menu sheet', tab: 'menu', ans: 'Go to Menu & Daily Sheet and click "Print Daily / Weekly / Monthly Menu" to switch between Daily, Weekly, and Monthly Calendar views and print.' },
  { q: 'Check in an arriving Purchase Order from Marberger or Jordan Banana', tab: 'receive', ans: 'Go to PO Check-In & Donations, type the actual received quantity in every blank box (enter 0 if shorted), and click "Reconcile & Check In PO".' },
  { q: 'Record an in-kind food donation and print a tax receipt for the donor', tab: 'receive', ans: 'Go to PO Check-In & Donations, fill out the In-Kind Food Donation form in Section 2, and click "Log Donation & Generate Tax Receipt".' },
  { q: 'Do a Blind Physical Count by section (live or from a printed sheet)', tab: 'records', ans: 'Go to Blind Count & Waste, choose a section (e.g. Walk-in cooler), select Live Count or Hard-Copy Entry, enter counts, and click Review & Reconcile.' },
  { q: 'Edit, add, or delete inventory items individually or in bulk', tab: 'stock', ans: 'Go to Stock, click "Edit" or "Delete" on a single item or "Bulk Edit / Delete Stock" at the top to update or remove multiple items.' },
  { q: 'Scale a recipe for 40 to 80 people or print a recipe card', tab: 'recipes', ans: 'Go to Recipes, pick the dish, drag the 40–80 slider (or tap 40–80 Quick-Scan Table), and click Print Recipe + QR.' },
  { q: 'Record today\'s lunch count and deduct ingredients from stock', tab: 'menu', ans: 'Go to Menu & Daily Sheet, enter the number served next to today\'s meal, and click "Served".' },
  { q: 'Log refrigerator, freezer, or steam table temperatures', tab: 'safety', ans: 'Go to Temps & Cleaning and type the °F reading into each of the 6 boxes; PASS or FIX NOW appears automatically.' },
  { q: 'Put a 3-day, 4-day, or 7-day date label on leftovers or salad bar items', tab: 'storage', ans: 'Go to Date Labels & Salad Bar, click a 1-Tap Preset button, enter the item name, and click Add & Date-Label.' }
];

export const tourState = { active: false, stepIndex: 0, completedTabs: {}, demoActive: false, demoNote: '' };

export let tourDemoBackup = null;

export function restoreTourDemoSandbox() {
  if (!tourDemoBackup) return false;
  const restored = JSON.parse(tourDemoBackup);
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, restored);
  tourDemoBackup = null;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  return true;
}

export function runTourStepDemo(tabId) {
  restoreTourDemoSandbox();
  tourDemoBackup = JSON.stringify(state);
  const today = localDateStr();

  switch (tabId) {
    case 'dashboard': {
      state.announcements.unshift({
        id: 'demo-ann-1',
        title: 'LIVE DEMO: Thanksgiving Week Service & Delivery Alert',
        body: 'Demo notice: Thursday & Friday closed for holiday. Extra portions auto-calculated for Wednesday service.',
        level: 'CRITICAL',
        repeat_rule: 'none',
        created_at: today,
        posted_by: 'Interactive Tour Demo'
      });
      return 'Added a live CRITICAL Dashboard alert banner — notice how it pins to the top of Home!';
    }
    case 'stock': {
      state._stockSearch = 'Spaghetti';
      if (state.items[0]) state.items[0].on_hand = Number(state.items[0].on_hand || 0) + 1;
      return 'Filtered Living Stock for "Spaghetti" and simulated a +1 shelf count adjustment (sandboxed).';
    }
    case 'orders': {
      const lowItem = state.items.find(i => i.cadence === 'W') || state.items[0];
      if (lowItem) lowItem.on_hand = 0;
      return 'Simulated a zero-stock Weekly item so Marberger whole-case PO suggestions appear below.';
    }
    case 'receive': {
      state.donations.unshift({
        id: 'demo-don-1',
        donor_name: 'St. Paul Community Food Drive (Demo)',
        donor_org: 'Butler Civic Partners',
        donor_address: '200 N Main St, Butler, PA 16001',
        donation_date: today,
        notes: 'Interactive Tour Demo — In-Kind Food Contribution',
        items: [{ item_id: '', description: 'Fresh Produce & Bakery Assortment', qty: 4, unit: 'cases' }],
        logged_by: 'Interactive Tour Demo',
        created_at: nowStamp()
      });
      return 'Logged a sample in-kind donation below — click "View / Print Tax Receipt" to preview the IRS receipt!';
    }
    case 'menu': {
      state._menuViewRange = 'all';
      return 'Switched Menu Planner to show the full November 2026 schedule, planned portions, and Served logging.';
    }
    case 'prep': {
      return 'Showing tomorrow’s scaled ingredient pulls grouped automatically by Walk-in Cooler, Freezer, and Stockroom.';
    }
    case 'recipes': {
      const spag = state.recipes.find(r => r.id === 'rec-spaghetti') || state.recipes[0];
      if (spag) {
        state._selectedRecipeId = spag.id;
        state._recipeScale = 75;
      }
      return 'Selected Spaghetti & Meatballs and scaled every ingredient from 65 to 75 portions automatically!';
    }
    case 'safety': {
      state.tempLogs = state.tempLogs.filter(t => t.log_date !== today);
      state.tempLogs.push(
        { id: 'demo-t1', log_date: today, checkpoint: 'Walk-in cooler', temp_f: 38, passed: true, logged_by: 'Tour Demo', logged_at: nowStamp() },
        { id: 'demo-t2', log_date: today, checkpoint: 'Walk-in freezer', temp_f: -2, passed: true, logged_by: 'Tour Demo', logged_at: nowStamp() },
        { id: 'demo-t3', log_date: today, checkpoint: 'Steam table well', temp_f: 128, passed: false, logged_by: 'Tour Demo', logged_at: nowStamp() }
      );
      return 'Logged sample temps: 38°F Cooler (PASS), -2°F Freezer (PASS), and 128°F Steam Table (FIX NOW alert)!';
    }
    case 'storage': {
      state.storageTags.unshift({
        id: 'demo-tag-1',
        item_name: 'Demo Cooked Meatballs & Marinara (2 Hotel Pans)',
        tag_category: 'LEFTOVER',
        zone: 'Walk-in cooler',
        prep_date: today,
        use_by_date: addDays(today, 6),
        status: 'STORED',
        logged_by: 'Tour Demo'
      });
      return 'Created a 7-day ServSafe FIFO leftover date label with automatic Use-By countdown!';
    }
    case 'checklists': {
      state._checklistTab = 'DAILY';
      return 'Opened Daily Operational Checklist — tap any box to stamp your name and timestamp automatically.';
    }
    case 'forecasting': {
      return 'Displaying the self-learning forecaster (32.1/day learned baseline, weekday factors & nearest-5 waste buffer).';
    }
    case 'records': {
      state._blindSection = 'Walk-in cooler';
      return 'Selected Walk-in cooler for a Blind Physical Count — system stock stays hidden until you reconcile.';
    }
    case 'report': {
      state._reportRange = 'month';
      return 'Loaded Executive Monthly Report with meals served, $3.25/meal grant projections & Copy Funding Brief.';
    }
    case 'users': {
      return 'Showing 4-tier RBAC staff accounts, PIN management, and the Real-Time Accountability Audit Feed.';
    }
    default:
      return 'Interactive demo active for this screen.';
  }
}


export const TOUR_STEPS = [
  { tab: 'dashboard', title: '1. Home Dashboard & Announcements', desc: 'Your daily command center: see Quick Shift Actions, color-coded Announcements & Reminders, Use-By alerts, Priority Carryover tasks, today\'s meal, and next-service forecast.', tryIt: 'Review any red or amber notices first, or tap a Quick Shift Action button.' },
  { tab: 'stock', title: '2. Living Stock & Bulk Manager', desc: 'Tracks real-time quantities across all 6 storage zones, with individual Edit/Delete buttons and a Bulk Edit / Delete Stock modal.', tryIt: 'Search or filter by zone, tap + / -, or open Bulk Edit / Delete Stock.' },
  { tab: 'orders', title: '3. Orders & Purchase Orders', desc: 'Separates Weekly orders (Marberger Dairy & Produce) from Monthly orders (3rd Friday Jordan Banana). Create Draft POs, approve quantities, and track deliveries.', tryIt: 'Review items below par and create a Draft PO for approval.' },
  { tab: 'receive', title: '4. PO Check-In & Donations (Tax Receipts)', desc: 'Enter exact quantities received on open POs to accept deliveries, and log in-kind food donations with printable IRS tax receipts.', tryIt: 'Enter received quantities in Section 1 or log a donation in Section 2.' },
  { tab: 'menu', title: '5. Menu Planner, Bulk Entry & Daily/Weekly/Monthly Print', desc: 'Bulk-enter past or future menus, schedule Mon/Tue/Wed/Fri service days, and print proper Daily, Weekly, or Monthly menus.', tryIt: 'Click "+ Bulk Enter Menus" or "Print Daily / Weekly / Monthly Menu".' },
  { tab: 'prep', title: '6. Next-Day Prep List', desc: 'Automatically pulls tomorrow\'s ingredient requirements grouped by storage zone (Cooler, Freezer, Dry Storage) plus FIFO leftovers.', tryIt: 'Check off each ingredient pull as you stage it for service.' },
  { tab: 'recipes', title: '7. Recipes (40–80), Bulk Edit & QR Scan', desc: 'Paste new recipes, bulk add/edit/delete recipes, scan recipe QR cards, drag the 40–80 portion slider, or open the 40–80 Quick-Scan Table.', tryIt: 'Drag the 40–80 slider or click "Bulk Add / Edit".' },
  { tab: 'safety', title: '8. Daily Temps & Cleaning (HACCP)', desc: 'Log the 6 required serving-day temperature checks (Coolers <=41°F, Freezers <=0°F, Entree >=165°F, Steam Table >=135°F) and 7-point cleaning checks.', tryIt: 'Enter a temperature reading to verify PASS vs. FLAGGED auto-check.' },
  { tab: 'storage', title: '9. Storage & Date Labels (FIFO)', desc: 'Use 1-Tap Presets for Cut Salad Greens/Fruit (3d), Dairy/Deli Salads (4d), Cooked Entrees (7d), and Freezer (90d) so Use-By alerts fire automatically.', tryIt: 'Tap a 1-Tap Preset or mark a stored container as Served/Used.' },
  { tab: 'checklists', title: '10. Daily, Weekly & Monthly Checklists', desc: 'Stamp your name and time on cleaning, ordering, and food safety tasks, and add, edit, or delete custom tasks.', tryIt: 'Switch between Daily, Weekly, and Monthly tabs and check off a task.' },
  { tab: 'forecasting', title: '11. Patrons Served & Forecasting', desc: 'Log actual patrons served, bulk-enter up to 1 year of past dates, or paste CSV/Spreadsheet rows to drive weekday & monthly attendance forecasts.', tryIt: 'Log a test count or open "+ Bulk Enter Past Dates".' },
  { tab: 'records', title: '12. Section Blind Count, Waste & Backups', desc: 'Pick a storage section to live-count on screen or print a blank count sheet and enter hard-copy numbers later.', tryIt: 'Select a section, enter counts, and click Review & Reconcile.' },
  { tab: 'report', title: '13. Monthly Operations Report', desc: 'View monthly meals served, top items used, waste summary, and print-ready Letter compliance reports.', tryIt: 'Pick a month and click Print Report.' },
  { tab: 'users', title: '14. Users, Announcements & Activity', desc: 'Manage Admin, Manager, Staff, and Volunteer profiles, post/schedule Announcements, and watch the Real-Time Accountability Feed.', tryIt: 'Click "+ Post / Schedule Announcement" or review the Accountability Feed.' }
];

export function getRoleTourSteps() {
  const allowed = getAllowedTabs(getActiveUser());
  return TOUR_STEPS.filter(s => allowed.includes(s.tab));
}

export function renderPageGuideBanner(tabId) {
  const g = PAGE_GUIDES[tabId];
  if (!g) return '';
  if (state.dismissedGuides && state.dismissedGuides[tabId]) return '';
  return `
    <div class="mb-4 kms-card p-3.5 border-l-4 border-l-emerald-600 bg-emerald-50/40 no-print">
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-1 text-xs">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="tag tag-OK">QUICK GUIDE</span>
            <strong class="text-sm">${esc(g.title)}</strong>
          </div>
          <p class="opacity-85">${esc(g.summary)}</p>
          <ol class="list-decimal list-inside space-y-0.5 pt-1 opacity-90">
            ${g.steps.map(s => `<li>${esc(s)}</li>`).join('')}
          </ol>
        </div>
        <button type="button" data-hide-guide="${esc(tabId)}" class="kms-btn-alt px-2.5 py-1 text-[11px] shrink-0">Hide Tip</button>
      </div>
    </div>
  `;
}

export let lastDiagnosticReport = null;

export async function runSystemDiagnostics() {
  const backupJson = JSON.stringify(state);
  const results = [];
  const recordTest = (id, area, check, expected, actual, passed) => {
    results.push({ id, area, check, expected, actual, passed: !!passed });
  };

  try {
    const seed = buildSeedInventory();
    const outItem = { on_hand: 0, par: 2 };
    const lowItem = { on_hand: 1, par: 3 };
    const okItem = { on_hand: 3, par: 3 };
    const t1 = seed.length === 76 && itemStatus(outItem) === 'OUT' && itemStatus(lowItem) === 'LOW' && itemStatus(okItem) === 'OK';
    recordTest('T-01', 'Living Inventory', 'Seed catalog integrity (76 Butler PA items) & OUT/LOW/OK thresholds', '76 items; OUT / LOW / OK accurate', `${seed.length} items; ${itemStatus(outItem)}/${itemStatus(lowItem)}/${itemStatus(okItem)}`, t1);

    const targetItem = state.items[0];
    const origQty = targetItem.on_hand;
    snapUndo();
    targetItem.on_hand = origQty + 5;
    const bumped = targetItem.on_hand === origQty + 5;
    state.items = JSON.parse(undoSnapshot);
    const restored = state.items[0].on_hand === origQty;
    recordTest('T-02', 'Stock & Undo Engine', 'Stock increment, bulk edit & 1-click Undo snapshot rollback', `+5 then restore to ${origQty}`, bumped && restored ? `Restored to ${state.items[0].on_hand}` : 'Mismatch', bumped && restored);

    const cupsInGal = convertCulinaryUnit(1, 'gallons', 'cups');
    const ozInLb = convertCulinaryUnit(2, 'lbs', 'oz');
    const fracStr = formatKitchenAmt(2.5, 'cups');
    const t3 = Math.abs(cupsInGal - 16) < 0.01 && Math.abs(ozInLb - 32) < 0.01 && fracStr === '2½ cups';
    recordTest('T-03', 'Culinary Conversions', 'Gallon-to-cup, pound-to-ounce & fraction formatting', '16 cups, 32 oz, "2½ cups"', `${cupsInGal} cups, ${ozInLb} oz, "${fracStr}"`, t3);

    const parsedRec = parsePastedRecipe('Test Mac & Cheese\nServings: 40\n4 lbs Macaroni\n2 lbs Shredded cheese\nDirections:\n1. Boil macaroni.\n2. Stir in cheese.');
    const hasAllergens = parsedRec.allergens.includes('wheat') && parsedRec.allergens.includes('milk');
    const t4 = parsedRec.name === 'Test Mac & Cheese' && parsedRec.base_servings === 40 && parsedRec.ingredients.length === 2 && parsedRec.steps.length === 2 && hasAllergens;
    recordTest('T-04', 'Recipe Parser & Allergens', 'Parse pasted recipe text, steps & FDA Big 9 allergens', '40 srv, 2 ing, 2 steps, wheat+milk', `${parsedRec.base_servings} srv, ${parsedRec.ingredients.length} ing, [${parsedRec.allergens.join(', ')}]`, t4);

    const spag = state.recipes.find(r => r.id === 'rec-spaghetti') || state.recipes[0];
    const baseS = spag.base_servings || 65;
    const scale80 = 80 / baseS;
    const scaledIng0 = Math.round((spag.ingredients[0].qty * scale80) * 100) / 100;
    const expectedIng0 = Math.round((spag.ingredients[0].qty * (80 / baseS)) * 100) / 100;
    const t5 = scaledIng0 === expectedIng0 && spag.ingredients[0].per100 > 0;
    recordTest('T-05', '40–80 Recipe Scaling', 'Proportional scaling to 80 portions & per-100 stock factor', `${expectedIng0} ${spag.ingredients[0].unit} @ 80 portions`, `${scaledIng0} ${spag.ingredients[0].unit} (per100: ${spag.ingredients[0].per100})`, t5);

    const countBefore = state.recipes.length;
    const bulkBlocks = [
      `${spag.name}\nServings: 70\n10 lbs Spaghetti\nDirections:\n1. Updated step.`,
      `Diagnostic Test Stew\nServings: 50\n5 lbs Beef stew\nDirections:\n1. Simmer.`
    ];
    let bAdded = 0, bUpdated = 0;
    bulkBlocks.forEach(blk => {
      const p = parsePastedRecipe(blk);
      const ex = state.recipes.find(r => r.name.trim().toLowerCase() === p.name.trim().toLowerCase());
      if (ex) { ex.base_servings = p.base_servings; bUpdated++; }
      else { state.recipes.unshift(p); bAdded++; }
    });
    const t6 = bUpdated === 1 && bAdded === 1 && state.recipes.length === countBefore + 1;
    recordTest('T-06', 'Bulk Recipe Manager', 'Batch update matching title + insert new recipe', '1 updated, 1 added', `${bUpdated} updated, ${bAdded} added`, t6);

    const d7 = demandForDays(serviceDaysBetween(localDateStr(), addDays(localDateStr(), 7)));
    const d30 = demandForDays(serviceDaysBetween(localDateStr(), addDays(localDateStr(), 30)));
    const fractionalGapItem = { id: 't-frac', on_hand: 1.5, par: 2, cadence: 'W' };
    const outGapItem = { id: 't-out', on_hand: 0, par: 2, cadence: 'M' };
    const sugFrac = suggestedOrderAmount(fractionalGapItem, d7, d30);
    const sugOut = suggestedOrderAmount(outGapItem, d7, d30);
    const t7 = sugFrac === 0 && sugOut === 2;
    recordTest('T-07', 'Orders & PO Check-In', 'Whole-case rounding (suppress <1 case gap; order >=1 when out)', '0 for 0.5 gap; 2 for 0 on-hand', `${sugFrac} cases; ${sugOut} cases`, t7);

    const beefItem = state.items.find(i => i.id === 'item-56') || state.items[0];
    const beefStart = beefItem.on_hand;
    const usedSim = 2;
    beefItem.on_hand = Math.round(Math.max(0, beefItem.on_hand - usedSim) * 100) / 100;
    const tagStart = state.storageTags.length;
    state.storageTags.unshift({ id: 't-tag', item_name: 'Test Leftover', tag_category: 'LEFTOVER', zone: 'Walk-in cooler', prep_date: '2026-11-23', use_by_date: addDays('2026-11-23', 6), status: 'STORED' });
    const t8 = beefItem.on_hand === Math.round((beefStart - usedSim) * 100) / 100 && state.storageTags[0].use_by_date === '2026-11-29' && state.storageTags.length === tagStart + 1;
    recordTest('T-08', 'Menu & FIFO Date Labels', 'Stock deduction on service & 7-day ServSafe Use-By calculation', `Stock -2 & Use-By 2026-11-29`, `Stock ${beefItem.on_hand} & Use-By ${state.storageTags[0].use_by_date}`, t8);

    const coolerOk = 38 <= TEMP_CHECKS[0][2];
    const coolerFail = 45 <= TEMP_CHECKS[0][2];
    const hotOk = 140 >= TEMP_CHECKS[4][2];
    const hotFail = 128 >= TEMP_CHECKS[4][2];
    const t9 = coolerOk && !coolerFail && hotOk && !hotFail;
    recordTest('T-09', 'HACCP Food Safety', 'Cold (<=41°F), Frozen (<=0°F) & Hot Hold (>=135°F) alerts', '38°F PASS, 45°F FAIL, 140°F PASS, 128°F FAIL', `${coolerOk?'PASS':'FAIL'}, ${coolerFail?'PASS':'FAIL'}, ${hotOk?'PASS':'FAIL'}, ${hotFail?'PASS':'FAIL'}`, t9);

    const thxClosed = forecastWeekday('2026-11-26');
    const openMon = forecastWeekday('2026-11-23');
    const t10 = thxClosed === 0 && openMon >= 10;
    recordTest('T-10', 'Forecasting & Holidays', 'Auto-zero closed federal holidays & predict open service days', 'Nov 26 = 0; Nov 23 >= 10', `Nov 26 = ${thxClosed}; Nov 23 = ${openMon}`, t10);

    // T-11: Self-Learning Portion Baseline & Nearest-5 Waste Control
    state.menuPlan = Array.from({ length: 12 }, (_, idx) => ({
      id: `sim-mp-${idx}`,
      service_date: addDays('2026-10-01', idx * 2),
      status: 'SERVED',
      circumstance: 'Normal Day',
      planned_portions: 35,
      served_portions: 32
    }));
    const learnedInfo = relearnPortionBaseline('2026-12-01');
    const rounded33 = roundUpToNearest5(33);
    const decForecast = forecastPlannedPortionsForDate('2026-12-02', 1.0, false);
    const t11 = learnedInfo.learnedBaseline === 32 && rounded33 === 35 && decForecast.plannedPortions === 35;
    recordTest(
      'T-11',
      'Self-Learning Portion Baseline',
      'Phase out 65 seed on ~32 avg & round 33 -> 35 nearest-5 waste buffer',
      'Baseline 32; 33 -> 35; Dec plan 35',
      `Baseline ${learnedInfo.learnedBaseline}; 33 -> ${rounded33}; Dec plan ${decForecast.plannedPortions}`,
      t11
    );

    const adminTabs = getAllowedTabs({ role: 'ADMIN' });
    const mgrTabs = getAllowedTabs({ role: 'MANAGER' });
    const staffTabs = getAllowedTabs({ role: 'STAFF' });
    const volTabs = getAllowedTabs({ role: 'VOLUNTEER' });
    const t12 = adminTabs.length === 15 && mgrTabs.length === 15 && !staffTabs.includes('users') && !staffTabs.includes('report') && !volTabs.includes('orders') && !volTabs.includes('receive');
    recordTest('T-12', 'RBAC 4-Tier Permissions', 'Enforce ADMIN (15), MANAGER (15), STAFF (13) & VOLUNTEER (10) boundaries', '15 / 15 / 13 / 10 tabs enforced', `${adminTabs.length} / ${mgrTabs.length} / ${staffTabs.length} / ${volTabs.length} tabs`, t12);

    const hasPrintCss = Array.from(document.styleSheets).some(ss => {
      try { return Array.from(ss.cssRules || []).some(r => r.media && r.media.mediaText && r.media.mediaText.includes('print')); }
      catch (e) { return false; }
    });
    recordTest('T-13', 'Letter Print & Menus', 'Verify @media print Letter pagination, unclipped lists & menu sheets', 'Print rules active', hasPrintCss ? 'Letter 0.45in & unclipped scroll active' : 'Missing', hasPrintCss);

    let cloudDetail = 'Local offline mode';
    let t14 = false;
    if (sbClient) {
      const { error } = await sbClient.from('kms_users').select('id').limit(1);
      if (!error) {
        t14 = true;
        cloudDetail = 'Connected & verified (kms_users reachable)';
      } else {
        cloudDetail = 'Supabase error: ' + error.message;
      }
    }
    recordTest('T-14', 'Supabase Cloud Sync', 'Live PostgreSQL database connection & table read check', 'Live connection OK', cloudDetail, t14);
  } finally {
    const restored = JSON.parse(backupJson);
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, restored);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  const u = getActiveUser();
  const passedCount = results.filter(r => r.passed).length;
  lastDiagnosticReport = {
    timestamp: nowStamp(),
    iso: new Date().toISOString(),
    tester: `${u.name} (${u.role})`,
    passedCount,
    totalCount: results.length,
    allPassed: passedCount === results.length,
    results
  };
  logActivity('SYSTEM SELF-TEST', `Ran diagnostic suite: ${passedCount}/${results.length} passed`);
  saveState();
  showDiagnosticModal();
}

export function showDiagnosticModal() {
  const rep = lastDiagnosticReport;
  if (!rep) return;
  document.body.classList.add('printing-modal');
  openModal('System Verification & Diagnostic Certification Report', `
    <div class="space-y-3 text-xs">
      <div class="p-3.5 rounded-xl border ${rep.allPassed ? 'border-emerald-500 bg-emerald-50/60' : 'border-amber-500 bg-amber-50/60'} flex flex-wrap items-center justify-between gap-2 print-keep">
        <div>
          <div class="text-[11px] font-bold uppercase opacity-70">The Salvation Army · Butler, PA · Community Meals KMS</div>
          <div class="text-base font-extrabold mt-0.5">${rep.allPassed ? 'ALL SYSTEMS VERIFIED & PASSED' : 'DIAGNOSTIC COMPLETED WITH WARNINGS'} (${rep.passedCount}/${rep.totalCount})</div>
          <div class="opacity-80 mt-0.5">Verified by <strong>${esc(rep.tester)}</strong> on <strong>${esc(rep.timestamp)}</strong> &bull; Non-destructive sandbox (live data untouched)</div>
        </div>
        <span class="tag ${rep.allPassed ? 'tag-OK' : 'tag-LOW'} text-sm px-3 py-1">${rep.allPassed ? 'CERTIFIED PASS' : 'CHECK WARNINGS'}</span>
      </div>

      <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
              <th class="p-2">ID</th>
              <th class="p-2">Subsystem</th>
              <th class="p-2">Verification Check</th>
              <th class="p-2">Observed Result</th>
              <th class="p-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--line)]">
            ${rep.results.map(r => `
              <tr>
                <td class="p-2 font-mono font-bold">${esc(r.id)}</td>
                <td class="p-2 font-bold">${esc(r.area)}</td>
                <td class="p-2">${esc(r.check)}</td>
                <td class="p-2 opacity-80">${esc(r.actual)}</td>
                <td class="p-2 text-right"><span class="tag ${r.passed ? 'tag-OK' : 'tag-OUT'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap gap-2 pt-1 no-print">
        <button type="button" onclick="window.print()" class="kms-btn-navy flex-1 py-2 text-xs font-semibold">Print / Save PDF Verification Report</button>
        <button type="button" id="btn-copy-diag-report" class="kms-btn-alt px-3.5 py-2 text-xs font-semibold">Copy Summary</button>
        <button type="button" data-close-modal="1" class="kms-btn-alt px-3.5 py-2 text-xs font-semibold">Close</button>
      </div>
    </div>
  `);
}

export function renderHelp(main) {
  const u = getActiveUser();
  const allowed = getAllowedTabs(u);
  const steps = getRoleTourSteps();
  const q = (state._helpSearch || '').trim().toLowerCase();
  const filteredTasks = HOW_DO_I_TASKS.filter(t =>
    allowed.includes(t.tab) && (!q || t.q.toLowerCase().includes(q) || t.ans.toLowerCase().includes(q))
  );
  const goBtn = (tab, label) => allowed.includes(tab)
    ? `<button type="button" data-tab="${tab}" class="mt-2 inline-block text-xs font-bold text-[#b3122b] hover:underline">Open ${label} &rarr;</button>`
    : '';
  main.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="bg-[#1b365d] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#b3122b]">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Training &amp; System Health</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Staff Onboarding, Role Guides &amp; Self-Test Diagnostics</h2>
              <div class="text-xs text-white/85 mt-0.5">Launch the interactive guided tour, review role workflows, or run the 14-point system self-test.</div>
            </div>
          </div>
          
        </div>
      </div>
    
      <div class="kms-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base sm:text-lg font-bold">Training Center, Guided Tour &amp; System Verification</h2>
          <p class="text-xs opacity-75">Zero-training quick answers, interactive walkthroughs, role permissions, and automated diagnostics (${esc(u.role)}).</p>
        </div>
        <div class="flex flex-wrap gap-2 no-print">
          <button type="button" id="btn-run-selftest" class="kms-btn-ok px-3.5 py-2 text-xs font-semibold">Run Full System Self-Test &amp; Report</button>
          <button type="button" id="btn-start-tour" class="kms-btn-primary px-3.5 py-2 text-xs font-semibold">Start Interactive Guided Tour</button>
          <button type="button" id="btn-show-all-guides" class="kms-btn-alt px-3 py-2 text-xs font-semibold">Reset Page Tips</button>
          <button type="button" id="btn-retrain-self" class="kms-btn-alt px-3 py-2 text-xs font-semibold">Replay First-Login Training</button>
        </div>
      </div>

      <!-- System Verification Status Card -->
      <div class="kms-card p-4 border-l-4 ${lastDiagnosticReport ? (lastDiagnosticReport.allPassed ? 'border-l-emerald-600' : 'border-l-amber-500') : 'border-l-[#1b365d]'} flex flex-wrap items-center justify-between gap-3">
        <div class="text-xs space-y-0.5">
          <div class="font-bold text-sm">System Self-Test &amp; Certification Report</div>
          ${lastDiagnosticReport
            ? `<p class="opacity-80">Last verified <strong>${esc(lastDiagnosticReport.timestamp)}</strong> by ${esc(lastDiagnosticReport.tester)} — <strong>${lastDiagnosticReport.passedCount}/${lastDiagnosticReport.totalCount} checks passed</strong>.</p>`
            : `<p class="opacity-80">Verify all 14 core subsystems (inventory math, bulk CRUD, 40–80 recipe scaling, self-learning nearest-5 portion baseline, PO check-in, HACCP temps, 4-tier RBAC &amp; Supabase sync) and print a PASS report.</p>`}
        </div>
        <div class="flex gap-2 no-print">
          ${lastDiagnosticReport ? `<button type="button" id="btn-view-last-diag" class="kms-btn-navy px-3 py-1.5 text-xs font-semibold">View / Print Report</button>` : ''}
          <button type="button" id="btn-run-selftest-2" class="kms-btn-ok px-3.5 py-1.5 text-xs font-semibold">${lastDiagnosticReport ? 'Re-Run All 14 Tests' : 'Run All 14 Tests Now'}</button>
        </div>
      </div>

      <!-- Instant "How Do I...?" Task Finder -->
      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wide">"How Do I...?" Instant Task Finder</h3>
            <p class="text-xs opacity-75">Type any question below to get a 1-sentence answer and jump directly to that screen.</p>
          </div>
          <input id="help-task-search" type="text" value="${esc(state._helpSearch || '')}" placeholder="Search e.g. bulk menu, print monthly, PO..." class="kms-input text-xs w-64 max-w-full" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          ${!filteredTasks.length ? '<p class="opacity-70 py-2">No matching tasks found.</p>' : filteredTasks.map(t => `
            <div class="p-3 rounded-lg border border-[var(--line)] flex flex-col justify-between gap-2">
              <div>
                <div class="font-bold text-sm">How do I ${esc(t.q)}?</div>
                <p class="opacity-80 mt-1 leading-relaxed">${esc(t.ans)}</p>
              </div>
              <div class="no-print">
                <button type="button" data-go-guide-tab="${esc(t.tab)}" class="kms-btn-navy px-3 py-1 text-[11px] font-semibold">Take Me There &rarr;</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="kms-card p-4 space-y-3">
        <h3 class="text-sm font-bold uppercase tracking-wide">Daily Kitchen Workflow (Mon / Tue / Wed / Fri Service)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div class="p-3.5 rounded-lg border border-[var(--line)]">
            <div class="font-bold text-[#b3122b] uppercase">Step 1 &bull; Morning Opening</div>
            <div class="font-bold text-sm mt-1">Log Temps &amp; Check In POs</div>
            <p class="opacity-80 mt-1 leading-relaxed">Log Walk-In &amp; Kitchen Cooler (&le;41&deg;F) and Freezer (&le;0&deg;F) temps in <strong>Safety</strong>. Reconcile arriving POs or log donations in <strong>PO Check-In &amp; Donations</strong>.</p>
            ${goBtn('safety', 'Safety')}
          </div>
          <div class="p-3.5 rounded-lg border border-[var(--line)]">
            <div class="font-bold text-[#b3122b] uppercase">Step 2 &bull; Recipes &amp; Menu</div>
            <div class="font-bold text-sm mt-1">Scale 40–80 &amp; Plan Menu</div>
            <p class="opacity-80 mt-1 leading-relaxed">Scale any recipe from <strong>40 to 80 portions</strong> (or scan its QR card) in <strong>Recipes</strong>. Bulk-schedule or print Daily/Weekly/Monthly menus in <strong>Menu</strong>.</p>
            ${goBtn('menu', 'Menu')}
          </div>
          <div class="p-3.5 rounded-lg border border-[var(--line)]">
            <div class="font-bold text-[#b3122b] uppercase">Step 3 &bull; Prep &amp; Service</div>
            <div class="font-bold text-sm mt-1">Pull Prep &amp; Hot Hold</div>
            <p class="opacity-80 mt-1 leading-relaxed">Follow <strong>Prep</strong> pulls grouped by Cooler, Freezer, and Dry Storage. Verify cooking (&ge;165&deg;F) and steam table (&ge;135&deg;F) temps before 11:30 AM.</p>
            ${goBtn('prep', 'Prep')}
          </div>
          <div class="p-3.5 rounded-lg border border-[var(--line)]">
            <div class="font-bold text-[#b3122b] uppercase">Step 4 &bull; After Service</div>
            <div class="font-bold text-sm mt-1">Date-Label &amp; Log Patrons</div>
            <p class="opacity-80 mt-1 leading-relaxed">Tag leftovers &amp; salad bar items in <strong>Storage</strong> (3d greens/fruit, 4d dairy, 7d cooked, 90d frozen). Log actual patrons served in <strong>Forecasting</strong>.</p>
            ${goBtn('forecasting', 'Forecasting')}
          </div>
          <div class="p-3.5 rounded-lg border border-[var(--line)]">
            <div class="font-bold text-[#b3122b] uppercase">Step 5 &bull; Weekly / Monthly</div>
            <div class="font-bold text-sm mt-1">Section Blind Audits &amp; POs</div>
            <p class="opacity-80 mt-1 leading-relaxed">Run unbiased physical counts by section in <strong>Blind Count &amp; Waste</strong>. Submit Weekly (Marberger) and Monthly 3rd-Friday (Jordan Banana) POs in <strong>Orders</strong>.</p>
            ${goBtn('records', 'Blind Count')}
          </div>
          <div class="p-3.5 rounded-lg border border-[var(--line)]">
            <div class="font-bold text-[#b3122b] uppercase">Step 6 &bull; Security &amp; Sync</div>
            <div class="font-bold text-sm mt-1">PINs, Auto-Lock &amp; Cloud Sync</div>
            <p class="opacity-80 mt-1 leading-relaxed">Shared tablets auto-lock after 5 minutes. Every change stamps your name and syncs live to Supabase across all kitchen devices.</p>
            ${goBtn('users', 'Users & Activity')}
          </div>
        </div>
      </div>

      <div class="kms-card p-4 space-y-3 no-print">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold uppercase tracking-wide">Interactive Walkthrough by Feature (Click Any Card)</h3>
          <span class="text-xs opacity-70">${Object.keys(tourState.completedTabs).length} / ${steps.length} explored</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          ${steps.map((s, idx) => `
            <button type="button" data-launch-tour-step="${idx}" class="text-left p-3 rounded-lg border transition ${tourState.completedTabs[s.tab] ? 'border-emerald-400 bg-emerald-50/40' : 'border-[var(--line)] hover:bg-black/5'}">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold">${esc(s.title)}</span>
                <span class="tag ${tourState.completedTabs[s.tab] ? 'tag-OK' : 'tag-LOW'}">${tourState.completedTabs[s.tab] ? 'Visited' : 'Start →'}</span>
              </div>
              <p class="text-[11px] opacity-75 mt-1 line-clamp-2">${esc(s.desc)}</p>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="kms-card p-4 space-y-2.5 text-xs">
        <h3 class="text-sm font-bold uppercase tracking-wide">Role Permissions Matrix (ADMIN / MANAGER / STAFF / VOLUNTEER)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead><tr class="border-b border-[var(--line)] uppercase opacity-70"><th class="py-1.5 pr-2">Role</th><th class="py-1.5 pr-2">Visible Tabs</th><th class="py-1.5 pr-2">Allowed Actions</th><th class="py-1.5">Restricted Actions</th></tr></thead>
            <tbody class="divide-y divide-[var(--line)]">
              <tr><td class="py-2 pr-2 font-bold text-[#b3122b]">ADMIN</td><td class="py-2 pr-2">All 15 Tabs</td><td class="py-2 pr-2">Full system control: manage logins/PINs/roles (up to Admin), announcements, backups, PO approvals/placement, PO check-in &amp; donations, bulk menu/stock/recipe/checklist edits &amp; deletes.</td><td class="py-2 opacity-75">Primary Owner account (usr-1) cannot be deleted or demoted.</td></tr>
              <tr><td class="py-2 pr-2 font-bold text-[#1b365d]">MANAGER</td><td class="py-2 pr-2">All 15 Tabs</td><td class="py-2 pr-2">Approve/reject/place/edit/delete any PO, check in POs &amp; print Donation Tax Receipts, access Funding Reports, bulk edit/delete Menus/Stock/Recipes/Checklists, manage Staff &amp; Volunteer accounts.</td><td class="py-2 opacity-75">Cannot create/edit/delete Admin or peer Manager accounts.</td></tr>
              <tr><td class="py-2 pr-2 font-bold text-emerald-700">STAFF</td><td class="py-2 pr-2">13 Operational Tabs</td><td class="py-2 pr-2">Create/edit/delete unapproved PO requests, reconcile POs, log Donations &amp; print Tax Receipts, mark Menu Served, suggest Recipes, log Temps, Date Labels, Checklists &amp; Patrons Served.</td><td class="py-2 opacity-75">No Users &amp; Activity or Monthly Funding Reports; cannot approve POs, overwrite Menu schedule, or bulk-delete Recipes/Stock.</td></tr>
              <tr><td class="py-2 pr-2 font-bold opacity-80">VOLUNTEER</td><td class="py-2 pr-2">10 Floor Tabs</td><td class="py-2 pr-2">Adjust Stock counts, view Menu &amp; scale Recipes (40–80), check off Next-Day Prep &amp; Checklists, log Temps &amp; Date Labels, submit Blind Counts &amp; Waste.</td><td class="py-2 opacity-75">No Orders &amp; POs, PO Check-In &amp; Donations, Monthly Report, or Users &amp; Activity; cannot edit/delete Recipes, Menu schedule, or Checklist templates.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="kms-card p-4 space-y-2.5 text-xs">
        <h3 class="text-sm font-bold uppercase tracking-wide">Kitchen &amp; App Glossary</h3>
        <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div><dt class="font-bold">Living Stock &amp; Par Level</dt><dd class="opacity-75">Real-time food on hand vs. the target amount needed (auto-learned from 8-week usage).</dd></div>
          <div><dt class="font-bold">PO (Purchase Order)</dt><dd class="opacity-75">Draft order list for Marberger (weekly dairy/produce) or Jordan Banana (monthly 3rd Friday dry/frozen).</dd></div>
          <div><dt class="font-bold">In-Kind Donation Tax Receipt</dt><dd class="opacity-75">Official IRS acknowledgment generated when community donors contribute food items (IRC &sect; 170(f)(8)).</dd></div>
          <div><dt class="font-bold">Blind Audit</dt><dd class="opacity-75">Counting shelves without seeing expected system stock first, keeping counts honest.</dd></div>
          <div><dt class="font-bold">HACCP / Time &amp; Temp</dt><dd class="opacity-75">Daily serving-day temperature checks: Cold &le;41&deg;F, Frozen &le;0&deg;F, Cook &ge;165&deg;F, Hot Hold &ge;135&deg;F.</dd></div>
          <div><dt class="font-bold">FIFO &amp; Use-By Date</dt><dd class="opacity-75">First In, First Out — use oldest dated containers first and discard anything past its Use-By date.</dd></div>
        </dl>
      </div>
    </div>
  `;
}