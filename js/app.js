// js/app.js — Main Router, Modals, Global Event Listeners & Boot Sequence

import {
  LOCATIONS, STOCK_UNITS, TEMP_CHECKS, CLEANING_TASKS, SHELF_PRESETS,
  KITCHEN_UNITS, normStockUnit, cleanItemName, normalizeInventoryItem,
  normUnit, formatKitchenFraction, localDateStr, addDays, dLabel,
  parseFlexibleDate, allMonTueWedFriBetween, serviceDaysBetween,
  isAnnouncementActiveToday, nowStamp, uid, esc, fmtNum,
  showToast, openModal, closeModal, askConfirm
, formatKitchenAmt } from './utils.js';

import {
  STORAGE_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, WEAK_PINS,
  state, undoSnapshot, sbClient, syncStatus, sessionPin,
  setRenderCallback, replaceState, setSessionPin, cloudManaged,
  saveState, getDefaultState, buildSeedInventory,
  normalizeRecipe, parsePastedRecipe, parseIngredientLine, recomputeIngredientPer100,
  ROLE_RANK, normalizeRole, sortUsersByRoleAndName, isAdminRole,
  canManageUserAccount, isMgmtOrHigher, isStaffOrHigher,
  getActiveUser, getAllowedTabs, ensureOwnerIntegrity,
  logActivity, snapUndo, doUndo, recordUsage, relearnPars,
  itemNeed, forecastWeekday, predictedPortions, demandForDays, suggestedOrderAmount,
  verifyPin, makeUser, newSalt, hashPin,
  updateSyncUI, edgeFetch, rpcLogin, rpcSetPin, pinErrorText,
  randomTempPin, stripLocalPins, requireRelogin,
  syncToSupabase, forceLiveStatus, initSupabase
, computeAccurateOrderSuggestions } from "./state.js";

import { renderDashboard } from './views/dashboard.js';
import { renderStock } from './views/stock.js';
import { renderOrders } from './views/orders.js';
import { VENDOR_CATALOG, getCatalogMetaForItem, getEffectiveUnitPrice, committedAndNetAvailable } from './state.js';
import { renderReceive, showDonationTaxReceiptModal } from './views/receive.js';
import { renderMenu, showMenuPrintSuiteModal, showBulkMenuModal } from './views/menu.js';
import { renderPrep } from './views/prep.js';
import { renderRecipes } from './views/recipes.js';
import { renderSafety } from './views/safety.js';
import { renderStorage } from './views/storage.js';
import { renderChecklists } from './views/checklists.js';
import { renderForecasting, destroyForecastChart } from './views/forecasting.js';
import { renderRecords } from './views/records.js';
import { renderReport } from './views/report.js';
import { renderUsers } from './views/users.js';
import {
  renderHelp, renderPageGuideBanner, tourState, getRoleTourSteps,
  lastDiagnosticReport, runSystemDiagnostics, showDiagnosticModal,
  runTourStepDemo, restoreTourDemoSandbox
} from './views/help.js';

let trainingStep = 0;

