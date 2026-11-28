// js/state.js — Core State, Seed Data, RBAC, Forecasting, PIN Security & Supabase Cloud Sync

import {
  LOCATIONS, VENDORS, TEMP_CHECKS, CLEANING_TASKS,
  normStockUnit, cleanItemName, normalizeInventoryItem,
  localDateStr, addDays, dLabel, nowStamp, uid,
  KITCHEN_UNITS, UNIT_ALIASES, normUnit, convertCulinaryUnit,
  getFederalHoliday, getThirdFriday, serviceDaysBetween,
  showToast
} from './utils.js';

export const STORAGE_KEY = 'sa-butler-kms-v4';
export const SUPABASE_URL = 'https://vydclmlheskrvvtvemky.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_MpzBqpjpEl4l7G9mM_XEFg_H5u-xSTv';
const WK_MS = 604800000;

export const SEED_ITEMS = [
  ["Scalloped potatoes","Stockroom","boxes",11,11,"M"],["Crackers (individual)","Stockroom","cases",1.5,1.5,"M"],["Tuna fish","Stockroom","cans",6,6,"M"],["Tomato soup","Stockroom","cases",1,1,"M"],["Manwich","Stockroom","cans",2,2,"M"],["Ketchup (large)","Stockroom","bottles",2,2,"M"],["Mustard (large)","Stockroom","bottles",2,2,"M"],["Mustard packets","Stockroom","cases",1,1,"M"],["Italian dressing (individual)","Stockroom","cases",1,1,"M"],["Vegetable oil","Stockroom","bottles",23,23,"M"],
  ["Mixed fruit","Stockroom","cases",4.5,4.5,"M"],["Apricots","Stockroom","cases",1,1,"M"],["Chocolate pudding","Stockroom","cans",5,7,"M"],["Vanilla pudding","Stockroom","cans",6,7,"M"],["Butterscotch pudding","Stockroom","cans",1,2,"M"],["Kidney beans (small)","Stockroom","cases",7,7,"M"],["Mixed vegetables (small)","Stockroom","cases",4,4,"M"],["Corn (small)","Stockroom","cases",2.5,2.5,"M"],["Green beans (small)","Stockroom","cases",3,3,"M"],["Black beans (large)","Stockroom","cans",2,2,"M"],["Pork & beans (large)","Stockroom","cans",6,6,"M"],["Whole potatoes","Stockroom","cans",2,2,"M"],["Tomato sauce","Stockroom","cans",5,5,"M"],["Spaghetti sauce (small)","Stockroom","cans",15,15,"M"],["Spaghetti sauce (large)","Stockroom","cases",1,1,"M"],
  ["Penne pasta","Stockroom","bags",6,6,"M"],["Spaghetti","Stockroom","boxes",6,6,"M"],["Farfalle pasta","Stockroom","boxes",3,3,"M"],["Egg noodles","Stockroom","cases",1,1,"M"],["Macaroni","Stockroom","cases",2.5,2.5,"M"],["Mashed potatoes","Stockroom","cases",2,2,"M"],["BBQ sauce","Stockroom","jugs",1,1,"M"],["French dressing","Stockroom","jugs",1,1,"M"],["Honey French dressing","Stockroom","jugs",2,2,"M"],["Ranch","Stockroom","jugs",5,5,"M"],["Mayo","Stockroom","jugs",3,3,"M"],["Chicken gravy","Stockroom","cans",13,13,"M"],["Beef gravy","Stockroom","cases",1.5,1.5,"M"],["Sausage gravy","Stockroom","cans",3,3,"M"],["Cranberry sauce","Stockroom","cans",5,5,"M"],["Beef stew","Stockroom","cases",1,1,"M"],["Cheese sauce","Stockroom","cans",2,2,"M"],["Pears","Stockroom","cans",2,2,"M"],["Pineapple","Stockroom","cans",1,1,"M"],["Peaches (small)","Stockroom","cases",5,5.5,"M"],
  ["Chicken soup","Walk-in freezer","cases",1,2,"M"],["Omelets","Walk-in freezer","cases",1,1,"M"],["Sliced ham","Walk-in freezer","cases",0,1,"M"],["Green beans (frozen)","Walk-in freezer","bags",1,1,"M"],["Turkeys","Walk-in freezer","cases",3,3,"M"],["Hot dogs","Walk-in freezer","cases",5,5,"M"],["Whole chickens","Walk-in freezer","cases",1.5,1.5,"M"],["Cut-up chicken","Walk-in freezer","cases",1,1,"M"],["French fries","Walk-in freezer","cases",2,2,"M"],["Tater tots","Walk-in freezer","cases",0.5,1,"M"],["Pierogies","Walk-in freezer","cases",2,2,"M"],["Ground beef (hamburger)","Walk-in freezer","packs",5,5,"M"],["Hamburger patties","Walk-in freezer","cases",1,1,"M"],["Biscuits","Walk-in freezer","cases",2,2,"M"],["Breadsticks","Walk-in freezer","cases",2,2,"M"],["Chicken patties","Walk-in freezer","cases",2,2,"M"],["Chicken nuggets","Walk-in freezer","cases",0,2,"M"],["Fish sticks","Walk-in freezer","cases",1,2,"M"],["Meatballs","Walk-in freezer","cases",2,2,"M"],["Ravioli (cheese)","Walk-in freezer","cases",1,2,"M"],
  ["Block butter","Walk-in cooler","pieces",2,2,"W"],["Shredded cheese","Walk-in cooler","bags",3,4,"W"],["Parmesan cheese","Walk-in cooler","bags",2,2,"W"],["Feta cheese","Walk-in cooler","tubs",1,1,"W"],["Chopped garlic","Walk-in cooler","jars",4,4,"W"],["Vegetable stock","Walk-in cooler","jars",5,5,"W"],["Yogurt","Walk-in cooler","pieces",4,5,"W"],["Cottage cheese","Walk-in cooler","pieces",2,2,"W"],["Lemonade","Walk-in cooler","crates",2,2,"W"],["Iced tea","Walk-in cooler","crates",1,2,"W"],["Milk","Walk-in cooler","crates",1,2.5,"W"]
];

// Offline SHA-256 PIN Hashing
export const WEAK_PINS = ['0000','1111','2222','9999','1234','12345','123456','000000'];

export function sha256hex(str) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(str));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
  for (let s = 24; s >= 0; s -= 8) bytes.push((hi >>> s) & 255);
  for (let s = 24; s >= 0; s -= 8) bytes.push((lo >>> s) & 255);
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) w[t] = ((bytes[i+4*t] << 24) | (bytes[i+4*t+1] << 16) | (bytes[i+4*t+2] << 8) | bytes[i+4*t+3]) >>> 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15] >>> 3);
      const s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}

