// js/utils.js — Shared Constants, Date Helpers, Unit/Spelling Normalizers & UI Modals

export const LOCATIONS = [
  "Walk-in cooler",
  "Walk-in freezer",
  "Stockroom",
  "Kitchen Cooler",
  "Kitchen Freezer",
  "Kitchen Dry Goods"
];

export const VENDORS = {
  W: "Weekly order – Marberger (dairy) & produce",
  M: "Monthly order – Jordan Banana (dry goods & frozen)"
};

export const TEMP_CHECKS = [
  ["Walk-in cooler", "max", 41],
  ["Walk-in freezer", "max", 0],
  ["Kitchen cooler", "max", 41],
  ["Kitchen freezer", "max", 0],
  ["Main entrée (hot hold)", "min", 135],
  ["Steam table well", "min", 135]
];

export const CLEANING_TASKS = [
  "Prep surfaces and tables sanitized",
  "Dishes washed, rinsed and sanitized",
  "Sanitizer strength tested",
  "Handwashing sink stocked with soap and towels",
  "Floors swept and mopped",
  "Trash and recycling out",
  "Date labels checked on all stored food"
];

export const SHELF_PRESETS = [
  { label: "Salad Greens (3d)", cat: "SALAD_BAR", days: 3, zone: "Walk-in cooler" },
  { label: "Cut Fruit (3d)", cat: "SALAD_BAR", days: 3, zone: "Walk-in cooler" },
  { label: "Yogurt / Pudding (4d)", cat: "SALAD_BAR", days: 4, zone: "Walk-in cooler" },
  { label: "Deli Salad (4d)", cat: "LEFTOVER", days: 4, zone: "Walk-in cooler" },
  { label: "Cooked Meal (7d)", cat: "LEFTOVER", days: 7, zone: "Walk-in cooler" },
  { label: "Freezer Backup (90d)", cat: "LEFTOVER", days: 90, zone: "Walk-in freezer" }
];

// Standardized Stock Units & Spelling Normalizer
export const STOCK_UNITS = [
  "cases", "cans", "boxes", "bags", "packs", "bottles", "jugs",
  "jars", "tubs", "crates", "pieces", "lbs", "oz", "gallons", "quarts", "pints", "loaves", "trays", "rolls"
];

const STOCK_UNIT_MAP = {
  case: "cases", cases: "cases", cs: "cases",
  can: "cans", cans: "cans", cn: "cans", "#10 can": "cans", "#10 cans": "cans",
  box: "boxes", boxes: "boxes", bx: "boxes",
  bag: "bags", bags: "bags", bg: "bags",
  pack: "packs", packs: "packs", pkg: "packs", pkgs: "packs", package: "packs", packages: "packs",
  bottle: "bottles", bottles: "bottles", btl: "bottles", btls: "bottles",
  jug: "jugs", jugs: "jugs",
  jar: "jars", jars: "jars",
  tub: "tubs", tubs: "tubs",
  crate: "crates", crates: "crates",
  piece: "pieces", pieces: "pieces", pc: "pieces", pcs: "pieces", each: "pieces", ea: "pieces", unit: "pieces", units: "pieces",
  lb: "lbs", lbs: "lbs", pound: "lbs", pounds: "lbs",
  oz: "oz", ounce: "oz", ounces: "oz",
  gal: "gallons", gallon: "gallons", gallons: "gallons",
  qt: "quarts", qts: "quarts", quart: "quarts", quarts: "quarts",
  pt: "pints", pts: "pints", pint: "pints", pints: "pints",
  loaf: "loaves", loaves: "loaves",
  tray: "trays", trays: "trays", pan: "trays", pans: "trays",
  roll: "rolls", rolls: "rolls"
};

const SPELLING_FIXES = [
  [/\bspagetti\b/gi, "spaghetti"],
  [/\btomatoe(s)?\b/gi, "tomato$1"],
  [/\bpotatoe(s)?\b/gi, "potato$1"],
  [/\bpeirogies\b|\bperogies\b/gi, "pierogies"],
  [/\bparmesian\b|\bparmasan\b/gi, "parmesan"],
  [/\bmozzerella\b|\bmozerella\b/gi, "mozzarella"],
  [/\bbroccli\b|\bbrocolli\b/gi, "broccoli"],
  [/\bmayonaise\b|\bmayonaisse\b/gi, "mayonnaise"],
  [/\bchickn\b|\bchiken\b/gi, "chicken"],
  [/\bvegtables\b|\bvegetabels\b/gi, "vegetables"],
  [/\bcheeze\b/gi, "cheese"],
  [/\bsause\b/gi, "sauce"],
  [/\bbiskits\b/gi, "biscuits"],
  [/\bbutterscoth\b/gi, "butterscotch"]
];