// Direct high-priority handler for Recipe Card + QR printing so no earlier click branch can intercept it
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-print-rec-modal-now')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.print();
    return;
  }
  if (e.target.closest('#btn-print-recipe-sheet')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      const rec = (state.recipes || []).find(r => r.id === state.selectedRecipeId) || (state.recipes || [])[0];
      if (!rec) { showToast('Select a recipe first', 'warn'); return; }
      const scale = Number(state.recipeScale || rec.base_servings || 65);
      const rNorm = typeof normalizeRecipe === 'function' ? normalizeRecipe(rec) : rec;
      const baseServ = Number(rNorm.base_servings || 65) || 65;
      const factor = scale / baseServ;
      let qrSvg = '';
      try {
        if (window.qrcode) {
          const qr = window.qrcode(0, 'M');
          qr.addData(String(rNorm.id || rec.id));
          qr.make();
          qrSvg = qr.createSvgTag({ cellSize: 3, margin: 1 });
        }
      } catch (_) {}
      document.body.classList.add('printing-modal');
      const cols = Array.from(new Set([40, 50, scale, 70, 80])).sort((a, b) => a - b);

      openModal(`Printable Standardized Recipe Card — ${rNorm.name}`, `
        <div class="space-y-3 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-black/5 border border-[var(--line)] no-print">
            <div class="opacity-80">Formatted as a <strong>1-Page Letter Standardized Recipe Card</strong> with scannable QR code &amp; 40–80 scaling matrix.</div>
            <button type="button" id="btn-print-rec-modal-now" class="kms-btn-navy px-4 py-1.5 text-xs font-semibold">Print Recipe Sheet (Letter)</button>
          </div>

          <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
            <div class="bg-[#1b365d] text-white px-4 py-3 flex items-center justify-between gap-3 border-b-4 border-[#b3122b] print-keep">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
                <div class="min-w-0">
                  <div class="sa-sub text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Standardized Recipe Card</div>
                  <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">${esc(rNorm.name)}</h2>
                  <div class="sa-meta text-[11px] text-white/90 mt-0.5">
                    Category: <strong>${esc(rNorm.category || 'Main')}</strong> &bull;
                    Prep: <strong>${rNorm.prep_min || 20}m</strong> &bull;
                    Cook: <strong>${rNorm.cook_min || 35}m</strong> &bull;
                    Active Target: <strong>${scale} Portions</strong>
                  </div>
                </div>
              </div>
              ${qrSvg ? `
                <div class="bg-white text-slate-900 p-1.5 rounded-lg text-center shrink-0 shadow">
                  <div class="w-14 h-14 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">${qrSvg}</div>
                  <div class="text-[9px] font-mono font-bold mt-0.5">${esc(rNorm.id)}</div>
                </div>
              ` : ''}
            </div>

            <div class="p-4 bg-white text-slate-900 space-y-3">
              ${((rNorm.allergens || []).length || rNorm.notes || rNorm.photo_url) ? `
                <div class="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 print-keep">
                  <div class="space-y-1 flex-1 min-w-[200px]">
                    ${(rNorm.allergens || []).length
                      ? `<div class="text-xs font-extrabold text-[#b3122b]">&#9888; FDA BIG 9 ALLERGENS: ${esc(rNorm.allergens.join(', ').toUpperCase())}</div>`
                      : `<div class="text-xs font-bold text-emerald-700">&#10003; No Major FDA Big 9 Allergens Listed</div>`}
                    ${rNorm.notes ? `<div class="text-xs text-slate-700"><strong>Chef / Service Notes:</strong> ${esc(rNorm.notes)}</div>` : ''}
                  </div>
                  ${rNorm.photo_url ? `<img src="${esc(rNorm.photo_url)}" alt="${esc(rNorm.name)}" class="w-16 h-16 rounded-lg object-cover border border-slate-300 shrink-0" />` : ''}
                </div>
              ` : ''}

              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="font-extrabold uppercase tracking-wider text-[11px] text-[#1b365d]">Scaled Ingredients Matrix (Active: ${scale} Portions Highlighted)</span>
                  <span class="text-[10px] font-semibold text-slate-500">Base Yield: ${baseServ} servings</span>
                </div>
                <table class="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr class="bg-[#1b365d] text-white uppercase text-[10px]">
                      <th class="border border-black py-1.5 px-2">Ingredient</th>
                      ${cols.map(p => `<th class="border border-black py-1.5 px-2 text-center ${p === scale ? 'bg-[#b3122b] font-black' : ''}">${p} Port.${p === scale ? ' ★' : ''}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${(rNorm.ingredients || []).map((g, idx) => `
                      <tr class="${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}">
                        <td class="border border-slate-300 py-1.5 px-2 font-bold">&#9744; ${esc(g.name)}</td>
                        ${cols.map(p => {
                          const f = p / baseServ;
                          const isTarget = p === scale;
                          return `<td class="border border-slate-300 py-1.5 px-2 text-center ${isTarget ? 'bg-red-50 font-black text-[#b3122b]' : 'font-semibold'}">${esc(formatKitchenAmt((g.qty || 0) * f, g.unit))}</td>`;
                        }).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              ${(rNorm.steps || []).length ? `
                <div class="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-1.5 print-keep">
                  <div class="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span class="font-extrabold uppercase tracking-wider text-[11px] text-[#1b365d]">Preparation &amp; Service Directions</span>
                    <span class="text-[10px] font-bold text-[#b3122b]">Cook &ge;165&deg;F &bull; Hot Hold &ge;135&deg;F &bull; Cold &le;41&deg;F</span>
                  </div>
                  <ol class="list-decimal list-inside space-y-1 text-xs leading-relaxed text-black">
                    ${rNorm.steps.map(s => `<li>${esc(s)}</li>`).join('')}
                  </ol>
                </div>
              ` : ''}

              <div class="grid grid-cols-3 gap-3 pt-1 text-[11px] font-semibold text-slate-700 print-keep">
                <div class="border-b border-black pb-0.5">Prepared By:</div>
                <div class="border-b border-black pb-0.5">Final Cook Temp (&ge;165&deg;F):</div>
                <div class="border-b border-black pb-0.5">Date / Portions Made:</div>
              </div>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      console.error('Print Recipe + QR error:', err);
      showToast('Recipe print error: ' + (err && err.message ? err.message : err), 'error');
    }
  }
}, true);
let inactivityTimer = null;
const firedAlertIds = new Set();

function pruneExpiredAlerts() {
  const todayStr = localDateStr();
  if (!Array.isArray(state.announcements)) return;
  const before = state.announcements.length;
  state.announcements = state.announcements.filter(a => !a.expires_at || a.expires_at >= todayStr);
  if (state.announcements.length !== before) saveState();
}

function checkScheduledAlerts() {
  const now = new Date();
  const todayStr = localDateStr(now);
  const u = getActiveUser();
  let triggered = false;
  (state.announcements || []).forEach(a => {
    if (!a.alert_at || firedAlertIds.has(a.id + ':' + todayStr)) return;
    if (a.dismissed_by && a.dismissed_by[u.id] === todayStr) return;
    if (isAnnouncementActiveToday(a, now)) {
      const goLiveMs = new Date(a.alert_at).getTime();
      if (!isNaN(goLiveMs) && now.getTime() - goLiveMs >= 0 && now.getTime() - goLiveMs < 120000) {
        firedAlertIds.add(a.id + ':' + todayStr);
        showToast(`Alert: ${a.title}`, a.priority === 'urgent' ? 'error' : 'warn');
        triggered = true;
      }
    }
  });
  if (triggered && state.activeTab === 'dashboard') render();
}

// Navigation Definition (5 clean groups)
const NAV_GROUPS = [
  { id: 'home', label: 'Home', tabs: [{ id: 'dashboard', label: 'Dashboard' }] },
  { id: 'stock', label: 'Stock & Orders', tabs: [
    { id: 'stock', label: 'Stock' },
    { id: 'orders', label: 'Orders & POs' },
    { id: 'receive', label: 'PO Check-In & Donations' },
    { id: 'records', label: 'Blind Count & Waste' }
  ]},
  { id: 'kitchen', label: 'Kitchen & Menu', tabs: [
    { id: 'menu', label: 'Menu & Daily Sheet' },
    { id: 'prep', label: 'Next-Day Prep' },
    { id: 'recipes', label: 'Recipes' }
  ]},
  { id: 'safety', label: 'Safety & Forecast', tabs: [
    { id: 'safety', label: 'Temps & Cleaning' },
    { id: 'storage', label: 'Date Labels & Salad Bar' },
    { id: 'checklists', label: 'Checklists' },
    { id: 'forecasting', label: 'Served & Forecast' }
  ]},
  { id: 'admin', label: 'Admin & Reports', tabs: [
    { id: 'report', label: 'Monthly Report' },
    { id: 'users', label: 'Users & Activity' },
    { id: 'help', label: 'Help & Training' }
  ]}
];

function updateChatBadge() {
  const badge = document.getElementById('chat-badge');
  if (!badge) return;
  const u = getActiveUser();
  const lastRead = (state.chatLastRead && state.chatLastRead[u.id]) || 0;
  const unread = (state.messages || []).filter(m =>
    m.sender_id !== u.id &&
    (m.recipient_id === 'ALL' || m.recipient_id === u.id) &&
    (m.created_at_ms || 0) > lastRead
  ).length;
  badge.textContent = String(unread);
  badge.classList.toggle('hidden', unread === 0);
}

function renderNav() {
  const locked = !!state.isLocked;
  ['btn-sync-pill', 'btn-quick-help', 'btn-open-chat', 'btn-switch-user', 'btn-lock-app', 'btn-tools', 'nav-groups', 'nav-subtabs', 'mobile-dock'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', locked);
  });
  const tmEl = document.getElementById('tools-menu');
  if (tmEl && locked) tmEl.classList.add('hidden');
  if (locked) {
    closeModal();
    document.getElementById('hdr-user').textContent = 'Locked';
    return;
  }
  const u = getActiveUser();
  const allowed = getAllowedTabs(u);
  if (!allowed.includes(state.activeTab)) state.activeTab = allowed[0];
  document.getElementById('hdr-user').textContent = `${u.name} (${u.role})`;
  updateChatBadge();

  const activeGrp = NAV_GROUPS.find(g => g.tabs.some(t => t.id === state.activeTab)) || NAV_GROUPS[0];
  const grpEl = document.getElementById('nav-groups');
  grpEl.innerHTML = NAV_GROUPS.map(g => {
    const visTabs = g.tabs.filter(t => allowed.includes(t.id));
    if (!visTabs.length) return '';
    const isOn = g.id === activeGrp.id;
    return `<button type="button" data-grp="${g.id}" class="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${isOn ? 'bg-[#b3122b] text-white shadow' : 'text-white/80 hover:bg-white/10'}">${g.label}</button>`;
  }).join('');

  const subEl = document.getElementById('nav-subtabs');
  const visSub = activeGrp.tabs.filter(t => allowed.includes(t.id));
  subEl.classList.toggle('hidden', visSub.length <= 1);
  subEl.innerHTML = visSub.map(t => {
    const isOn = t.id === state.activeTab;
    return `<button type="button" data-tab="${t.id}" class="px-3 py-1 rounded-md text-xs font-semibold transition ${isOn ? 'bg-white text-[#1b365d] shadow-sm' : 'text-white/85 hover:bg-white/15'}">${t.label}</button>`;
  }).join('');

  const dockEl = document.getElementById('mobile-dock');
  const dockTabs = [
    ['dashboard', 'Home'], ['stock', 'Stock'], ['menu', 'Menu'], ['safety', 'Safety'], ['receive', 'PO & Donations']
  ].filter(([id]) => allowed.includes(id));
  dockEl.innerHTML = dockTabs.map(([id, lbl]) => `
    <button type="button" data-tab="${id}" class="px-2.5 py-1.5 rounded-lg text-xs font-bold ${state.activeTab === id ? 'bg-[#b3122b] text-white' : 'opacity-75'}">${lbl}</button>
  `).join('');
}

function checkMandatoryModals() {
  const u = getActiveUser();
  const pinB = document.getElementById('pin-change-backdrop');
  const trnB = document.getElementById('training-backdrop');
  if (state.isLocked) {
    pinB.classList.add('hidden'); pinB.classList.remove('flex');
    trnB.classList.add('hidden'); trnB.classList.remove('flex');
    return;
  }
  if (u.must_change_pin) {
    document.getElementById('pin-change-sub').textContent = `Hi ${u.name}, please set your personal 6+ character PIN before using the system.`;
    pinB.classList.remove('hidden'); pinB.classList.add('flex');
    trnB.classList.add('hidden'); trnB.classList.remove('flex');
    return;
  }
  pinB.classList.add('hidden'); pinB.classList.remove('flex');
  const pendingTrn = (state.trainingModules || []).filter(m => (m.role === 'ALL' || normalizeRole(m.role) === normalizeRole(u.role)) && !(u.completed_training_ids || []).includes(m.id));
  if (pendingTrn.length && !u.onboarding_completed) {
    if (trainingStep >= pendingTrn.length) trainingStep = pendingTrn.length - 1;
    const mod = pendingTrn[trainingStep];
    document.getElementById('trn-title').textContent = mod.title;
    document.getElementById('trn-body').textContent = mod.content;
    document.getElementById('trn-step').textContent = `${trainingStep + 1} / ${pendingTrn.length}`;
    document.getElementById('btn-trn-prev').disabled = trainingStep === 0;
    document.getElementById('btn-trn-next').textContent = trainingStep === pendingTrn.length - 1 ? 'Complete Training ✓' : 'Next →';
    trnB.classList.remove('hidden'); trnB.classList.add('flex');
  } else {
    trnB.classList.add('hidden'); trnB.classList.remove('flex');
  }
}

export function render() {
  relearnPars();
  renderNav();
  updateSyncUI();
  destroyForecastChart();
  const main = document.getElementById('app-main');

  if (state.isLocked) {
    const activeUsers = sortUsersByRoleAndName(state.users.filter(u => u.active !== false));
    main.innerHTML = `
      <div class="max-w-md mx-auto mt-10 kms-card p-6 space-y-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-bold">SA</div>
          <div>
            <h2 class="text-base font-bold">Kitchen OS Locked</h2>
            <p class="text-xs opacity-70">Select your profile and enter your PIN.</p>
          </div>
        </div>
        <form id="form-unlock" class="space-y-3">
          <select name="userId" class="kms-input w-full text-sm">
            ${activeUsers.map(u => `<option value="${u.id}" ${u.id === state.activeUserId ? 'selected' : ''}>${esc(u.name)} — ${esc(u.role)}</option>`).join('')}
          </select>
          <input name="pin" type="password" required placeholder="Enter your personal PIN" class="kms-input w-full text-sm" />
          <div id="unlock-err" class="text-xs font-bold text-red-600 hidden">Incorrect PIN.</div>
          <button type="submit" class="kms-btn-primary w-full py-2.5 text-sm">Sign In &amp; Unlock</button>
        </form>
      </div>
    `;
    checkMandatoryModals();
    return;
  }

  switch (state.activeTab) {
    case 'dashboard': renderDashboard(main); break;
    case 'stock': renderStock(main); break;
    case 'orders': renderOrders(main); break;
    case 'receive': renderReceive(main); break;
    case 'menu': renderMenu(main); break;
    case 'prep': renderPrep(main); break;
    case 'recipes': renderRecipes(main); break;
    case 'safety': renderSafety(main); break;
    case 'storage': renderStorage(main); break;
    case 'checklists': renderChecklists(main); break;
    case 'forecasting': renderForecasting(main); break;
    case 'records': renderRecords(main); break;
    case 'report': renderReport(main); break;
    case 'users': renderUsers(main); break;
    case 'help': renderHelp(main); break;
    default: renderDashboard(main);
  }

  const guideHtml = renderPageGuideBanner(state.activeTab);
  if (guideHtml) main.insertAdjacentHTML('afterbegin', guideHtml);

  if (tourState.active) {
    const steps = getRoleTourSteps();
    const idx = Math.min(tourState.stepIndex, Math.max(0, steps.length - 1));
    const step = steps[idx];
    if (step) {
      tourState.completedTabs[step.tab] = true;
      const pct = Math.round(((idx + 1) / steps.length) * 100);
      const banner = document.createElement('div');
      banner.id = 'tour-banner';
      banner.className = 'mb-4 bg-[#1b365d] text-white rounded-xl p-4 shadow-lg border border-white/20 no-print';
      banner.innerHTML = `
        <div class="space-y-2.5">
          <div class="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-400 transition-all duration-300" style="width:${pct}%"></div>
          </div>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1.5 flex-1 min-w-[240px]">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider">Interactive Demo &bull; Step ${idx + 1} of ${steps.length}</span>
                <strong class="text-sm sm:text-base text-white">${esc(step.title)}</strong>
              </div>
              <p class="text-xs sm:text-sm text-white/95 leading-relaxed">${esc(step.desc)}</p>
              <p class="text-xs text-emerald-200 font-medium"><strong>How to Use:</strong> ${esc(step.tryIt)}</p>
              ${tourState.demoActive && tourState.demoNote ? `<div class="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/25 border border-emerald-300/40 text-xs text-emerald-100"><strong>Live Demo Active:</strong> ${esc(tourState.demoNote)} <span class="opacity-80">(Sandboxed — restores automatically on Next or Skip)</span></div>` : ''}
            </div>
            <div class="flex flex-wrap items-center gap-1.5 shrink-0">
              <button type="button" id="btn-tour-demo" class="px-3 py-1.5 rounded-lg ${tourState.demoActive ? 'bg-amber-400 text-slate-950' : 'bg-sky-400 text-slate-950'} text-xs font-extrabold hover:opacity-90">${tourState.demoActive ? 'Reset Demo Data' : '▶ Demonstrate Feature'}</button>
              <button type="button" id="btn-tour-prev" ${idx === 0 ? 'disabled' : ''} class="px-2.5 py-1.5 rounded-lg border border-white/30 text-white text-xs font-semibold ${idx === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/15'}">&larr; Back</button>
              ${idx < steps.length - 1
                ? `<button type="button" id="btn-tour-next" class="px-3.5 py-1.5 rounded-lg bg-[#b3122b] hover:bg-[#910d22] text-white text-xs font-semibold">Next Feature &rarr;</button>`
                : `<button type="button" id="btn-tour-finish" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Finish Tour &#10003;</button>`}
              <button type="button" id="btn-tour-exit" class="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold">Skip Tour</button>
            </div>
          </div>
        </div>
      `;
      main.insertAdjacentElement('afterbegin', banner);
    }
  }
  checkMandatoryModals();
}

setRenderCallback(render);

// Modals & Helpers
function showSwitchUserModal() {
  const active = sortUsersByRoleAndName(state.users.filter(u => u.active !== false));
  openModal('Switch User (PIN Required)', `
    <form id="form-switch-user" class="space-y-3">
      <select name="userId" class="kms-input w-full text-sm">${active.map(u => `<option value="${u.id}" ${u.id === state.activeUserId ? 'selected' : ''}>${esc(u.name)} — ${esc(u.role)}</option>`).join('')}</select>
      <input name="pin" type="password" required placeholder="Enter PIN" class="kms-input w-full text-sm" />
      <div id="sw-err" class="text-xs font-bold text-red-600 hidden">Incorrect PIN.</div>
      <button type="submit" class="kms-btn-primary w-full py-2 text-sm">Verify &amp; Switch</button>
    </form>
  `);
}

function showAnnouncementEditorModal(annId) {
  const a = annId ? (state.announcements || []).find(x => x.id === annId) : null;
  const isEdit = !!a;
  const rep = (isEdit && a.repeat_rule) ? a.repeat_rule : 'none';
  const repDays = isEdit && Array.isArray(a.repeat_days) ? a.repeat_days.map(Number) : [];
  const dayOpts = [[0,'Sun'],[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat']];
  openModal(isEdit ? 'Edit Announcement / Reminder' : 'Post Kitchen Announcement or Reminder', `
    <form id="form-save-announcement" class="space-y-3">
      <input type="hidden" name="annId" value="${isEdit ? esc(a.id) : ''}" />
      ${!isEdit ? `
        <div class="flex flex-wrap items-center gap-1.5 pb-1">
          <span class="text-[11px] font-semibold opacity-70">Quick Preset:</span>
          <button type="button" id="btn-preset-weekly-order" class="kms-btn-alt px-2.5 py-1 text-[11px]">Weekly Order Reminder (Fridays)</button>
        </div>
      ` : ''}
      <div>
        <label class="block text-xs font-semibold mb-1">Title</label>
        <input name="title" type="text" required value="${isEdit ? esc(a.title) : ''}" placeholder="e.g. Weekly Marberger &amp; Produce Order" class="kms-input w-full text-sm" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold mb-1">Color-Coded Urgency</label>
          <select name="priority" class="kms-input w-full text-sm">
            <option value="urgent" ${isEdit && a.priority === 'urgent' ? 'selected' : ''}>Red — Critical / Holiday Alert</option>
            <option value="reminder" ${!isEdit || a.priority === 'reminder' ? 'selected' : ''}>Amber — Important Reminder</option>
            <option value="info" ${isEdit && a.priority === 'info' ? 'selected' : ''}>Blue — General Info</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1">Start / Alert Time (Optional)</label>
          <input name="alertAt" type="datetime-local" value="${isEdit && a.alert_at ? esc(a.alert_at) : ''}" class="kms-input w-full text-sm" />
        </div>
      </div>
      <div class="p-3 rounded-lg border border-[var(--line)] space-y-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold mb-1">Repeat Schedule</label>
            <select id="ann-repeat-select" name="repeat" class="kms-input w-full text-xs font-medium">
              <option value="none" ${rep === 'none' ? 'selected' : ''}>No Repeat (One-Time)</option>
              <option value="daily" ${rep === 'daily' ? 'selected' : ''}>Daily (Every Day)</option>
              <option value="weekly" ${rep === 'weekly' ? 'selected' : ''}>Weekly (Pick Day(s))</option>
              <option value="biweekly" ${rep === 'biweekly' ? 'selected' : ''}>Every 2 Weeks (Pick Day(s))</option>
              <option value="monthly" ${rep === 'monthly' ? 'selected' : ''}>Monthly (Same Day of Month)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">Auto-Delete After Date (Optional)</label>
            <input name="expiresAt" type="date" value="${isEdit && a.expires_at ? esc(a.expires_at) : ''}" class="kms-input w-full text-xs" />
          </div>
        </div>
        <div id="ann-repeat-days-wrap" class="${rep === 'weekly' || rep === 'biweekly' ? '' : 'hidden'} pt-1">
          <label class="block text-[11px] font-semibold opacity-75 mb-1">Repeat on Day(s) of Week</label>
          <div class="flex flex-wrap gap-1.5">
            ${dayOpts.map(([dVal, dLbl]) => `
              <label class="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--line)] text-xs cursor-pointer">
                <input type="checkbox" name="repeatDays" value="${dVal}" ${repDays.includes(dVal) ? 'checked' : ''} class="accent-[#b3122b]" />
                <span>${dLbl}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold mb-1">Message</label>
        <textarea name="body" rows="3" required placeholder="Details for staff and volunteers..." class="kms-input w-full text-sm">${isEdit ? esc(a.body) : ''}</textarea>
      </div>
      <button type="submit" class="kms-btn-primary w-full py-2 text-sm">${isEdit ? 'Save Announcement' : 'Post / Schedule Announcement'}</button>
    </form>
  `);
}

function buildNotifyLinks(recipients, subject, body) {
  const emails = recipients.map(r => r.email).filter(Boolean);
  const mailHref = emails.length
    ? `mailto:${encodeURIComponent(emails.join(','))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { mailHref, emails, hasContacts: emails.length > 0 };
}

async function sendBackgroundAlert(recipients, subject, text) {
  if (!sbClient) return false;
  const uniqueTo = Array.from(new Set((recipients || []).map(r => r.email).filter(Boolean)));
  if (!uniqueTo.length) return false;
  try {
    const res = await edgeFetch('notify-alert', {
      body: JSON.stringify({ to: uniqueTo, subject, text })
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data && data.ok !== false;
  } catch (e) {
    return false;
  }
}

function invokeScrapeRecipe(payload) {
  const fallbackClientFetch = async (url) => {
    if (!url) throw new Error('Edge Function unavailable');
    const r = await fetch('https://r.jina.ai/' + url, { headers: { 'Accept': 'text/plain' } });
    if (!r.ok) throw new Error('Could not fetch recipe from URL (HTTP ' + r.status + '). Try copying and pasting the recipe text below.');
    const md = await r.text();
    const lines = md.split(/\r?\n/).map(l => l.trim());
    let name = '', baseServings = 4, mode = 'none';
    const ingredients = [], steps = [];
    for (const raw of lines) {
      if (!raw) continue;
      const tm = raw.match(/^Title:\s*(.+)$/i);
      if (tm && !name) { name = tm[1].replace(/\s*[-|].*(Allrecipes|Food Network|Recipe).*$/i, '').trim(); continue; }
      if (!name && /^#\s+/.test(raw)) { name = raw.replace(/^#+\s*/, '').trim(); continue; }
      const ym = raw.match(/^(?:Yield|Servings|Serves)\s*:?\s*(\d+)/i);
      if (ym) { baseServings = Math.max(1, Number(ym[1])); continue; }
      if (/^#{1,4}\s*Ingredients\b|^Ingredients\s*:?$/i.test(raw)) { mode = 'ing'; continue; }
      if (/^#{1,4}\s*(?:Directions|Instructions|Method|Steps)\b|^(?:Directions|Instructions|Method)\s*:?$/i.test(raw)) { mode = 'step'; continue; }
      if (/^#{1,4}\s*(?:Nutrition|Reviews|Shop|Related|More|Video|Cook's Note|Notes)\b/i.test(raw)) { if (ingredients.length && steps.length) break; mode = 'none'; continue; }
      const clean = raw.replace(/^[-*•\[\]xX\s]+(?=[A-Za-z0-9¼½¾⅓⅔⅛])/, '').replace(/^\*+|\*+$/g, '').trim();
      if (!clean || /^!\[|^\[.*\]\(http/.test(raw)) continue;
      if (mode === 'ing' && clean.length < 180) ingredients.push(clean);
      else if (mode === 'step') { const st = clean.replace(/^\d+[\.\)]\s*/, '').trim(); if (st.length > 8) steps.push(st); }
    }
    if (!ingredients.length) throw new Error('No recipe ingredients found on that page. Copy and paste the recipe text below instead.');
    return { ok: true, recipe: { name: name || 'Imported Recipe', category: 'Main Entree', base_servings: baseServings, prep_min: 20, cook_min: 35, ingredients, steps, source_url: url } };
  };

  return edgeFetch('scrape-recipe', { body: JSON.stringify(payload) })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.ok === false)) {
        if (payload && payload.url) return await fallbackClientFetch(payload.url);
        throw new Error((data && data.error) || ('Edge Function HTTP ' + res.status));
      }
      return data;
    })
    .catch(async err => {
      if (payload && payload.url) return await fallbackClientFetch(payload.url);
      throw err;
    });
}

function showChatModal() {
  const u = getActiveUser();
  if (!state.chatLastRead) state.chatLastRead = {};
  state.chatLastRead[u.id] = Date.now();
  updateChatBadge();
  const target = state._chatTarget || 'ALL';
  const editingId = state._editingMsgId || null;
  const others = (state.users || []).filter(x => x.active !== false && x.id !== u.id);
  const visibleMsgs = (state.messages || []).filter(m => {
    if (target === 'ALL') return m.recipient_id === 'ALL' || !m.recipient_id;
    return (m.sender_id === u.id && m.recipient_id === target) || (m.sender_id === target && m.recipient_id === u.id);
  }).slice(-40);
  const targetUser = target === 'ALL' ? null : others.find(x => x.id === target);
  const notifyRecips = target === 'ALL' ? others : (targetUser ? [targetUser] : []);
  const lastMsg = visibleMsgs[visibleMsgs.length - 1];
  const links = buildNotifyLinks(
    notifyRecips,
    `Salvation Army KMS ${target === 'ALL' ? 'Alert' : 'DM from ' + u.name}`,
    lastMsg ? `${lastMsg.sender_name}: ${lastMsg.body}` : ''
  );

  openModal('Kitchen Alerts & Private DMs', `
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" data-chat-target="ALL" class="px-2.5 py-1 rounded-lg font-bold border ${target === 'ALL' ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'border-[var(--line)] hover:bg-black/5'}">Alert All (Broadcast)</button>
          ${others.map(o => `
            <button type="button" data-chat-target="${o.id}" class="px-2.5 py-1 rounded-lg font-semibold border ${target === o.id ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">DM: ${esc(o.name)} (${esc(o.role)})</button>
          `).join('')}
        </div>
        ${visibleMsgs.length && isMgmtOrHigher(u) ? `<button type="button" id="btn-clear-chat-thread" class="text-[11px] font-semibold text-red-500 hover:underline px-1.5 py-1">Clear Thread</button>` : ''}
      </div>
      <div class="max-h-60 overflow-y-auto space-y-2 p-2 rounded-lg bg-black/5">
        ${!visibleMsgs.length ? `<p class="text-xs opacity-60 text-center py-6">${target === 'ALL' ? 'No broadcast alerts yet.' : 'No private messages with ' + esc(targetUser ? targetUser.name : 'user') + ' yet.'}</p>` : visibleMsgs.map(m => {
          const canEditMsg = (m.sender_id === u.id) || isMgmtOrHigher(u);
          const isEditing = editingId === m.id;
          return `
          <div class="p-2.5 rounded-lg kms-card text-xs ${m.sender_id === u.id ? 'border-l-4 border-l-[#1b365d]' : ''}">
            <div class="flex items-start justify-between gap-2">
              <div class="font-bold">
                ${esc(m.sender_name)}
                ${m.recipient_id && m.recipient_id !== 'ALL' ? `<span class="opacity-65 font-normal">&rarr; ${esc(m.recipient_name)} (Private)</span>` : ''}
                <span class="opacity-60 font-normal">(${esc(m.timestamp_label)})</span>
                ${m.priority === 'urgent' ? '<span class="tag tag-OUT ml-1">URGENT</span>' : ''}
                ${m.edited ? '<span class="opacity-55 font-normal italic ml-1">(edited)</span>' : ''}
              </div>
              ${canEditMsg && !isEditing ? `
                <div class="flex items-center gap-2 shrink-0 text-[11px]">
                  <button type="button" data-edit-msg="${esc(m.id)}" class="font-semibold text-[var(--navy)] hover:underline">Edit</button>
                  <button type="button" data-del-msg="${esc(m.id)}" class="font-semibold text-red-500 hover:underline">Delete</button>
                </div>
              ` : ''}
            </div>
            ${isEditing ? `
              <form class="form-edit-msg mt-2 space-y-2" data-msg-id="${esc(m.id)}">
                <textarea name="body" rows="2" required class="kms-input w-full text-xs leading-relaxed">${esc(m.body)}</textarea>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label class="flex items-center gap-1.5 text-xs font-bold cursor-pointer"><input type="checkbox" name="urgent" ${m.priority === 'urgent' ? 'checked' : ''} /> Urgent</label>
                  <div class="flex gap-1.5">
                    <button type="button" id="btn-cancel-edit-msg" class="kms-btn-alt px-2.5 py-1 text-xs">Cancel</button>
                    <button type="submit" class="kms-btn-ok px-3 py-1 text-xs">Update</button>
                  </div>
                </div>
              </form>
            ` : `<div class="mt-1 whitespace-pre-line">${esc(m.body)}</div>`}
          </div>
        `; }).join('')}
      </div>
      <form id="form-chat" class="space-y-2">
        <input type="hidden" name="recipientId" value="${esc(target)}" />
        <div class="flex flex-wrap gap-2">
          <input name="body" required placeholder="${target === 'ALL' ? 'Alert everyone in the kitchen...' : 'Private message to ' + esc(targetUser ? targetUser.name : '') + '...'}" class="kms-input flex-1 min-w-[180px] text-sm" />
          <label class="flex items-center gap-1 text-xs font-bold"><input type="checkbox" name="urgent" /> Urgent</label>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="kms-btn-primary flex-1 py-2 text-sm">${target === 'ALL' ? 'Send Alert to All' : 'Send Private DM'}</button>
          <a href="${links.mailHref}" class="kms-btn-alt px-3 py-2 text-xs font-semibold text-center">Email Alert</a>
        </div>
      </form>
    </div>
  `);
}

function showQrLabelsModal() {
  const cards = state.items.filter(i => !i.discontinued).slice(0, 30).map(item => {
    let svg = '';
    try {
      if (window.qrcode) {
        const qr = window.qrcode(0, 'M');
        qr.addData(item.sku);
        qr.make();
        svg = qr.createSvgTag({ cellSize: 2, margin: 1 });
      }
    } catch (e) {}
    return `
      <div class="p-2 border border-dashed border-gray-400 rounded flex items-center gap-2 text-xs qr-label-card">
        <div class="shrink-0">${svg || esc(item.sku)}</div>
        <div><div class="font-bold">${esc(item.name)}</div><div class="font-mono text-[#b3122b]">${esc(item.sku)}</div><div class="opacity-70">${esc(item.location)}</div></div>
      </div>
    `;
  }).join('');
  document.body.classList.add('printing-modal');
  openModal('Printable Shelf QR Labels', `
    <div class="space-y-3">
      <button type="button" onclick="window.print()" class="kms-btn-navy px-4 py-1.5 text-xs no-print">Print Labels (Letter)</button>
      <div class="qr-print-grid grid grid-cols-1 sm:grid-cols-2 gap-2">${cards}</div>
    </div>
  `);
}

function showBackupRestoreModal() {
  openModal('Backup & Restore Full System', `
    <div class="space-y-4 text-xs">
      <div class="p-3 rounded-lg border border-[var(--line)] space-y-2">
        <div class="font-bold">1. Download Full JSON Backup</div>
        <p class="opacity-75">Saves all Butler PA inventory, recipes, photos, menu plans, POs, donations, users, and safety logs to a file.</p>
        <button type="button" id="btn-dl-json" class="kms-btn-navy px-3.5 py-2 font-semibold">Download JSON Backup</button>
      </div>
      <div class="p-3 rounded-lg border border-[var(--line)] space-y-2">
        <div class="font-bold">2. Restore from JSON Backup File</div>
        <p class="opacity-75">Upload a previously saved <code>.json</code> backup file to restore locally and sync to Supabase.</p>
        <input type="file" id="inp-restore-json" accept=".json,application/json" class="kms-input w-full text-xs" />
      </div>
      <div class="pt-2 border-t border-[var(--line)] flex justify-between items-center">
        <button type="button" id="btn-reset-seed" class="kms-btn-alt px-3 py-1.5 text-xs">Reset Stock to Starting Seed</button>
        <button type="button" data-close-modal="1" class="kms-btn-alt px-3 py-1.5 text-xs">Close</button>
      </div>
    </div>
  `);
}

function upsertPoDeliveryReminder(po, deliveryDate) {
  if (!po || !deliveryDate) return;
  if (!Array.isArray(state.announcements)) state.announcements = [];
  const annId = 'ann-po-' + po.id;
  const title = `Delivery Expected: ${po.po_number} (${po.vendor})`;
  const body = `Expected delivery for ${po.po_number} (${(po.lines || []).length} item(s)). Reconcile & check in under PO Check-In & Donations when it arrives.`;
  const idx = state.announcements.findIndex(a => a.id === annId);
  const rec = {
    id: annId, priority: 'reminder', title, body,
    alert_at: deliveryDate + 'T08:00', repeat_rule: 'none', repeat_days: [],
    expires_at: deliveryDate, author: getActiveUser().name,
    created_at: localDateStr(), dismissed_by: {}
  };
  if (idx >= 0) state.announcements[idx] = { ...state.announcements[idx], ...rec };
  else state.announcements.unshift(rec);
}

function importRecipeFromUrl(targetUrl, btn) {
  const origTxt = btn ? btn.textContent : 'Import';
  if (btn) { btn.disabled = true; btn.textContent = 'Importing...'; }
  invokeScrapeRecipe({ url: targetUrl }).then(data => {
    if (!data || !data.ok || !data.recipe) {
      throw new Error((data && data.error) || 'Import failed');
    }
    const rawRec = data.recipe;
    const baseServ = Math.max(1, Number(rawRec.base_servings) || 8);
    const allText = (rawRec.name || '') + ' ' + (rawRec.ingredients || []).join(' ');
    const allergenKeywords = {
      milk: /milk|cheese|butter|cream|yogurt|dairy/i,
      eggs: /egg/i,
      wheat: /flour|pasta|spaghetti|penne|noodles|macaroni|bread|biscuit|cracker|wheat/i,
      soy: /\bsoy\b|tofu/i,
      peanuts: /peanut/i,
      'tree nuts': /almond|walnut|pecan|cashew/i,
      fish: /tuna|salmon|fish|cod/i,
      shellfish: /shrimp|crab|lobster/i,
      sesame: /sesame|tahini/i
    };
    const allergens = Object.keys(allergenKeywords).filter(a => allergenKeywords[a].test(allText));
    const r = {
      id: uid('rec'),
      name: rawRec.name || 'Imported Recipe',
      category: rawRec.category || 'Main Entree',
      base_servings: baseServ,
      prep_min: Number(rawRec.prep_min) || 20,
      cook_min: Number(rawRec.cook_min) || 35,
      allergens,
      photo_url: rawRec.image || '',
      steps: Array.isArray(rawRec.steps) ? rawRec.steps : [],
      ingredients: (rawRec.ingredients || []).map(ln => parseIngredientLine(ln, baseServ))
    };
    state.recipes.unshift(r);
    state.selectedRecipeId = r.id;
    state._recSearch = '';
    state._webRecQuery = '';
    state._webRecResults = [];
    state.recipeScale = Math.min(80, Math.max(40, predictedPortions(localDateStr())));
    logActivity('RECIPE IMPORTED', `${r.name} (from URL)`);
    saveState();
    render();
    showToast(`Imported "${r.name}" (base ${baseServ}, scaled to ${state.recipeScale})`);
  }).catch(err => {
    showToast(String(err.message || err), 'warn');
  }).finally(() => {
    if (btn) { btn.disabled = false; btn.textContent = origTxt; }
  });
}

// Global Click Listener
document.addEventListener('click', (e) => {
  if (state.isLocked) return;
  const toolsBtn = e.target.closest('#btn-tools');
  if (toolsBtn) { document.getElementById('tools-menu').classList.toggle('hidden'); return; }
  const tm = document.getElementById('tools-menu');
  if (tm && !tm.classList.contains('hidden')) tm.classList.add('hidden');

  const grpBtn = e.target.closest('[data-grp]');
  if (grpBtn) {
    const g = NAV_GROUPS.find(x => x.id === grpBtn.dataset.grp);
    const allowed = getAllowedTabs();
    const first = g && g.tabs.find(t => allowed.includes(t.id));
    if (first) { state.activeTab = first.id; state.selectedSheetDate = null; saveState(); render(); }
    return;
  }
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { state.activeTab = tabBtn.dataset.tab; state.selectedSheetDate = null; saveState(); render(); return; }

  // Page Quick Guide & Task Finder Controls
  if (e.target.closest('#btn-quick-help')) {
    if (!state.dismissedGuides) state.dismissedGuides = {};
    state.dismissedGuides[state.activeTab] = !state.dismissedGuides[state.activeTab];
    saveState();
    render();
    return;
  }
  const hideGuideBtn = e.target.closest('[data-hide-guide]');
  if (hideGuideBtn) {
    if (!state.dismissedGuides) state.dismissedGuides = {};
    state.dismissedGuides[hideGuideBtn.dataset.hideGuide] = true;
    saveState();
    render();
    return;
  }
  if (e.target.id === 'btn-show-all-guides') {
    state.dismissedGuides = {};
    saveState();
    render();
    showToast('All page quick guides restored');
    return;
  }
  const goGuideBtn = e.target.closest('[data-go-guide-tab]');
  if (goGuideBtn) {
    const targetTab = goGuideBtn.dataset.goGuideTab;
    if (!state.dismissedGuides) state.dismissedGuides = {};
    delete state.dismissedGuides[targetTab];
    state.activeTab = targetTab;
    state.selectedSheetDate = null;
    saveState();
    render();
    return;
  }

  // System Self-Test & Certification Report
  if (e.target.id === 'btn-run-selftest' || e.target.id === 'btn-run-selftest-2') {
    runSystemDiagnostics();
    return;
  }
  if (e.target.id === 'btn-view-last-diag') {
    showDiagnosticModal();
    return;
  }
  if (e.target.id === 'btn-copy-diag-report' && lastDiagnosticReport) {
    const rep = lastDiagnosticReport;
    const txt = [
      `THE SALVATION ARMY COMMUNITY MEALS KMS (BUTLER, PA) — SYSTEM VERIFICATION REPORT`,
      `Status: ${rep.allPassed ? 'ALL SYSTEMS VERIFIED & PASSED' : 'WARNINGS'} (${rep.passedCount}/${rep.totalCount})`,
      `Verified By: ${rep.tester} | Timestamp: ${rep.timestamp}`,
      ...rep.results.map(r => `[${r.passed ? 'PASS' : 'FAIL'}] ${r.id} ${r.area}: ${r.check} -> ${r.actual}`)
    ].join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    showToast('Copied Verification Report to clipboard');
    return;
  }

  // Donations & Tax Receipt Actions
  if (e.target.id === 'btn-add-don-row') {
    const tbody = document.getElementById('don-rows-body');
    if (tbody) {
      const invOpts = state.items.filter(i => !i.discontinued).map(i => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join('');
      tbody.insertAdjacentHTML('beforeend', `
        <tr class="don-row">
          <td class="p-1.5">
            <select name="donItemId" class="kms-input w-full text-xs">
              <option value="">-- Custom / Non-Catalog Item --</option>
              ${invOpts}
            </select>
          </td>
          <td class="p-1.5"><input name="donCustomName" type="text" placeholder="e.g. Fresh produce box / Pies" class="kms-input w-full text-xs" /></td>
          <td class="p-1.5"><input name="donQty" type="number" step="0.5" min="0" placeholder="0" class="kms-input w-full text-xs text-center font-bold" /></td>
          <td class="p-1.5"><input name="donUnit" type="text" value="cases" placeholder="cases, lbs..." class="kms-input w-full text-xs" /></td>
          <td class="p-1.5 text-center"><button type="button" class="btn-rm-don-row text-rose-600 font-bold text-sm">&times;</button></td>
        </tr>
      `);
    }
    return;
  }
  if (e.target.classList && e.target.classList.contains('btn-rm-don-row')) {
    const row = e.target.closest('tr');
    if (row) row.remove();
    return;
  }
  const viewDonBtn = e.target.closest('[data-view-don-receipt]');
  if (viewDonBtn) {
    showDonationTaxReceiptModal(viewDonBtn.dataset.viewDonReceipt);
    return;
  }
  const delDonBtn = e.target.closest('[data-del-don]');
  if (delDonBtn) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can delete donation records', 'warn'); return; }
    const donId = delDonBtn.dataset.delDon;
    const dObj = (state.donations || []).find(d => d.id === donId);
    if (dObj) {
      askConfirm('Delete Donation Record', `Delete donation receipt ${dObj.receipt_number} from ${dObj.donor_name}?`, () => {
        state.donations = (state.donations || []).filter(d => d.id !== donId);
        logActivity('DONATION DELETED', `Deleted ${dObj.receipt_number} (${dObj.donor_name})`);
        saveState();
        render();
        showToast('Donation record deleted');
      });
    }
    return;
  }

  if (e.target.id === 'modal-close' || e.target.id === 'modal-backdrop') { closeModal(); return; }
  if (e.target.closest('[data-close-modal]')) { closeModal(); if (!e.target.closest('[data-tab]')) return; }
  if (e.target.closest('#btn-switch-user')) { showSwitchUserModal(); return; }
  if (e.target.closest('#btn-open-chat')) { state._editingMsgId = null; showChatModal(); return; }
  const chatTgtBtn = e.target.closest('[data-chat-target]');
  if (chatTgtBtn) { state._chatTarget = chatTgtBtn.dataset.chatTarget; state._editingMsgId = null; showChatModal(); return; }
  const editMsgBtn = e.target.closest('[data-edit-msg]');
  if (editMsgBtn) { state._editingMsgId = editMsgBtn.dataset.editMsg; showChatModal(); return; }
  if (e.target.id === 'btn-cancel-edit-msg') { state._editingMsgId = null; showChatModal(); return; }
  const delMsgBtn = e.target.closest('[data-del-msg]');
  if (delMsgBtn) {
    const msgId = delMsgBtn.dataset.delMsg;
    const u = getActiveUser();
    const targetMsg = (state.messages || []).find(m => m.id === msgId);
    if (targetMsg && (targetMsg.sender_id === u.id || isMgmtOrHigher(u))) {
      state.messages = (state.messages || []).filter(m => m.id !== msgId);
      if (state._editingMsgId === msgId) state._editingMsgId = null;
      if (sbClient) sbClient.from('kms_messages').delete().eq('id', msgId).then(() => {});
      logActivity('CHAT DELETED', `Deleted message from ${targetMsg.sender_name}`);
      saveState();
      updateChatBadge();
      showChatModal();
      showToast('Message deleted');
    }
    return;
  }
  if (e.target.id === 'btn-clear-chat-thread') {
    if (!isMgmtOrHigher()) { showToast('Only Management can clear a chat thread', 'warn'); return; }
    const u = getActiveUser();
    const target = state._chatTarget || 'ALL';
    const toDelete = (state.messages || []).filter(m => {
      if (target === 'ALL') return m.recipient_id === 'ALL' || !m.recipient_id;
      return (m.sender_id === u.id && m.recipient_id === target) || (m.sender_id === target && m.recipient_id === u.id);
    }).map(m => m.id);
    if (!toDelete.length) return;
    state.messages = (state.messages || []).filter(m => !toDelete.includes(m.id));
    state._editingMsgId = null;
    if (sbClient) sbClient.from('kms_messages').delete().in('id', toDelete).then(() => {});
    logActivity('CHAT CLEARED', `Cleared ${toDelete.length} message(s) in ${target === 'ALL' ? 'Broadcast' : 'DM'}`);
    saveState();
    updateChatBadge();
    showChatModal();
    showToast(`Cleared ${toDelete.length} message(s)`);
    return;
  }
  if (e.target.closest('#btn-lock-app')) {
    const curU = getActiveUser();
    logActivity('LOGOUT', `${curU.name} locked / signed out`);
    state.isLocked = true;
    setSessionUnlocked(false);
    setSessionPin('');
    saveState();
    render();
    return;
  }
  if (e.target.closest('#btn-sync-pill')) {
    openModal('Supabase Cloud Sync & Connection', `
      <div class="space-y-3 text-xs">
        <div class="p-3 rounded-lg border border-[var(--line)] flex items-center justify-between">
          <div>
            <div class="font-bold">Status: ${syncStatus === 'live' ? 'Connected (Live Sync)' : syncStatus === 'connecting' ? 'Connecting...' : 'Local / Offline Mode'}</div>
            <div class="opacity-70 font-mono text-[11px] mt-0.5">${esc(SUPABASE_URL)}</div>
          </div>
          <span class="tag ${syncStatus === 'live' ? 'tag-OK' : 'tag-LOW'}">${syncStatus.toUpperCase()}</span>
        </div>
        <p class="opacity-80">Use <strong>Reconnect &amp; Pull from Cloud</strong> to refresh all devices from Supabase, or <strong>Push Local Data to Cloud</strong> if you made offline changes.</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" id="btn-sb-reconnect" class="kms-btn-navy flex-1 py-2 text-xs font-semibold">Reconnect &amp; Pull from Cloud</button>
          <button type="button" id="btn-sb-push" class="kms-btn-ok flex-1 py-2 text-xs font-semibold">Push Local Data to Cloud</button>
        </div>
      </div>
    `);
    return;
  }
  if (e.target.id === 'btn-sb-reconnect') {
    closeModal();
    showToast('Reconnecting to Supabase...');
    initSupabase();
    return;
  }
  if (e.target.id === 'btn-sb-push') {
    closeModal();
    if (!sbClient) { showToast('Supabase client unavailable', 'warn'); return; }
    forceLiveStatus();
    syncToSupabase().then(() => showToast('Pushed local data to Supabase cloud!'));
    return;
  }
  const closeToolsMenu = () => { const tm = document.getElementById('tools-menu'); if (tm) tm.classList.add('hidden'); };
  if (e.target.closest('#btn-undo') || e.target.closest('#btn-stock-undo')) { closeToolsMenu(); doUndo(); return; }
  if (e.target.closest('#btn-print-qr')) { closeToolsMenu(); showQrLabelsModal(); return; }
  if (e.target.closest('#btn-print-page')) { closeToolsMenu(); setTimeout(() => window.print(), 60); return; }
  if (e.target.closest('#btn-text-size')) {
    closeToolsMenu();
    state.textZoom = ((state.textZoom || 0) + 1) % 3;
    const labels = ['Normal Text (100%)', 'Large Text (112.5%)', 'Extra Large Text (125%)'];
    document.documentElement.style.fontSize = ['100%', '112.5%', '125%'][state.textZoom];
    saveState();
    showToast('Text size: ' + labels[state.textZoom]);
    return;
  }
  if (e.target.closest('#btn-theme-toggle')) {
    closeToolsMenu();
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState();
    showToast(state.theme === 'dark' ? 'Dark Mode enabled' : 'Light Mode enabled');
    return;
  }
  if (e.target.closest('#btn-backup') || e.target.closest('#btn-open-restore')) { closeToolsMenu(); showBackupRestoreModal(); return; }
  if (e.target.id === 'btn-dl-json') {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sa-butler-kms-${localDateStr()}.json`;
    a.click();
    return;
  }
  if (e.target.id === 'btn-reset-seed') {
    askConfirm('Reset Stock', 'Reset all inventory items back to the starting Butler PA seed list?', () => {
      state.items = buildSeedInventory();
      saveState();
      render();
      showToast('Inventory reset to starting seed');
    });
    return;
  }

  // Stock +/- & Individual/Bulk Edit & Delete
  const adjBtn = e.target.closest('[data-adj]');
  if (adjBtn) {
    const [id, d] = adjBtn.dataset.adj.split(':');
    const delta = Number(d);
    const x = state.items.find(i => i.id === id);
    if (x) {
      snapUndo();
      if (delta < 0) recordUsage(x, Math.min(-delta, x.on_hand));
      x.on_hand = Math.max(0, Math.round((x.on_hand + delta) * 100) / 100);
      logActivity('STOCK', `${delta > 0 ? '+' : ''}${delta} ${x.unit} ${x.name}`);
      saveState();
      render();
    }
    return;
  }

  const editItemBtn = e.target.closest('[data-edit-item]');
  if (editItemBtn) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can edit item details', 'warn'); return; }
    const x = state.items.find(i => i.id === editItemBtn.dataset.editItem);
    if (x) {
      const curU = normStockUnit(x.unit);
      const uOpts = Array.from(new Set([...STOCK_UNITS, curU]));
      openModal(`Edit Inventory Item — ${x.name}`, `
        <form id="form-edit-item" class="space-y-3 text-xs">
          <input type="hidden" name="itemId" value="${esc(x.id)}" />
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="sm:col-span-2"><label class="block font-semibold mb-1">Item Name</label><input name="name" type="text" required value="${esc(x.name)}" class="kms-input w-full text-sm" /></div>
            <div><label class="block font-semibold mb-1">SKU</label><input name="sku" type="text" required value="${esc(x.sku)}" class="kms-input w-full text-sm font-mono" /></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label class="block font-semibold mb-1">Storage Location</label><select name="location" class="kms-input w-full text-xs">${LOCATIONS.map(l => `<option value="${esc(l)}" ${x.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
            <div><label class="block font-semibold mb-1">Standardized Unit</label><select name="unit" class="kms-input w-full text-xs">${uOpts.map(u => `<option value="${esc(u)}" ${curU === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
            <div><label class="block font-semibold mb-1">Order Schedule</label><select name="cadence" class="kms-input w-full text-xs"><option value="W" ${x.cadence === 'W' ? 'selected' : ''}>Weekly (Marberger)</option><option value="M" ${x.cadence === 'M' ? 'selected' : ''}>Monthly (Jordan Banana)</option></select></div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div><label class="block font-semibold mb-1">On Hand</label><input name="onHand" type="number" step="0.5" min="0" value="${x.on_hand}" class="kms-input w-full text-xs font-bold" /></div>
            <div><label class="block font-semibold mb-1">Par Level</label><input name="par" type="number" step="0.5" min="0" value="${x.par}" class="kms-input w-full text-xs font-bold" /></div>
            ${isMgmtOrHigher(getActiveUser()) ? `<div><label class="block font-semibold mb-1">Unit Price ($) <span class="text-[10px] font-normal opacity-70">(PO &amp; Waste reports only · blank = ${getEffectiveUnitPrice(x).price.toFixed(2)} wholesale est.)</span></label><input name="unitPrice" type="number" step="0.01" min="0" value="${x.unit_price || ''}" placeholder="${getEffectiveUnitPrice(x).price.toFixed(2)}" class="kms-input w-full text-xs" /></div>` : ''}
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save Item Changes</button>
        </form>
      `);
    }
    return;
  }

  const delItemBtn = e.target.closest('[data-del-item]');
  if (delItemBtn) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can delete inventory items', 'warn'); return; }
    const itemId = delItemBtn.dataset.delItem;
    const targetItem = state.items.find(i => i.id === itemId);
    if (targetItem) {
      askConfirm('Delete Inventory Item', `Permanently delete "${targetItem.name}" (${targetItem.sku}) from Living Stock?`, () => {
        snapUndo();
        state.items = state.items.filter(i => i.id !== itemId);
        if (sbClient) sbClient.from('kms_inventory_items').delete().eq('id', itemId).then(() => {});
        logActivity('DELETE ITEM', `Deleted ${targetItem.name} (${targetItem.sku})`);
        saveState();
        render();
        showToast(`Deleted ${targetItem.name}`);
      });
    }
    return;
  }

  if (e.target.id === 'btn-bulk-stock') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-edit stock', 'warn'); return; }
    openModal('Bulk Add, Edit & Delete Stock Items', `
      <div class="space-y-4 text-xs">
        <form id="form-bulk-add-stock" class="p-3 rounded-lg border border-[var(--line)] bg-black/5 space-y-2">
          <div class="font-bold text-sm">1. Bulk Add New Items (1 per line: <code>Name, Location, Unit, OnHand, Par, W/M</code>)</div>
          <textarea name="bulkItemsRaw" rows="3" required placeholder="Apple juice, Walk-in cooler, crates, 2, 3, W&#10;Oatmeal packets, Stockroom, boxes, 4, 4, M" class="kms-input w-full text-xs font-mono"></textarea>
          <button type="submit" class="kms-btn-ok w-full py-1.5 text-xs font-semibold">Add Pasted Stock Items</button>
        </form>

        <form id="form-bulk-edit-stock" class="space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold text-sm">2. Bulk Edit or Delete Existing Items (${state.items.length})</div>
            <button type="submit" class="kms-btn-primary px-3.5 py-1.5 text-xs font-semibold">Save All &amp; Delete Checked</button>
          </div>
          <div class="max-h-72 overflow-y-auto border border-[var(--line)] rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                  <th class="p-1.5 text-center text-red-600">Del</th>
                  <th class="p-1.5">Name</th>
                  <th class="p-1.5">Zone</th>
                  <th class="p-1.5">Unit</th>
                  <th class="p-1.5 w-16">Have</th>
                  <th class="p-1.5 w-16">Par</th>
                  <th class="p-1.5">W/M</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--line)]">
                ${state.items.map(x => {
                  const curU = normStockUnit(x.unit);
                  const uOpts = Array.from(new Set([...STOCK_UNITS, curU]));
                  return `
                  <tr>
                    <td class="p-1.5 text-center"><input type="checkbox" name="del_${esc(x.id)}" class="accent-red-600" title="Check to delete" /></td>
                    <td class="p-1"><input name="name_${esc(x.id)}" type="text" value="${esc(x.name)}" class="kms-input w-full text-xs font-semibold" /></td>
                    <td class="p-1"><select name="loc_${esc(x.id)}" class="kms-input text-xs">${LOCATIONS.map(l => `<option value="${esc(l)}" ${x.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td>
                    <td class="p-1"><select name="unit_${esc(x.id)}" class="kms-input text-xs">${uOpts.map(u => `<option value="${esc(u)}" ${curU === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></td>
                    <td class="p-1"><input name="hand_${esc(x.id)}" type="number" step="0.5" min="0" value="${x.on_hand}" class="kms-input w-16 text-xs text-center font-bold" /></td>
                    <td class="p-1"><input name="par_${esc(x.id)}" type="number" step="0.5" min="0" value="${x.par}" class="kms-input w-16 text-xs text-center" /></td>
                    <td class="p-1"><select name="cad_${esc(x.id)}" class="kms-input text-xs"><option value="W" ${x.cadence === 'W' ? 'selected' : ''}>W</option><option value="M" ${x.cadence === 'M' ? 'selected' : ''}>M</option></select></td>
                  </tr>
                `; }).join('')}
              </tbody>
            </table>
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Apply All Stock Updates &amp; Deletions</button>
        </form>
      </div>
    `);
    return;
  }

  if (e.target.id === 'btn-add-item-modal') {
    if (!isStaffOrHigher()) { showToast('Only Staff or Management can add new items', 'warn'); return; }
    openModal('Add Inventory Item', `
      <form id="form-add-item" class="space-y-3">
        <input name="name" required placeholder="Item name (spelling auto-standardized)" class="kms-input w-full text-sm" />
        <div class="grid grid-cols-2 gap-2">
          <select name="location" class="kms-input text-sm">${LOCATIONS.map(l => `<option>${esc(l)}</option>`).join('')}</select>
          <select name="unit" class="kms-input text-sm">${STOCK_UNITS.map(u => `<option value="${esc(u)}" ${u === 'cases' ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <input name="onHand" type="number" step="0.5" value="0" placeholder="On hand" class="kms-input text-sm" />
          <input name="par" type="number" step="0.5" value="1" placeholder="Par" class="kms-input text-sm" />
          <select name="cadence" class="kms-input text-sm"><option value="W">Weekly</option><option value="M">Monthly</option></select>
        </div>
        <button type="submit" class="kms-btn-primary w-full py-2 text-sm">Add Item</button>
      </form>
    `);
    return;
  }

  // PO Actions
  const poSelAll = e.target.closest('[data-po-sel-all]');
  if (poSelAll) {
    const cad = poSelAll.dataset.poSelAll;
    const chks = Array.from(document.querySelectorAll('.po-chk-' + cad));
    const allOn = chks.length && chks.every(c => c.checked);
    chks.forEach(c => { c.checked = !allOn; });
    return;
  }
  const poAddExtra = e.target.closest('[data-po-add-extra]');
  if (poAddExtra) {
    const cad = poAddExtra.dataset.poAddExtra;
    const sel = document.getElementById('po-add-sel-' + cad);
    const qInp = document.getElementById('po-add-qty-' + cad);
    if (sel && sel.value) {
      if (!state.manualPoExtra) state.manualPoExtra = {};
      if (!state.manualPoExtra[cad]) state.manualPoExtra[cad] = {};
      state.manualPoExtra[cad][sel.value] = Math.max(1, Math.ceil(parseFloat(qInp ? qInp.value : 1) || 1));
      render();
      showToast('Added item to PO suggestions');
    }
    return;
  }
  const poEditBtn = e.target.closest('[data-po-edit]');
  if (poEditBtn) {
    const po = (state.purchaseOrders || []).find(p => p.id === poEditBtn.dataset.poEdit);
    if (po) {
      if (!isStaffOrHigher()) {
        showToast('Staff or Management access required to edit PO requests', 'warn');
        return;
      }
      if (!isMgmtOrHigher() && po.status !== 'requested') {
        showToast('Only Management can edit approved or ordered POs', 'warn');
        return;
      }
      const isMgrModal = isMgmtOrHigher();
      const allItems = state.items.filter(i => !i.discontinued).map(i => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join('');
      openModal(`${isMgrModal ? 'Edit Purchase Order' : 'Edit Purchase Request'} — ${po.po_number}`, `
        <form id="form-edit-po" class="space-y-3 text-xs">
          <input type="hidden" name="poId" value="${esc(po.id)}" />
          ${isMgrModal ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label class="block font-semibold mb-1">PO #</label><input name="poNumber" type="text" required value="${esc(po.po_number)}" class="kms-input w-full text-xs font-mono" /></div>
            <div><label class="block font-semibold mb-1">Vendor Invoice / Conf #</label><input name="vendorConf" type="text" value="${esc(po.vendor_conf || '')}" placeholder="e.g. INV-4821" class="kms-input w-full text-xs font-mono" /></div>
            <div><label class="block font-semibold mb-1">Expected Delivery</label><input name="expectedArrival" type="date" value="${esc(po.expected_arrival || '')}" class="kms-input w-full text-xs" /></div>
          </div>` : ''}
          <p class="opacity-75">Update requested whole-case quantities below (set to 0 to remove an item).</p>
          <div class="max-h-60 overflow-y-auto divide-y divide-[var(--line)] border border-[var(--line)] rounded-lg">
            ${(po.lines || []).map((l, lIdx) => l.isFee ? '' : `
              <div class="p-2 flex items-center justify-between gap-2">
                <span class="font-semibold">${esc(l.name)}</span>
                <div class="flex items-center gap-1">
                  <input type="number" step="0.5" min="0" name="line_idx_${lIdx}" value="${Number(l.qty || 0)}" class="kms-input w-20 text-xs text-center font-bold" />
                  <span class="opacity-70">${esc(l.unit)}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center gap-1.5 pt-1">
            <select name="extraItemId" id="po-edit-extra-sel" class="kms-input flex-1 text-xs"><option value="">+ Add another item (optional)...</option><option value="__NEW__">+ Add NEW item (not in inventory yet)...</option>${allItems}</select>
            <input name="extraQty" type="number" step="1" min="1" placeholder="Cases" class="kms-input w-20 text-xs text-center" />
          </div>
          <div id="po-edit-new-wrap" class="hidden p-2.5 rounded-lg border border-[var(--line)] bg-black/5 space-y-2">
            <div class="font-semibold">New Item Details</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input name="newItemName" type="text" placeholder="Item name (e.g. Applesauce cups)" class="kms-input text-xs" />
              <select name="newItemUnit" class="kms-input text-xs">${STOCK_UNITS.map(u => `<option value="${esc(u)}" ${u === 'cases' ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <select name="newItemLoc" class="kms-input text-xs">${LOCATIONS.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('')}</select>
              <input name="newItemPar" type="number" step="0.01" min="0" value="1" placeholder="Par level" class="kms-input text-xs" title="Par level" />
            </div>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="addToCatalog" checked class="accent-[#b3122b]" /><span>Also add to Inventory Catalog (so receiving updates stock)</span></label>
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save PO Updates</button>
        </form>
      `);
    }
    return;
  }

  const decBtn = e.target.closest('[data-po-decide]');
  if (decBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can approve or reject POs', 'warn'); return; }
    const [id, st] = decBtn.dataset.poDecide.split(':');
    const po = state.purchaseOrders.find(p => p.id === id);
    if (po) {
      po.status = st;
      po.approved_by = getActiveUser().name;
      po.approved_date = localDateStr();
      logActivity('PO ' + st.toUpperCase(), po.po_number);
      saveState();
      render();
    }
    return;
  }
  const ordBtn = e.target.closest('[data-po-order]');
  if (ordBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can place or mark orders as ordered', 'warn'); return; }
    const po = state.purchaseOrders.find(p => p.id === ordBtn.dataset.poOrder);
    if (po) {
      po.status = 'ordered';
      po.vendor_conf = document.getElementById('conf-' + po.id)?.value || po.vendor_conf || '';
      const etaVal = document.getElementById('eta-' + po.id)?.value || '';
      if (etaVal) po.expected_arrival = etaVal;
      const makeRem = document.getElementById('rem-' + po.id)?.checked;
      if (makeRem && po.expected_arrival) upsertPoDeliveryReminder(po, po.expected_arrival);
      logActivity('PO ORDERED', po.po_number + (po.expected_arrival ? ' (ETA ' + po.expected_arrival + ')' : ''));
      saveState();
      render();
      showToast(makeRem && po.expected_arrival ? `Marked ${po.po_number} ordered & set delivery reminder` : `Marked ${po.po_number} ordered`);
    }
    return;
  }
  const recPoBtn = e.target.closest('[data-po-reconcile]');
  if (recPoBtn) {
    const po = state.purchaseOrders.find(p => p.id === recPoBtn.dataset.poReconcile);
    if (po) {
      if (po.status === 'requested') {
        showToast('This PO must be approved and placed by Management before it can be reconciled.', 'warn');
        return;
      }
      for (let idx = 0; idx < (po.lines || []).length; idx++) {
        const inp = document.getElementById(`rc-${po.id}-${idx}`);
        if (inp && (inp.value === '' || isNaN(parseFloat(inp.value)) || parseFloat(inp.value) < 0)) {
          showToast(`Enter the actual received quantity for ${po.lines[idx].name} (enter 0 if none received)`, 'warn');
          inp.focus();
          return;
        }
      }
      po.lines.forEach((ln, idx) => {
        const v = parseFloat(document.getElementById(`rc-${po.id}-${idx}`)?.value || 0);
        if (v <= 0) return;
        const x = state.items.find(i => i.id === ln.item_id);
        if (x) x.on_hand = Math.round((x.on_hand + v) * 100) / 100;
        ln.received = (ln.received || 0) + v;
        state.transactions.unshift({
          id: uid('tx'), tx_date: localDateStr(), tx_type: 'RECEIVE', item_id: ln.item_id, item_name: ln.name,
          unit: ln.unit, qty: v, source: po.vendor, cost: v * (ln.price || 0), po_number: po.po_number, staff_name: getActiveUser().name
        });
      });
      po.status = 'closed';
      logActivity('PO RECEIVED', po.po_number);
      saveState();
      render();
      showToast(`Reconciled ${po.po_number} into Living Stock`);
    }
    return;
  }
  const delPoBtn = e.target.closest('[data-po-del]');
  if (delPoBtn) {
    const poId = delPoBtn.dataset.poDel;
    const targetPo = (state.purchaseOrders || []).find(p => p.id === poId);
    if (targetPo && !isMgmtOrHigher() && targetPo.status !== 'requested') {
      showToast('Only Management can delete approved or ordered POs', 'warn');
      return;
    }
    askConfirm('Delete PO', 'Permanently delete this purchase order?', () => {
      state.purchaseOrders = state.purchaseOrders.filter(p => p.id !== poId);
      if (sbClient) sbClient.from('kms_purchase_orders').delete().eq('id', poId).then(() => {});
      logActivity('PO DELETED', `Deleted PO ${poId}`);
      saveState();
      render();
      showToast('Purchase order deleted');
    });
    return;
  }

  // Menu Sheet, Bulk Past/Future Menu Entry, Print Suite & Served
  if (e.target.id === 'btn-open-menu-print-suite') {
    showMenuPrintSuiteModal('weekly', localDateStr());
    return;
  }
  const printWeekBtn = e.target.closest('[data-print-week-of]');
  if (printWeekBtn) {
    showMenuPrintSuiteModal('weekly', printWeekBtn.dataset.printWeekOf);
    return;
  }
  const printPeriodBtn = e.target.closest('[data-menu-print-period]');
  if (printPeriodBtn) {
    const curRef = document.getElementById('menu-print-ref-date')?.value || state._menuPrintDate || localDateStr();
    showMenuPrintSuiteModal(printPeriodBtn.dataset.menuPrintPeriod, curRef);
    return;
  }
  if (e.target.id === 'btn-open-bulk-menu') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-edit menus', 'warn'); return; }
    showBulkMenuModal(addDays(localDateStr(), -30), addDays(localDateStr(), 45));
    return;
  }
  if (e.target.id === 'btn-bmenu-reload') {
    const s = document.getElementById('bmenu-start')?.value || addDays(localDateStr(), -30);
    const en = document.getElementById('bmenu-end')?.value || addDays(localDateStr(), 45);
    showBulkMenuModal(s, en);
    return;
  }
  const bmenuPresetBtn = e.target.closest('[data-bmenu-preset]');
  if (bmenuPresetBtn) {
    const today = localDateStr();
    if (bmenuPresetBtn.dataset.bmenuPreset === 'past60') showBulkMenuModal(addDays(today, -60), today);
    else showBulkMenuModal(today, addDays(today, 60));
    return;
  }
  const menuRangeBtn = e.target.closest('[data-menu-range]');
  if (menuRangeBtn) {
    state._menuViewRange = menuRangeBtn.dataset.menuRange;
    render();
    return;
  }
  const shBtn = e.target.closest('[data-open-sheet]');
  if (shBtn) { state.selectedSheetDate = shBtn.dataset.openSheet; render(); return; }
  if (e.target.id === 'btn-back-menu') { state.selectedSheetDate = null; render(); return; }
  const clrMenuBtn = e.target.closest('[data-clear-menu]');
  if (clrMenuBtn) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can clear menu dates', 'warn'); return; }
    const ds = clrMenuBtn.dataset.clearMenu;
    const mp = state.menuPlan.find(m => m.service_date === ds);
    if (mp) {
      mp.recipe_id = '';
      mp.custom_title = '';
      mp.status = 'PLANNED';
      mp.served_portions = null;
      logActivity('MENU CLEARED', `Cleared meal on ${ds}`);
      saveState();
      render();
      showToast(`Cleared menu for ${dLabel(ds)}`);
    }
    return;
  }
  const srvBtn = e.target.closest('[data-mark-served]');
  if (srvBtn) {
    if (!isStaffOrHigher()) { showToast('Only Staff or Management can mark meals served', 'warn'); return; }
    const ds = srvBtn.dataset.markServed;
    const mp = state.menuPlan.find(m => m.service_date === ds);
    const sv = parseFloat(document.getElementById('sv-qty-' + ds)?.value || 0);
    if (!mp || !mp.recipe_id || sv <= 0) { showToast('Choose a recipe and enter how many were served', 'warn'); return; }
    const rec = state.recipes.find(r => r.id === mp.recipe_id);
    if (rec) {
      (rec.ingredients || []).forEach(g => {
        const x = g.inv_id ? state.items.find(i => i.id === g.inv_id) : null;
        if (x && g.per100) {
          const used = (g.per100 * sv) / 100;
          recordUsage(x, Math.min(used, x.on_hand));
          x.on_hand = Math.round(Math.max(0, x.on_hand - used) * 100) / 100;
        }
      });
    }
    mp.served_portions = sv;
    mp.status = 'SERVED';
    mp.note = document.getElementById('sv-note-' + ds)?.value || '';
    mp.logged_by = getActiveUser().name;
    const left = (mp.planned_portions || 0) - sv;
    if (left > 0 && rec) {
      state.storageTags.unshift({
        id: uid('tag'), item_name: rec.name, tag_category: 'LEFTOVER', zone: 'Walk-in cooler',
        qty_label: left + ' portions', prep_date: ds, prep_time: '12:30', use_by_date: addDays(ds, 6),
        tagged_by: getActiveUser().name, status: 'STORED'
      });
    }
    logActivity('SERVED', `${ds}: ${sv} served (${rec ? rec.name : 'Meal'})`);
    saveState();
    render();
    showToast(`Logged ${sv} served & updated stock`);
    return;
  }

  // Recipe Selection, Bulk Edit/Delete & Delete
  if (e.target.id === 'btn-bulk-recipes') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-edit recipes', 'warn'); return; }
    openModal('Bulk Add, Update & Delete Recipes', `
      <div class="space-y-4 text-xs">
        <form id="form-bulk-paste-recipes" class="p-3 rounded-lg border border-[var(--line)] bg-black/5 space-y-2">
          <div class="font-bold text-sm">1. Bulk Paste New or Updated Recipes (Separate with <code>---</code>)</div>
          <p class="opacity-75">If a pasted recipe's title matches an existing recipe, it will <strong>update</strong> that recipe; otherwise it adds a new one.</p>
          <textarea name="bulkRaw" rows="5" required placeholder="Baked Ziti&#10;Servings: 65&#10;8 lbs Penne pasta&#10;24 cups Spaghetti sauce&#10;Directions:&#10;1. Boil pasta and drain.&#10;2. Mix with sauce and bake at 350°F.&#10;---&#10;Chicken Noodle Soup&#10;Servings: 65&#10;3 cases Chicken soup&#10;Directions:&#10;1. Heat to >=165°F." class="kms-input w-full text-xs font-mono"></textarea>
          <button type="submit" class="kms-btn-ok w-full py-2 text-xs font-semibold">Import / Update Pasted Recipes</button>
        </form>

        <form id="form-bulk-edit-recipes" class="space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="font-bold text-sm">2. Bulk Edit or Delete Saved Recipes (${state.recipes.length})</div>
            <button type="submit" class="kms-btn-primary px-3.5 py-1.5 text-xs font-semibold">Save All &amp; Delete Checked</button>
          </div>
          <div class="max-h-80 overflow-y-auto space-y-2.5 pr-1">
            ${state.recipes.map(r => {
              const rn = normalizeRecipe(r);
              const ingTxt = (rn.ingredients || []).map(g => `${g.unit === 'to taste' ? '' : formatKitchenFraction(g.qty) + ' ' + g.unit + ' '}${g.name}`.trim()).join('\n');
              const stepTxt = (rn.steps || []).join('\n');
              return `
                <div class="p-3 rounded-lg border border-[var(--line)] space-y-2">
                  <div class="flex items-center justify-between gap-2 pb-1 border-b border-[var(--line)]/60">
                    <label class="inline-flex items-center gap-1.5 text-red-600 font-bold cursor-pointer">
                      <input type="checkbox" name="delrec_${esc(rn.id)}" class="accent-red-600" />
                      <span>Delete this recipe</span>
                    </label>
                    <span class="font-mono opacity-60">${esc(rn.id)}</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-1.5">
                    <input name="name_${esc(rn.id)}" type="text" required value="${esc(rn.name)}" class="kms-input sm:col-span-2 text-xs font-bold" placeholder="Recipe title" />
                    <input name="cat_${esc(rn.id)}" type="text" value="${esc(rn.category)}" class="kms-input text-xs" placeholder="Category" />
                    <input name="base_${esc(rn.id)}" type="number" min="1" value="${rn.base_servings}" class="kms-input text-xs text-center font-bold" title="Base servings" />
                  </div>
                  <div class="grid grid-cols-3 gap-1.5">
                    <input name="prep_${esc(rn.id)}" type="number" min="0" value="${rn.prep_min}" class="kms-input text-xs text-center" title="Prep minutes" />
                    <input name="cook_${esc(rn.id)}" type="number" min="0" value="${rn.cook_min}" class="kms-input text-xs text-center" title="Cook minutes" />
                    <input name="allg_${esc(rn.id)}" type="text" value="${esc((rn.allergens || []).join(', '))}" placeholder="Allergens (milk, wheat...)" class="kms-input text-xs" />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div>
                      <label class="block text-[10px] font-bold uppercase opacity-65 mb-0.5">Ingredients (1 per line)</label>
                      <textarea name="ing_${esc(rn.id)}" rows="3" class="kms-input w-full text-xs leading-snug">${esc(ingTxt)}</textarea>
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold uppercase opacity-65 mb-0.5">Directions (1 step per line)</label>
                      <textarea name="step_${esc(rn.id)}" rows="3" class="kms-input w-full text-xs leading-snug">${esc(stepTxt)}</textarea>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save All Recipe Changes</button>
        </form>
      </div>
    `);
    return;
  }
  const recPresetBtn = e.target.closest('[data-rec-preset]');
  if (recPresetBtn) {
    state.recipeScale = Number(recPresetBtn.dataset.recPreset) || 65;
    render();
    return;
  }
  if (e.target.id === 'btn-toggle-rec-matrix') {
    state._showRecMatrix = !state._showRecMatrix;
    render();
    return;
  }
  if (e.target.closest('#btn-print-recipe-sheet')) {
    const rec = state.recipes.find(r => r.id === state.selectedRecipeId) || state.recipes[0];
    if (!rec) return;
    const scale = Number(state.recipeScale || rec.base_servings || 65);
    const factor = scale / (rec.base_servings || 65);
    let qrSvg = '';
    try {
      if (window.qrcode) {
        const qr = window.qrcode(0, 'M');
        qr.addData(rec.id);
        qr.make();
        qrSvg = qr.createSvgTag({ cellSize: 3, margin: 1 });
      }
    } catch (err) {}
    document.body.classList.add('printing-modal');
    const rNorm = typeof normalizeRecipe === 'function' ? normalizeRecipe(rec) : rec;
    const cols = Array.from(new Set([40, 50, scale, 70, 80])).sort((a, b) => a - b);

    openModal(`Printable Standardized Recipe Card — ${rNorm.name}`, `
      <div class="space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-black/5 border border-[var(--line)] no-print">
          <div class="opacity-80">Formatted as a <strong>1-Page Letter Standardized Recipe Card</strong> with scannable QR code &amp; 40–80 scaling matrix.</div>
          <button type="button" id="btn-print-rec-modal-now" class="kms-btn-navy px-4 py-1.5 text-xs font-semibold">Print Recipe Sheet (Letter)</button>
        </div>

        <div class="sa-print-shell rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
          <!-- SA Navy/Red Header -->
          <div class="sa-print-banner bg-[#1b365d] text-white px-4 py-2.5 flex items-center justify-between gap-3 border-b-4 border-[#b3122b] print-keep">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
              <div class="min-w-0">
                <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Standardized Recipe Card</div>
                <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">${esc(rNorm.name)}</h2>
                <div class="text-[11px] text-white/90 mt-0.5">
                  Category: <strong>${esc(rNorm.category || 'Main')}</strong> &bull;
                  Prep: <strong>${rNorm.prep_min || 20}m</strong> &bull;
                  Cook: <strong>${rNorm.cook_min || 35}m</strong> &bull;
                  Active Target: <strong>${scale} Portions</strong>
                </div>
              </div>
            </div>
            ${qrSvg ? `
              <div class="bg-white text-slate-900 p-1.5 rounded-lg text-center shrink-0 shadow">
                <div class="w-14 h-14 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">${qrSvg}</div>
                <div class="text-[9px] font-mono font-bold mt-0.5">${esc(rNorm.id)}</div>
              </div>
            ` : ''}
          </div>

          <div class="p-4 bg-white text-slate-900 space-y-3">
            <!-- Allergen & Notes Strip -->
            ${((rNorm.allergens || []).length || rNorm.notes || rNorm.photo_url) ? `
              <div class="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 print-keep">
                <div class="space-y-1 flex-1 min-w-[200px]">
                  ${(rNorm.allergens || []).length
                    ? `<div class="text-xs font-extrabold text-[#b3122b]">&#9888; FDA BIG 9 ALLERGENS: ${esc(rNorm.allergens.join(', ').toUpperCase())}</div>`
                    : `<div class="text-xs font-bold text-emerald-700">&#10003; No Major FDA Big 9 Allergens Listed</div>`}
                  ${rNorm.notes ? `<div class="text-xs text-slate-700"><strong>Chef / Service Notes:</strong> ${esc(rNorm.notes)}</div>` : ''}
                </div>
                ${rNorm.photo_url ? `<img src="${esc(rNorm.photo_url)}" alt="${esc(rNorm.name)}" class="w-16 h-16 rounded-lg object-cover border border-slate-300 shrink-0" />` : ''}
              </div>
            ` : ''}

            <!-- Scaled Ingredients Table -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="font-extrabold uppercase tracking-wider text-[11px] text-[#1b365d]">Scaled Ingredients Matrix (Active: ${scale} Portions Highlighted)</span>
                <span class="text-[10px] font-semibold text-slate-500">Base Yield: ${rNorm.base_servings || 65} servings</span>
              </div>
              <table class="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr class="bg-[#1b365d] text-white uppercase text-[10px]">
                    <th class="border border-black py-1.5 px-2">Ingredient</th>
                    ${cols.map(p => `<th class="border border-black py-1.5 px-2 text-center ${p === scale ? 'bg-[#b3122b] font-black' : ''}">${p} Port.${p === scale ? ' ★' : ''}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${(rNorm.ingredients || []).map((g, idx) => `
                    <tr class="${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}">
                      <td class="border border-slate-300 py-1.5 px-2 font-bold">&#9744; ${esc(g.name)}</td>
                      ${cols.map(p => {
                        const f = p / (rNorm.base_servings || 65);
                        const isTarget = p === scale;
                        return `<td class="border border-slate-300 py-1.5 px-2 text-center ${isTarget ? 'bg-red-50 font-black text-[#b3122b]' : 'font-semibold'}">${esc(formatKitchenAmt((g.qty || 0) * f, g.unit))}</td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Preparation & HACCP Directions -->
            ${(rNorm.steps || []).length ? `
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-1.5 print-keep">
                <div class="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span class="font-extrabold uppercase tracking-wider text-[11px] text-[#1b365d]">Preparation &amp; Service Directions</span>
                  <span class="text-[10px] font-bold text-[#b3122b]">Cook &ge;165&deg;F &bull; Hot Hold &ge;135&deg;F &bull; Cold &le;41&deg;F</span>
                </div>
                <ol class="list-decimal list-inside space-y-1 text-xs leading-relaxed text-black">
                  ${rNorm.steps.map(s => `<li>${esc(s)}</li>`).join('')}
                </ol>
              </div>
            ` : ''}

            <!-- Kitchen Execution Sign-Off -->
            <div class="grid grid-cols-3 gap-3 pt-1 text-[11px] font-semibold text-slate-700 print-keep">
              <div class="border-b border-black pb-0.5">Prepared By:</div>
              <div class="border-b border-black pb-0.5">Final Cook Temp (&ge;165&deg;F):</div>
              <div class="border-b border-black pb-0.5">Date / Portions Made:</div>
            </div>
          </div>
        </div>
      </div>
    `);
    return;
  }
  if (e.target.closest('#btn-print-rec-modal-now')) {
    window.print();
    return;
  }
  if (e.target.id === 'btn-scan-recipe-qr') {
    const wrap = document.getElementById('rec-qr-wrap');
    if (!window.Html5Qrcode) { showToast('Camera scanner unavailable — type recipe name or ID in search box', 'warn'); return; }
    if (wrap) wrap.classList.remove('hidden');
    try {
      window._recQrInst = new window.Html5Qrcode('rec-qr-reader');
      window._recQrInst.start({ facingMode: 'environment' }, { fps: 10, qrbox: 200 }, (txt) => {
        const clean = String(txt || '').trim().toLowerCase();
        const match = state.recipes.find(r => r.id.toLowerCase() === clean || r.name.toLowerCase().includes(clean));
        if (window._recQrInst) { window._recQrInst.stop().catch(() => {}); window._recQrInst = null; }
        if (wrap) wrap.classList.add('hidden');
        if (match) { state.selectedRecipeId = match.id; state._recSearch = ''; render(); showToast('Loaded recipe: ' + match.name); }
        else showToast('No recipe matched QR: ' + txt, 'warn');
      }, () => {}).catch(() => { if (wrap) wrap.classList.add('hidden'); showToast('Camera unavailable in this window — use Search box', 'warn'); });
    } catch (err) { if (wrap) wrap.classList.add('hidden'); }
    return;
  }
  if (e.target.id === 'btn-stop-recipe-qr') {
    const wrap = document.getElementById('rec-qr-wrap');
    if (window._recQrInst) { window._recQrInst.stop().catch(() => {}); window._recQrInst = null; }
    if (wrap) wrap.classList.add('hidden');
    return;
  }
  if (e.target.id === 'btn-clear-web-search') {
    state._webRecQuery = '';
    state._webRecResults = [];
    render();
    return;
  }
  const selRec = e.target.closest('[data-sel-rec]');
  if (selRec) {
    state.selectedRecipeId = selRec.dataset.selRec;
    state._recSearch = '';
    state._webRecQuery = '';
    state._webRecResults = [];
    render();
    return;
  }
  const importMealBtn = e.target.closest('[data-import-mealdb]');
  if (importMealBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can import recipes', 'warn'); return; }
    const meal = (state._webRecResults || []).find(m => String(m.uid) === String(importMealBtn.dataset.importMealdb));
    if (meal) {
      if (meal.type === 'url' && meal.url) {
        importRecipeFromUrl(meal.url, importMealBtn);
        return;
      }
      const baseServ = meal.base_servings || 4;
      const rawLines = meal.rawLines || [];
      const steps = meal.steps || [];
      const allText = (meal.title || '') + ' ' + rawLines.join(' ');
      const allergenKeywords = {
        milk: /milk|cheese|butter|cream|yogurt|dairy/i,
        eggs: /egg/i,
        wheat: /flour|pasta|spaghetti|penne|noodles|macaroni|bread|biscuit|cracker|wheat/i,
        soy: /\bsoy\b|tofu/i,
        peanuts: /peanut/i,
        'tree nuts': /almond|walnut|pecan|cashew/i,
        fish: /tuna|salmon|fish|cod/i,
        shellfish: /shrimp|crab|lobster/i,
        sesame: /sesame|tahini/i
      };
      const allergens = Object.keys(allergenKeywords).filter(a => allergenKeywords[a].test(allText));
      const r = {
        id: uid('rec'),
        name: meal.title || 'Imported Recipe',
        category: meal.category || 'Main Entree',
        base_servings: baseServ,
        prep_min: meal.prep_min || 20,
        cook_min: meal.cook_min || 35,
        allergens,
        photo_url: meal.photo_url || '',
        steps,
        ingredients: rawLines.map(ln => parseIngredientLine(ln, baseServ))
      };
      state.recipes.unshift(r);
      state.selectedRecipeId = r.id;
      state._recSearch = '';
      state._webRecQuery = '';
      state._webRecResults = [];
      state.recipeScale = Math.min(80, Math.max(40, predictedPortions(localDateStr())));
      logActivity('RECIPE IMPORTED', `${r.name} (web search)`);
      saveState();
      render();
      showToast(`Imported "${r.name}" (scaled to ${state.recipeScale} portions)`);
    }
    return;
  }

  const editRecBtn = e.target.closest('[data-edit-rec]');
  if (editRecBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can edit recipes', 'warn'); return; }
    const r = state.recipes.find(x => x.id === editRecBtn.dataset.editRec);
    if (r) {
      const stepsTxt = (r.steps && r.steps.length) ? r.steps.join('\n') : String(r.directions || '');
      openModal(`Edit Recipe — ${r.name}`, `
        <form id="form-edit-recipe" class="space-y-3 text-xs">
          <input type="hidden" name="recId" value="${esc(r.id)}" />
          <div><label class="block font-semibold mb-1">Recipe Title</label><input name="name" type="text" required value="${esc(r.name)}" class="kms-input w-full text-sm" /></div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><label class="block font-semibold mb-1">Category</label><input name="category" type="text" value="${esc(r.category || 'Main Entree')}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Base Servings</label><input name="baseServings" type="number" min="1" value="${r.base_servings || 65}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Prep (min)</label><input name="prepMin" type="number" min="0" value="${r.prep_min || 20}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Cook (min)</label><input name="cookMin" type="number" min="0" value="${r.cook_min || 35}" class="kms-input w-full text-xs" /></div>
          </div>
          <div><label class="block font-semibold mb-1">Allergens (comma-separated)</label><input name="allergens" type="text" value="${esc((r.allergens || []).join(', '))}" placeholder="milk, wheat, soy..." class="kms-input w-full text-xs" /></div>
          <div class="p-2.5 rounded-lg border border-[var(--line)] bg-black/5 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <label class="font-semibold">Recipe Photo (Upload or URL)</label>
              ${r.photo_url ? `<button type="button" id="btn-clear-rec-photo" class="text-[11px] text-red-600 underline font-semibold">Remove Photo</button>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <img id="rec-photo-preview" src="${esc(r.photo_url || '')}" alt="Preview" class="${r.photo_url ? '' : 'hidden '}w-14 h-14 rounded-lg object-cover border border-[var(--line)] shrink-0" />
              <div class="flex-1 space-y-1.5">
                <input id="rec-photo-file" type="file" accept="image/*" class="kms-input w-full text-[11px]" />
                <input id="rec-photo-url-inp" name="photoUrl" type="text" value="${esc(r.photo_url || '')}" placeholder="Or paste image URL (https://...)" class="kms-input w-full text-xs" />
              </div>
            </div>
          </div>
          <div><label class="block font-semibold mb-1">Prep / Serving Notes (optional)</label><textarea name="notes" rows="2" placeholder="e.g. Hold >=135°F on steam table; serve with salad bar..." class="kms-input w-full text-xs">${esc(r.notes || '')}</textarea></div>
          <div>
            <label class="block font-semibold mb-1">Directions / Steps (one step per line)</label>
            <textarea name="stepsText" rows="7" placeholder="1. Preheat oven to 350°F..." class="kms-input w-full text-xs leading-relaxed">${esc(stepsTxt)}</textarea>
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save Recipe &amp; Directions</button>
        </form>
      `);
    }
    return;
  }

  if (e.target.id === 'btn-clear-rec-photo') {
    const urlInp = document.getElementById('rec-photo-url-inp');
    const prev = document.getElementById('rec-photo-preview');
    if (urlInp) urlInp.value = '';
    if (prev) { prev.src = ''; prev.classList.add('hidden'); }
    return;
  }

  const delRecIng = e.target.closest('[data-del-rec-ing]');
  if (delRecIng) {
    if (!isMgmtOrHigher()) { showToast('Only Management can edit recipes', 'warn'); return; }
    const [rid, idxStr] = delRecIng.dataset.delRecIng.split(':');
    const r = state.recipes.find(x => x.id === rid);
    const idx = parseInt(idxStr, 10);
    if (r && Array.isArray(r.ingredients) && r.ingredients[idx]) {
      const removed = r.ingredients.splice(idx, 1)[0];
      saveState();
      render();
      showToast(`Removed ${removed.name}`);
    }
    return;
  }

  if (e.target.id === 'btn-sug-fetch-url') {
    const urlInp = document.getElementById('sug-url-inp');
    const targetUrl = String(urlInp ? urlInp.value : '').trim();
    if (!targetUrl) { showToast('Paste a recipe URL first', 'warn'); return; }
    const btn = e.target;
    btn.disabled = true; btn.textContent = 'Fetching...';
    invokeScrapeRecipe({ url: targetUrl }).then(data => {
      if (!data || !data.ok || !data.recipe) throw new Error((data && data.error) || 'Could not fetch recipe from URL');
      const rec = data.recipe;
      const tInp = document.getElementById('sug-title-inp');
      const sInp = document.getElementById('sug-serv-inp');
      const rInp = document.getElementById('sug-raw-inp');
      const pInp = document.getElementById('sug-photo-inp');
      if (tInp) tInp.value = rec.name || '';
      if (sInp) sInp.value = rec.base_servings || 8;
      if (pInp) pInp.value = rec.image || '';
      if (rInp) {
        const lines = ['Ingredients:', ...(rec.ingredients || [])];
        if (rec.steps && rec.steps.length) lines.push('', 'Directions:', ...rec.steps.map((st, idx) => `${idx + 1}. ${st}`));
        rInp.value = lines.join('\n');
      }
      showToast(`Fetched "${rec.name}" — review & submit for approval!`);
    }).catch(err => {
      showToast(String(err.message || err), 'warn');
    }).finally(() => {
      btn.disabled = false; btn.textContent = 'Fetch URL';
    });
    return;
  }

  const delRec = e.target.closest('[data-del-rec]');
  if (delRec) {
    if (!isMgmtOrHigher()) { showToast('Only Management can delete recipes', 'warn'); return; }
    const recId = delRec.dataset.delRec;
    const targetRec = (state.recipes || []).find(r => r.id === recId);
    askConfirm('Delete Recipe', `Permanently delete "${targetRec ? targetRec.name : 'this recipe'}"?`, () => {
      state.recipes = (state.recipes || []).filter(r => r.id !== recId);
      state.selectedRecipeId = state.recipes[0]?.id || '';
      if (sbClient) sbClient.from('kms_recipes').delete().eq('id', recId).then(() => {});
      if (targetRec) logActivity('RECIPE DELETED', `Deleted "${targetRec.name}"`);
      saveState();
      render();
      showToast('Recipe deleted');
    });
    return;
  }

  // Storage Presets & Actions
  const tpBtn = e.target.closest('[data-tag-preset]');
  if (tpBtn) {
    const p = SHELF_PRESETS[Number(tpBtn.dataset.tagPreset)];
    const f = document.getElementById('form-add-tag');
    if (f && p) {
      f.querySelector('[name="itemName"]').value = p.label.split(' (')[0];
      f.querySelector('[name="tagCategory"]').value = p.cat;
      f.querySelector('[name="days"]').value = String(p.days);
      f.querySelector('[name="zone"]').value = p.zone;
    }
    return;
  }
  const taBtn = e.target.closest('[data-tag-act]');
  if (taBtn) {
    const [id, act] = taBtn.dataset.tagAct.split(':');
    const t = state.storageTags.find(x => x.id === id);
    if (t) {
      t.status = act;
      t.closed_by = getActiveUser().name;
      t.closed_at = nowStamp();
      logActivity('DATE TAG ' + act, t.item_name);
      saveState();
      render();
    }
    return;
  }
  const delTagBtn = e.target.closest('[data-del-tag]');
  if (delTagBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can delete date labels', 'warn'); return; }
    const id = delTagBtn.dataset.delTag;
    const t = state.storageTags.find(x => x.id === id);
    if (t) {
      state.storageTags = state.storageTags.filter(x => x.id !== id);
      if (sbClient) sbClient.from('kms_storage_tags').delete().eq('id', id).then(() => {});
      logActivity('DATE TAG DELETED', t.item_name);
      saveState();
      render();
      showToast(`Deleted date label for ${t.item_name}`);
    }
    return;
  }

  // Checklists Edit/Delete, Forecast Horizon, Blind Count, Exports, Training, Users
  const editChkBtn = e.target.closest('[data-edit-chk]');
  if (editChkBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can edit checklist tasks', 'warn'); return; }
    const c = state.checklists.find(x => x.id === editChkBtn.dataset.editChk);
    if (c) {
      openModal('Edit Checklist Task', `
        <form id="form-edit-checklist" class="space-y-3 text-xs">
          <input type="hidden" name="chkId" value="${esc(c.id)}" />
          <div><label class="block font-semibold mb-1">Task Description</label><input name="title" type="text" required value="${esc(c.title)}" class="kms-input w-full text-sm" /></div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="block font-semibold mb-1">Frequency</label><select name="freq" class="kms-input w-full text-xs"><option value="daily" ${c.freq === 'daily' ? 'selected' : ''}>Daily</option><option value="weekly" ${c.freq === 'weekly' ? 'selected' : ''}>Weekly</option><option value="monthly" ${c.freq === 'monthly' ? 'selected' : ''}>Monthly</option></select></div>
            <div><label class="block font-semibold mb-1">Category</label><input name="category" type="text" value="${esc(c.category || 'Food Safety / Cleaning')}" class="kms-input w-full text-xs" /></div>
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save Checklist Task</button>
        </form>
      `);
    }
    return;
  }
  const delChkBtn = e.target.closest('[data-del-chk]');
  if (delChkBtn) {
    if (!isMgmtOrHigher()) { showToast('Only Management can delete checklist tasks', 'warn'); return; }
    const cid = delChkBtn.dataset.delChk;
    const c = state.checklists.find(x => x.id === cid);
    if (c) {
      askConfirm('Delete Checklist Task', `Remove "${c.title}" from the ${c.freq} checklist?`, () => {
        state.checklists = state.checklists.filter(x => x.id !== cid);
        if (sbClient) sbClient.from('kms_checklists').delete().eq('id', cid).then(() => {});
        logActivity('CHECKLIST DELETED', c.title);
        saveState();
        render();
        showToast('Checklist task removed');
      });
    }
    return;
  }
  const cfBtn = e.target.closest('[data-chk-freq]');
  if (cfBtn) { state.checklistFreq = cfBtn.dataset.chkFreq; render(); return; }
  const hzBtn = e.target.closest('[data-hz]');
  if (hzBtn) { state.horizon = hzBtn.dataset.hz; render(); return; }

  // Section Blind Physical Count Controls
  const blindZoneBtn = e.target.closest('[data-blind-zone]');
  if (blindZoneBtn) {
    if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} };
    state.blindDraft.zone = blindZoneBtn.dataset.blindZone;
    saveState();
    render();
    return;
  }
  const blindModeBtn = e.target.closest('[data-blind-mode]');
  if (blindModeBtn) {
    if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} };
    state.blindDraft.mode = blindModeBtn.dataset.blindMode;
    saveState();
    render();
    return;
  }
  const blindStepBtn = e.target.closest('[data-blind-step]');
  if (blindStepBtn) {
    const [id, d] = blindStepBtn.dataset.blindStep.split(':');
    const delta = Number(d);
    if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} };
    const curRaw = state.blindDraft.counts[id];
    const curVal = curRaw === undefined || curRaw === '' ? 0 : (parseFloat(curRaw) || 0);
    const nextVal = Math.max(0, Math.round((curVal + delta) * 100) / 100);
    state.blindDraft.counts[id] = String(nextVal);
    saveState();
    render();
    return;
  }
  if (e.target.id === 'btn-clear-blind-draft') {
    askConfirm('Clear Blind Count Draft', 'Clear all unsubmitted physical count entries?', () => {
      state.blindDraft = { zone: (state.blindDraft && state.blindDraft.zone) || LOCATIONS[0], mode: (state.blindDraft && state.blindDraft.mode) || 'blank30', search: '', revealed: false, counts: {}, blankRowsByZone: {} };
      saveState();
      render();
      showToast('Blind count draft cleared');
    });
    return;
  }
  if (e.target.id === 'btn-print-blind-sheet' || e.target.id === 'btn-print-blind-all') {
    const isAll = e.target.id === 'btn-print-blind-all';
    const zone = (state.blindDraft && state.blindDraft.zone) || LOCATIONS[0];
    const zonesToPrint = (isAll || zone === 'ALL') ? LOCATIONS : [zone];
    const blankLines = Array.from({ length: 25 }, (_, idx) => idx + 1);
    document.body.classList.add('printing-modal');
    openModal(`Printable Blank 25-Line Blind Count Sheet — ${zonesToPrint.length > 1 ? 'All 6 Sections (1 Page per Zone)' : zone}`, `
      <div class="text-xs text-slate-900">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2 mb-3 no-print">
          <div class="opacity-85">Formatted to fit <strong>exactly 1 US Letter page per section</strong> (${zonesToPrint.length} page${zonesToPrint.length > 1 ? 's' : ''} total, 25 large write-in lines each).</div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.print()" class="kms-btn-primary px-4 py-2 text-xs font-extrabold shadow-md">Print Blank 25-Line Sheet (Letter)</button>
            <button type="button" onclick="document.getElementById('modal-close').click()" class="kms-btn-alt px-3 py-2 text-xs">Close</button>
          </div>
        </div>
        ${zonesToPrint.map((z, zIdx) => `
          <div class="sa-print-shell w-full bg-white text-slate-900 border-2 border-[#1b365d] rounded-md overflow-hidden" style="${zIdx > 0 ? 'page-break-before: always; break-before: page;' : ''}">
            <div style="background-color:#0a1628;color:#ffffff;border-bottom:3px solid #b3122b;" class="sa-sheet-banner px-3 py-1.5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <div style="background-color:#b3122b;color:#ffffff;" class="w-7 h-7 rounded flex items-center justify-center font-black text-xs shrink-0">SA</div>
                <div>
                  <div style="color:#fde68a;" class="sa-sub text-[9.5px] font-extrabold uppercase tracking-wider">The Salvation Army &bull; Butler, PA &bull; Community Meals KMS</div>
                  <div style="color:#ffffff;" class="text-sm font-black tracking-tight">BLIND PHYSICAL INVENTORY SHEET — <span style="text-decoration:underline;">${esc(z.toUpperCase())}</span></div>
                </div>
              </div>
              <div style="color:#ffffff;" class="text-right text-[10px] font-bold">
                <div>Page ${zIdx + 1} of ${zonesToPrint.length} &bull; 25 Lines</div>
                <div style="color:#e2e8f0;" class="font-normal">313 W. Cunningham St.</div>
              </div>
            </div>
            <div class="px-2 py-1.5 bg-white text-slate-900">
              <div class="grid grid-cols-3 gap-3 text-[11px] font-extrabold text-black mb-1">
                <div class="border-b border-black pb-0.5">Date: _______________________</div>
                <div class="border-b border-black pb-0.5">Counted By: _________________</div>
                <div class="border-b border-black pb-0.5">Verified By: _________________</div>
              </div>
              <table class="w-full text-[11.5px] border-collapse" style="border:1.5px solid #1e293b;">
                <thead>
                  <tr style="background-color:#0a1628;color:#ffffff;">
                    <th style="width:30px;border:1px solid #1e293b;padding:3px 4px;text-align:center;color:#ffffff;">#</th>
                    <th style="border:1px solid #1e293b;padding:3px 6px;text-align:left;color:#ffffff;">ITEM NAME / DESCRIPTION</th>
                    <th style="width:74px;border:1px solid #1e293b;padding:3px 4px;text-align:center;color:#ffffff;">UNIT</th>
                    <th style="width:84px;border:1px solid #1e293b;padding:3px 4px;text-align:center;color:#ffffff;">COUNTED QTY</th>
                    <th style="width:125px;border:1px solid #1e293b;padding:3px 6px;text-align:left;color:#ffffff;">NOTES / EXP.</th>
                  </tr>
                </thead>
                <tbody>
                  ${blankLines.map(n => `
                    <tr style="height:21px;background-color:${n % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                      <td style="height:30.5px;border:1.5px solid #000000;padding:1px 4px;text-align:center;font-weight:700;color:#0f172a;">${n}</td>
                      <td style="height:30.5px;border:1.5px solid #000000;padding:1px 6px;"></td>
                      <td style="height:30.5px;border:1.5px solid #000000;padding:1px 4px;"></td>
                      <td style="height:30.5px;border:1.5px solid #000000;padding:1px 4px;"></td>
                      <td style="height:30.5px;border:1.5px solid #000000;padding:1px 6px;"></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="flex justify-between items-center text-[9px] font-bold text-black mt-1 pt-0.5 border-t border-black">
                <span>Instructions: Write item name, unit (cs, lb, gal, ea), and physical count. Enter totals into Records &rarr; Blind Audit.</span>
                <span>Form KMS-INV-25</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `);
    return;
  }

  if (e.target.id === 'btn-print-exec-report') { window.print(); return; }
  if (e.target.id === 'btn-copy-funding-brief' || e.target.id === 'btn-copy-funding-brief-2') {
    const ta = document.getElementById('exec-funding-brief');
    if (ta && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).catch(() => {});
    }
    showToast('Copied Funding & Operations Brief to clipboard');
    return;
  }
  if (e.target.id === 'btn-export-exec-csv') {
    const activeItems = state.items.filter(x => !x.discontinued && itemNeed(x) > 0);
    const canPrice = isMgmtOrHigher(getActiveUser());
    const rows = [canPrice ? ['Item', 'Vendor', 'On Hand', 'Par', 'Unit', 'Whole Cases Needed', 'Est. PO Unit Price'] : ['Item', 'Vendor', 'On Hand', 'Par', 'Unit', 'Whole Cases Needed']];
    activeItems.forEach(x => rows.push(canPrice ? [x.name, x.vendor || '', x.on_hand, x.par, x.unit, Math.max(1, Math.ceil(itemNeed(x))), getEffectiveUnitPrice(x).price] : [x.name, x.vendor || '', x.on_hand, x.par, x.unit, Math.max(1, Math.ceil(itemNeed(x)))]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `executive_restock_needs-${localDateStr()}.csv`;
    a.click();
    return;
  }
  if (e.target.id === 'btn-suggest-menu') {
    openModal('Suggest Recipe / Menu Change', `
      <form id="form-suggest-recipe" class="space-y-3 text-xs">
        <p class="opacity-75">Submit a new recipe or menu change suggestion for ADMIN / MANAGER approval.</p>
        <input name="title" type="text" required placeholder="Suggested dish or recipe name" class="kms-input w-full text-xs" />
        <div class="grid grid-cols-2 gap-2">
          <div><label class="block font-semibold mb-1">Servings</label><input name="servings" type="number" min="40" max="80" value="65" class="kms-input w-full text-xs" /></div>
          <div><label class="block font-semibold mb-1">Suggested Date</label><input name="targetDate" type="date" value="${localDateStr()}" class="kms-input w-full text-xs" /></div>
        </div>
        <textarea name="raw" rows="4" required placeholder="Ingredients, quantities &amp; notes..." class="kms-input w-full text-xs"></textarea>
        <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Submit Suggestion for Approval</button>
      </form>
    `);
    return;
  }
  const appSug = e.target.closest('[data-approve-recsug]');
  if (appSug) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can approve recipe suggestions', 'warn'); return; }
    const s = (state.recipeSuggestions || []).find(x => x.id === appSug.dataset.approveRecsug);
    if (s) {
      const parsed = s.parsed_recipe
        ? normalizeRecipe({ ...s.parsed_recipe, id: uid('rec'), name: s.title, base_servings: Number(s.servings) || s.parsed_recipe.base_servings || 65 })
        : parsePastedRecipe(s.title + '\nServings: ' + (s.servings || 65) + '\n' + s.raw);
      parsed.name = s.title;
      parsed.base_servings = Number(s.servings) || parsed.base_servings || 65;
      state.recipes.unshift(parsed);
      state.selectedRecipeId = parsed.id;
      state._recSearch = '';
      if (s.target_date) {
        const ex = state.menuPlan.find(m => m.service_date === s.target_date);
        if (ex) { ex.recipe_id = parsed.id; ex.custom_title = parsed.name; }
        else state.menuPlan.push({ id: uid('mp'), service_date: s.target_date, recipe_id: parsed.id, custom_title: parsed.name, planned_portions: forecastWeekday(s.target_date, parsed.id), status: 'PLANNED' });
      }
      s.status = 'APPROVED';
      logActivity('RECIPE APPROVED', `Approved "${parsed.name}" (suggested by ${s.suggested_by})`);
      saveState();
      render();
      showToast(`Approved & added "${parsed.name}" to Recipe Book!`);
    }
    return;
  }
  const revSug = e.target.closest('[data-review-recsug]');
  if (revSug) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can review recipe suggestions', 'warn'); return; }
    const s = (state.recipeSuggestions || []).find(x => x.id === revSug.dataset.reviewRecsug);
    if (s) {
      const pr = s.parsed_recipe
        ? normalizeRecipe(s.parsed_recipe)
        : parsePastedRecipe(s.title + '\nServings: ' + (s.servings || 65) + '\n' + s.raw);
      const ingLines = (pr.ingredients || []).map(g => `${g.unit === 'to taste' ? '' : formatKitchenFraction(g.qty) + ' ' + g.unit + ' '}${g.name}`.trim()).join('\n');
      const stepLines = (pr.steps || []).join('\n');
      openModal(`Review & Edit Suggestion — ${s.title}`, `
        <form id="form-review-recsug" class="space-y-3 text-xs">
          <input type="hidden" name="sugId" value="${esc(s.id)}" />
          <div><label class="block font-semibold mb-1">Recipe Title</label><input name="title" type="text" required value="${esc(s.title)}" class="kms-input w-full text-sm" /></div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><label class="block font-semibold mb-1">Category</label><input name="category" type="text" value="${esc(pr.category || 'Main Entree')}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Base Servings</label><input name="servings" type="number" min="1" value="${Number(s.servings) || pr.base_servings || 65}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Prep (min)</label><input name="prepMin" type="number" min="0" value="${pr.prep_min || 20}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Cook (min)</label><input name="cookMin" type="number" min="0" value="${pr.cook_min || 35}" class="kms-input w-full text-xs" /></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label class="block font-semibold mb-1">Target Menu Date (Optional)</label><input name="targetDate" type="date" value="${esc(s.target_date || '')}" class="kms-input w-full text-xs" /></div>
            <div><label class="block font-semibold mb-1">Allergens (comma-separated)</label><input name="allergens" type="text" value="${esc((pr.allergens || []).join(', '))}" placeholder="milk, wheat, soy..." class="kms-input w-full text-xs" /></div>
          </div>
          <div><label class="block font-semibold mb-1">Photo URL (Optional)</label><input name="photoUrl" type="text" value="${esc(pr.photo_url || '')}" placeholder="https://..." class="kms-input w-full text-xs" /></div>
          <div><label class="block font-semibold mb-1">Notes (Optional)</label><input name="notes" type="text" value="${esc(pr.notes || '')}" placeholder="Prep or serving notes..." class="kms-input w-full text-xs" /></div>
          <div>
            <label class="block font-semibold mb-1">Ingredients (one per line, e.g. 4 lbs Ground beef)</label>
            <textarea name="ingText" rows="5" required class="kms-input w-full text-xs leading-relaxed">${esc(ingLines)}</textarea>
          </div>
          <div>
            <label class="block font-semibold mb-1">Directions (one step per line)</label>
            <textarea name="stepsText" rows="5" class="kms-input w-full text-xs leading-relaxed">${esc(stepLines)}</textarea>
          </div>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="submit" name="action" value="save" class="kms-btn-alt flex-1 py-2 text-xs font-semibold">Save Draft Changes</button>
            <button type="submit" name="action" value="approve" class="kms-btn-ok flex-1 py-2 text-xs font-semibold">Approve &amp; Add to Recipes</button>
          </div>
        </form>
      `);
    }
    return;
  }
  const rejSug = e.target.closest('[data-reject-recsug]');
  if (rejSug) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can reject suggestions', 'warn'); return; }
    const s = (state.recipeSuggestions || []).find(x => x.id === rejSug.dataset.rejectRecsug);
    if (s) { s.status = 'REJECTED'; saveState(); render(); showToast('Suggestion dismissed'); }
    return;
  }
  if (e.target.id === 'btn-start-tour') {
    restoreTourDemoSandbox();
    tourState.demoActive = false;
    tourState.demoNote = '';
    const steps = getRoleTourSteps();
    if (steps.length) {
      tourState.active = true;
      tourState.stepIndex = 0;
      state.activeTab = steps[0].tab;
      render();
    }
    return;
  }
  if (e.target.id === 'btn-tour-demo') {
    const steps = getRoleTourSteps();
    const step = steps[tourState.stepIndex];
    if (step) {
      if (tourState.demoActive) {
        restoreTourDemoSandbox();
        tourState.demoActive = false;
        tourState.demoNote = '';
        showToast('Sandbox reset to your real kitchen data.');
      } else {
        tourState.demoNote = runTourStepDemo(step.tab);
        tourState.demoActive = true;
      }
      render();
    }
    return;
  }
  const launchStepBtn = e.target.closest('[data-launch-tour-step]');
  if (launchStepBtn) {
    restoreTourDemoSandbox();
    tourState.demoActive = false;
    tourState.demoNote = '';
    const steps = getRoleTourSteps();
    const idx = Number(launchStepBtn.dataset.launchTourStep);
    if (steps[idx]) {
      tourState.active = true;
      tourState.stepIndex = idx;
      state.activeTab = steps[idx].tab;
      render();
    }
    return;
  }
  if (e.target.id === 'btn-tour-next') {
    restoreTourDemoSandbox();
    tourState.demoActive = false;
    tourState.demoNote = '';
    const steps = getRoleTourSteps();
    if (tourState.stepIndex < steps.length - 1) {
      tourState.stepIndex++;
      state.activeTab = steps[tourState.stepIndex].tab;
      render();
    }
    return;
  }
  if (e.target.id === 'btn-tour-prev') {
    restoreTourDemoSandbox();
    tourState.demoActive = false;
    tourState.demoNote = '';
    const steps = getRoleTourSteps();
    if (tourState.stepIndex > 0) {
      tourState.stepIndex--;
      state.activeTab = steps[tourState.stepIndex].tab;
      render();
    }
    return;
  }
  if (e.target.id === 'btn-tour-finish' || e.target.id === 'btn-tour-exit') {
    const skipped = e.target.id === 'btn-tour-exit';
    restoreTourDemoSandbox();
    tourState.demoActive = false;
    tourState.demoNote = '';
    tourState.active = false;
    try {
      localStorage.setItem('kms_tour_completed', '1');
      localStorage.setItem('kms_tour_autostart', '0');
    } catch (err) {}
    const u = getActiveUser();
    if (u) {
      u.tour_completed = true;
      saveState();
    }
    if (skipped) state.activeTab = 'dashboard';
    render();
    showToast(skipped ? 'Tour skipped — replay anytime in Help & Training.' : 'Interactive tutorial complete! It will not auto-show again.');
    return;
  }
  if (e.target.id === 'btn-retrain-self') {
    try { localStorage.removeItem('kms_tour_completed'); localStorage.setItem('kms_tour_autostart', '1'); } catch (err) {}
    const u = getActiveUser();
    if (u) u.tour_completed = false;
    u.completed_training_ids = [];
    u.onboarding_completed = false;
    trainingStep = 0;
    saveState();
    render();
    return;
  }
  if (e.target.id === 'btn-new-announcement') {
    showAnnouncementEditorModal(null);
    return;
  }
  if (e.target.id === 'btn-manage-announcements') {
    state.activeTab = 'users';
    render();
    const el = document.getElementById('announcements-admin-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (e.target.id === 'btn-preset-weekly-order') {
    const f = document.getElementById('form-save-announcement');
    if (f) {
      f.querySelector('[name="title"]').value = 'Weekly Order Reminder (Marberger & Produce)';
      f.querySelector('[name="priority"]').value = 'reminder';
      f.querySelector('[name="repeat"]').value = 'weekly';
      f.querySelector('[name="body"]').value = 'Review Order Suggestions and submit weekly Draft POs for Marberger (Dairy) and Produce today.';
      const wrap = document.getElementById('ann-repeat-days-wrap');
      if (wrap) wrap.classList.remove('hidden');
      f.querySelectorAll('input[name="repeatDays"]').forEach(cb => { cb.checked = (cb.value === '5'); });
    }
    return;
  }
  const editAnnBtn = e.target.closest('[data-edit-announcement]');
  if (editAnnBtn) {
    showAnnouncementEditorModal(editAnnBtn.dataset.editAnnouncement);
    return;
  }
  const delAnnBtn = e.target.closest('[data-del-announcement]');
  if (delAnnBtn) {
    const targetId = delAnnBtn.dataset.delAnnouncement;
    const targetAnn = (state.announcements || []).find(a => a.id === targetId);
    askConfirm('Delete Announcement', `Globally delete "${targetAnn ? targetAnn.title : 'this announcement'}"?`, () => {
      state.announcements = (state.announcements || []).filter(a => a.id !== targetId);
      if (targetAnn) logActivity('ANNOUNCEMENT DELETED', `Deleted "${targetAnn.title}"`);
      if (sbClient) sbClient.from('kms_announcements').delete().eq('id', targetId).then(() => {});
      saveState();
      render();
      showToast('Announcement deleted globally');
    });
    return;
  }
  const daBtn = e.target.closest('[data-dismiss-ann]');
  if (daBtn) {
    const id = daBtn.dataset.dismissAnn;
    const uid2 = getActiveUser().id;
    const todayStr = localDateStr();
    if (id.startsWith('auto-')) {
      if (!state.dismissedAutoAnns) state.dismissedAutoAnns = {};
      if (!state.dismissedAutoAnns[uid2]) state.dismissedAutoAnns[uid2] = {};
      state.dismissedAutoAnns[uid2][id] = todayStr;
      saveState();
      render();
      showToast('Dismissed for today (will reappear tomorrow while active)');
      return;
    }
    const a = (state.announcements || []).find(x => x.id === id);
    if (a) {
      a.dismissed_by = a.dismissed_by || {};
      a.dismissed_by[uid2] = todayStr;
      logActivity('ANNOUNCEMENT DISMISSED', `Dismissed "${a.title}" for today`);
      saveState();
      render();
      showToast('Dismissed for today (will reappear tomorrow until expired)');
    }
    return;
  }

  if (e.target.id === 'btn-trn-prev' && trainingStep > 0) { trainingStep--; checkMandatoryModals(); return; }
  if (e.target.id === 'btn-trn-next') {
    const u = getActiveUser();
    const pending = state.trainingModules.filter(m => (m.role === 'ALL' || normalizeRole(m.role) === normalizeRole(u.role)) && !(u.completed_training_ids || []).includes(m.id));
    if (trainingStep < pending.length - 1) { trainingStep++; checkMandatoryModals(); }
    else {
      u.completed_training_ids = u.completed_training_ids || [];
      pending.forEach(m => { if (!u.completed_training_ids.includes(m.id)) u.completed_training_ids.push(m.id); });
      u.onboarding_completed = true;
      trainingStep = 0;
      logActivity('TRAINING', 'Completed mandatory onboarding');
      saveState();
      checkMandatoryModals();
      showToast('Training complete!');
    }
    return;
  }

  const editUsrBtn = e.target.closest('[data-edit-usr]');
  if (editUsrBtn) {
    const u = state.users.find(x => x.id === editUsrBtn.dataset.editUsr);
    const me = getActiveUser();
    const isSelfOwner = !!(u && u.id === 'usr-1' && me.id === 'usr-1');
    if (!u || (!canManageUserAccount(me, u) && !isSelfOwner)) { showToast('You can only edit accounts you manage', 'warn'); return; }
    const myRank = ROLE_RANK[normalizeRole(me.role)] || 0;
    const roleOpts = ['VOLUNTEER', 'STAFF', 'MANAGER', 'ADMIN'].filter(r => isAdminRole(me) ? ROLE_RANK[r] <= myRank : ROLE_RANK[r] < myRank);
    openModal(`Edit Account — ${u.name}`, `
      <form id="form-edit-usr" class="space-y-3 text-xs">
        <input type="hidden" name="userId" value="${esc(u.id)}" />
        <div><label class="block font-semibold mb-1">Full Name</label><input name="name" type="text" required value="${esc(u.name)}" class="kms-input w-full text-sm" /></div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="block font-semibold mb-1">Initials</label><input name="initials" type="text" maxlength="4" required value="${esc(u.initials)}" class="kms-input w-full text-sm uppercase" /></div>
          <div><label class="block font-semibold mb-1">Role</label>${isSelfOwner ? `<input type="hidden" name="role" value="ADMIN" /><input type="text" value="ADMIN" disabled class="kms-input w-full text-sm opacity-60" />` : `<select name="role" class="kms-input w-full text-sm">${roleOpts.map(r => `<option value="${r}" ${normalizeRole(u.role) === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`}</div>
        </div>
        <div><label class="block font-semibold mb-1">Email (for Alerts &amp; PO Notifications)</label><input name="email" type="email" value="${esc(u.email || '')}" class="kms-input w-full text-xs" /></div>
        <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save Account Changes</button>
      </form>
    `);
    return;
  }
  const delUsrBtn = e.target.closest('[data-del-usr]');
  if (delUsrBtn) {
    const u = state.users.find(x => x.id === delUsrBtn.dataset.delUsr);
    const me = getActiveUser();
    if (!u || !canManageUserAccount(me, u) || u.id === me.id) { showToast('You can only delete accounts lower than your role', 'warn'); return; }
    askConfirm('Delete User Permanently', `Permanently delete ${u.name} (${u.role})? This removes their login completely.`, () => {
      state.users = state.users.filter(x => x.id !== u.id);
      if (sbClient) sbClient.from('kms_users').delete().eq('id', u.id).then(() => {});
      logActivity('USER DELETED', `Permanently deleted ${u.name} (${u.role})`);
      saveState();
      render();
      showToast(`Deleted user ${u.name}`);
    });
    return;
  }
  const rpBtn = e.target.closest('[data-reset-pin]');
  if (rpBtn) {
    const u = state.users.find(x => x.id === rpBtn.dataset.resetPin);
    const me = getActiveUser();
    if (u && !canManageUserAccount(me, u) && !(u.id === 'usr-1' && me.id === 'usr-1')) {
      showToast('You can only reset PINs for accounts lower than your role', 'warn');
      return;
    }
    if (u) {
      const tmp = randomTempPin();
      if (cloudManaged() && sbClient) {
        if (!sessionPin) { requireRelogin(); return; }
        rpcSetPin(me.id, sessionPin, u.id, tmp, true).then(res => {
          if (!res || !res.ok) { showToast(pinErrorText(res), 'warn'); return; }
          u.must_change_pin = true;
          logActivity('PIN RESET', `${me.name} reset the PIN for ${u.name}`);
          saveState();
          alert(`Temporary PIN for ${u.name}:\n\n${tmp}\n\nWrite it down and give it to them now. It will not be shown again, and they must choose a new PIN at sign-in.`);
        });
        return;
      }
      u.pin_salt = newSalt();
      u.pin_hash = hashPin(tmp, u.pin_salt);
      u.must_change_pin = true;
      saveState();
      alert(`Temporary PIN for ${u.name}:\n\n${tmp}\n\nThey must choose a new PIN at sign-in.`);
    }
    return;
  }
  const tuBtn = e.target.closest('[data-toggle-usr]');
  if (tuBtn) {
    const u = state.users.find(x => x.id === tuBtn.dataset.toggleUsr);
    if (u) {
      if (!canManageUserAccount(getActiveUser(), u)) { showToast('You can only deactivate accounts lower than your role', 'warn'); return; }
      u.active = u.active === false ? true : false;
      saveState();
      render();
    }
    return;
  }

  if (e.target.id === 'btn-bulk-served' || e.target.id === 'btn-bulk-reload') {
    const end = document.getElementById('bulk-end')?.value || localDateStr();
    const presetDays = e.target.id === 'btn-bulk-reload' ? null : -365;
    const start = document.getElementById('bulk-start')?.value || addDays(end, presetDays || -365);
    const dates = serviceDaysBetween(start, end).reverse();
    openModal('Bulk Enter Past Patrons Served (Up to 1 Year)', `
      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-2 p-2.5 rounded-lg bg-black/5 text-xs">
          <label class="font-bold">From<input id="bulk-start" type="date" value="${esc(start)}" class="kms-input block mt-1 text-xs" /></label>
          <label class="font-bold">To<input id="bulk-end" type="date" value="${esc(end)}" class="kms-input block mt-1 text-xs" /></label>
          <button type="button" id="btn-bulk-reload" class="kms-btn-navy px-3 py-1.5 text-xs">Load Dates (${dates.length})</button>
        </div>
        <details class="p-2.5 rounded-lg border border-[var(--line)] text-xs">
          <summary class="font-bold cursor-pointer">Or Paste CSV / Spreadsheet Rows (Date, Served, Note)</summary>
          <form id="form-bulk-paste" class="space-y-2 mt-2">
            <textarea name="csv" rows="4" required placeholder="2026-11-18, 64, Cold snap&#10;2026-11-16, 58&#10;11/13/2026, 71, Coat drive" class="kms-input w-full text-xs font-mono"></textarea>
            <button type="submit" class="kms-btn-ok px-3 py-1.5 text-xs">Import Pasted Rows</button>
          </form>
        </details>
        <form id="form-bulk-served" class="space-y-3">
          <div class="max-h-64 overflow-y-auto space-y-1.5">
            ${dates.map(ds => {
              const mp = state.menuPlan.find(m => m.service_date === ds);
              return `<div class="flex items-center gap-2 text-xs p-1.5 border-b border-[var(--line)]">
                <span class="w-36 font-mono">${esc(ds)} (${dLabel(ds).split(',')[0]})</span>
                <input type="number" min="0" name="sv_${ds}" value="${mp && mp.served_portions != null ? mp.served_portions : ''}" placeholder="Served" class="kms-input w-20 text-center font-bold" />
                <input type="text" name="nt_${ds}" value="${mp ? esc(mp.note || '') : ''}" placeholder="Note (optional)" class="kms-input flex-1" />
              </div>`;
            }).join('')}
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-sm">Save All Entered Counts</button>
        </form>
      </div>
    `);
    return;
  }
  const editSrvBtn = e.target.closest('[data-edit-srv]');
  if (editSrvBtn) {
    const mp = state.menuPlan.find(m => m.id === editSrvBtn.dataset.editSrv);
    if (mp) {
      openModal('Edit Past Patrons Served — ' + mp.service_date, `
        <form id="form-edit-srv" class="space-y-3">
          <input type="hidden" name="id" value="${esc(mp.id)}" />
          <div class="grid grid-cols-3 gap-2">
            <label class="text-xs font-bold">Date<input name="date" type="date" value="${esc(mp.service_date)}" required class="kms-input w-full mt-1" /></label>
            <label class="text-xs font-bold">Planned<input name="planned" type="number" min="0" value="${mp.planned_portions || 0}" required class="kms-input w-full mt-1" /></label>
            <label class="text-xs font-bold">Served<input name="served" type="number" min="0" value="${mp.served_portions ?? 0}" required class="kms-input w-full mt-1" /></label>
          </div>
          <select name="circumstance" class="kms-input w-full text-sm">
            ${['Normal Day','Closed / Federal Holiday','Snow / Cold Snap','Heavy Rain / Storm','Local Event / Drive','Holiday Week'].map(c => `<option ${(mp.circumstance || 'Normal Day') === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <input name="note" value="${esc(mp.note || '')}" placeholder="Notes" class="kms-input w-full text-sm" />
          <button type="submit" class="kms-btn-primary w-full py-2 text-sm">Save Changes</button>
        </form>
      `);
    }
    return;
  }
  const delSrvBtn = e.target.closest('[data-del-srv]');
  if (delSrvBtn) {
    askConfirm('Delete Service Record', 'Remove this past attendance record?', () => {
      state.menuPlan = state.menuPlan.filter(m => m.id !== delSrvBtn.dataset.delSrv);
      saveState();
      render();
      showToast('Deleted attendance record');
    });
    return;
  }
});

// Global Input Listener
document.addEventListener('input', (e) => {
  if (e.target.id === 'help-task-search') { state._helpSearch = e.target.value; render(); const el = document.getElementById('help-task-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } return; }
  if (e.target.id === 'stock-search') { state._stockSearch = e.target.value; render(); const el = document.getElementById('stock-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } return; }
  if (e.target.id === 'blind-search-inp') {
    if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} };
    state.blindDraft.search = e.target.value;
    render();
    const el = document.getElementById('blind-search-inp');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    return;
  }
  if (e.target.id === 'rec-scale-inp' || e.target.id === 'rec-scale-slider') { state.recipeScale = Math.max(1, parseFloat(e.target.value) || 1); render(); return; }
  if (e.target.id === 'act-search-inp') { state._actSearch = e.target.value; render(); const el = document.getElementById('act-search-inp'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } return; }
  if (e.target.id === 'rec-search-inp') {
    state._recSearch = e.target.value;
    const q = state._recSearch.trim().toLowerCase();
    const exact = state.recipes.find(r => r.id.toLowerCase() === q);
    if (exact) { state.selectedRecipeId = exact.id; state._recSearch = ''; }
    render();
    const el = document.getElementById('rec-search-inp');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    return;
  }
  if (e.target.matches('[data-blind-id]')) {
    if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} };
    state.blindDraft.counts[e.target.dataset.blindId] = e.target.value;
    saveState();
    return;
  }
  if (e.target.matches('[data-blank-row]')) {
    const [zName, idxStr, field] = e.target.dataset.blankRow.split(':');
    const idx = Number(idxStr);
    if (!state.blindDraft) state.blindDraft = { zone: zName, mode: 'blank30', search: '', revealed: false, counts: {}, blankRowsByZone: {} };
    if (!state.blindDraft.blankRowsByZone) state.blindDraft.blankRowsByZone = {};
    if (!Array.isArray(state.blindDraft.blankRowsByZone[zName])) {
      state.blindDraft.blankRowsByZone[zName] = Array.from({ length: 30 }, () => ({ name: '', unit: '', qty: '' }));
    }
    state.blindDraft.blankRowsByZone[zName][idx][field] = e.target.value;
    if (field === 'name') {
      const m = state.items.find(i => !i.discontinued && i.name.trim().toLowerCase() === e.target.value.trim().toLowerCase());
      if (m && !state.blindDraft.blankRowsByZone[zName][idx].unit) {
        state.blindDraft.blankRowsByZone[zName][idx].unit = normStockUnit(m.unit);
      }
    }
    saveState();
    return;
  }
});

// Global Change Listener
document.addEventListener('change', (e) => {
  if (e.target.id === 'menu-print-ref-date') {
    showMenuPrintSuiteModal(state._menuPrintPeriod || 'weekly', e.target.value || localDateStr());
    return;
  }
  if (e.target.id === 'act-cat-filter') { state._actCat = e.target.value; render(); return; }
  if (e.target.id === 'rec-photo-file') {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 720;
        const ratio = img.width > maxW ? (maxW / img.width) : 1;
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * ratio);
        c.height = Math.round(img.height * ratio);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL('image/jpeg', 0.78);
        const urlInp = document.getElementById('rec-photo-url-inp');
        const prev = document.getElementById('rec-photo-preview');
        if (urlInp) urlInp.value = dataUrl;
        if (prev) { prev.src = dataUrl; prev.classList.remove('hidden'); }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    return;
  }
  if (e.target.id === 'po-edit-extra-sel') {
    const wrap = document.getElementById('po-edit-new-wrap');
    if (wrap) wrap.classList.toggle('hidden', e.target.value !== '__NEW__');
    return;
  }
  if (e.target.id === 'inp-restore-json') {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (!parsed || !Array.isArray(parsed.items)) {
          showToast('Invalid backup JSON file', 'error');
          return;
        }
        const next = Object.assign(getDefaultState(), parsed);
        next.items = next.items.map(normalizeInventoryItem);
        if (Array.isArray(next.recipes)) next.recipes = next.recipes.map(normalizeRecipe);
        next.cloudManaged = true;
        replaceState(next);
        stripLocalPins();
        ensureOwnerIntegrity();
        state.isLocked = false;
        setSessionUnlocked(true);
        logActivity('BACKUP RESTORED', `Restored backup (${state.items.length} items, ${state.recipes.length} recipes)`);
        closeModal();
        saveState();
        render();
        showToast('Backup restored & synced to Supabase!');
      } catch (err) {
        showToast('Could not read JSON backup file', 'error');
      }
    };
    reader.readAsText(file);
    return;
  }
  if (e.target && e.target.id === 'ann-repeat-select') {
    const wrap = document.getElementById('ann-repeat-days-wrap');
    if (wrap) wrap.classList.toggle('hidden', !['weekly', 'biweekly'].includes(e.target.value));
    return;
  }
  if (e.target.id === 'stock-loc') { state._stockLoc = e.target.value; render(); return; }
  if (e.target.id === 'order-hz') { state._orderHorizon = e.target.value; render(); return; }
  if (e.target.id === 'fc-whatif-meal') { state._fcMealFilter = e.target.value; render(); return; }
  if (e.target.id === 'fc-whatif-circ') { state._fcCircFilter = e.target.value; render(); return; }
  if (e.target.id === 'rep-month') { state.reportMonth = e.target.value; render(); return; }

  if (e.target.name === 'donItemId') {
    const row = e.target.closest('tr');
    const x = state.items.find(i => i.id === e.target.value);
    if (row && x) {
      const uInp = row.querySelector('[name="donUnit"]');
      if (uInp) uInp.value = normStockUnit(x.unit || 'cases');
    }
    return;
  }

  const itemField = e.target.dataset.itemField;
  if (itemField) {
    const [id, f] = itemField.split(':');
    const x = state.items.find(i => i.id === id);
    if (x) {
      if (f !== 'on_hand' && !isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can edit par, unit, price, or zone', 'warn'); render(); return; }
      snapUndo();
      if (f === 'cadence') { x.cadence = e.target.value; x.vendor = x.cadence === 'W' ? 'Marberger / Produce' : 'Jordan Banana'; }
      else if (f === 'location') { x.location = e.target.value; }
      else if (f === 'unit') {
        const nu = normStockUnit(e.target.value);
        x.unit = nu;
        x.pack_label = nu;
        (state.recipes || []).forEach(r => (r.ingredients || []).forEach(ing => { if (ing.inv_id === x.id) recomputeIngredientPer100(ing, r.base_servings); }));
      }
      else {
        const v = Math.max(0, parseFloat(e.target.value) || 0);
        if (f === 'on_hand' && v < x.on_hand) recordUsage(x, x.on_hand - v);
        if (f === 'par') { x.par_manual = true; x.par_learned = false; }
        x[f] = v;
      }
      saveState();
      render();
    }
    return;
  }

  if (e.target.dataset.menuRec) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can change the menu schedule', 'warn'); render(); return; }
    const ds = e.target.dataset.menuRec;
    let mp = state.menuPlan.find(m => m.service_date === ds);
    const rec = state.recipes.find(r => r.id === e.target.value);
    if (!mp) { mp = { id: uid('mp'), service_date: ds, planned_portions: forecastWeekday(ds), status: 'PLANNED' }; state.menuPlan.push(mp); }
    mp.recipe_id = e.target.value;
    mp.custom_title = rec ? rec.name : '';
    saveState();
    render();
    return;
  }
  if (e.target.dataset.menuPlan) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can change planned portions', 'warn'); render(); return; }
    const ds = e.target.dataset.menuPlan;
    let mp = state.menuPlan.find(m => m.service_date === ds);
    if (!mp) { mp = { id: uid('mp'), service_date: ds, recipe_id: '', status: 'PLANNED' }; state.menuPlan.push(mp); }
    mp.planned_portions = Math.max(0, parseInt(e.target.value, 10) || 0);
    saveState();
    return;
  }
  if (e.target.dataset.prepChk) {
    const [mpId, itemId] = e.target.dataset.prepChk.split(':');
    const mp = state.menuPlan.find(m => m.id === mpId);
    if (mp) { mp.prep_checked_items = mp.prep_checked_items || {}; mp.prep_checked_items[itemId] = e.target.checked; saveState(); }
    return;
  }
  if (e.target.dataset.recBase) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can change recipe base servings', 'warn'); render(); return; }
    const r = state.recipes.find(x => x.id === e.target.dataset.recBase);
    if (r) {
      r.base_servings = Math.max(1, parseFloat(e.target.value) || 1);
      (r.ingredients || []).forEach(ing => recomputeIngredientPer100(ing, r.base_servings));
      saveState();
      render();
    }
    return;
  }
  if (e.target.dataset.recIng) {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can edit recipe ingredients', 'warn'); render(); return; }
    const [rid, idx, f] = e.target.dataset.recIng.split(':');
    const r = state.recipes.find(x => x.id === rid);
    if (r && r.ingredients[idx]) {
      const ing = r.ingredients[idx];
      if (f === 'qty' || f === 'stock_per_unit' || f === 'per100') ing[f] = parseFloat(e.target.value) || 0;
      else ing[f] = e.target.value;
      if (f !== 'per100') recomputeIngredientPer100(ing, r.base_servings);
      logActivity('RECIPE EDITED', `${r.name}: updated ${ing.name} (${f})`);
      saveState();
      render();
    }
    return;
  }
  if (e.target.dataset.tempIdx !== undefined) {
    const today = localDateStr();
    const log = state.safetyLogs[today] = state.safetyLogs[today] || { temps: {}, cleaning: {} };
    log.temps[e.target.dataset.tempIdx] = e.target.value === '' ? null : parseFloat(e.target.value);
    log.logged_by = getActiveUser().name;
    logActivity('SAFETY TEMP', `${TEMP_CHECKS[e.target.dataset.tempIdx]?.[0] || 'Temp'}: ${e.target.value || 'cleared'}°F`);
    saveState();
    render();
    return;
  }
  if (e.target.dataset.cleanIdx !== undefined) {
    const today = localDateStr();
    const log = state.safetyLogs[today] = state.safetyLogs[today] || { temps: {}, cleaning: {} };
    log.cleaning[e.target.dataset.cleanIdx] = e.target.checked;
    logActivity('CLEANING LOG', `${CLEANING_TASKS[e.target.dataset.cleanIdx] || 'Task'}: ${e.target.checked ? 'Done' : 'Unchecked'}`);
    saveState();
    render();
    return;
  }
  if (e.target.dataset.chkId) {
    const c = state.checklists.find(x => x.id === e.target.dataset.chkId);
    if (c) {
      c.done = e.target.checked;
      c.done_by = c.done ? getActiveUser().name : '';
      c.done_at = c.done ? nowStamp() : '';
      if (c.done) c.priority_carryover = false;
      logActivity('CHECKLIST', c.title);
      saveState();
      render();
    }
    return;
  }
});