export function newSalt() {
  const a = new Uint8Array(12);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hashPin(pin, salt) {
  let h = sha256hex(salt + '|' + String(pin));
  for (let i = 0; i < 2000; i++) h = sha256hex(h + salt + pin);
  return h;
}

export function makeUser(id, name, role, initials, pin, mustChange) {
  const salt = newSalt();
  return {
    id, name, role, initials,
    pin_hash: hashPin(pin, salt),
    pin_salt: salt,
    must_change_pin: !!mustChange,
    active: true,
    onboarding_completed: false,
    completed_training_ids: []
  };
}

export function verifyPin(u, pin) {
  if (!u || !u.pin_hash || !u.pin_salt) return false;
  return hashPin(pin, u.pin_salt) === u.pin_hash;
}

export function buildSeedInventory() {
  return SEED_ITEMS.map((r, i) => {
    const prefix = r[1] === 'Walk-in freezer' ? 'FRZ' : r[1] === 'Walk-in cooler' ? 'CLR' : 'STK';
    const u = normStockUnit(r[2]);
    return {
      id: 'item-' + i,
      sku: prefix + '-' + String(101 + i),
      name: cleanItemName(r[0]),
      location: r[1],
      category: r[5] === 'W' ? 'Dairy / Refrigerated' : r[1] === 'Walk-in freezer' ? 'Frozen' : 'Dry / Canned',
      unit: u,
      pack_label: u,
      units_per_pack: 1,
      on_hand: r[3],
      par: r[4],
      par_manual: false,
      par_learned: false,
      cadence: r[5],
      vendor: r[5] === 'W' ? 'Marberger / Produce' : 'Jordan Banana',
      unit_price: null,
      usage_log: [],
      discontinued: false
    };
  });
}

export function buildSeedRecipes() {
  return [
    {
      id: 'rec-spaghetti',
      name: 'Spaghetti & Meatballs with Marinara',
      category: 'Main Entree',
      base_servings: 65,
      prep_min: 20,
      cook_min: 35,
      allergens: ['wheat'],
      steps: [
        'Thaw frozen meatballs overnight in Walk-in cooler.',
        'Boil spaghetti until tender and drain well.',
        'Simmer spaghetti sauce with thawed meatballs to >=165°F.',
        'Hold on steam table >=135°F and serve with Daily Salad Bar & breadsticks.'
      ],
      ingredients: [
        { name: 'Spaghetti (dry)', qty: 8, unit: 'lbs', inv_id: 'item-26', stock_per_unit: 2, per100: 6.15 },
        { name: 'Spaghetti sauce', qty: 24, unit: 'cups', inv_id: 'item-24', stock_per_unit: 24, per100: 1.54 },
        { name: 'Chopped garlic', qty: 6, unit: 'tbsp', inv_id: 'item-69', stock_per_unit: 32, per100: 0.29 },
        { name: 'Meatballs', qty: 130, unit: 'pieces', inv_id: 'item-63', stock_per_unit: 130, per100: 1.54 },
        { name: 'Breadsticks', qty: 65, unit: 'pieces', inv_id: 'item-59', stock_per_unit: 65, per100: 1.54 }
      ]
    },
    {
      id: 'rec-chili',
      name: 'Hearty Beef & Bean Chili',
      category: 'Soup / Main',
      base_servings: 65,
      prep_min: 20,
      cook_min: 45,
      allergens: [],
      steps: [
        'Brown ground beef in kettle to >=155°F.',
        'Add kidney beans, black beans, tomato sauce, and chopped garlic.',
        'Simmer 35 min stirring often until >=165°F; hold >=135°F.',
        'Serve with crackers or biscuits.'
      ],
      ingredients: [
        { name: 'Ground beef (hamburger)', qty: 15, unit: 'lbs', inv_id: 'item-56', stock_per_unit: 5, per100: 4.62 },
        { name: 'Kidney beans', qty: 12, unit: 'cups', inv_id: 'item-15', stock_per_unit: 12, per100: 1.54 },
        { name: 'Black beans', qty: 16, unit: 'cups', inv_id: 'item-19', stock_per_unit: 8, per100: 3.08 },
        { name: 'Tomato sauce', qty: 24, unit: 'cups', inv_id: 'item-22', stock_per_unit: 8, per100: 4.62 },
        { name: 'Chopped garlic', qty: 4, unit: 'tbsp', inv_id: 'item-69', stock_per_unit: 32, per100: 0.19 },
        { name: 'Biscuits', qty: 65, unit: 'pieces', inv_id: 'item-58', stock_per_unit: 65, per100: 1.54 }
      ]
    },
    {
      id: 'rec-thanksgiving',
      name: 'Holiday Turkey Feast (Turkey, Mash, Gravy, Green Beans & Cranberry)',
      category: 'Holiday Feast',
      base_servings: 75,
      prep_min: 45,
      cook_min: 90,
      allergens: ['milk', 'wheat'],
      steps: [
        'Thaw turkeys in Walk-in cooler 48 hrs prior; roast to >=165°F.',
        'Prepare mashed potatoes with block butter and milk.',
        'Heat chicken gravy (>=165°F) and green beans (>=135°F).',
        'Serve with cranberry sauce & Daily Salad Bar.'
      ],
      ingredients: [
        { name: 'Turkeys', qty: 38, unit: 'lbs', inv_id: 'item-49', stock_per_unit: 20, per100: 2.53 },
        { name: 'Mashed potatoes (flakes)', qty: 24, unit: 'cups', inv_id: 'item-30', stock_per_unit: 16, per100: 2 },
        { name: 'Block butter', qty: 16, unit: 'tbsp', inv_id: 'item-65', stock_per_unit: 32, per100: 0.67 },
        { name: 'Chicken gravy', qty: 16, unit: 'cups', inv_id: 'item-36', stock_per_unit: 4, per100: 5.33 },
        { name: 'Green beans', qty: 18, unit: 'cups', inv_id: 'item-18', stock_per_unit: 12, per100: 2 },
        { name: 'Cranberry sauce', qty: 8, unit: 'cups', inv_id: 'item-39', stock_per_unit: 4, per100: 2.67 }
      ]
    }
  ];
}

export function getDefaultState() {
  const today = localDateStr();
  return {
    activeTab: 'dashboard',
    activeUserId: 'usr-1',
    isLocked: false,
    autoLockMinutes: 5,
    theme: 'light',
    textZoom: 0,
    startTimestamp: Date.now(),
    horizon: 'days',
    cadence: 'W',
    poOpenQty: {},
    selectedRecipeId: 'rec-spaghetti',
    recipeScale: 65,
    selectedSheetDate: null,
    checklistFreq: 'daily',
    reportMonth: today.slice(0, 7),
    dismissedGuides: {},
    donations: [],
    items: buildSeedInventory(),
    recipes: buildSeedRecipes(),
    menuPlan: [
      { id: 'mp-nov-16', service_date: '2026-11-16', recipe_id: '', custom_title: 'Chicken Sandwich, Chips, Potato Salad', menu_type: 'RECIPE', planned_portions: 65, served_portions: 65, status: 'SERVED', circumstance: 'Normal Day', note: 'Imported from schedule', logged_by: 'William Clark' },
      { id: 'mp-nov-17', service_date: '2026-11-17', recipe_id: '', custom_title: 'Goulash, Bread Sticks (2)', menu_type: 'RECIPE', planned_portions: 65, served_portions: 65, status: 'SERVED', circumstance: 'Normal Day', note: 'Imported from schedule', logged_by: 'William Clark' },
      { id: 'mp-nov-18', service_date: '2026-11-18', recipe_id: '', custom_title: 'Hot Dogs (2), Baked Beans', menu_type: 'RECIPE', planned_portions: 65, served_portions: 65, status: 'SERVED', circumstance: 'Normal Day', note: 'Imported from schedule', logged_by: 'William Clark' },
      { id: 'mp-nov-20', service_date: '2026-11-20', recipe_id: '', custom_title: 'Leftovers or Beef Stew over noodles', menu_type: 'RECIPE', planned_portions: 0, served_portions: null, status: 'PLANNED', circumstance: 'Normal Day', note: '', logged_by: '' },
      { id: 'mp-nov-23', service_date: '2026-11-23', recipe_id: '', custom_title: 'Tuna Salad Sandwich & chips, Mac Salad', menu_type: 'RECIPE', planned_portions: 0, served_portions: null, status: 'PLANNED', circumstance: 'Normal Day', note: '', logged_by: '' },
      { id: 'mp-nov-24', service_date: '2026-11-24', recipe_id: '', custom_title: 'Traditional Thanksgiving Dinner (Turkey, Mash, Stuffing, Green Beans, Cranberry, Rolls & Pie)', menu_type: 'RECIPE', planned_portions: 0, served_portions: null, status: 'PLANNED', circumstance: 'Holiday Week', note: '', logged_by: '' },
      { id: 'mp-nov-25', service_date: '2026-11-25', recipe_id: '', custom_title: 'Leftovers Service', menu_type: 'LEFTOVERS', planned_portions: 0, served_portions: null, status: 'PLANNED', circumstance: 'Holiday Week', note: '', logged_by: '' },
      { id: 'mp-nov-26', service_date: '2026-11-26', recipe_id: '', custom_title: 'Office Closed (Thanksgiving)', menu_type: 'CLOSED', planned_portions: 0, served_portions: 0, status: 'CLOSED', circumstance: 'Closed / Federal Holiday', note: '', logged_by: '' },
      { id: 'mp-nov-27', service_date: '2026-11-27', recipe_id: '', custom_title: 'Office Closed', menu_type: 'CLOSED', planned_portions: 0, served_portions: 0, status: 'CLOSED', circumstance: 'Closed / Federal Holiday', note: '', logged_by: '' },
      { id: 'mp-nov-30', service_date: '2026-11-30', recipe_id: 'rec-spaghetti', custom_title: 'Spaghetti', menu_type: 'RECIPE', planned_portions: 0, served_portions: null, status: 'PLANNED', circumstance: 'Normal Day', note: '', logged_by: '' }
    ],
    purchaseOrders: [],
    transactions: [],
    safetyLogs: {},
    storageTags: [],
    checklists: [
      ...CLEANING_TASKS.map((t, i) => ({ id: 'chk-d-' + i, freq: 'daily', category: 'Food Safety / Cleaning', title: t, done: false, done_by: '', done_at: '', priority_carryover: false })),
      { id: 'chk-w-1', freq: 'weekly', category: 'Ordering', title: 'Review Weekly Marberger & Produce Order (Friday)', done: false, done_by: '', done_at: '', priority_carryover: false },
      { id: 'chk-w-2', freq: 'weekly', category: 'Food Safety', title: 'Calibrate probe thermometers (32°F ice-point test)', done: false, done_by: '', done_at: '', priority_carryover: false },
      { id: 'chk-m-1', freq: 'monthly', category: 'Ordering', title: 'Finalize Monthly Jordan Banana Order (3rd Friday)', done: false, done_by: '', done_at: '', priority_carryover: false },
      { id: 'chk-m-2', freq: 'monthly', category: 'Inventory', title: 'Complete full Blind Physical Count & Reconcile', done: false, done_by: '', done_at: '', priority_carryover: false }
    ],
    blindAudits: [],
    blindDraft: { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} },
    announcements: [
      { id: 'ann-1', priority: 'urgent', title: 'Thanksgiving Holiday Closing (Nov 26–27)', body: 'Kitchen & office closed Thu Nov 26 & Fri Nov 27. Thanksgiving Dinner is Tue Nov 24 (75 portions).', author: 'William Clark', created_at: '2026-11-16', alert_at: '', repeat_rule: 'none', repeat_days: [], expires_at: '2026-11-27', dismissed_by: {} },
      { id: 'ann-2', priority: 'reminder', title: 'Weekly & Monthly Order Schedule', body: 'Marberger (dairy) and Produce can be ordered weekly. Dry Goods & Frozen items (Jordan Banana) are ordered monthly on the 3rd Friday.', author: 'William Clark', created_at: '2026-11-16', alert_at: '', repeat_rule: 'weekly', repeat_days: [5], expires_at: '', dismissed_by: {} }
    ],
    messages: [],
    activityLogs: [],
    users: [
      makeUser('usr-1', 'William Clark', 'ADMIN', 'WC', '1234', true),
      makeUser('usr-2', 'Kitchen Manager', 'MANAGER', 'KM', '1111', true),
      makeUser('usr-3', 'Sabrina', 'STAFF', 'SB', '2222', true),
      makeUser('usr-4', 'Volunteer Team', 'VOLUNTEER', 'VT', '0000', true)
    ],
    trainingModules: [
      { id: 'trn-1', role: 'ALL', title: 'Welcome, Role Boundaries & Auto-Lock', content: 'Welcome to The Salvation Army Community Meals KMS (Butler, PA).\n\nEvery stock change, temp log, and checklist tick is stamped with your name. Shared tablets auto-lock after 5 minutes of inactivity.' },
      { id: 'trn-2', role: 'ALL', title: 'Daily Temps, Salad Bar & Variable Shelf Lives', content: 'On service days (Mon/Tue/Wed/Fri), log all 6 temperature checks in Safety.\n\nUse 1-Tap Date Labels for storage: Cut Salad Greens & Fruit = 3 days; Dairy/Deli Salads = 4 days; Cooked Entrees = 7 days; Freezer = 90 days.' },
      { id: 'trn-3', role: 'VOLUNTEER', title: 'Volunteer Guide: Prep, Blind Counts & Temps', content: '1. View Recipes (scale 40-80) & Menu Planner (read-only).\n2. Check off Next-Day Prep pulls and Daily Checklists.\n3. Log 6-point Temps, tag Leftovers/Salad Bar, and submit Section Blind Counts.' },
      { id: 'trn-4', role: 'STAFF', title: 'Staff Operations: PO Check-In, Donations & Service', content: '1. Reconcile arriving POs (entering exact received quantities) and log In-Kind Donations (with printable IRS Tax Receipts) in PO Check-In & Donations.\n2. Create PO Requests in Orders & POs.\n3. Schedule meals and mark Served to deduct Living Stock.' },
      { id: 'trn-5', role: 'MANAGER', title: 'Manager Guide: PO Approvals, Pars & Funding Reports', content: '1. Approve, edit, and place POs with Marberger & Jordan Banana.\n2. Set Par Levels, reconcile Blind Audits, and edit historical attendance.\n3. Access Executive, Funding & Donation Reports.' },
      { id: 'trn-6', role: 'ADMIN', title: 'Admin Guide: Users, PINs, Announcements & Backups', content: 'Full system control: manage ADMIN / MANAGER / STAFF / VOLUNTEER logins & PINs, post/schedule Announcements, configure Auto-Lock, and export/restore full JSON backups.' }
    ],
    lastCarryoverDate: today
  };
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        const merged = Object.assign(getDefaultState(), parsed);
        merged.items = merged.items.map(normalizeInventoryItem);
        return merged;
      }
    }
  } catch (e) {}
  return getDefaultState();
}