export function normStockUnit(u) {
  const raw = String(u || "cases").trim().toLowerCase().replace(/\.$/, "");
  return STOCK_UNIT_MAP[raw] || raw || "cases";
}

export function cleanItemName(name) {
  let s = String(name || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  SPELLING_FIXES.forEach(([rx, rep]) => { s = s.replace(rx, rep); });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function normalizeInventoryItem(x) {
  if (!x || typeof x !== "object") return x;
  const cleanU = normStockUnit(x.unit || x.pack_label || "cases");
  const cleanLoc = LOCATIONS.find(l => l.toLowerCase() === String(x.location || "").trim().toLowerCase()) || String(x.location || "Stockroom").trim() || "Stockroom";
  return {
    ...x,
    sku: String(x.sku || "").trim().toUpperCase(),
    name: cleanItemName(x.name),
    location: cleanLoc,
    unit: cleanU,
    pack_label: cleanU
  };
}

// Date & Format Helpers
export function localDateStr(dObj) {
  const d = dObj || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export function dLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function parseFlexibleDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    let y = parseInt(mdy[3], 10);
    if (y < 100) y += 2000;
    const m = String(parseInt(mdy[1], 10)).padStart(2, '0');
    const d = String(parseInt(mdy[2], 10)).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    return isNaN(new Date(iso + 'T12:00:00').getTime()) ? '' : iso;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? '' : localDateStr(parsed);
}

export function getWeekMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

export function nowStamp() {
  const d = new Date();
  return localDateStr(d) + ' ' + d.toTimeString().slice(0, 5);
}

export function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtNum(n) {
  return String(Math.round((Number(n) || 0) * 100) / 100);
}

// Culinary Conversions & Recipe Helpers
export const KITCHEN_UNITS = ['tsp', 'tbsp', 'fl oz', 'cups', 'pints', 'quarts', 'gallons', 'oz', 'lbs', 'pieces', 'cans', 'boxes', 'bags', 'packs', 'cases', 'to taste'];

export const UNIT_ALIASES = {
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp',
  'fl oz': 'fl oz', floz: 'fl oz', 'fluid oz': 'fl oz',
  cup: 'cups', cups: 'cups', c: 'cups',
  pint: 'pints', pints: 'pints', pt: 'pints',
  quart: 'quarts', quarts: 'quarts', qt: 'quarts', qts: 'quarts',
  gallon: 'gallons', gallons: 'gallons', gal: 'gallons',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  pound: 'lbs', pounds: 'lbs', lb: 'lbs', lbs: 'lbs',
  gram: 'g', grams: 'g', g: 'g', kg: 'kg', ml: 'ml', l: 'l',
  piece: 'pieces', pieces: 'pieces', pc: 'pieces', pcs: 'pieces', each: 'pieces',
  can: 'cans', cans: 'cans', box: 'boxes', boxes: 'boxes', bag: 'bags', bags: 'bags',
  bottle: 'bottles', bottles: 'bottles', jug: 'jugs', jugs: 'jugs',
  pack: 'packs', packs: 'packs', 'case': 'cases', cases: 'cases', crate: 'crates', crates: 'crates'
};

const VOL_TSP = { tsp: 1, tbsp: 3, 'fl oz': 6, cups: 48, pints: 96, quarts: 192, gallons: 768, ml: 0.202884, l: 202.884 };
const WT_OZ = { oz: 1, lbs: 16, g: 0.035274, kg: 35.274 };

export function normUnit(u) {
  const k = String(u || 'pieces').trim().toLowerCase();
  return UNIT_ALIASES[k] || k || 'pieces';
}

export function convertCulinaryUnit(qty, fromU, toU) {
  const f = normUnit(fromU), t = normUnit(toU);
  if (f === t) return qty;
  if (VOL_TSP[f] && VOL_TSP[t]) return (qty * VOL_TSP[f]) / VOL_TSP[t];
  if (WT_OZ[f] && WT_OZ[t]) return (qty * WT_OZ[f]) / WT_OZ[t];
  return null;
}

export function formatKitchenFraction(val) {
  const v = Math.max(0, Number(val) || 0);
  if (v === 0) return '0';
  const whole = Math.floor(v + 1e-6);
  const rem = v - whole;
  const fracs = [
    [0.125, '⅛'], [0.25, '¼'], [1/3, '⅓'], [0.375, '⅜'],
    [0.5, '½'], [0.625, '⅝'], [2/3, '⅔'], [0.75, '¾'], [0.875, '⅞']
  ];
  for (const [f, sym] of fracs) {
    if (Math.abs(rem - f) < 0.035) return (whole > 0 ? String(whole) : '') + sym;
  }
  if (rem > 0.965) return String(whole + 1);
  if (rem < 0.035 && whole > 0) return String(whole);
  return fmtNum(v);
}

export function formatKitchenAmt(qty, unit) {
  const rawU = String(unit || '').trim().toLowerCase();
  if (rawU === 'to taste' || rawU === 'as needed') return 'To taste';
  let q = Number(qty) || 0;
  if (q <= 0) return 'To taste';
  let u = normUnit(unit);
  if (u === 'tsp' && q >= 3) { q = q / 3; u = 'tbsp'; }
  if (u === 'cups' && q > 0 && q < 0.25) { q = q * 16; u = 'tbsp'; }
  if (u === 'tbsp' && q > 0 && q < 1) { q = q * 3; u = 'tsp'; }
  else if (u === 'tbsp' && q >= 16) { q = q / 16; u = 'cups'; }
  if (u === 'oz' && q >= 16) { q = q / 16; u = 'lbs'; }
  else if (u === 'lbs' && q > 0 && q < 1) { q = q * 16; u = 'oz'; }
  if (u === 'quarts' && q > 0 && q < 1) { q = q * 4; u = 'cups'; }
  if (u === 'gallons' && q > 0 && q < 1) { q = q * 4; u = 'quarts'; }
  return formatKitchenFraction(q) + ' ' + u;
}

// Federal Holidays & Service Calendar
export function getFederalHoliday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate(), dow = d.getDay();
  if (m === 1 && day === 1) return "New Year's Day";
  if (m === 1 && dow === 1 && day >= 15 && day <= 21) return 'MLK Jr. Day';
  if (m === 2 && dow === 1 && day >= 15 && day <= 21) return "Presidents' Day";
  if (m === 5 && dow === 1 && day >= 25) return 'Memorial Day';
  if (m === 6 && day === 19) return 'Juneteenth';
  if (m === 7 && day === 4) return 'Independence Day';
  if (m === 9 && dow === 1 && day <= 7) return 'Labor Day';
  if (m === 10 && dow === 1 && day >= 8 && day <= 14) return 'Columbus Day';
  if (m === 11 && day === 11) return 'Veterans Day';
  if (m === 11) {
    const nov1Dow = new Date(y, 10, 1).getDay();
    const thx = 1 + ((4 - nov1Dow + 7) % 7) + 21;
    if (day === thx) return 'Thanksgiving Day';
    if (day === thx + 1) return 'Thanksgiving Friday (Closed)';
  }
  if (m === 12 && day === 25) return 'Christmas Day';
  return '';
}

export function getThirdFriday(year, month0) {
  const firstDow = new Date(year, month0, 1).getDay();
  const firstFri = 1 + ((5 - firstDow + 7) % 7);
  return localDateStr(new Date(year, month0, firstFri + 14));
}

export function serviceDaysBetween(startStr, endStr) {
  const res = [];
  let cur = startStr;
  while (cur <= endStr) {
    const dow = new Date(cur + 'T12:00:00').getDay();
    if ([1, 2, 3, 5].includes(dow) && !getFederalHoliday(cur)) res.push(cur);
    cur = addDays(cur, 1);
  }
  return res;
}

export function allMonTueWedFriBetween(startStr, endStr) {
  const res = [];
  let cur = startStr;
  while (cur <= endStr) {
    const dow = new Date(cur + 'T12:00:00').getDay();
    if ([1, 2, 3, 5].includes(dow)) res.push(cur);
    cur = addDays(cur, 1);
  }
  return res;
}

// Toast & Modal Utilities
export function showToast(msg, type) {
  const box = document.getElementById('toast-container');
  if (!box) return;
  const el = document.createElement('div');
  const bg = type === 'error' ? 'bg-red-700' : type === 'warn' ? 'bg-amber-600' : 'bg-[#1b365d]';
  el.className = `${bg} text-white px-4 py-2.5 rounded-lg shadow-lg text-xs sm:text-sm font-semibold transition-opacity duration-300`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

export function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  const b = document.getElementById('modal-backdrop');
  b.classList.remove('hidden');
  b.classList.add('flex');
}

export function closeModal() {
  document.body.classList.remove('printing-modal');
  const b = document.getElementById('modal-backdrop');
  b.classList.add('hidden');
  b.classList.remove('flex');
}

export function askConfirm(title, message, onConfirm) {
  openModal(title, `
    <div class="space-y-4">
      <p class="text-sm">${esc(message)}</p>
      <div class="flex justify-end gap-2">
        <button type="button" id="cf-cancel" class="kms-btn-alt px-3.5 py-2 text-xs">Cancel</button>
        <button type="button" id="cf-yes" class="kms-btn-primary px-4 py-2 text-xs">Confirm</button>
      </div>
    </div>
  `);
  document.getElementById('cf-cancel').onclick = closeModal;
  document.getElementById('cf-yes').onclick = () => { closeModal(); onConfirm(); };
}