// Global Form Submit Listener
document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (state.isLocked && e.target.id !== 'form-unlock') return;
  const fd = new FormData(e.target);

  if (e.target.id === 'form-unlock' || e.target.id === 'form-switch-user') {
    const u = state.users.find(x => x.id === fd.get('userId') && x.active !== false);
    const pin = String(fd.get('pin') || '');
    const errEl = document.getElementById(e.target.id === 'form-unlock' ? 'unlock-err' : 'sw-err');
    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); } };
    const finishLogin = () => {
      state.activeUserId = u.id;
      state.isLocked = false;
      setSessionUnlocked(true);
      trainingStep = 0;
      logActivity('LOGIN', `${u.name} signed in`);
      saveState();
      closeModal();
      render();
    };
    if (!u) return;
    if (sbClient) {
      rpcLogin(u.id, pin).then(res => {
        if (!res || !res.ok) {
          if (res && (res.error === 'bad_pin' || res.error === 'locked')) { logActivity('LOGIN FAILED', `${res.error === 'locked' ? 'Locked-out' : 'Incorrect'} PIN attempt for ${u.name}`); saveState(); }
          showErr(pinErrorText(res));
          return;
        }
        setSessionPin(pin);
        u.must_change_pin = !!res.must_change_pin;
        if (res.role) u.role = normalizeRole(res.role);
        finishLogin();
      });
      return;
    }
    if (!verifyPin(u, pin)) {
      logActivity('LOGIN FAILED', `Incorrect PIN attempt for ${u.name}`); saveState();
      showErr('Incorrect PIN.');
      return;
    }
    finishLogin();
    return;
  }

  if (e.target.id === 'form-force-pin') {
    const p1 = String(fd.get('newPin') || '').trim();
    const p2 = String(fd.get('confirmPin') || '').trim();
    const err = document.getElementById('force-pin-err');
    if (p1.length < 6 || WEAK_PINS.includes(p1)) { err.textContent = 'Choose a stronger 6+ character PIN.'; err.classList.remove('hidden'); return; }
    if (p1 !== p2) { err.textContent = 'PINs do not match.'; err.classList.remove('hidden'); return; }
    const u = getActiveUser();
    if (sbClient) {
      if (!sessionPin) { requireRelogin(); return; }
      rpcSetPin(u.id, sessionPin, u.id, p1, false).then(res => {
        if (!res || !res.ok) { err.textContent = pinErrorText(res); err.classList.remove('hidden'); return; }
        setSessionPin(p1);
        u.must_change_pin = false;
        saveState();
        checkMandatoryModals();
        showToast('Personal PIN saved');
      });
      return;
    }
    u.pin_salt = newSalt();
    u.pin_hash = hashPin(p1, u.pin_salt);
    u.must_change_pin = false;
    saveState();
    checkMandatoryModals();
    showToast('Personal PIN saved');
    return;
  }

  if (e.target.classList && e.target.classList.contains('form-reconcile-po')) {
    const po = (state.purchaseOrders || []).find(p => p.id === e.target.dataset.poId);
    if (po && po.status === 'requested') {
      showToast('This PO must be approved and placed by Management before it can be reconciled.', 'warn');
      return;
    }
    if (po && ['ordered', 'approved', 'APPROVED_ORDERED'].includes(po.status)) {
      const lines = po.lines || [];
      for (let idx = 0; idx < lines.length; idx++) {
        const ln = lines[idx];
        if (Number(ln.qty || 0) <= 0) continue;
        const rawVal = String(fd.get('rec_idx_' + idx) ?? '').trim();
        const numVal = parseFloat(rawVal);
        if (rawVal === '' || isNaN(numVal) || numVal < 0) {
          showToast(`Enter the actual received quantity for ${ln.name} (enter 0 if shorted)`, 'warn');
          const badInp = e.target.querySelector(`[name="rec_idx_${idx}"]`);
          if (badInp) badInp.focus();
          return;
        }
      }
      const uName = getActiveUser().name;
      const todayStr = localDateStr();
      const poNum = String(fd.get('recPoNum') || '').trim();
      if (poNum) po.po_number = poNum;
      const invNum = String(fd.get('recInvNum') || '').trim();
      if (invNum) po.vendor_conf = invNum;
      let added = 0;
      let invTotal = 0;
      lines.forEach((ln, idx) => {
        if (Number(ln.qty || 0) <= 0) return;
        const actualOrderUnits = Math.max(0, Math.round((parseFloat(fd.get('rec_idx_' + idx)) || 0) * 100) / 100);
        ln.received = actualOrderUnits;
        const editedRateEl = form.querySelector(`[name="rec_price_${idx}"]`);
        if (editedRateEl && isMgmtOrHigher(getActiveUser())) {
          const newRate = Number(editedRateEl.value || 0);
          if (!isNaN(newRate) && newRate >= 0) ln.unit_price = newRate;
        }
        invTotal += actualOrderUnits * Number(ln.unit_price || 0);
        if (ln.isFee || actualOrderUnits <= 0) return;
        const packMult = Number(ln.packQty || 1);
        const stockGain = Math.round((actualOrderUnits * packMult) * 100) / 100;
        const x = (ln.item_id && state.items.find(i => i.id === ln.item_id))
          || state.items.find(i => !i.discontinued && (i.name.toLowerCase() === String(ln.name || '').toLowerCase() || (ln.sku && i.sku === ln.sku)));
        if (!x) return;
        x.on_hand = Math.round((Number(x.on_hand || 0) + stockGain) * 100) / 100;
        if (ln.sku && ln.sku !== 'STK') x.sku = ln.sku;
        if (Number(ln.unit_price || 0) > 0) {
          x.unit_price = Math.round((Number(ln.unit_price) / packMult) * 10000) / 10000;
        }
        state.transactions.unshift({
          id: uid('tx'), tx_date: todayStr, tx_type: 'RECEIVE', item_id: x.id, item_name: x.name,
          unit: x.unit, qty: stockGain,
          source: `PO ${po.po_number}${po.vendor_conf ? ' / Inv ' + po.vendor_conf : ''} (${po.vendor} · ${actualOrderUnits} ${ln.unit})`,
          exp_date: '', cleared: false, staff_name: uName
        });
        added++;
      });
      po.status = 'closed';
      po.received_by = uName;
      po.verified_total = Math.round(invTotal * 100) / 100;
      logActivity('PO RECEIVED', `${po.po_number}${po.vendor_conf ? ' / Inv ' + po.vendor_conf : ''} ($${po.verified_total.toFixed(2)} · ${added} items checked in)`);
      saveState();
      render();
      showToast(isMgmtOrHigher(getActiveUser()) ? `Reconciled ${po.po_number} (${po.verified_total.toFixed(2)}): added ${added} item(s) to Living Stock!` : `Reconciled ${po.po_number}: added ${added} item(s) to Living Stock!`);
    }
    return;
  }

  if (e.target.id === 'form-log-donation') {
    if (!isStaffOrHigher()) { showToast('Only Staff or Management can log donations', 'warn'); return; }
    const donorName = String(fd.get('donorName') || '').trim();
    const donorOrg = String(fd.get('donorOrg') || '').trim();
    const donationDate = String(fd.get('donationDate') || localDateStr());
    const donorContact = String(fd.get('donorContact') || '').trim();
    const donorAddress = String(fd.get('donorAddress') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    const ids = fd.getAll('donItemId');
    const customNames = fd.getAll('donCustomName');
    const qtys = fd.getAll('donQty');
    const units = fd.getAll('donUnit');
    const donItems = [];
    const uName = getActiveUser().name;

    ids.forEach((itemId, idx) => {
      const q = parseFloat(qtys[idx]) || 0;
      if (q <= 0) return;
      const inv = itemId ? state.items.find(i => i.id === itemId) : null;
      const cName = cleanItemName(customNames[idx] || '');
      const name = inv ? inv.name : cName;
      if (!name) return;
      const unit = inv ? normStockUnit(inv.unit) : normStockUnit(units[idx] || 'cases');
      if (inv) {
        inv.on_hand = Math.round((inv.on_hand + q) * 100) / 100;
        state.transactions.unshift({
          id: uid('tx'), tx_date: donationDate, tx_type: 'RECEIVE', item_id: inv.id, item_name: inv.name,
          unit: inv.unit, qty: q, source: `Donation — ${donorName}${donorOrg ? ' (' + donorOrg + ')' : ''}`,
          exp_date: '', cleared: false, staff_name: uName
        });
      }
      donItems.push({ item_id: inv ? inv.id : '', name, qty: q, unit, condition: 'Good / Unopened' });
    });

    if (!donorName || !donItems.length) {
      showToast('Enter donor name and at least one donated item with qty > 0', 'warn');
      return;
    }

    state.donations = state.donations || [];
    const recNum = 'DON-' + donationDate.replace(/-/g, '') + '-' + String(state.donations.length + 101);
    const donRecord = {
      id: uid('don'),
      receipt_number: recNum,
      donor_name: donorName,
      donor_org: donorOrg,
      donor_contact: donorContact,
      donor_address: donorAddress,
      donation_date: donationDate,
      notes,
      received_by: uName,
      items: donItems
    };
    state.donations.unshift(donRecord);
    logActivity('DONATION', `${recNum} from ${donorName} (${donItems.length} item(s))`);
    saveState();
    render();
    showToast(`Logged donation ${recNum} & updated Living Stock!`);
    showDonationTaxReceiptModal(donRecord.id);
    return;
  }

  if (e.target.id === 'form-add-item') {
    if (!isStaffOrHigher()) { showToast('Only Staff or Management can add items', 'warn'); return; }
    const loc = String(fd.get('location') || LOCATIONS[0]);
    const prefix = /freezer/i.test(loc) ? 'FRZ' : /cooler/i.test(loc) ? 'CLR' : /kitchen dry/i.test(loc) ? 'KDG' : 'STK';
    const uClean = normStockUnit(fd.get('unit') || 'cases');
    const item = normalizeInventoryItem({
      id: uid('item'), sku: prefix + '-' + String(state.items.length + 101), name: cleanItemName(fd.get('name')),
      location: loc, category: 'General', unit: uClean,
      pack_label: uClean, units_per_pack: 1,
      on_hand: parseFloat(fd.get('onHand')) || 0, par: parseFloat(fd.get('par')) || 1,
      par_manual: false, par_learned: false, cadence: fd.get('cadence'),
      vendor: fd.get('cadence') === 'W' ? 'Marberger / Produce' : 'Jordan Banana',
      unit_price: null, usage_log: [], discontinued: false
    });
    state.items.push(item);
    logActivity('ADD ITEM', `${item.name} (${loc}, ${item.unit})`);
    saveState();
    closeModal();
    render();
    showToast(`Added ${item.name}`);
    return;
  }

  if (e.target.id === 'form-edit-item') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can edit item details', 'warn'); return; }
    const x = state.items.find(i => i.id === fd.get('itemId'));
    if (x) {
      snapUndo();
      x.name = cleanItemName(fd.get('name')) || x.name;
      x.sku = String(fd.get('sku') || '').trim().toUpperCase() || x.sku;
      x.location = String(fd.get('location') || x.location);
      x.unit = normStockUnit(fd.get('unit') || x.unit);
      x.pack_label = x.unit;
      x.cadence = fd.get('cadence') === 'W' ? 'W' : 'M';
      x.vendor = x.cadence === 'W' ? 'Marberger / Produce' : 'Jordan Banana';
      x.on_hand = Math.max(0, parseFloat(fd.get('onHand')) || 0);
      x.par = Math.max(0, parseFloat(fd.get('par')) || 0);
      x.par_manual = true;
      x.par_learned = false;
      const up = parseFloat(fd.get('unitPrice'));
      x.unit_price = isNaN(up) || up <= 0 ? null : up;
      (state.recipes || []).forEach(r => (r.ingredients || []).forEach(ing => { if (ing.inv_id === x.id) recomputeIngredientPer100(ing, r.base_servings); }));
      logActivity('EDIT ITEM', `Updated ${x.name} (${x.sku})`);
      closeModal();
      saveState();
      render();
      showToast(`Updated ${x.name}`);
    }
    return;
  }

  if (e.target.id === 'form-bulk-add-stock') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-add stock', 'warn'); return; }
    const lines = String(fd.get('bulkItemsRaw') || '').split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
    let added = 0;
    lines.forEach(ln => {
      const parts = ln.split(',').map(s => s.trim());
      if (!parts[0]) return;
      const loc = LOCATIONS.find(l => l.toLowerCase() === (parts[1] || '').toLowerCase()) || 'Stockroom';
      const unit = normStockUnit(parts[2] || 'cases');
      const onHand = Math.max(0, parseFloat(parts[3]) || 0);
      const par = Math.max(0, parseFloat(parts[4]) || 1);
      const cad = /^w/i.test(parts[5] || '') ? 'W' : 'M';
      const prefix = /freezer/i.test(loc) ? 'FRZ' : /cooler/i.test(loc) ? 'CLR' : /kitchen dry/i.test(loc) ? 'KDG' : 'STK';
      state.items.push(normalizeInventoryItem({
        id: uid('item'), sku: prefix + '-' + String(state.items.length + 101), name: cleanItemName(parts[0]),
        location: loc, category: cad === 'W' ? 'Dairy / Refrigerated' : 'General',
        unit, pack_label: unit, units_per_pack: 1, on_hand: onHand, par,
        par_manual: false, par_learned: false, cadence: cad,
        vendor: cad === 'W' ? 'Marberger / Produce' : 'Jordan Banana',
        unit_price: null, usage_log: [], discontinued: false
      }));
      added++;
    });
    logActivity('BULK ADD STOCK', `Added ${added} inventory item(s)`);
    closeModal();
    saveState();
    render();
    showToast(`Added ${added} new stock item(s)!`);
    return;
  }

  if (e.target.id === 'form-bulk-edit-stock') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-edit stock', 'warn'); return; }
    snapUndo();
    const delIds = [];
    let updated = 0;
    state.items.forEach(x => {
      if (fd.get('del_' + x.id)) {
        delIds.push(x.id);
        return;
      }
      const nName = cleanItemName(fd.get('name_' + x.id) || '');
      if (nName) x.name = nName;
      const nLoc = String(fd.get('loc_' + x.id) || '').trim();
      if (nLoc) x.location = nLoc;
      const nUnit = normStockUnit(fd.get('unit_' + x.id) || x.unit);
      if (nUnit) { x.unit = nUnit; x.pack_label = nUnit; }
      const nHand = parseFloat(fd.get('hand_' + x.id));
      if (!isNaN(nHand) && nHand >= 0) x.on_hand = nHand;
      const nPar = parseFloat(fd.get('par_' + x.id));
      if (!isNaN(nPar) && nPar >= 0 && nPar !== x.par) { x.par = nPar; x.par_manual = true; x.par_learned = false; }
      const nCad = fd.get('cad_' + x.id) === 'W' ? 'W' : 'M';
      x.cadence = nCad;
      x.vendor = nCad === 'W' ? 'Marberger / Produce' : 'Jordan Banana';
      updated++;
    });
    if (delIds.length) {
      state.items = state.items.filter(x => !delIds.includes(x.id));
      if (sbClient) sbClient.from('kms_inventory_items').delete().in('id', delIds).then(() => {});
    }
    (state.recipes || []).forEach(r => (r.ingredients || []).forEach(ing => recomputeIngredientPer100(ing, r.base_servings)));
    logActivity('BULK EDIT STOCK', `Updated ${updated}, deleted ${delIds.length} stock item(s)`);
    closeModal();
    saveState();
    render();
    showToast(`Saved ${updated} item(s)${delIds.length ? `, deleted ${delIds.length}` : ''}!`);
    return;
  }

  if (e.target.id === 'form-add-checklist') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can add checklist tasks', 'warn'); return; }
    const title = String(fd.get('title') || '').trim();
    if (!title) return;
    state.checklists.push({
      id: uid('chk'),
      freq: state.checklistFreq || 'daily',
      category: String(fd.get('category') || 'Food Safety / Cleaning'),
      title,
      done: false,
      done_by: '',
      done_at: '',
      priority_carryover: false
    });
    logActivity('CHECKLIST ADDED', `Added "${title}" (${state.checklistFreq || 'daily'})`);
    saveState();
    render();
    showToast('Added checklist task');
    return;
  }

  if (e.target.id === 'form-edit-checklist') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can edit checklist tasks', 'warn'); return; }
    const c = state.checklists.find(x => x.id === fd.get('chkId'));
    if (c) {
      c.title = String(fd.get('title') || '').trim() || c.title;
      c.freq = String(fd.get('freq') || c.freq);
      c.category = String(fd.get('category') || '').trim() || c.category;
      logActivity('CHECKLIST EDITED', c.title);
      closeModal();
      saveState();
      render();
      showToast('Updated checklist task');
    }
    return;
  }

  if (e.target.classList && e.target.classList.contains('form-create-po')) {
    const cad = e.target.dataset.cad;
    const lines = [];
    state.items.filter(x => !x.discontinued && x.cadence === cad).forEach(x => {
      if (!fd.get('inc_' + x.id)) return;
      const q = Math.ceil(parseFloat(fd.get('qty_' + x.id)) || 0);
      if (q <= 0) return;
      lines.push({ item_id: x.id, name: x.name, unit: x.unit, qty: q, received: 0, price: x.unit_price || 0 });
    });
    if (!lines.length) { showToast('Check at least one item with qty > 0 to request a PO', 'warn'); return; }
    const po = {
      id: uid('po'),
      po_number: String(fd.get('customPoNum') || '').trim() || ((cad === 'W' ? 'MAR-' : 'JB-') + localDateStr().replace(/-/g, '') + '-' + ((state.purchaseOrders || []).length + 1)),
      vendor_conf: String(fd.get('customInvNum') || '').trim(),
      vendor: cad === 'W' ? 'Marberger / Produce' : 'Jordan Banana',
      cadence: cad,
      status: 'requested',
      requested_by: getActiveUser().name,
      requested_date: localDateStr(),
      lines
    };
    state.purchaseOrders.unshift(po);
    if (state.manualPoExtra) delete state.manualPoExtra[cad];
    logActivity('PO REQUESTED', `${po.po_number} (${lines.length} items)`);
    saveState();
    render();
    const poSummary = `${po.po_number} (${po.vendor}): ` + lines.map(l => `${l.qty} ${l.unit} ${l.name}`).join(', ');
    const u = getActiveUser();
    const mgrs = (state.users || []).filter(x => x.active !== false && isMgmtOrHigher(x));
    state.messages.push({
      id: uid('msg'), sender_id: u.id, sender_name: u.name, sender_role: u.role,
      recipient_id: 'ALL', recipient_name: 'Everyone', priority: 'urgent',
      body: `PO Submitted for Approval — ${poSummary}`,
      created_at_ms: Date.now(), timestamp_label: nowStamp()
    });
    saveState();
    render();
    sendBackgroundAlert(mgrs, `PO Approval Needed: ${po.po_number}`, `Please review and approve ${poSummary}`).then(sent => {
      if (sent) showToast('Auto-sent background Email alert to Management!');
    });
    const poLinks = buildNotifyLinks(mgrs, `PO Approval Needed: ${po.po_number}`, `Please review and approve ${poSummary}`);
    openModal(`PO Submitted — Notify Management`, `
      <div class="space-y-3 text-xs">
        <p><strong>${esc(po.po_number)}</strong> has been submitted for approval and posted to Kitchen Alerts.</p>
        <div class="p-2.5 rounded bg-black/5">${esc(poSummary)}</div>
        <div class="flex flex-wrap gap-2">
          <a href="${poLinks.mailHref}" class="kms-btn-navy flex-1 py-2 text-center font-semibold">Email Management</a>
          <button type="button" data-close-modal="1" class="kms-btn-alt px-4 py-2 font-semibold">Done</button>
        </div>
      </div>
    `);
    return;
  }

  if (e.target.id === 'form-edit-po') {
    const po = (state.purchaseOrders || []).find(p => p.id === fd.get('poId'));
    if (po) {
      if (!isStaffOrHigher()) {
        showToast('Staff or Management access required to edit PO requests', 'warn');
        return;
      }
      if (!isMgmtOrHigher() && po.status !== 'requested') {
        showToast('Only Management can modify approved or ordered POs', 'warn');
        return;
      }
      const nextLines = [];
      (po.lines || []).forEach((l, lIdx) => {
        if (l.isFee) { nextLines.push({ ...l }); return; }
        const q = Math.round((parseFloat(fd.get('line_idx_' + lIdx)) || 0) * 100) / 100;
        if (!isNaN(q) && q > 0) nextLines.push({ ...l, qty: q });
      });
      const exId = fd.get('extraItemId');
      const exQ = Math.ceil(parseFloat(fd.get('extraQty')) || 0);
      if (exId === '__NEW__') {
        const newName = cleanItemName(fd.get('newItemName') || '');
        const newUnit = normStockUnit(fd.get('newItemUnit') || 'cases');
        const newLoc = String(fd.get('newItemLoc') || LOCATIONS[0]);
        const newPar = Math.round((parseFloat(fd.get('newItemPar')) || 1) * 100) / 100;
        if (!newName) { showToast('Enter a name for the new item', 'warn'); return; }
        if (exQ <= 0) { showToast('Enter at least 1 case for the new item', 'warn'); return; }
        if (fd.get('addToCatalog')) {
          const prefix = /freezer/i.test(newLoc) ? 'FRZ' : /cooler/i.test(newLoc) ? 'CLR' : /kitchen dry/i.test(newLoc) ? 'KDG' : 'STK';
          const sku = prefix + '-' + (100 + state.items.length + 1);
          const newItem = normalizeInventoryItem({
            id: uid('itm'), sku, name: newName, location: newLoc, category: 'General',
            unit: newUnit, pack_label: newUnit, units_per_pack: 1,
            on_hand: 0, par: newPar, par_manual: true, par_learned: false,
            cadence: po.cadence || 'M', vendor: po.vendor || '', unit_price: null,
            usage_log: [], discontinued: false
          });
          state.items.push(newItem);
          logActivity('ADD ITEM', `Added ${newItem.name} (${newItem.sku}) via PO ${po.po_number}`);
          nextLines.push({ item_id: newItem.id, name: newItem.name, unit: newItem.unit, qty: exQ, received: 0, price: 0 });
        } else {
          nextLines.push({ item_id: uid('custom'), name: newName, unit: newUnit, qty: exQ, received: 0, price: 0 });
        }
      } else if (exId && exQ > 0) {
        const item = state.items.find(i => i.id === exId);
        if (item) {
          const exist = nextLines.find(l => l.item_id === exId);
          if (exist) exist.qty += exQ;
          else {
            const meta = getCatalogMetaForItem(item);
            nextLines.push({
              item_id: item.id, sku: meta.sku, category: meta.cat, name: item.name,
              unit: meta.orderUnit, qty: exQ, received: 0,
              unit_price: meta.casePrice || meta.unitPrice,
              isWholesaleEst: !!meta.isWholesaleEst,
              packQty: meta.packQty, baseUnit: meta.baseUnit
            });
          }
        }
      }
      if (!nextLines.length) { showToast('PO must have at least 1 item', 'warn'); return; }
      const newPoNum = String(fd.get('poNumber') || '').trim();
      const newConf = String(fd.get('vendorConf') || '').trim();
      const newEta = String(fd.get('expectedArrival') || '').trim();
      if (newPoNum) po.po_number = newPoNum;
      po.vendor_conf = newConf;
      po.expected_arrival = newEta;
      po.lines = nextLines;
      logActivity('PO UPDATED', `${po.po_number}${po.vendor_conf ? ' / Inv ' + po.vendor_conf : ''} (${nextLines.length} items)`);
      saveState();
      closeModal();
      render();
      showToast(`Updated ${po.po_number}`);
    }
    return;
  }

  if (e.target.id === 'form-bulk-menu-paste') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-import menus', 'warn'); return; }
    const lines = String(fd.get('bulkMenuRaw') || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let count = 0;
    lines.forEach(ln => {
      const parts = ln.split(/,|\t/).map(s => s.trim());
      if (parts.length < 2) return;
      const ds = parseFlexibleDate(parts[0]);
      if (!ds) return;
      const title = cleanItemName(parts[1]);
      if (!title) return;
      const isClosed = /closed|holiday/i.test(title) && (parts[2] === '0' || !parts[2]);
      const matchRec = state.recipes.find(r => r.name.toLowerCase() === title.toLowerCase() || r.name.toLowerCase().includes(title.toLowerCase()));
      const plan = parts[2] !== undefined && parts[2] !== '' ? Math.max(0, parseInt(parts[2], 10) || 0) : (isClosed ? 0 : forecastWeekday(ds));
      const hasSrv = parts[3] !== undefined && parts[3] !== '' && !isNaN(parseInt(parts[3], 10));
      const srv = hasSrv ? Math.max(0, parseInt(parts[3], 10)) : null;
      const note = parts.slice(4).join(', ');

      let mp = state.menuPlan.find(m => m.service_date === ds);
      if (!mp) {
        mp = { id: uid('mp'), service_date: ds, status: 'PLANNED', circumstance: 'Normal Day', note: '', logged_by: '' };
        state.menuPlan.push(mp);
      }
      mp.recipe_id = matchRec ? matchRec.id : '';
      mp.custom_title = matchRec ? matchRec.name : title;
      mp.planned_portions = plan;
      if (isClosed) {
        mp.status = 'CLOSED';
        mp.circumstance = 'Closed / Federal Holiday';
        mp.served_portions = 0;
      } else if (hasSrv) {
        mp.served_portions = srv;
        mp.status = 'SERVED';
      } else {
        mp.status = 'PLANNED';
      }
      if (note) mp.note = note;
      count++;
    });
    logActivity('BULK MENU PASTE', `Imported ${count} past/future menu day(s)`);
    saveState();
    closeModal();
    render();
    showToast(`Imported ${count} past/future menu day(s)!`);
    return;
  }

  if (e.target.id === 'form-bulk-menu-grid') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-edit menus', 'warn'); return; }
    const start = String(fd.get('rangeStart') || '');
    const end = String(fd.get('rangeEnd') || '');
    const dates = allMonTueWedFriBetween(start, end);
    let updated = 0;
    dates.forEach(ds => {
      const recId = String(fd.get('rec_' + ds) || '').trim();
      const titleRaw = cleanItemName(fd.get('title_' + ds) || '');
      const plan = Math.max(0, parseInt(fd.get('plan_' + ds), 10) || 0);
      const srvRaw = String(fd.get('srv_' + ds) ?? '').trim();
      const hasSrv = srvRaw !== '' && !isNaN(parseInt(srvRaw, 10));
      const srv = hasSrv ? Math.max(0, parseInt(srvRaw, 10)) : null;
      const rec = recId ? state.recipes.find(r => r.id === recId) : null;
      const finalTitle = titleRaw || (rec ? rec.name : '');
      let mp = state.menuPlan.find(m => m.service_date === ds);
      if (!finalTitle && !recId && !hasSrv) {
        if (mp) { mp.recipe_id = ''; mp.custom_title = ''; mp.status = 'PLANNED'; mp.served_portions = null; }
        return;
      }
      if (!mp) {
        mp = { id: uid('mp'), service_date: ds, status: 'PLANNED', circumstance: 'Normal Day', note: '', logged_by: '' };
        state.menuPlan.push(mp);
      }
      mp.recipe_id = recId;
      mp.custom_title = finalTitle;
      mp.planned_portions = plan;
      if (/closed|holiday/i.test(finalTitle) && plan === 0) {
        mp.status = 'CLOSED';
        mp.circumstance = 'Closed / Federal Holiday';
        mp.served_portions = 0;
      } else if (hasSrv) {
        mp.served_portions = srv;
        mp.status = 'SERVED';
      } else {
        mp.status = 'PLANNED';
        mp.served_portions = null;
      }
      updated++;
    });
    logActivity('BULK MENU SAVE', `Updated ${updated} service day(s) (${start} to ${end})`);
    saveState();
    closeModal();
    render();
    showToast(`Saved ${updated} past & future menu day(s)!`);
    return;
  }

  if (e.target.id === 'form-bulk-menu') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-schedule menus', 'warn'); return; }
    const rid = fd.get('recipeId');
    const rec = state.recipes.find(r => r.id === rid);
    const nDays = parseInt(fd.get('days'), 10) || 7;
    let count = 0;
    serviceDaysBetween(localDateStr(), addDays(localDateStr(), nDays)).forEach(ds => {
      if (state.menuPlan.some(m => m.service_date === ds && m.recipe_id)) return;
      state.menuPlan.push({
        id: uid('mp'), service_date: ds, recipe_id: rid, custom_title: rec ? rec.name : 'Meal',
        menu_type: 'RECIPE', planned_portions: forecastWeekday(ds), status: 'PLANNED'
      });
      count++;
    });
    saveState();
    render();
    showToast(`Scheduled ${count} empty service day(s)`);
    return;
  }

  if (e.target.id === 'form-suggest-recipe') {
    let title = String(fd.get('title') || '').trim();
    let raw = String(fd.get('raw') || '').trim();
    let serv = Number(fd.get('servings')) || 65;
    let photoUrl = String(fd.get('photoUrl') || '').trim();
    const sourceUrl = String(fd.get('url') || '').trim();
    const targetDate = String(fd.get('targetDate') || '').trim();

    const finalizeSuggestion = (finalTitle, finalServ, finalRaw, finalPhoto) => {
      const parsedRec = parsePastedRecipe(finalTitle + '\nServings: ' + finalServ + '\n' + finalRaw);
      parsedRec.name = finalTitle;
      parsedRec.base_servings = finalServ;
      if (finalPhoto) parsedRec.photo_url = finalPhoto;
      state.recipeSuggestions = state.recipeSuggestions || [];
      state.recipeSuggestions.unshift({
        id: uid('rsug'),
        title: finalTitle,
        servings: finalServ,
        target_date: targetDate,
        raw: finalRaw,
        source_url: sourceUrl,
        parsed_recipe: parsedRec,
        suggested_by: getActiveUser().name,
        status: 'PENDING',
        created_at: localDateStr()
      });
      const mgrs = (state.users || []).filter(u => u.active !== false && ['ADMIN', 'MANAGER'].includes(normalizeRole(u.role)));
      const summary = `${finalTitle} (Base ${finalServ}${targetDate ? ', target ' + targetDate : ''}, ${(parsedRec.ingredients || []).length} ingredients) suggested by ${getActiveUser().name}`;
      state.messages = state.messages || [];
      state.messages.push({
        id: uid('msg'), sender_id: getActiveUser().id, sender_name: getActiveUser().name, sender_role: getActiveUser().role,
        recipient_id: 'ALL', recipient_name: 'Everyone', priority: 'urgent',
        body: `Recipe Suggestion for Approval — ${summary}`,
        created_at_ms: Date.now(), timestamp_label: nowStamp()
      });
      logActivity('RECIPE SUGGESTED', `Suggested "${finalTitle}"`);
      saveState();
      render();
      sendBackgroundAlert(mgrs, `Recipe Approval Needed: ${finalTitle}`, `Please review and approve ${summary} in Kitchen & Menu → Recipes.`).then(sent => {
        if (sent) showToast('Auto-sent background Email alert to Management!');
      });
      const links = buildNotifyLinks(mgrs, `Recipe Approval Needed: ${finalTitle}`, `Please review and approve ${summary} in Kitchen & Menu → Recipes.`);
      openModal('Recipe Suggestion Submitted — Notify Management', `
        <div class="space-y-3 text-xs">
          <p><strong>${esc(finalTitle)}</strong> has been formatted and sent to Management for approval.</p>
          <div class="p-2.5 rounded bg-black/5">${esc(summary)}</div>
          <div class="flex flex-wrap gap-2">
            <a href="${links.mailHref}" class="kms-btn-navy flex-1 py-2 text-center font-semibold">Email Management</a>
            <button type="button" data-close-modal="1" class="kms-btn-alt px-4 py-2 font-semibold">Done</button>
          </div>
        </div>
      `);
    };

    if (sourceUrl && !raw) {
      const btn = document.getElementById('btn-submit-sug');
      if (btn) { btn.disabled = true; btn.textContent = 'Fetching & Submitting...'; }
      invokeScrapeRecipe({ url: sourceUrl }).then(data => {
        if (!data || !data.ok || !data.recipe) throw new Error((data && data.error) || 'Could not fetch URL');
        const rec = data.recipe;
        const lines = ['Ingredients:', ...(rec.ingredients || [])];
        if (rec.steps && rec.steps.length) lines.push('', 'Directions:', ...rec.steps.map((st, idx) => `${idx + 1}. ${st}`));
        finalizeSuggestion(title || rec.name || 'Suggested Recipe', Number(rec.base_servings) || serv, lines.join('\n'), photoUrl || rec.image || '');
      }).catch(err => {
        showToast(String(err.message || err), 'warn');
      }).finally(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Submit & Notify Management'; }
      });
      return;
    }

    if (!title || !raw) { showToast('Enter a recipe URL or title + ingredients/directions', 'warn'); return; }
    finalizeSuggestion(title, serv, raw, photoUrl);
    return;
  }

  if (e.target.id === 'form-search-web-recipes') {
    const q = String(fd.get('q') || '').trim();
    if (!q) return;
    state._webRecQuery = q;
    const btn = document.getElementById('btn-search-web-rec');
    if (btn) { btn.disabled = true; btn.textContent = 'Searching...'; }
    invokeScrapeRecipe({ query: q }).then(data => {
      if (!data || !data.ok || !Array.isArray(data.results)) throw new Error('fallback');
      state._webRecResults = data.results;
      render();
    }).catch(() => {
      Promise.allSettled([
        fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q)).then(r => r.json()),
        fetch('https://dummyjson.com/recipes/search?q=' + encodeURIComponent(q)).then(r => r.json())
      ]).then(([mdbRes, djRes]) => {
        const results = [];
        const seen = new Set();
        if (mdbRes.status === 'fulfilled' && Array.isArray(mdbRes.value.meals)) {
          mdbRes.value.meals.forEach(m => {
            const key = String(m.strMeal || '').toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            const rawLines = [];
            for (let k = 1; k <= 20; k++) {
              const ing = String(m['strIngredient' + k] || '').trim();
              const meas = String(m['strMeasure' + k] || '').trim();
              if (ing) rawLines.push((meas ? meas + ' ' : '') + ing);
            }
            results.push({
              uid: 'mdb-' + m.idMeal, type: 'direct', title: m.strMeal,
              category: m.strCategory || 'Main Entree',
              subtitle: 'TheMealDB · ' + (m.strCategory || 'Main') + (m.strArea ? ' · ' + m.strArea : ''),
              base_servings: 4, prep_min: 20, cook_min: 35, rawLines,
              steps: String(m.strInstructions || '').split(/\r?\n+/).map(s => s.trim()).filter(Boolean)
            });
          });
        }
        if (djRes.status === 'fulfilled' && Array.isArray(djRes.value.recipes)) {
          djRes.value.recipes.forEach(d => {
            const key = String(d.name || '').toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            results.push({
              uid: 'dj-' + d.id, type: 'direct', title: d.name,
              category: (Array.isArray(d.mealType) && d.mealType[0]) || 'Main Entree',
              subtitle: 'Open Recipe · ' + (d.cuisine || 'Classic') + (d.servings ? ' · Serves ' + d.servings : ''),
              base_servings: Number(d.servings) || 4,
              prep_min: Number(d.prepTimeMinutes) || 20,
              cook_min: Number(d.cookTimeMinutes) || 35,
              photo_url: d.image || '', rawLines: Array.isArray(d.ingredients) ? d.ingredients : [],
              steps: Array.isArray(d.instructions) ? d.instructions : []
            });
          });
        }
        state._webRecResults = results;
        render();
      }).catch(() => {
        state._webRecResults = [];
        render();
        showToast('Web search offline — try Search Recipe Sites ↗ or paste a URL', 'warn');
      });
    });
    return;
  }

  if (e.target.id === 'form-import-recipe-url') {
    if (!isMgmtOrHigher()) { showToast('Only Management can import recipes', 'warn'); return; }
    const targetUrl = String(fd.get('url') || '').trim();
    importRecipeFromUrl(targetUrl, document.getElementById('btn-import-url'));
    return;
  }

  if (e.target.id === 'form-edit-recipe') {
    if (!isMgmtOrHigher()) { showToast('Only Management can edit recipes', 'warn'); return; }
    const r = state.recipes.find(x => x.id === fd.get('recId'));
    if (r) {
      r.name = String(fd.get('name') || '').trim() || r.name;
      r.category = String(fd.get('category') || '').trim() || 'Main Entree';
      r.base_servings = Math.max(1, parseFloat(fd.get('baseServings')) || r.base_servings || 65);
      r.prep_min = Math.max(0, parseInt(fd.get('prepMin'), 10) || 0);
      r.cook_min = Math.max(0, parseInt(fd.get('cookMin'), 10) || 0);
      r.allergens = String(fd.get('allergens') || '').split(',').map(s => s.trim()).filter(Boolean);
      r.photo_url = String(fd.get('photoUrl') || '').trim();
      r.notes = String(fd.get('notes') || '').trim();
      r.steps = String(fd.get('stepsText') || '').split(/\r?\n+/).map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
      delete r.directions;
      (r.ingredients || []).forEach(ing => recomputeIngredientPer100(ing, r.base_servings));
      logActivity('RECIPE UPDATED', `Updated "${r.name}"`);
      closeModal();
      saveState();
      render();
      showToast(`Saved "${r.name}"`);
    }
    return;
  }

  if (e.target.id === 'form-review-recsug') {
    if (!isMgmtOrHigher()) { showToast('Only Management can edit suggestions', 'warn'); return; }
    const s = (state.recipeSuggestions || []).find(x => x.id === fd.get('sugId'));
    if (s) {
      const action = (e.submitter && e.submitter.value) || 'approve';
      const title = String(fd.get('title') || '').trim() || s.title;
      const serv = Math.max(1, parseFloat(fd.get('servings')) || 65);
      const ingText = String(fd.get('ingText') || '').trim();
      const stepsText = String(fd.get('stepsText') || '').trim();
      const targetDate = String(fd.get('targetDate') || '').trim();
      const rawCombined = `Ingredients:\n${ingText}\n\nDirections:\n${stepsText}`;
      const parsed = parsePastedRecipe(`${title}\nServings: ${serv}\n${rawCombined}`);
      parsed.name = title;
      parsed.category = String(fd.get('category') || '').trim() || 'Main Entree';
      parsed.base_servings = serv;
      parsed.prep_min = Math.max(0, parseInt(fd.get('prepMin'), 10) || 0);
      parsed.cook_min = Math.max(0, parseInt(fd.get('cookMin'), 10) || 0);
      parsed.allergens = String(fd.get('allergens') || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      parsed.photo_url = String(fd.get('photoUrl') || '').trim();
      parsed.notes = String(fd.get('notes') || '').trim();

      s.title = title;
      s.servings = serv;
      s.target_date = targetDate;
      s.raw = rawCombined;
      s.parsed_recipe = parsed;

      if (action === 'approve') {
        parsed.id = uid('rec');
        state.recipes.unshift(parsed);
        state.selectedRecipeId = parsed.id;
        state._recSearch = '';
        if (targetDate) {
          const ex = state.menuPlan.find(m => m.service_date === targetDate);
          if (ex) { ex.recipe_id = parsed.id; ex.custom_title = parsed.name; }
          else state.menuPlan.push({ id: uid('mp'), service_date: targetDate, recipe_id: parsed.id, custom_title: parsed.name, planned_portions: forecastWeekday(targetDate, parsed.id), status: 'PLANNED' });
        }
        s.status = 'APPROVED';
        logActivity('RECIPE APPROVED', `Reviewed & approved "${parsed.name}" (suggested by ${s.suggested_by})`);
        closeModal();
        saveState();
        render();
        showToast(`Approved & added "${parsed.name}" to Recipe Book!`);
      } else {
        logActivity('SUGGESTION EDITED', `Edited pending suggestion "${title}"`);
        closeModal();
        saveState();
        render();
        showToast(`Saved edits to pending suggestion "${title}"`);
      }
    }
    return;
  }

  if (e.target.id === 'form-add-rec-ing') {
    if (!isMgmtOrHigher()) { showToast('Only Management can edit recipes', 'warn'); return; }
    const r = state.recipes.find(x => x.id === e.target.dataset.recId);
    if (r) {
      const ingObj = {
        name: cleanItemName(fd.get('name') || ''),
        qty: parseFloat(fd.get('qty')) || 1,
        unit: normUnit(fd.get('unit') || 'cups'),
        inv_id: String(fd.get('inv_id') || ''),
        stock_per_unit: parseFloat(fd.get('stock_per_unit')) || 0,
        per100: 0
      };
      recomputeIngredientPer100(ingObj, r.base_servings);
      r.ingredients = r.ingredients || [];
      r.ingredients.push(ingObj);
      saveState();
      render();
      showToast(`Added ${ingObj.name}`);
    }
    return;
  }

  if (e.target.id === 'form-paste-recipe') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can add recipes directly', 'warn'); return; }
    const rec = parsePastedRecipe(fd.get('raw'));
    state.recipes.push(rec);
    state.selectedRecipeId = rec.id;
    state._recSearch = '';
    logActivity('ADD RECIPE', rec.name);
    saveState();
    render();
    showToast(`Saved recipe: ${rec.name}`);
    return;
  }

  if (e.target.id === 'form-bulk-paste-recipes') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-import recipes', 'warn'); return; }
    const blocks = String(fd.get('bulkRaw') || '')
      .split(/\r?\n\s*---+\s*\r?\n/)
      .map(b => b.trim())
      .filter(Boolean);
    let added = 0, updated = 0;
    blocks.forEach(blk => {
      const parsed = parsePastedRecipe(blk);
      const existing = state.recipes.find(r => r.name.trim().toLowerCase() === parsed.name.trim().toLowerCase());
      if (existing) {
        existing.base_servings = parsed.base_servings;
        existing.allergens = parsed.allergens;
        existing.steps = parsed.steps;
        existing.ingredients = parsed.ingredients;
        delete existing.directions;
        updated++;
      } else {
        state.recipes.unshift(parsed);
        added++;
      }
    });
    if (state.recipes[0]) state.selectedRecipeId = state.recipes[0].id;
    state._recSearch = '';
    logActivity('BULK RECIPES', `Added ${added}, updated ${updated} recipe(s)`);
    closeModal();
    saveState();
    render();
    showToast(`Bulk import complete: ${added} added, ${updated} updated!`);
    return;
  }

  if (e.target.id === 'form-bulk-edit-recipes') {
    if (!isMgmtOrHigher()) { showToast('Only ADMIN or MANAGER can bulk-edit recipes', 'warn'); return; }
    let count = 0;
    const delRecIds = [];
    state.recipes.forEach(r => {
      if (fd.get('delrec_' + r.id)) {
        delRecIds.push(r.id);
        return;
      }
      const newName = String(fd.get('name_' + r.id) || '').trim();
      if (!newName) return;
      const base = Math.max(1, parseFloat(fd.get('base_' + r.id)) || r.base_servings || 65);
      r.name = newName;
      r.category = String(fd.get('cat_' + r.id) || '').trim() || 'Main Entree';
      r.base_servings = base;
      r.prep_min = Math.max(0, parseInt(fd.get('prep_' + r.id), 10) || 0);
      r.cook_min = Math.max(0, parseInt(fd.get('cook_' + r.id), 10) || 0);
      r.allergens = String(fd.get('allg_' + r.id) || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const ingLines = String(fd.get('ing_' + r.id) || '').split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
      r.ingredients = ingLines.map(ln => parseIngredientLine(ln, base));
      r.steps = String(fd.get('step_' + r.id) || '').split(/\r?\n+/).map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
      delete r.directions;
      count++;
    });
    if (delRecIds.length) {
      state.recipes = state.recipes.filter(r => !delRecIds.includes(r.id));
      if (sbClient) sbClient.from('kms_recipes').delete().in('id', delRecIds).then(() => {});
      if (delRecIds.includes(state.selectedRecipeId)) state.selectedRecipeId = state.recipes[0]?.id || '';
    }
    logActivity('BULK EDIT RECIPES', `Updated ${count}, deleted ${delRecIds.length} recipe(s)`);
    closeModal();
    saveState();
    render();
    showToast(`Saved ${count} recipe(s)${delRecIds.length ? `, deleted ${delRecIds.length}` : ''}!`);
    return;
  }

  if (e.target.id === 'form-add-tag') {
    const days = parseInt(fd.get('days'), 10) || 7;
    const today = localDateStr();
    state.storageTags.unshift({
      id: uid('tag'), item_name: fd.get('itemName').trim(), tag_category: fd.get('tagCategory'),
      zone: fd.get('zone'), qty_label: fd.get('qtyLabel').trim(), prep_date: today,
      prep_time: new Date().toTimeString().slice(0, 5), use_by_date: addDays(today, days - 1),
      tagged_by: getActiveUser().name, status: 'STORED'
    });
    logActivity('DATE TAG', fd.get('itemName').trim());
    saveState();
    render();
    showToast('Date label logged');
    return;
  }

  if (e.target.id === 'form-log-served') {
    const ds = fd.get('date');
    const pl = parseInt(fd.get('planned'), 10) || 0;
    const sv = parseInt(fd.get('served'), 10) || 0;
    let mp = state.menuPlan.find(m => m.service_date === ds);
    if (!mp) { mp = { id: uid('mp'), service_date: ds, custom_title: 'Community Meal', status: 'SERVED' }; state.menuPlan.push(mp); }
    mp.planned_portions = pl;
    mp.served_portions = sv;
    mp.circumstance = fd.get('circumstance') || 'Normal Day';
    mp.status = 'SERVED';
    mp.note = fd.get('note') || '';
    logActivity('PATRONS SERVED', `${ds}: ${sv} served`);
    saveState();
    render();
    showToast(`Saved ${sv} patrons served`);
    return;
  }

  if (e.target.id === 'form-edit-srv') {
    const mp = state.menuPlan.find(m => m.id === fd.get('id'));
    if (mp) {
      mp.service_date = fd.get('date');
      mp.planned_portions = parseInt(fd.get('planned'), 10) || 0;
      mp.served_portions = parseInt(fd.get('served'), 10) || 0;
      mp.circumstance = fd.get('circumstance') || 'Normal Day';
      mp.note = fd.get('note') || '';
      mp.status = 'SERVED';
      logActivity('EDIT SERVED', `${mp.service_date}: ${mp.served_portions} served`);
      saveState();
      closeModal();
      render();
      showToast('Updated past service record');
    }
    return;
  }

  if (e.target.id === 'form-bulk-paste') {
    const lines = String(fd.get('csv') || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let count = 0;
    lines.forEach(ln => {
      const parts = ln.split(/,|\t/).map(s => s.trim());
      if (parts.length < 2) return;
      const ds = parseFlexibleDate(parts[0]);
      if (!ds) return;
      const sv = parseInt(parts[1], 10);
      if (isNaN(sv) || sv < 0) return;
      const note = parts.slice(2).join(', ');
      let mp = state.menuPlan.find(m => m.service_date === ds);
      if (!mp) { mp = { id: uid('mp'), service_date: ds, custom_title: 'Community Meal', planned_portions: sv, status: 'SERVED' }; state.menuPlan.push(mp); }
      mp.served_portions = sv;
      mp.status = 'SERVED';
      if (note) mp.note = note;
      count++;
    });
    logActivity('BULK PASTE SERVED', `Imported ${count} past attendance record(s)`);
    saveState();
    closeModal();
    render();
    showToast(`Imported ${count} past attendance record(s)`);
    return;
  }

  if (e.target.id === 'form-bulk-served') {
    let count = 0;
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith('sv_') || v === '') continue;
      const ds = k.slice(3);
      const sv = parseInt(v, 10);
      if (isNaN(sv) || sv < 0) continue;
      let mp = state.menuPlan.find(m => m.service_date === ds);
      if (!mp) { mp = { id: uid('mp'), service_date: ds, custom_title: 'Community Meal', planned_portions: sv, status: 'SERVED' }; state.menuPlan.push(mp); }
      mp.served_portions = sv;
      mp.status = 'SERVED';
      mp.note = fd.get('nt_' + ds) || mp.note || '';
      count++;
    }
    logActivity('BULK SERVED', `Saved ${count} past service count(s)`);
    saveState();
    closeModal();
    render();
    showToast(`Saved ${count} past attendance record(s)`);
    return;
  }

  if (e.target.id === 'form-waste') {
    const x = state.items.find(i => i.id === fd.get('itemId'));
    const q = parseFloat(fd.get('qty')) || 0;
    const txType = String(fd.get('txType') || 'WASTE');
    const reason = String(fd.get('reason') || '');
    if (!x || q <= 0) return;
    x.on_hand = Math.round(Math.max(0, Number(x.on_hand || 0) - q) * 100) / 100;
    const effUnit = getEffectiveUnitPrice(x).price;
    const costImpact = Math.round(q * effUnit * 100) / 100;
    state.transactions.unshift({
      id: uid('tx'), tx_date: localDateStr(), tx_type: txType, item_id: x.id, item_name: x.name,
      unit: x.unit, qty: -q, cost_impact: costImpact, reason, staff_name: getActiveUser().name
    });
    logActivity(txType, `-${q} ${x.unit} ${x.name} (${reason})`);
    saveState();
    render();
    showToast(`Logged ${txType === 'STORE_USE' ? 'Store-Use' : 'Waste/Crack'}: -${q} ${x.unit} ${x.name}`, txType === 'WASTE' ? 'warn' : 'ok');
    return;
  }

  if (e.target.id === 'form-edit-usr') {
    const u = state.users.find(x => x.id === fd.get('userId'));
    const me = getActiveUser();
    const isSelfOwner = !!(u && u.id === 'usr-1' && me.id === 'usr-1');
    const newRole = isSelfOwner ? 'ADMIN' : normalizeRole(fd.get('role'));
    if (!u || (!canManageUserAccount(me, u) && !isSelfOwner) || (!isSelfOwner && !(isAdminRole(me) ? (ROLE_RANK[newRole] || 0) <= (ROLE_RANK[normalizeRole(me.role)] || 0) : (ROLE_RANK[newRole] || 0) < (ROLE_RANK[normalizeRole(me.role)] || 0)))) {
      showToast('You can only assign roles within your permission level', 'warn');
      return;
    }
    u.name = String(fd.get('name') || '').trim() || u.name;
    u.initials = String(fd.get('initials') || '').trim().toUpperCase() || u.initials;
    u.role = newRole;
    u.email = String(fd.get('email') || '').trim();
    logActivity('USER UPDATED', `${u.name} (${u.role})`);
    closeModal();
    saveState();
    render();
    showToast(`Updated ${u.name} (${u.role})`);
    return;
  }

  if (e.target.id === 'form-add-user') {
    const me = getActiveUser();
    const reqRole = normalizeRole(fd.get('role'));
    if (!isMgmtOrHigher(me) || !(isAdminRole(me) ? (ROLE_RANK[reqRole] || 0) <= (ROLE_RANK[normalizeRole(me.role)] || 0) : (ROLE_RANK[reqRole] || 0) < (ROLE_RANK[normalizeRole(me.role)] || 0))) {
      showToast('You can only create accounts with a role lower than yours', 'warn');
      return;
    }
    const startPin = String(fd.get('pin') || '');
    if (cloudManaged() && sbClient) {
      if (!sessionPin) { requireRelogin(); return; }
      const nu = { id: uid('usr'), name: fd.get('name').trim(), role: reqRole, initials: fd.get('initials').trim().toUpperCase(),
        must_change_pin: true, active: true, onboarding_completed: false, completed_training_ids: [], email: String(fd.get('email') || '').trim() };
      (async () => {
        const up = await sbClient.from('kms_users').upsert({ id: nu.id, name: nu.name, role: nu.role, initials: nu.initials, active: true,
          onboarding_completed: false, completed_training_ids: [], email: nu.email }, { onConflict: 'id' });
        if (up.error) { showToast('Could not create the account: ' + up.error.message, 'warn'); return; }
        const res = await rpcSetPin(me.id, sessionPin, nu.id, startPin, true);
        if (!res || !res.ok) {
          await sbClient.from('kms_users').delete().eq('id', nu.id);
          showToast(pinErrorText(res), 'warn');
          return;
        }
        state.users.push(nu);
        logActivity('ADD USER', `${nu.name} (${nu.role})`);
        saveState();
        render();
        showToast(`Added ${nu.name}`);
      })();
      return;
    }
    const u = makeUser(uid('usr'), fd.get('name').trim(), reqRole, fd.get('initials').trim().toUpperCase(), startPin, true);
    u.email = String(fd.get('email') || '').trim();
    state.users.push(u);
    logActivity('ADD USER', `${u.name} (${u.role})`);
    saveState();
    render();
    showToast(`Added ${u.name}`);
    return;
  }

  if (e.target.classList && e.target.classList.contains('form-edit-msg')) {
    const msgId = e.target.dataset.msgId;
    const u = getActiveUser();
    const m = (state.messages || []).find(x => x.id === msgId);
    const newBody = String(fd.get('body') || '').trim();
    if (m && newBody && (m.sender_id === u.id || isMgmtOrHigher(u))) {
      m.body = newBody;
      m.priority = fd.get('urgent') ? 'urgent' : 'normal';
      m.edited = true;
      state._editingMsgId = null;
      logActivity('CHAT EDITED', `Updated message in ${m.recipient_id === 'ALL' ? 'Broadcast' : 'DM'}`);
      saveState();
      showChatModal();
      showToast('Message updated');
    }
    return;
  }

  if (e.target.id === 'form-chat') {
    const u = getActiveUser();
    const recId = String(fd.get('recipientId') || 'ALL');
    const recUser = recId === 'ALL' ? null : state.users.find(x => x.id === recId);
    state.messages.push({
      id: uid('msg'), sender_id: u.id, sender_name: u.name, sender_role: u.role,
      recipient_id: recId, recipient_name: recUser ? recUser.name : 'Everyone',
      priority: fd.get('urgent') ? 'urgent' : 'normal',
      body: fd.get('body').trim(), created_at_ms: Date.now(), timestamp_label: nowStamp()
    });
    if (fd.get('urgent') || recId !== 'ALL') {
      const chatRecips = recId === 'ALL'
        ? (state.users || []).filter(x => x.active !== false && x.id !== u.id)
        : (recUser ? [recUser] : []);
      sendBackgroundAlert(
        chatRecips,
        `Salvation Army KMS ${recId === 'ALL' ? 'Urgent Alert' : 'Private DM'} from ${u.name}`,
        `${u.name}: ${fd.get('body').trim()}`
      ).then(sent => { if (sent) showToast('Auto-sent background Email notification!'); });
    }
    saveState();
    showChatModal();
    return;
  }

  if (e.target.id === 'form-save-announcement') {
    const annId = String(fd.get('annId') || '').trim();
    const title = String(fd.get('title') || '').trim();
    const body = String(fd.get('body') || '').trim();
    const priority = String(fd.get('priority') || 'reminder');
    const alertAt = String(fd.get('alertAt') || '').trim();
    const repeatRule = String(fd.get('repeat') || 'none');
    const expiresAt = String(fd.get('expiresAt') || '').trim();
    const repeatDays = fd.getAll('repeatDays').map(Number).filter(n => !isNaN(n));
    if (!title || !body) return;
    state.announcements = state.announcements || [];
    if (annId) {
      const idx = state.announcements.findIndex(x => x.id === annId);
      if (idx >= 0) {
        state.announcements[idx] = {
          ...state.announcements[idx],
          title, body, priority, alert_at: alertAt, repeat_rule: repeatRule,
          repeat_days: repeatDays, expires_at: expiresAt
        };
        logActivity('ANNOUNCEMENT UPDATED', title);
        showToast('Announcement updated');
      }
    } else {
      state.announcements.unshift({
        id: uid('ann'), priority, title, body, alert_at: alertAt, repeat_rule: repeatRule,
        repeat_days: repeatDays, expires_at: expiresAt, author: getActiveUser().name,
        created_at: localDateStr(), dismissed_by: {}
      });
      logActivity('ANNOUNCEMENT POSTED', title);
      showToast('Announcement posted');
    }
    closeModal();
    saveState();
    render();
    return;
  }
});