// Mutable Shared Store
export let state = loadInitialState();
export let undoSnapshot = null;
export let sbClient = null;
export let syncStatus = 'local';
export let sessionPin = '';
export let onStateRender = null;

export function setRenderCallback(fn) {
  onStateRender = fn;
}

export function replaceState(nextState) {
  state = nextState;
}

export function setSessionPin(pin) {
  sessionPin = pin;
}

export function cloudManaged() {
  return !!state.cloudManaged;
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
  syncToSupabase();
}

// Recipe Parsing & Normalization (Depends on state.items)
export function recomputeIngredientPer100(ing, baseServings) {
  const base = Math.max(1, Number(baseServings) || 65);
  const inv = ing.inv_id ? state.items.find(x => x.id === ing.inv_id) : null;
  if (!inv) return;
  if (Number(ing.stock_per_unit) > 0) {
    ing.per100 = Math.round(((Number(ing.qty) || 0) / Number(ing.stock_per_unit)) * (100 / base) * 1000) / 1000;
    return;
  }
  const conv = convertCulinaryUnit(Number(ing.qty) || 0, ing.unit, inv.unit);
  if (conv !== null) {
    ing.per100 = Math.round(conv * (100 / base) * 1000) / 1000;
  }
}

export function parseIngredientLine(rawLine, baseServings) {
  const uniMap = { '⅛': ' 1/8', '¼': ' 1/4', '⅓': ' 1/3', '⅜': ' 3/8', '½': ' 1/2', '⅝': ' 5/8', '⅔': ' 2/3', '¾': ' 3/4', '⅞': ' 7/8' };
  let ln = String(rawLine || '').trim();
  Object.keys(uniMap).forEach(k => { ln = ln.split(k).join(uniMap[k]); });
  ln = ln.replace(/^[-*•]\s*/, '').replace(/\s+/g, ' ').trim();
  const m = ln.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(fl\s+oz|[a-zA-Z#]+)?\s+(.+)$/i);
  if (!m) return { name: ln, qty: 0, unit: 'to taste', inv_id: '', stock_per_unit: 0, per100: 0 };
  const parseFrac = (tok) => {
    const parts = String(tok).trim().split(/\s+/);
    let sum = 0;
    parts.forEach(p => {
      if (p.includes('/')) { const [a, b] = p.split('/').map(Number); sum += b ? (a / b) : 0; }
      else sum += parseFloat(p) || 0;
    });
    return sum || 1;
  };
  const q = parseFrac(m[1]);
  const rawU = (m[3] || '').toLowerCase();
  const knownUnit = rawU && (UNIT_ALIASES[rawU] || KITCHEN_UNITS.includes(rawU));
  const unit = knownUnit ? normUnit(rawU) : 'pieces';
  const ingName = cleanItemName(knownUnit ? m[4] : ((m[3] ? m[3] + ' ' : '') + m[4]));
  const words = ingName.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const matchInv = state.items.find(i => {
    const iname = i.name.toLowerCase();
    return words.some(w => iname.includes(w));
  });
  const ingObj = { name: ingName, qty: Math.round(q * 100) / 100, unit, inv_id: matchInv ? matchInv.id : '', stock_per_unit: 0, per100: 0 };
  recomputeIngredientPer100(ingObj, baseServings);
  return ingObj;
}

export function normalizeRecipe(r) {
  if (!r || typeof r !== 'object') return r;
  const baseServ = Math.max(1, Number(r.base_servings) || 65);
  const rawSteps = Array.isArray(r.steps) && r.steps.length
    ? r.steps
    : String(r.directions || '').split(/\r?\n+/).filter(Boolean);
  const steps = rawSteps.map(s => String(s || '').replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).map(g => {
    const unit = normUnit(g.unit || (Number(g.qty) > 0 ? 'pieces' : 'to taste'));
    const ing = {
      name: cleanItemName(g.name || 'Ingredient'),
      qty: unit === 'to taste' ? 0 : (Number(g.qty) || 0),
      unit,
      inv_id: g.inv_id || '',
      stock_per_unit: Number(g.stock_per_unit) || 0,
      per100: Number(g.per100) || 0
    };
    recomputeIngredientPer100(ing, baseServ);
    return ing;
  });
  const out = {
    ...r,
    name: String(r.name || 'Untitled Recipe').trim(),
    category: String(r.category || 'Main Entree').trim() || 'Main Entree',
    base_servings: baseServ,
    prep_min: Math.max(0, Number(r.prep_min) || 20),
    cook_min: Math.max(0, Number(r.cook_min) || 35),
    allergens: Array.from(new Set((Array.isArray(r.allergens) ? r.allergens : []).map(a => String(a || '').toLowerCase().trim()).filter(Boolean))),
    photo_url: String(r.photo_url || '').trim(),
    notes: String(r.notes || '').trim(),
    steps,
    ingredients
  };
  delete out.directions;
  return out;
}

export function parsePastedRecipe(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const name = lines[0] || 'Imported Recipe';
  let servings = 4;
  const srvMatch = raw.match(/servings?\s*[:\-]?\s*(\d+)/i) || raw.match(/makes?\s*(\d+)/i);
  if (srvMatch) servings = Math.max(1, parseInt(srvMatch[1], 10));

  const allergenKeywords = {
    milk: /milk|butter|cheese|cream|yogurt|cheddar|mozzarella|parmesan/i,
    eggs: /\beggs?\b/i,
    wheat: /flour|pasta|spaghetti|penne|noodles|macaroni|bread|biscuit|cracker|wheat/i,
    soy: /\bsoy\b|tofu/i,
    peanuts: /peanut/i,
    'tree nuts': /almond|walnut|pecan|cashew/i,
    fish: /tuna|salmon|fish|cod/i,
    shellfish: /shrimp|crab|lobster/i,
    sesame: /sesame|tahini/i
  };
  const allergens = Object.keys(allergenKeywords).filter(a => allergenKeywords[a].test(raw));

  const ingredients = [];
  const steps = [];
  let mode = 'ing';
  lines.slice(1).forEach(ln => {
    if (/^(servings?|portions?|yield|makes|prep(?:\s+time)?|cook(?:\s+time)?|total(?:\s+time)?)\s*[:\-]/i.test(ln.trim())) return;
    if (/^(directions|instructions|steps|method)/i.test(ln)) { mode = 'step'; return; }
    if (/^(ingredients)/i.test(ln)) { mode = 'ing'; return; }
    if (mode === 'step' || /^\d+[\.\)]\s/.test(ln)) {
      steps.push(ln.replace(/^\d+[\.\)]\s*/, ''));
    } else {
      ingredients.push(parseIngredientLine(ln, servings));
    }
  });
  return normalizeRecipe({ id: uid('rec'), name, category: 'Main Entree', base_servings: servings, prep_min: 20, cook_min: 35, allergens, steps, ingredients });
}

// Role Access Control (ADMIN, MANAGER, STAFF, VOLUNTEER)
export const ROLE_TABS = {
  ADMIN: ['dashboard', 'stock', 'orders', 'receive', 'menu', 'prep', 'recipes', 'safety', 'storage', 'checklists', 'forecasting', 'records', 'report', 'users', 'help'],
  MANAGER: ['dashboard', 'stock', 'orders', 'receive', 'menu', 'prep', 'recipes', 'safety', 'storage', 'checklists', 'forecasting', 'records', 'report', 'users', 'help'],
  STAFF: ['dashboard', 'stock', 'orders', 'receive', 'menu', 'prep', 'recipes', 'safety', 'storage', 'checklists', 'forecasting', 'records', 'help'],
  VOLUNTEER: ['dashboard', 'stock', 'menu', 'prep', 'recipes', 'safety', 'storage', 'checklists', 'records', 'help']
};

export const ROLE_RANK = { ADMIN: 4, MANAGER: 3, STAFF: 2, VOLUNTEER: 1 };

export function normalizeRole(role) {
  const r = String(role || '').trim().toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'MANAGER') return 'MANAGER';
  if (r === 'STAFF') return 'STAFF';
  if (r === 'VOLUNTEER') return 'VOLUNTEER';
  return 'VOLUNTEER';
}

export function sortUsersByRoleAndName(list) {
  return [...(list || [])].sort((a, b) => (ROLE_RANK[normalizeRole(b.role)] || 0) - (ROLE_RANK[normalizeRole(a.role)] || 0) || (a.name || '').localeCompare(b.name || ''));
}

export function isAdminRole(u) {
  return normalizeRole((u || getActiveUser()).role) === 'ADMIN';
}

export function canManageUserAccount(actor, target) {
  const a = actor || getActiveUser();
  const aRole = normalizeRole(a.role);
  if (aRole !== 'ADMIN' && aRole !== 'MANAGER') return false;
  if (!target || target.id === 'usr-1') return false;
  const tRank = ROLE_RANK[normalizeRole(target.role)] || 0;
  const aRank = ROLE_RANK[aRole] || 0;
  return aRole === 'ADMIN' ? tRank <= aRank : tRank < aRank;
}

export function isMgmtOrHigher(u) {
  const r = normalizeRole((u || getActiveUser()).role);
  return r === 'ADMIN' || r === 'MANAGER';
}

export function isStaffOrHigher(u) {
  const r = normalizeRole((u || getActiveUser()).role);
  return r === 'ADMIN' || r === 'MANAGER' || r === 'STAFF';
}

export function getActiveUser() {
  const u = (state.users || []).find(x => x.id === state.activeUserId && x.active !== false) || state.users[0];
  if (u) u.role = normalizeRole(u.role);
  return u;
}

export function getAllowedTabs(user) {
  const r = normalizeRole((user || getActiveUser()).role);
  return ROLE_TABS[r] || ROLE_TABS.VOLUNTEER;
}

export function ensureOwnerIntegrity() {
  if (!Array.isArray(state.users)) state.users = [];
  let owner = state.users.find(u => u.id === 'usr-1');
  if (!owner) {
    owner = makeUser('usr-1', 'William Clark', 'ADMIN', 'WC', '1234', true);
    state.users.unshift(owner);
  }
  owner.role = 'ADMIN';
  owner.active = true;
  return owner;
}

// Activity Logging & Undo
export function logActivity(category, detail) {
  const u = getActiveUser();
  state.activityLogs.unshift({
    id: uid('act'),
    actor_name: u.name,
    actor_role: u.role,
    category,
    detail,
    timestamp_label: nowStamp(),
    created_at_ms: Date.now()
  });
  if (state.activityLogs.length > 300) state.activityLogs.length = 300;
}

export function snapUndo() {
  undoSnapshot = JSON.stringify(state.items);
}

export function doUndo() {
  if (!undoSnapshot) { showToast('Nothing to undo', 'warn'); return; }
  state.items = JSON.parse(undoSnapshot);
  undoSnapshot = null;
  logActivity('UNDO', 'Undid last stock change');
  saveState();
  if (onStateRender) onStateRender();
  showToast('Undid last stock change');
}

// Auto-Learning Par Levels & Stock Status
export function recordUsage(item, amount) {
  if (amount <= 0) return;
  item.usage_log = item.usage_log || [];
  const now = Date.now();
  item.usage_log.push([now, amount]);
  item.usage_log = item.usage_log.filter(e => now - e[0] < 8 * WK_MS);
}

export function relearnPars() {
  const weeks = Math.min(8, (Date.now() - (state.startTimestamp || Date.now())) / WK_MS);
  if (weeks < 1) return;
  const now = Date.now();
  state.items.forEach(x => {
    if (x.par_manual || !x.usage_log || !x.usage_log.length) return;
    let total = 0;
    x.usage_log.forEach(e => { if (now - e[0] <= weeks * WK_MS) total += e[1]; });
    if (total <= 0) return;
    const cycleWeeks = x.cadence === 'W' ? 1 : 4.33;
    x.par = Math.round(((total / weeks) * cycleWeeks * 1.25) * 100) / 100;
    x.par_learned = true;
  });
}

export function learnMessage() {
  const weeks = (Date.now() - (state.startTimestamp || Date.now())) / WK_MS;
  if (weeks < 1) {
    return `Learning: ${Math.max(1, Math.ceil(7 - weeks * 7))} more day(s) of use needed before par levels auto-update.`;
  }
  return `Par levels auto-update from the last ${Math.min(8, Math.floor(weeks))} week(s) of use (+25% safety stock). Editing a par manually locks that item.`;
}

export function itemStatus(x) {
  if (x.on_hand <= 0) return 'OUT';
  if (x.par > 0 && itemNeed(x) >= 1) return 'LOW';
  return 'OK';
}

export function itemNeed(x) {
  return Math.max(0, Math.round(((Number(x.par) || 0) - (Number(x.on_hand) || 0)) * 100) / 100);
}

// Forecasting & Order Demand Engine
export function getOpenServedHistory() {
  return (state.menuPlan || [])
    .filter(m => m.status === 'SERVED' && Number(m.served_portions) > 0 && m.circumstance !== 'Closed / Federal Holiday')
    .sort((a, b) => a.service_date.localeCompare(b.service_date));
}

export function isNearFederalHoliday(dateStr) {
  for (let o = -3; o <= 3; o++) {
    if (o === 0) continue;
    const hol = getFederalHoliday(addDays(dateStr, o));
    if (hol) return hol;
  }
  return '';
}

export function getForecastMetrics() {
  const open = getOpenServedHistory().slice(-210);
  const recent = open.slice(-40);
  const avgAll = open.length ? open.reduce((s, m) => s + Number(m.served_portions), 0) / open.length : 60;
  const avgRecent = recent.length ? recent.reduce((s, m) => s + Number(m.served_portions), 0) / recent.length : avgAll;
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dowFactor = {};
  [1, 2, 3, 5].forEach(d => {
    const arr = recent.filter(m => new Date(m.service_date + 'T12:00:00').getDay() === d);
    const dAvg = arr.length ? arr.reduce((s, m) => s + Number(m.served_portions), 0) / arr.length : avgRecent;
    dowFactor[dowNames[d]] = avgRecent > 0 ? Math.min(1.4, Math.max(0.65, dAvg / avgRecent)) : 1;
  });
  const buckets = { start: [], mid: [], end: [] };
  recent.forEach(m => {
    const day = parseInt(String(m.service_date).slice(8, 10), 10) || 15;
    buckets[day <= 10 ? 'start' : day <= 20 ? 'mid' : 'end'].push(Number(m.served_portions));
  });
  const bucketFactor = {};
  ['start', 'mid', 'end'].forEach(k => {
    const arr = buckets[k];
    const bAvg = arr.length >= 2 ? arr.reduce((a, b) => a + b, 0) / arr.length : avgRecent;
    bucketFactor[k] = avgRecent > 0 ? Math.min(1.25, Math.max(0.8, bAvg / avgRecent)) : 1;
  });

  const mealMap = {};
  open.forEach(m => {
    const r = m.recipe_id ? state.recipes.find(x => x.id === m.recipe_id) : null;
    const title = ((r ? r.name : m.custom_title) || '').trim();
    if (!title || /bulk history/i.test(title)) return;
    const key = title.toLowerCase();
    if (!mealMap[key]) mealMap[key] = { title, vals: [] };
    mealMap[key].vals.push(Number(m.served_portions));
  });
  const mealStats = Object.values(mealMap).map(g => {
    const avg = g.vals.reduce((a, b) => a + b, 0) / g.vals.length;
    const mult = avgRecent > 0 ? Math.min(1.4, Math.max(0.7, avg / avgRecent)) : 1;
    return { title: g.title, count: g.vals.length, avg, mult, pct: Math.round((mult - 1) * 100) };
  }).sort((a, b) => b.avg - a.avg);

  function mealFactor(titleOrId) {
    if (!titleOrId) return 1;
    const r = state.recipes.find(x => x.id === titleOrId);
    const q = ((r ? r.name : titleOrId) || '').trim().toLowerCase();
    if (!q) return 1;
    const hit = mealStats.find(ms => ms.title.toLowerCase() === q || ms.title.toLowerCase().includes(q) || q.includes(ms.title.toLowerCase()));
    return hit ? hit.mult : 1;
  }

  const circMap = {};
  open.forEach(m => {
    const c = (m.circumstance || 'Normal Day').trim();
    if (!circMap[c]) circMap[c] = [];
    circMap[c].push(Number(m.served_portions));
  });
  const defaultCircMult = { 'Normal Day': 1, 'Holiday Week': 1.15, 'Local Event / Drive': 1.15, 'Snow / Cold Snap': 0.85, 'Heavy Rain / Storm': 0.88 };
  const circStats = Object.keys(circMap).map(c => {
    const arr = circMap[c];
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const mult = avgRecent > 0 ? Math.min(1.4, Math.max(0.6, avg / avgRecent)) : (defaultCircMult[c] || 1);
    return { name: c, count: arr.length, avg, mult, pct: Math.round((mult - 1) * 100) };
  });
  function circFactor(cName) {
    if (!cName || cName === 'Normal Day') return 1;
    const hit = circStats.find(cs => cs.name === cName);
    return hit ? hit.mult : (defaultCircMult[cName] || 1);
  }

  const nearHolVals = open.filter(m => isNearFederalHoliday(m.service_date)).map(m => Number(m.served_portions));
  const nearHolAvg = nearHolVals.length >= 2 ? nearHolVals.reduce((a, b) => a + b, 0) / nearHolVals.length : avgRecent * 1.10;
  const nearHolFactor = avgRecent > 0 ? Math.min(1.35, Math.max(0.75, nearHolAvg / avgRecent)) : 1.10;

  return { openCount: open.length, avgAll, avgRecent, dowFactor, bucketFactor, mealStats, mealFactor, circStats, circFactor, nearHolFactor };
}