// Auto-Lock & Session Management
function resetInactivity() {
  clearTimeout(inactivityTimer);
  if (!state.autoLockMinutes || state.isLocked) return;
  inactivityTimer = setTimeout(() => {
    if (!state.isLocked) logActivity('AUTO LOCK', `${getActiveUser().name} auto-locked after inactivity`);
    state.isLocked = true;
    setSessionUnlocked(false);
    setSessionPin('');
    saveState();
    render();
  }, state.autoLockMinutes * 60 * 1000);
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, resetInactivity, { passive: true }));

function setSessionUnlocked(unlocked) {
  try {
    if (unlocked) sessionStorage.setItem('sa_kms_session_unlocked', '1');
    else sessionStorage.removeItem('sa_kms_session_unlocked');
  } catch (e) {}
}

function isSessionUnlocked() {
  try { return sessionStorage.getItem('sa_kms_session_unlocked') === '1'; } catch (e) { return false; }
}

function lockOnExit() {
  if (!state.isLocked) logActivity('LOGOUT', `${getActiveUser().name} session ended on exit`);
  state.isLocked = true;
  setSessionUnlocked(false);
  setSessionPin('');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
window.addEventListener('pagehide', lockOnExit);
window.addEventListener('beforeunload', lockOnExit);

// Boot
ensureOwnerIntegrity();
if (!isSessionUnlocked()) state.isLocked = true;
if (state.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.style.fontSize = ['100%', '112.5%', '125%'][state.textZoom || 0];
function maybeAutoStartInteractiveTour() {
  const params = new URLSearchParams(window.location.search);
  const forceParam = params.get('tour') === '1' || params.get('demo') === '1';
  const u = getActiveUser();
  const alreadyDone = localStorage.getItem('kms_tour_completed') === '1' ||
                      localStorage.getItem('kms_tour_autostart') === '0' ||
                      Boolean(u && u.tour_completed);
  if (!forceParam && alreadyDone) return;
  const steps = getRoleTourSteps();
  if (steps.length) {
    tourState.active = true;
    tourState.stepIndex = 0;
    state.activeTab = steps[0].tab;
  }
}

maybeAutoStartInteractiveTour();
pruneExpiredAlerts();
render();
initSupabase();
setInterval(checkScheduledAlerts, 15000);

// === SECTION 3: UNIFIED WEEKLY/MONTHLY ORDERING EVENT HANDLERS ===
if (!window.__sec3OrdersWired) {
  window.__sec3OrdersWired = true;

  const buildOrderSuggestions = () => {
    const hz = Number(state._orderHorizon || 7);
    const days = serviceDaysBetween(localDateStr(), addDays(localDateStr(), hz === 1 ? 4 : hz));
    const useDays = hz === 1 ? days.slice(0, 1) : days;
    const parMult = hz === 30 ? 4 : (hz === 1 ? 0.25 : 1);

    return (state.items || []).filter(x => !x.discontinued).map(x => {
      const meta = getCatalogMetaForItem(x);
      const isPerishable = /produce|dairy|milk|deli|fresh|cooler/i.test(meta.cat + ' ' + (x.location || ''));
      const effMult = (hz === 30 && isPerishable) ? 1 : parMult;
      const parTarget = Math.ceil(Number(x.par || 0) * effMult);
      const { netAvailable } = committedAndNetAvailable(x, useDays);
      const deficit = Math.max(0, parTarget - netAvailable);
      if (deficit <= 0) return null;
      const orderQty = Math.max(1, Math.ceil(deficit / (meta.packQty || 1)));
      return {
        itemId: x.id,
        vendor: meta.vendor,
        line: {
          item_id: x.id,
          sku: meta.sku,
          category: meta.cat,
          name: x.name,
          qty: orderQty,
          unit: meta.orderUnit,
          unit_price: meta.casePrice || meta.unitPrice,
          isWholesaleEst: !!meta.isWholesaleEst,
          packQty: meta.packQty,
          baseUnit: meta.baseUnit
        }
      };
    }).filter(Boolean);
  };

  const addLineToVendorPO = (vendor, line) => {
    state.purchaseOrders = state.purchaseOrders || [];
    let po = state.purchaseOrders.find(p => p.vendor === vendor && p.status === 'requested');
    if (!po) {
      const pfx = /jordan/i.test(vendor) ? 'JB-' : 'MD-';
      po = {
        id: uid(),
        po_number: pfx + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + (state.purchaseOrders.length + 1),
        vendor,
        status: 'requested',
        created_at: localDateStr(),
        created_by: getActiveUser()?.name || 'Staff',
        lines: /jordan/i.test(vendor)
          ? [{ sku: 'FEE-DEL', category: 'Delivery', name: 'Delivery Charge', qty: 1, unit: 'fee', unit_price: 10.00, packQty: 1, baseUnit: 'fee', isFee: true }]
          : []
      };
      state.purchaseOrders.unshift(po);
    }
    const ex = po.lines.find(l => l.sku === line.sku && l.name === line.name && l.unit === line.unit && !l.isFee);
    if (ex) ex.qty = Number(ex.qty || 0) + Number(line.qty || 0);
    else po.lines.unshift(line);
    return po;
  };

  document.addEventListener('change', (e) => {
    if (e.target.id === 'order-hz') { state._orderHorizon = Number(e.target.value || 7); render(); }
    if (e.target.id === 'ord-vendor-filter') { state._orderVendor = e.target.value || 'ALL'; render(); }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-ord-cat-add')) {
      const c = VENDOR_CATALOG[parseInt(document.getElementById('ord-cat-idx')?.value || '0', 10)];
      const mode = document.getElementById('ord-cat-mode')?.value || 'case';
      const qty = Math.max(0.5, parseFloat(document.getElementById('ord-cat-qty')?.value || '1'));
      if (c) {
        const sng = mode === 'single';
        const invMatch = (state.items || []).find(it => it.name.toLowerCase() === c.name.toLowerCase());
        const po = addLineToVendorPO(c.vendor, {
          item_id: invMatch?.id || null,
          sku: c.sku,
          category: c.cat,
          name: c.name,
          qty,
          unit: sng ? 'ea' : c.orderUnit,
          unit_price: sng ? c.singlePrice : c.casePrice,
          packQty: sng ? 1 : c.packQty,
          baseUnit: c.baseUnit,
          catchWeight: !!c.catchWeight
        });
        saveState();
        showToast(`Added [${c.sku}] ${c.name} to ${po.po_number}`);
        render();
      }
      return;
    }

    const oneSug = e.target.closest('[data-add-sug-id]');
    if (oneSug) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const itemId = oneSug.getAttribute('data-add-sug-id');
      const found = buildOrderSuggestions().find(s => String(s.itemId) === String(itemId));
      if (found) {
        const po = addLineToVendorPO(found.vendor, found.line);
        saveState();
        showToast(`Added ${found.line.name} to ${po.po_number}`);
        render();
      }
      return;
    }

    const bulkBtn = e.target.closest('#btn-req-all-jb, #btn-req-all-md');
    if (bulkBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const tv = bulkBtn.id === 'btn-req-all-jb' ? 'Jordan Banana' : 'Marberger Dairy';
      const list = buildOrderSuggestions().filter(s => s.vendor === tv);
      if (!list.length) { showToast(`No shortages for ${tv} in this window`); return; }
      let po;
      list.forEach(s => { po = addLineToVendorPO(s.vendor, s.line); });
      saveState();
      showToast(`Added ${list.length} ${tv} items to ${po.po_number}`);
      render();
      return;
    }

    const actBtn = e.target.closest('[data-ord-approve], [data-ord-copy], [data-ord-del], [data-ord-recv]');
    if (actBtn) {
      const id = actBtn.getAttribute('data-ord-approve') || actBtn.getAttribute('data-ord-copy') || actBtn.getAttribute('data-ord-del') || actBtn.getAttribute('data-ord-recv');
      const po = (state.purchaseOrders || []).find(p => String(p.id) === String(id));
      if (!po) return;
      if (actBtn.hasAttribute('data-ord-del')) {
        state._deletedPoIds = [...new Set([...(state._deletedPoIds || []), po.id])]; state.purchaseOrders = state.purchaseOrders.filter(p => p !== po); if (typeof sbClient !== "undefined" && sbClient) { try { sbClient.from("kms_purchase_orders").delete().eq("id", po.id); } catch (_) {} }
        saveState(); render(); return;
      }
      if (actBtn.hasAttribute('data-ord-recv')) {
        state.activeTab = 'receive'; render(); return;
      }
      const canSeePrices = isMgmtOrHigher(getActiveUser());
      const lines = po.lines || [];
      const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0), 0);
      const txt = [
        `PURCHASE ORDER: ${po.po_number} (${po.vendor})`,
        'SHIP TO: The Salvation Army Butler · 92 Race St., Butler, PA 16003 · NEED BY 1:00 PM · Net 7 Days · Tax Exempt',
        ...lines.map(l => canSeePrices
          ? `- [${l.sku || ''}] ${l.qty} ${l.unit} ${l.name} @ ${Number(l.unit_price || 0).toFixed(2)} = ${(Number(l.qty || 0) * Number(l.unit_price || 0)).toFixed(2)}`
          : `- [${l.sku || ''}] ${l.qty} ${l.unit} ${l.name}`
        ),
        ...(canSeePrices ? [`ESTIMATED INVOICE TOTAL: ${total.toFixed(2)}`] : [])
      ].join('\n');
      navigator.clipboard?.writeText(txt);
      if (actBtn.hasAttribute('data-ord-approve')) {
        po.status = 'ordered';
        po.approved_by = getActiveUser()?.name || 'Manager';
        po.approved_at = localDateStr();
        saveState();
        const to = /jordan/i.test(po.vendor) ? 'orders@jordanbanana.com' : '';
        window.open(`mailto:${to}?subject=${encodeURIComponent('Approved Order ' + po.po_number + ' - Salvation Army Butler')}&body=${encodeURIComponent(txt)}`, '_blank');
        showToast(isMgmtOrHigher(getActiveUser()) ? `Approved & Placed ${po.po_number} (${total.toFixed(2)}) — copied to clipboard!` : `Approved & Placed ${po.po_number} — copied to clipboard!`);
        render();
      } else {
        showToast('Order sheet copied to clipboard!');
      }
    }
  });
}