export function suggestPortionsOverall() {
  const m = getForecastMetrics();
  return m.openCount ? Math.round(m.avgRecent * 1.1) : 65;
}

export function forecastWeekday(dateStr, mealTitleOrId, circumstance) {
  if (getFederalHoliday(dateStr)) return 0;
  const mp = (state.menuPlan || []).find(x => x.service_date === dateStr);
  if (mp && mp.status === 'CLOSED') return 0;
  const m = getForecastMetrics();
  if (!m.openCount) return 65;
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dn = dowNames[new Date(dateStr + 'T12:00:00').getDay()];
  const day = parseInt(String(dateStr).slice(8, 10), 10) || 15;
  const bKey = day <= 10 ? 'start' : day <= 20 ? 'mid' : 'end';
  const mRef = mealTitleOrId || (mp ? (mp.recipe_id || mp.custom_title) : '');
  const mMult = mRef ? m.mealFactor(mRef) : 1;
  const cRef = circumstance || (mp ? mp.circumstance : '');
  const cMult = cRef ? m.circFactor(cRef) : 1;
  const holMult = isNearFederalHoliday(dateStr) ? m.nearHolFactor : 1;
  const raw = m.avgRecent * (m.dowFactor[dn] || 1) * ((1 + (m.bucketFactor[bKey] || 1)) / 2) * mMult * cMult * holMult;
  return Math.max(10, Math.round(raw));
}

export function predictedPortions(dateStr) {
  const f = forecastWeekday(dateStr);
  return f > 0 ? f : (suggestPortionsOverall() || 65);
}

export function onOrderQty(itemId) {
  let total = 0;
  (state.purchaseOrders || []).forEach(po => {
    if (['requested', 'approved', 'ordered'].includes(po.status)) {
      (po.lines || []).forEach(l => {
        if (l.item_id === itemId) total += Math.max(0, (l.qty || 0) - (l.received || 0));
      });
    }
  });
  return total;
}

export function demandForDays(dayList) {
  const d = {};
  dayList.forEach(ds => {
    const mp = state.menuPlan.find(m => m.service_date === ds && m.status !== 'SERVED' && m.status !== 'CLOSED');
    if (!mp || !mp.recipe_id) return;
    const rec = state.recipes.find(r => r.id === mp.recipe_id);
    if (!rec) return;
    const portions = mp.planned_portions || predictedPortions(ds);
    (rec.ingredients || []).forEach(ing => {
      if (ing.inv_id && ing.per100) {
        d[ing.inv_id] = (d[ing.inv_id] || 0) + (ing.per100 * portions) / 100;
      }
    });
  });
  return d;
}

export function suggestedOrderAmount(x, d7, d30) {
  const dem = (x.cadence === 'W' ? d7 : d30)[x.id] || 0;
  const demTarget = Math.round(dem * 1.1 * 100) / 100;
  const target = Math.max(Number(x.par) || 0, demTarget);
  const gap = Math.round((target - (Number(x.on_hand) || 0) - onOrderQty(x.id)) * 100) / 100;
  if (gap <= 0) return 0;
  if ((Number(x.on_hand) || 0) <= 0 && target > 0) return Math.max(1, Math.floor(gap));
  return gap >= 1 ? Math.floor(gap) : 0;
}

// Holiday & Order Announcements
export function isHolidayOrClosedDay(ds) {
  if (getFederalHoliday(ds)) return getFederalHoliday(ds);
  const mp = (state.menuPlan || []).find(m => m.service_date === ds && m.status === 'CLOSED');
  return mp ? (mp.custom_title || 'Office Closed') : '';
}

export function adjustOrderDateForHoliday(targetDateStr) {
  let d = targetDateStr;
  const holOn = isHolidayOrClosedDay(d);
  const holPrev = getFederalHoliday(addDays(d, -1));
  const holNext = getFederalHoliday(addDays(d, 1));
  const nearHol = holOn || holPrev || holNext;
  if (!nearHol) return { date: d, adjusted: false, reason: '' };
  let cursor = d;
  for (let i = 0; i < 7; i++) {
    const dow = new Date(cursor + 'T12:00:00').getDay();
    if ([1, 2, 3, 4, 5].includes(dow) && !isHolidayOrClosedDay(cursor) && !getFederalHoliday(addDays(cursor, 1))) {
      return { date: cursor, adjusted: cursor !== targetDateStr, reason: nearHol };
    }
    cursor = addDays(cursor, -1);
  }
  return { date: d, adjusted: false, reason: nearHol };
}

export function getAutoHolidayAndOrderAnnouncements(todayStr) {
  const today = todayStr || localDateStr();
  const list = [];
  const holHits = [];
  for (let i = 0; i <= 14; i++) {
    const ds = addDays(today, i);
    const h = getFederalHoliday(ds);
    if (h) holHits.push({ date: ds, name: h, daysAway: i });
  }
  if (holHits.length) {
    const first = holHits[0];
    const labels = holHits.map(x => `${dLabel(x.date)} (${x.name})`).join(', ');
    list.push({
      id: 'auto-hol-' + first.date, isAuto: true, priority: 'urgent',
      title: `Upcoming Holiday Closing: ${first.name}`,
      body: `Salvation Army Community Kitchen is closed on ${labels}. Plan extra portions on the open service day before the holiday and adjust deliveries accordingly.`,
      author: 'Holiday Schedule', created_at: today
    });
  }
  const todayDow = new Date(today + 'T12:00:00').getDay();
  const daysToFri = (5 - todayDow + 7) % 7;
  const nextFri = addDays(today, daysToFri);
  const wAdj = adjustOrderDateForHoliday(nextFri);
  const wLowCount = state.items.filter(x => !x.discontinued && x.cadence === 'W' && itemStatus(x) !== 'OK').length;
  if (wAdj.date >= today && wAdj.date <= addDays(today, 4)) {
    list.push({
      id: 'auto-ord-w-' + wAdj.date, isAuto: true, priority: wAdj.adjusted ? 'urgent' : 'reminder',
      title: wAdj.adjusted ? `Weekly Marberger & Produce Order — Adjusted for ${wAdj.reason}` : `Weekly Marberger & Produce Order Due ${wAdj.date === today ? 'Today' : dLabel(wAdj.date)}`,
      body: wAdj.adjusted
        ? `Normal Friday order (${dLabel(nextFri)}) falls on or near ${wAdj.reason}. Submit & approve your weekly PO early on ${dLabel(wAdj.date)}. (${wLowCount} item(s) below par)`
        : `Review Orders & POs and submit your weekly Marberger & Produce order on ${dLabel(wAdj.date)}. (${wLowCount} item(s) below par)`,
      author: 'Order Schedule', created_at: today
    });
  }
  const nowD = new Date(today + 'T12:00:00');
  let m3Fri = getThirdFriday(nowD.getFullYear(), nowD.getMonth());
  if (addDays(m3Fri, 1) < today) {
    const nextMo = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1, 12);
    m3Fri = getThirdFriday(nextMo.getFullYear(), nextMo.getMonth());
  }
  const mAdj = adjustOrderDateForHoliday(m3Fri);
  const mLowCount = state.items.filter(x => !x.discontinued && x.cadence === 'M' && itemStatus(x) !== 'OK').length;
  if (mAdj.date >= today && mAdj.date <= addDays(today, 7)) {
    list.push({
      id: 'auto-ord-m-' + mAdj.date, isAuto: true, priority: mAdj.adjusted ? 'urgent' : 'reminder',
      title: mAdj.adjusted ? `Monthly Jordan Banana Order — Adjusted for ${mAdj.reason}` : `Monthly Jordan Banana Order Due ${mAdj.date === today ? 'Today' : dLabel(mAdj.date)}`,
      body: mAdj.adjusted
        ? `3rd-Friday order (${dLabel(m3Fri)}) falls on or near ${mAdj.reason}. Submit & approve your monthly whole-case PO early on ${dLabel(mAdj.date)}. (${mLowCount} item(s) below par)`
        : `Monthly dry & frozen whole-case order for Jordan Banana is due ${dLabel(mAdj.date)}. (${mLowCount} item(s) below par)`,
      author: 'Order Schedule', created_at: today
    });
  }
  return list;
}

// Supabase Sync & RPC Auth
export function updateSyncUI() {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  if (!dot || !lbl) return;
  if (syncStatus === 'live') {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    lbl.textContent = 'Live Supabase Sync';
  } else if (syncStatus === 'connecting') {
    dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    lbl.textContent = 'Connecting...';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-rose-400';
    lbl.textContent = 'Local Mode';
  }
}

export async function edgeFetch(fnName, init) {
  if (!sbClient) throw new Error('Supabase client not initialized');
  return fetch(SUPABASE_URL + '/functions/v1/' + fnName, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    },
    body: init.body
  });
}

export async function rpcLogin(userId, pin) {
  const { data, error } = await sbClient.rpc('kms_login', { p_user_id: userId, p_pin: String(pin) });
  if (error) return { ok: false, error: 'network' };
  return data || { ok: false, error: 'network' };
}

export async function rpcSetPin(actorId, actorPin, targetId, newPin, mustChange) {
  const { data, error } = await sbClient.rpc('kms_set_pin', {
    p_actor_id: actorId, p_actor_pin: String(actorPin), p_target_id: targetId,
    p_new_pin: String(newPin), p_must_change: !!mustChange
  });
  if (error) return { ok: false, error: 'network' };
  return data || { ok: false, error: 'network' };
}

export function pinErrorText(res) {
  if (!res) return 'Could not reach the cloud. Check Wi-Fi and try again.';
  if (res.error === 'locked') return `Too many wrong PINs. Try again in ${Math.max(1, Math.ceil((res.retry_seconds || 300) / 60))} min.`;
  if (res.error === 'bad_pin' || res.error === 'bad_actor_pin') return 'Incorrect PIN.';
  if (res.error === 'weak_pin') return 'Choose a stronger PIN (6+ characters, nothing obvious like 123456).';
  if (res.error === 'not_allowed') return 'Your role cannot change that account.';
  if (res.error === 'network') return 'Could not reach the cloud. Check Wi-Fi and try again.';
  return 'Sign-in failed.';
}

export function randomTempPin() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(8);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map(b => chars[b % chars.length]).join('');
}

export function stripLocalPins() {
  (state.users || []).forEach(u => { delete u.pin_hash; delete u.pin_salt; });
}

export function requireRelogin() {
  state.isLocked = true;
  try { sessionStorage.removeItem('sa_kms_session_unlocked'); } catch (e) {}
  sessionPin = '';
  saveState();
  if (onStateRender) onStateRender();
  showToast('Please sign in again to confirm your PIN', 'warn');
}

async function fetchAllRows(table, orderCol, maxRows) {
  const out = []; const page = 1000;
  for (let from = 0; from < maxRows; from += page) {
    const { data, error } = await sbClient.from(table).select('*').order(orderCol, { ascending: false }).range(from, from + page - 1);
    if (error || !data) break;
    out.push(...data);
    if (data.length < page) break;
  }
  return out;
}