// === SECTION 5 PART 1: UNDO DAILY DEDUCTION ===
document.addEventListener('click', (e) => {
  const undoBtn = e.target.closest('[data-undo-tx]');
  if (!undoBtn) return;
  const txId = undoBtn.getAttribute('data-undo-tx');
  const idx = (state.transactions || []).findIndex(t => t.id === txId);
  if (idx === -1) return;
  const tx = state.transactions[idx];
  const item = (state.items || []).find(i => i.id === tx.item_id);
  if (item && Number(tx.qty) < 0) {
    item.on_hand = Math.round((Number(item.on_hand || 0) + Math.abs(Number(tx.qty))) * 100) / 100;
  }
  state.transactions.splice(idx, 1);
  logActivity('UNDO DEDUCTION', `Restored ${Math.abs(Number(tx.qty))} ${tx.unit} ${tx.item_name}`);
  saveState();
  render();
  showToast(`Restored ${Math.abs(Number(tx.qty))} ${tx.unit} ${tx.item_name} to Living Stock`);
});


// === SECTION 5 PART 2: 1-CLICK TODAY PREP STOCK DEDUCTION ===
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-deduct-today-prep]');
  if (!btn) return;
  const mpId = btn.getAttribute('data-deduct-today-prep');
  const mp = (state.menuPlan || []).find(m => m.id === mpId);
  if (!mp || mp.prep_deducted) return;
  const rec = mp.recipe_id ? (state.recipes || []).find(r => r.id === mp.recipe_id) : null;
  if (!rec) return;
  const portions = mp.planned_portions || predictedPortions(mp.service_date);
  const scale = portions / (rec.base_servings || 65);
  const uName = getActiveUser()?.name || 'Staff';
  const todayStr = localDateStr();
  let count = 0;
  (rec.ingredients || []).forEach(g => {
    const x = g.inv_id ? (state.items || []).find(i => i.id === g.inv_id) : null;
    if (!x) return;
    const amt = Math.round(((g.per100 ? (g.per100 * portions) / 100 : ((g.qty || 0) * scale))) * 100) / 100;
    if (amt <= 0) return;
    x.on_hand = Math.round(Math.max(0, Number(x.on_hand || 0) - amt) * 100) / 100;
    state.transactions.unshift({
      id: uid('tx'), tx_date: todayStr, tx_type: 'STORE_USE', item_id: x.id, item_name: x.name,
      unit: x.unit, qty: -amt, reason: `Meal Prep: ${rec.name} (${portions} portions)`, staff_name: uName
    });
    count++;
  });
  mp.prep_deducted = true;
  logActivity('PREP DEDUCT', `${rec.name} (${portions} portions · ${count} ingredients deducted)`);
  saveState();
  render();
  showToast(`Deducted ${count} prepped ingredient(s) for ${rec.name}!`);
});