export async function syncToSupabase() {
  if (!sbClient || syncStatus === 'local') return;
  try {
    await Promise.all([
      sbClient.from('kms_inventory_items').upsert(state.items.map(x => ({
        id: x.id, sku: x.sku, name: x.name, location: x.location, category: x.category,
        unit: x.unit, pack_label: x.pack_label, units_per_pack: x.units_per_pack || 1,
        on_hand: x.on_hand, par: x.par, par_manual: !!x.par_manual, par_learned: !!x.par_learned,
        cadence: x.cadence, vendor: x.vendor, unit_price: x.unit_price, usage_log: x.usage_log || [],
        discontinued: !!x.discontinued, updated_at: new Date().toISOString()
      })), { onConflict: 'id' }),
      sbClient.from('kms_recipes').upsert(state.recipes.map(r => ({
        id: r.id, name: r.name, category: r.category, base_servings: r.base_servings,
        prep_min: r.prep_min || 20, cook_min: r.cook_min || 35, allergens: r.allergens || [],
        steps: r.steps || [], ingredients: r.ingredients || [],
        photo_url: r.photo_url || '', notes: r.notes || '', updated_at: new Date().toISOString()
      })), { onConflict: 'id' }).then(res => {
        if (res && res.error) {
          sbClient.from('kms_recipes').upsert(state.recipes.map(r => ({
            id: r.id, name: r.name, category: r.category, base_servings: r.base_servings,
            prep_min: r.prep_min || 20, cook_min: r.cook_min || 35, allergens: r.allergens || [],
            steps: r.steps || [], ingredients: r.ingredients || [], updated_at: new Date().toISOString()
          })), { onConflict: 'id' });
        }
      }),
      sbClient.from('kms_menu_plan').upsert(state.menuPlan.map(m => ({
        id: m.id, service_date: m.service_date, recipe_id: m.recipe_id || '', custom_title: m.custom_title || '',
        menu_type: m.menu_type || 'RECIPE', planned_portions: m.planned_portions || 0,
        served_portions: m.served_portions, status: m.status || 'PLANNED', circumstance: m.circumstance || 'Normal Day',
        note: m.note || '', logged_by: m.logged_by || '', prep_checked_items: m.prep_checked_items || {},
        updated_at: new Date().toISOString()
      })), { onConflict: 'id' }),
      sbClient.from('kms_purchase_orders').upsert(state.purchaseOrders.map(p => ({
        id: p.id, po_number: p.po_number, vendor: p.vendor, cadence: p.cadence || 'weekly', status: p.status,
        requested_by: p.requested_by || p.created_by || 'Staff',
        requested_date: p.requested_date || p.created_at || localDateStr(),
        approved_by: p.approved_by || '',
        approved_date: p.approved_date || p.approved_at || '',
        expected_arrival: p.expected_arrival || '',
        vendor_conf: p.vendor_conf || p.invoice_number || '',
        notes: p.notes || (p.verified_total ? `Verified Total: ${Number(p.verified_total).toFixed(2)}` : ''),
        lines: p.lines || [],
        updated_at: new Date().toISOString()
      })), { onConflict: 'id' }),
      sbClient.from('kms_settings').upsert([{ key: 'purchase_orders_v2', value: state.purchaseOrders }], { onConflict: 'key' }),
      sbClient.from('kms_transactions').upsert(state.transactions.slice(0, 300).map(t => ({
        id: t.id, tx_date: t.tx_date, tx_type: t.tx_type, item_id: t.item_id || '', item_name: t.item_name,
        unit: t.unit, qty: t.qty, source: t.source || '', exp_date: t.exp_date || '', cleared: !!t.cleared,
        reason: t.reason || '', cost: t.cost || 0, po_number: t.po_number || '', staff_name: t.staff_name || '',
        note: t.note || ''
      })), { onConflict: 'id' }),
      sbClient.from('kms_storage_tags').upsert(state.storageTags.map(t => ({
        id: t.id, item_name: t.item_name, tag_category: t.tag_category || 'LEFTOVER', zone: t.zone,
        qty_label: t.qty_label || '', prep_date: t.prep_date, prep_time: t.prep_time || '',
        use_by_date: t.use_by_date, temp_f: t.temp_f, notes: t.notes || '', tagged_by: t.tagged_by || '',
        status: t.status || 'STORED', closed_by: t.closed_by || '', closed_at: t.closed_at || ''
      })), { onConflict: 'id' }),
      sbClient.from('kms_checklists').upsert(state.checklists.map(c => ({
        id: c.id, freq: c.freq, category: c.category, title: c.title, done: !!c.done,
        done_by: c.done_by || '', done_at: c.done_at || '', priority_carryover: !!c.priority_carryover
      })), { onConflict: 'id' }),
      sbClient.from('kms_users').upsert(state.users.map(u => ({
        id: u.id, name: u.name, role: normalizeRole(u.role), initials: u.initials, active: u.active !== false,
        onboarding_completed: !!u.onboarding_completed, completed_training_ids: u.completed_training_ids || [],
        email: u.email || ''
      })), { onConflict: 'id' }),
      sbClient.from('kms_announcements').upsert(state.announcements.map(a => ({
        id: a.id, priority: a.priority, title: a.title, body: a.body, alert_at: a.alert_at || '', repeat_rule: a.repeat_rule || 'none',
        repeat_days: a.repeat_days || [], expires_at: a.expires_at || '', author: a.author || '',
        dismissed_by: a.dismissed_by || {}, created_at: a.created_at
      })), { onConflict: 'id' })
    ]);
    const todayLog = state.safetyLogs[localDateStr()];
    if (todayLog) {
      await sbClient.from('kms_safety_logs').upsert({
        log_date: localDateStr(), temps: todayLog.temps || {}, cleaning: todayLog.cleaning || {},
        logged_by: todayLog.logged_by || getActiveUser().name, updated_at: new Date().toISOString()
      }, { onConflict: 'log_date' });
    }
    if (state.messages.length) {
      await sbClient.from('kms_messages').upsert(state.messages.slice(-50).map(m => ({
        id: m.id, sender_id: m.sender_id, sender_name: m.sender_name, sender_role: m.sender_role,
        recipient_id: m.recipient_id || 'ALL', recipient_name: m.recipient_name || 'Everyone',
        priority: m.priority || 'normal', body: m.body, created_at_ms: m.created_at_ms, timestamp_label: m.timestamp_label
      })), { onConflict: 'id' });
    }
    if (state.activityLogs && state.activityLogs.length) {
      await sbClient.from('kms_activity_logs').upsert(state.activityLogs.slice(0, 120).map(a => ({
        id: a.id, actor_name: a.actor_name || 'System', actor_role: a.actor_role || '',
        category: a.category || 'ACTION', detail: a.detail || '',
        timestamp_label: a.timestamp_label || '', created_at_ms: Math.round(Number(a.created_at_ms) || Date.now())
      })), { onConflict: 'id' });
    }
    if (state.blindAudits && state.blindAudits.length) {
      await sbClient.from('kms_blind_audits').upsert(state.blindAudits.slice(0, 60).map(a => ({
        id: a.id, audit_date: a.audit_date, auditor: a.auditor || 'Unknown', zone: a.zone || 'ALL', rows: a.rows || []
      })), { onConflict: 'id' });
    }
    await sbClient.from('kms_settings').upsert({
      key: 'suggestions',
      value: {
        recipeSuggestions: (state.recipeSuggestions || []).slice(0, 50),
        menuSuggestions: (state.menuSuggestions || []).slice(0, 50),
        donations: (state.donations || []).slice(0, 200)
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {}
}

let sbRealtimeChannel = null;
let sbRefreshTimer = null;
let sbRefreshing = false;

export async function refreshFromCloud() {
  if (!sbClient || sbRefreshing) return;
  sbRefreshing = true;
  try {
    const { data: invData, error } = await sbClient.from('kms_inventory_items').select('*');
    if (error) {
      syncStatus = 'local';
      updateSyncUI();
      return;
    }
    if (invData && invData.length > 0) {
      const [recR, mpR, poR, txAll, tagR, chkR, usrR, annR, msgR, safR, actR, setR, audR] = await Promise.all([
        sbClient.from('kms_recipes').select('*'),
        sbClient.from('kms_menu_plan').select('*'),
        sbClient.from('kms_purchase_orders').select('*'),
        fetchAllRows('kms_transactions', 'created_at', 3000),
        sbClient.from('kms_storage_tags').select('*'),
        sbClient.from('kms_checklists').select('*'),
        sbClient.from('kms_users').select('*'),
        sbClient.from('kms_announcements').select('*'),
        sbClient.from('kms_messages').select('*').order('created_at_ms', { ascending: true }).limit(50),
        sbClient.from('kms_safety_logs').select('*'),
        sbClient.from('kms_activity_logs').select('*').order('created_at_ms', { ascending: false }).limit(150),
        sbClient.from('kms_settings').select('*').eq('key', 'suggestions'),
        sbClient.from('kms_blind_audits').select('*').order('created_at', { ascending: false }).limit(60)
      ]);
      state.items = invData.map(normalizeInventoryItem);
      if (recR.data && recR.data.length) state.recipes = recR.data.map(normalizeRecipe);
      if (mpR.data && mpR.data.length) state.menuPlan = mpR.data;
      if (poR.data) {
        const delSet = new Set(state._deletedPoIds || []);
        const byPo = new Map();
        (state.purchaseOrders || []).forEach(p => { if (p && p.id && !delSet.has(p.id)) byPo.set(p.id, p); });
        (poR.data || []).forEach(p => {
          if (!p || !p.id || delSet.has(p.id)) return;
          const loc = byPo.get(p.id);
          if (!loc) byPo.set(p.id, { ...p, created_by: p.created_by || p.requested_by, created_at: p.created_at || p.requested_date });
        });
        state.purchaseOrders = Array.from(byPo.values());
      }
      if (txAll && txAll.length) {
        const byTx = new Map();
        [...txAll, ...(state.transactions || [])].forEach(t => { if (t && t.id && !byTx.has(t.id)) byTx.set(t.id, t); });
        state.transactions = Array.from(byTx.values()).sort((a, b) => String(b.created_at || b.tx_date || '').localeCompare(String(a.created_at || a.tx_date || '')));
      }
      if (audR && audR.data && audR.data.length) {
        const byAud = new Map();
        [...audR.data.map(a => ({ id: a.id, audit_date: a.audit_date, auditor: a.auditor, zone: a.zone, rows: a.rows || [] })), ...(state.blindAudits || [])]
          .forEach(a => { if (a && a.id && !byAud.has(a.id)) byAud.set(a.id, a); });
        state.blindAudits = Array.from(byAud.values()).sort((a, b) => String(b.audit_date || '').localeCompare(String(a.audit_date || '')));
      }
      if (tagR.data) state.storageTags = tagR.data;
      if (chkR.data && chkR.data.length) state.checklists = chkR.data;
      if (usrR.data && usrR.data.length) { state.users = usrR.data; stripLocalPins(); state.cloudManaged = true; ensureOwnerIntegrity(); }
      if (annR.data) state.announcements = annR.data;
      if (msgR.data) state.messages = msgR.data;
      if (actR && actR.data && actR.data.length) {
        const byId = new Map();
        [...(state.activityLogs || []), ...actR.data].forEach(a => { if (a && a.id) byId.set(a.id, a); });
        state.activityLogs = Array.from(byId.values()).sort((a, b) => (Number(b.created_at_ms) || 0) - (Number(a.created_at_ms) || 0)).slice(0, 200);
      }
      if (setR && setR.data && setR.data[0] && setR.data[0].value) {
        const sv = setR.data[0].value;
        if (Array.isArray(sv.recipeSuggestions)) state.recipeSuggestions = sv.recipeSuggestions;
        if (Array.isArray(sv.menuSuggestions)) state.menuSuggestions = sv.menuSuggestions;
        if (Array.isArray(sv.donations)) {
          const byDon = new Map();
          [...sv.donations, ...(state.donations || [])].forEach(d => { if (d && d.id && !byDon.has(d.id)) byDon.set(d.id, d); });
          state.donations = Array.from(byDon.values());
        }
      }
      if (safR.data) {
        safR.data.forEach(s => { state.safetyLogs[s.log_date] = s; });
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    } else {
      syncStatus = 'live';
      await syncToSupabase();
    }
    syncStatus = 'live';
    updateSyncUI();
    if (onStateRender) onStateRender();
  } catch (e) {
    syncStatus = 'local';
    updateSyncUI();
  } finally {
    sbRefreshing = false;
  }
}

export function forceLiveStatus() {
  syncStatus = 'live';
  updateSyncUI();
}

export async function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    syncStatus = 'local';
    updateSyncUI();
    return;
  }
  if (!sbClient) {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  state.cloudManaged = true;
  stripLocalPins();
  if (syncStatus !== 'live') { syncStatus = 'connecting'; updateSyncUI(); }
  await refreshFromCloud();
  if (!sbRealtimeChannel && sbClient) {
    sbRealtimeChannel = sbClient.channel('kms_relational_live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(sbRefreshTimer);
        sbRefreshTimer = setTimeout(() => { refreshFromCloud(); }, 900);
      }).subscribe();
  }
}

// === SECTION 1: MASTER VENDOR CATALOG & PACK CONVERSION ENGINE ===
export const VENDOR_CATALOG = [
  // Jordan Banana — Canned #10 & Dry (Stockroom)
  { vendor: 'Jordan Banana', sku: 'JB-1042', cat: 'Canned & Dry', name: 'Chicken soup', aliases: ['chicken soup'], orderUnit: 'cs', packQty: 12, baseUnit: 'cans', casePrice: 38.40, singlePrice: 3.40 },
  { vendor: 'Jordan Banana', sku: 'JB-1088', cat: 'Canned & Dry', name: 'Kidney beans (small)', aliases: ['kidney beans'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 34.50, singlePrice: 6.10 },
  { vendor: 'Jordan Banana', sku: 'JB-1091', cat: 'Canned & Dry', name: 'Black beans (large)', aliases: ['black beans'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 35.90, singlePrice: 6.35 },
  { vendor: 'Jordan Banana', sku: 'JB-1104', cat: 'Canned & Dry', name: 'Tomato sauce', aliases: ['tomato sauce'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 48.00, singlePrice: 8.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1106', cat: 'Canned & Dry', name: 'Spaghetti sauce (large)', aliases: ['spaghetti sauce (large)'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 49.50, singlePrice: 8.75 },
  { vendor: 'Jordan Banana', sku: 'JB-1107', cat: 'Canned & Dry', name: 'Spaghetti sauce (small)', aliases: ['spaghetti sauce (small)'], orderUnit: 'cs', packQty: 24, baseUnit: 'cans', casePrice: 36.00, singlePrice: 1.65 },
  { vendor: 'Jordan Banana', sku: 'JB-1112', cat: 'Canned & Dry', name: 'Corn (small)', aliases: ['corn (small)', 'corn'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 46.95, singlePrice: 8.25 },
  { vendor: 'Jordan Banana', sku: 'JB-1115', cat: 'Canned & Dry', name: 'Green beans (small)', aliases: ['green beans (small)', 'green beans'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 49.50, singlePrice: 9.85 },
  { vendor: 'Jordan Banana', sku: 'JB-1120', cat: 'Canned & Dry', name: 'Mixed vegetables (small)', aliases: ['mixed vegetables'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 45.00, singlePrice: 8.00 },
  { vendor: 'Jordan Banana', sku: 'JB-1130', cat: 'Canned & Dry', name: 'Peaches (small)', aliases: ['peaches'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 56.70, singlePrice: 10.70 },
  { vendor: 'Jordan Banana', sku: 'JB-1131', cat: 'Canned & Dry', name: 'Pears', aliases: ['pears'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 58.00, singlePrice: 10.70 },
  { vendor: 'Jordan Banana', sku: 'JB-1132', cat: 'Canned & Dry', name: 'Pineapple', aliases: ['pineapple'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 54.00, singlePrice: 9.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1133', cat: 'Canned & Dry', name: 'Mixed fruit', aliases: ['mixed fruit'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 55.00, singlePrice: 9.75 },
  { vendor: 'Jordan Banana', sku: 'JB-1210', cat: 'Canned & Dry', name: 'Vanilla pudding', aliases: ['vanilla pudding'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 54.75, singlePrice: 9.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1211', cat: 'Canned & Dry', name: 'Butterscotch pudding', aliases: ['butterscotch pudding'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 54.75, singlePrice: 9.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1212', cat: 'Canned & Dry', name: 'Chocolate pudding', aliases: ['chocolate pudding'], orderUnit: 'cs', packQty: 6, baseUnit: 'cans', casePrice: 54.75, singlePrice: 9.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1240', cat: 'Canned & Dry', name: 'Mashed potatoes', aliases: ['mashed potatoes'], orderUnit: 'cs', packQty: 6, baseUnit: 'pouches', casePrice: 92.60, singlePrice: 15.80 },
  { vendor: 'Jordan Banana', sku: 'JB-1250', cat: 'Canned & Dry', name: 'Spaghetti', aliases: ['spaghetti'], orderUnit: 'cs', packQty: 20, baseUnit: 'boxes', casePrice: 34.00, singlePrice: 1.85 },
  { vendor: 'Jordan Banana', sku: 'JB-1251', cat: 'Canned & Dry', name: 'Macaroni', aliases: ['macaroni'], orderUnit: 'cs', packQty: 20, baseUnit: 'lb', casePrice: 34.00, singlePrice: 1.85 },
  { vendor: 'Jordan Banana', sku: 'JB-1252', cat: 'Canned & Dry', name: 'Egg noodles', aliases: ['egg noodles'], orderUnit: 'cs', packQty: 10, baseUnit: 'lb', casePrice: 34.00, singlePrice: 3.60 },
  // Jordan Banana — Freezer & Deli/Produce
  { vendor: 'Jordan Banana', sku: 'JB-1305', cat: 'Frozen Bakery', name: 'Biscuits', aliases: ['biscuits'], orderUnit: 'cs', packQty: 120, baseUnit: 'ea', casePrice: 36.00, singlePrice: 0.35 },
  { vendor: 'Jordan Banana', sku: 'JB-1410', cat: 'Frozen Proteins', name: 'Ground beef (hamburger)', aliases: ['ground beef'], orderUnit: 'ea', packQty: 10, baseUnit: 'lb', casePrice: 55.90, singlePrice: 55.90 },
  { vendor: 'Jordan Banana', sku: 'JB-1415', cat: 'Frozen Proteins', name: 'Hot dogs', aliases: ['hot dogs'], orderUnit: 'cs', packQty: 80, baseUnit: 'ea', casePrice: 56.30, singlePrice: 0.75 },
  { vendor: 'Jordan Banana', sku: 'JB-1420', cat: 'Frozen Proteins', name: 'Meatballs', aliases: ['meatballs'], orderUnit: 'cs', packQty: 160, baseUnit: 'ea', casePrice: 72.90, singlePrice: 0.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1422', cat: 'Frozen Proteins', name: 'Chicken nuggets', aliases: ['chicken nuggets'], orderUnit: 'cs', packQty: 10, baseUnit: 'lb', casePrice: 34.90, singlePrice: 3.75 },
  { vendor: 'Jordan Banana', sku: 'JB-1430', cat: 'Frozen Seafood', name: 'Fish sticks', aliases: ['fish sticks'], orderUnit: 'cs', packQty: 20, baseUnit: 'lb', casePrice: 106.50, singlePrice: 5.60 },
  { vendor: 'Jordan Banana', sku: 'JB-1445', cat: 'Frozen Pasta', name: 'Ravioli (cheese)', aliases: ['ravioli'], orderUnit: 'cs', packQty: 10, baseUnit: 'lb', casePrice: 32.50, singlePrice: 3.50 },
  { vendor: 'Jordan Banana', sku: 'JB-1502', cat: 'Deli & Catch-Weight', name: 'Sliced ham', aliases: ['sliced ham', 'deli ham'], orderUnit: 'lb', packQty: 1, baseUnit: 'lb', casePrice: 5.30, singlePrice: 5.30, catchWeight: true },
  { vendor: 'Jordan Banana', sku: 'JB-1610', cat: 'Cheese & Cooler', name: 'Shredded cheese', aliases: ['shredded cheese'], orderUnit: 'cs', packQty: 6, baseUnit: 'bags', casePrice: 76.95, singlePrice: 13.25 },
  { vendor: 'Jordan Banana', sku: 'JB-1612', cat: 'Cheese & Cooler', name: 'Parmesan cheese', aliases: ['parmesan cheese'], orderUnit: 'ea', packQty: 1, baseUnit: 'bags', casePrice: 25.85, singlePrice: 25.85 },
  { vendor: 'Jordan Banana', sku: 'JB-2025', cat: 'Fresh Produce', name: 'Celery 30 Sleeve', aliases: ['celery'], orderUnit: 'cs', packQty: 30, baseUnit: 'ea', casePrice: 64.00, singlePrice: 1.80 },
  // Marberger Dairy — Weekly Cooler & Fluid Dairy
  { vendor: 'Marberger Dairy', sku: 'MD-101', cat: 'Fluid Milk', name: 'Milk', aliases: ['milk', 'white milk'], orderUnit: 'crates', packQty: 4, baseUnit: 'gal', casePrice: 16.80, singlePrice: 4.35 },
  { vendor: 'Marberger Dairy', sku: 'MD-102', cat: 'Fluid Milk', name: 'Chocolate milk', aliases: ['chocolate milk'], orderUnit: 'crates', packQty: 50, baseUnit: 'ea', casePrice: 18.50, singlePrice: 0.40 },
  { vendor: 'Marberger Dairy', sku: 'MD-201', cat: 'Beverages', name: 'Lemonade', aliases: ['lemonade'], orderUnit: 'crates', packQty: 4, baseUnit: 'gal', casePrice: 12.40, singlePrice: 3.25 },
  { vendor: 'Marberger Dairy', sku: 'MD-202', cat: 'Beverages', name: 'Iced tea', aliases: ['iced tea'], orderUnit: 'crates', packQty: 4, baseUnit: 'gal', casePrice: 12.40, singlePrice: 3.25 },
  { vendor: 'Marberger Dairy', sku: 'MD-301', cat: 'Cultured Dairy', name: 'Yogurt', aliases: ['yogurt'], orderUnit: 'cs', packQty: 12, baseUnit: 'pieces', casePrice: 18.00, singlePrice: 1.60 },
  { vendor: 'Marberger Dairy', sku: 'MD-302', cat: 'Cultured Dairy', name: 'Cottage cheese', aliases: ['cottage cheese'], orderUnit: 'cs', packQty: 6, baseUnit: 'pieces', casePrice: 21.00, singlePrice: 3.75 },
  { vendor: 'Marberger Dairy', sku: 'MD-303', cat: 'Butter & Spreads', name: 'Block butter', aliases: ['block butter', 'butter'], orderUnit: 'cs', packQty: 36, baseUnit: 'pieces', casePrice: 118.00, singlePrice: 3.45 }
];

export function matchCatalogItem(q, vendor) {
  const s = String(q || '').toLowerCase().trim();
  if (!s) return null;
  return VENDOR_CATALOG.find(c =>
    (!vendor || c.vendor === vendor) &&
    (c.sku.toLowerCase() === s || c.name.toLowerCase() === s || (c.aliases || []).some(a => s === a || s.includes(a)))
  ) || null;
}

export function getCatalogMetaForItem(item) {
  const cat = matchCatalogItem(item?.sku) || matchCatalogItem(item?.name);
  const vendor = cat?.vendor || (item?.cadence === 'W' || /milk|lemonade|tea|yogurt|butter|cottage/i.test(item?.name || '') ? 'Marberger Dairy' : 'Jordan Banana');
  const packQty = cat?.packQty || 1;
  const orderUnit = cat?.orderUnit || item?.unit || 'cs';
  const casePrice = cat?.casePrice || (Number(item?.unit_price || 0) * packQty) || 0;
  const unitPrice = cat ? Number((cat.casePrice / packQty).toFixed(2)) : Number(item?.unit_price || 0);
  return {
    sku: cat?.sku || item?.sku || '—',
    vendor,
    cat: cat?.cat || item?.zone || 'General',
    orderUnit,
    packQty,
    baseUnit: item?.unit || cat?.baseUnit || 'ea',
    casePrice,
    singlePrice: cat?.singlePrice || unitPrice,
    unitPrice,
    catchWeight: !!cat?.catchWeight
  };
}


// === SECTION 2: COMMITTED STOCK & ROLLOVER CALCULATION ===
export function committedAndNetAvailable(item, dayList) {
  const dd = demandForDays(dayList);
  const committed = Number((dd[item.id] || 0).toFixed(2));
  const inTransit = Number(onOrderQty(item.id) || 0);
  const onHand = Number(item.on_hand || 0);
  const netAvailable = Number((onHand + inTransit - committed).toFixed(2));
  return { onHand, inTransit, committed, netAvailable };
}