window.addEventListener("afterprint", () => document.body.classList.remove("printing-modal"));


document.addEventListener('change', (e) => {
  const attr = e.target && e.target.getAttribute && e.target.getAttribute('data-po-price');
  if (!attr || !isMgmtOrHigher(getActiveUser())) return;
  const [poId, idxStr] = attr.split(':');
  const idx = Number(idxStr);
  const val = Math.max(0, Number(e.target.value || 0));
  const po = (state.purchaseOrders || []).find(p => p.id === poId);
  if (!po || !po.lines || !po.lines[idx]) return;
  const ln = po.lines[idx];
  ln.unit_price = val;
  ln.isWholesaleEst = false;
  const matchedItem = (state.items || []).find(it => it.id === ln.item_id || (ln.sku && it.sku === ln.sku) || it.name.toLowerCase() === String(ln.name || '').toLowerCase());
  if (matchedItem && val > 0) {
    const packMult = Number(ln.packQty || 1) || 1;
    matchedItem.unit_price = Math.round((val / packMult) * 10000) / 10000;
  }
  saveState();
  render();
  showToast(`Updated price for ${ln.name} to $${val.toFixed(2)} (saved for future orders)`);
});


document.addEventListener('change', (e) => {
  const attr = e.target && e.target.getAttribute && e.target.getAttribute('data-po-qty');
  if (!attr || !isStaffOrHigher(getActiveUser())) return;
  const [poId, idxStr] = attr.split(':');
  const idx = Number(idxStr);
  const po = (state.purchaseOrders || []).find(p => String(p.id) === String(poId));
  if (!po || !po.lines || !po.lines[idx]) return;
  if (!isMgmtOrHigher(getActiveUser()) && po.status !== 'requested') {
    showToast('Only Management can edit approved or ordered POs', 'warn');
    render();
    return;
  }
  const newQty = Math.round((parseFloat(e.target.value) || 0) * 100) / 100;
  if (newQty <= 0) {
    const removedName = po.lines[idx].name;
    po.lines.splice(idx, 1);
    showToast(`Removed ${removedName} from ${po.po_number}`);
  } else {
    po.lines[idx].qty = newQty;
    showToast(`Updated ${po.lines[idx].name} qty to ${newQty} ${po.lines[idx].unit}`);
  }
  saveState();
  render();
});

document.addEventListener('click', (e) => {
  const rmLineBtn = e.target.closest('[data-po-rm-line]');
  if (rmLineBtn && isStaffOrHigher(getActiveUser())) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const [poId, idxStr] = rmLineBtn.getAttribute('data-po-rm-line').split(':');
    const idx = Number(idxStr);
    const po = (state.purchaseOrders || []).find(p => String(p.id) === String(poId));
    if (!po || !po.lines || !po.lines[idx]) return;
    if (!isMgmtOrHigher(getActiveUser()) && po.status !== 'requested') {
      showToast('Only Management can modify approved or ordered POs', 'warn');
      return;
    }
    const removed = po.lines.splice(idx, 1)[0];
    saveState();
    render();
    showToast(`Removed ${removed?.name || 'item'} from ${po.po_number}`);
    return;
  }

  const emailBtn = e.target.closest('[data-po-email]');
  if (!emailBtn) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const poId = emailBtn.getAttribute('data-po-email');
  const po = (state.purchaseOrders || []).find(p => String(p.id) === String(poId));
  if (!po) return;
  const sel = document.getElementById(`po-approver-sel-${po.id}`);
  const approverId = sel ? sel.value : '';
  if (!approverId) {
    showToast('Select an approver account from the dropdown first.', 'warn');
    if (sel) sel.focus();
    return;
  }
  const approver = (state.users || []).find(u => String(u.id) === String(approverId));
  if (!approver) return;
  const me = getActiveUser();
  const canSeePrices = isMgmtOrHigher(me);
  const lines = po.lines || [];
  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0), 0);
  const bodyLines = [
    `Hi ${approver.name},`,
    '',
    `${me.name} (${me.role}) submitted Purchase Request ${po.po_number} for ${po.vendor} and requested your approval:`,
    '',
    ...lines.map(l => canSeePrices
      ? `- [${l.sku || ''}] ${l.qty} ${l.unit} ${l.name} @ $${Number(l.unit_price || 0).toFixed(2)} = $${(Number(l.qty || 0) * Number(l.unit_price || 0)).toFixed(2)}`
      : `- [${l.sku || ''}] ${l.qty} ${l.unit} ${l.name}`
    ),
    ...(canSeePrices ? ['', `Estimated Total: $${total.toFixed(2)}`] : []),
    '',
    'Please review and approve this request in the Salvation Army Community Meals KMS (Orders & POs tab).'
  ];
  const subj = `PO Approval Needed: ${po.po_number} (${po.vendor})`;
  const bodyTxt = bodyLines.join('\n');
  navigator.clipboard?.writeText(bodyTxt);

  po.assigned_approver_id = approver.id;
  po.assigned_approver_name = approver.name;
  po.routed_at = localDateStr();

  state.messages = state.messages || [];
  state.messages.unshift({
    id: uid('msg'),
    sender_id: me.id,
    sender_name: me.name,
    sender_role: me.role,
    recipient_id: approver.id,
    body: `PO Approval Requested: ${po.po_number} (${po.vendor}) routed to ${approver.name}${approver.email ? ' (' + approver.email + ')' : ''}.`,
    created_at: new Date().toISOString()
  });

  if (approver.email) {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(approver.email)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(bodyTxt)}`;
    window.open(gmailUrl, '_blank', 'noopener');
    logActivity('PO APPROVAL EMAILED', `Routed & emailed ${po.po_number} to ${approver.name} (${approver.email})`);
    saveState();
    render();
    showToast(`Routed ${po.po_number} to ${approver.name}, copied text & opened Gmail compose!`);
  } else {
    logActivity('PO APPROVAL ROUTED', `Routed ${po.po_number} in-app to ${approver.name} (no email on file)`);
    saveState();
    render();
    showToast(`Routed ${po.po_number} in-app to ${approver.name} & copied request text (add their email in Users & Roster to launch Gmail).`);
  }
});
