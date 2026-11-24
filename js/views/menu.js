// js/views/menu.js — Menu Planner, Bulk Past/Future Entry & Daily/Weekly/Monthly Printouts

import {
  TEMP_CHECKS, localDateStr, addDays, dLabel, getWeekMonday,
  allMonTueWedFriBetween, serviceDaysBetween, getFederalHoliday,
  esc, fmtNum, formatKitchenAmt, openModal
} from '../utils.js';
import {
  state, isMgmtOrHigher, isStaffOrHigher, forecastWeekday, predictedPortions
} from '../state.js';

export function showMenuPrintSuiteModal(initialPeriod, initialRefDate) {
  const today = localDateStr();
  const period = initialPeriod || state._menuPrintPeriod || 'weekly';
  const refDate = initialRefDate || state._menuPrintDate || today;
  state._menuPrintPeriod = period;
  state._menuPrintDate = refDate;

  const getMealEntry = (ds) => {
    const hol = getFederalHoliday(ds);
    const mp = (state.menuPlan || []).find(m => m.service_date === ds);
    const rec = mp && mp.recipe_id ? state.recipes.find(r => r.id === mp.recipe_id) : null;
    const title = (rec ? rec.name : (mp ? mp.custom_title : '')) || (hol ? `Closed (${hol})` : '');
    const status = mp ? mp.status : (hol ? 'CLOSED' : 'PLANNED');
    const portions = mp ? (status === 'SERVED' ? mp.served_portions : mp.planned_portions) : (hol ? 0 : forecastWeekday(ds));
    return { ds, hol, mp, rec, title, status, portions, note: (mp && mp.note) || '' };
  };

  let bodyHtml = '';
  let subtitle = '';

  if (period === 'daily') {
    const e = getMealEntry(refDate);
    const n = e.portions || predictedPortions(refDate);
    const f = e.rec ? (n / (e.rec.base_servings || 65)) : 1;
    subtitle = `Daily Kitchen & Dining Menu — ${dLabel(refDate)}`;
    bodyHtml = `
      <div class="space-y-3">
        <div class="p-3 rounded-lg bg-black/5 border border-[var(--line)] print-keep">
          <div class="text-lg font-extrabold text-[#1b365d]">${esc(e.title || 'No Meal Scheduled')}</div>
          <div class="text-xs opacity-80 mt-0.5">
            Service Date: <strong>${dLabel(refDate)}</strong> &bull;
            ${e.status === 'SERVED' ? `Served: <strong>${e.portions}</strong>` : `Planned Portions: <strong>${n}</strong>`}
            ${e.rec && (e.rec.allergens || []).length ? ` &bull; <span class="text-[#b3122b] font-bold">Allergens: ${esc(e.rec.allergens.join(', '))}</span>` : ''}
          </div>
          ${e.note ? `<div class="text-xs opacity-75 mt-1">Notes: ${esc(e.note)}</div>` : ''}
        </div>
        ${e.rec ? `
          <div>
            <div class="font-bold uppercase opacity-70 mb-1">Scaled Ingredients (${n} Portions)</div>
            <table class="w-full text-left border-collapse text-xs">
              <thead><tr class="border-b border-[var(--line)] bg-black/5 uppercase"><th class="py-1.5 px-2">Ingredient</th><th class="py-1.5 px-2 text-right">Amount Needed</th></tr></thead>
              <tbody class="divide-y divide-[var(--line)]">
                ${(e.rec.ingredients || []).map(g => `<tr><td class="py-1.5 px-2">&#9744; ${esc(g.name)}</td><td class="py-1.5 px-2 text-right font-bold">${esc(formatKitchenAmt((g.qty || 0) * f, g.unit))}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${(e.rec.steps || []).length ? `
            <div class="p-2.5 rounded bg-black/5 space-y-1 print-keep">
              <div class="font-bold uppercase opacity-70">Preparation Directions</div>
              <ol class="list-decimal list-inside space-y-1 leading-relaxed">${e.rec.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            </div>
          ` : ''}
        ` : '<p class="text-xs opacity-75">Custom menu entry (no linked recipe ingredients).</p>'}
        <div class="p-2.5 rounded border border-[var(--line)] text-[11px] flex justify-between print-keep">
          <span>Cook / Lead: ________________________</span>
          <span>Actual Served: ________</span>
          <span>Use Leftovers By: <strong>${dLabel(addDays(refDate, 6))}</strong></span>
        </div>
      </div>
    `;
  } else if (period === 'weekly') {
    const mon = getWeekMonday(refDate);
    const fri = addDays(mon, 4);
    const weekDays = [0, 1, 2, 4].map(offset => addDays(mon, offset));
    subtitle = `Weekly Service Menu — Week of ${dLabel(mon)} to ${dLabel(fri)}`;
    bodyHtml = `
      <div class="space-y-2.5">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b-2 border-[#1b365d] bg-black/5 uppercase">
              <th class="py-2 px-2.5 w-36">Service Day</th>
              <th class="py-2 px-2.5">Menu Entr&eacute;e &amp; Sides</th>
              <th class="py-2 px-2.5 text-center w-24">Portions</th>
              <th class="py-2 px-2.5 w-36">Allergens / Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--line)]">
            ${weekDays.map(ds => {
              const e = getMealEntry(ds);
              const isClosed = e.status === 'CLOSED' || !!e.hol;
              return `
                <tr class="${isClosed ? 'bg-red-50/40' : ''}">
                  <td class="py-2.5 px-2.5 font-bold align-top">
                    <div>${dLabel(ds)}</div>
                    <div class="text-[10px] font-mono opacity-65">${esc(ds)}</div>
                  </td>
                  <td class="py-2.5 px-2.5 align-top">
                    <div class="font-bold text-sm ${isClosed ? 'text-[#b3122b]' : ''}">${esc(e.title || '— Menu TBD —')}</div>
                    ${!isClosed ? `<div class="text-[11px] opacity-75 mt-0.5">Served with Daily Salad Bar, Bread &amp; Beverage</div>` : ''}
                  </td>
                  <td class="py-2.5 px-2.5 text-center align-top font-bold">
                    ${isClosed ? 'CLOSED' : (e.status === 'SERVED' ? `${e.portions} served` : `${e.portions || 65} plan`)}
                  </td>
                  <td class="py-2.5 px-2.5 align-top text-[11px] opacity-80">
                    ${e.rec && (e.rec.allergens || []).length ? `<div class="font-bold text-[#b3122b]">Allergens: ${esc(e.rec.allergens.join(', '))}</div>` : ''}
                    ${esc(e.note)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="text-[11px] opacity-75 pt-1 flex justify-between print-keep">
          <span>Lunch Service: Monday, Tuesday, Wednesday &amp; Friday &bull; 11:30 AM – 12:30 PM</span>
          <span>Menu subject to change based on donations</span>
        </div>
      </div>
    `;
  } else {
    const ym = refDate.slice(0, 7);
    const [yr, mo] = ym.split('-').map(Number);
    const monthName = new Date(yr, mo - 1, 1, 12).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const lastDay = new Date(yr, mo, 0).getDate();
    const firstIso = `${ym}-01`;
    const lastIso = `${ym}-${String(lastDay).padStart(2, '0')}`;
    const serviceDays = allMonTueWedFriBetween(firstIso, lastIso);
    const weeks = [];
    let curWeek = null;
    serviceDays.forEach(ds => {
      const wMon = getWeekMonday(ds);
      if (!curWeek || curWeek.mon !== wMon) {
        curWeek = { mon: wMon, slots: { 1: null, 2: null, 3: null, 5: null } };
        weeks.push(curWeek);
      }
      const dow = new Date(ds + 'T12:00:00').getDay();
      curWeek.slots[dow] = getMealEntry(ds);
    });
    subtitle = `Monthly Community Meals Menu — ${monthName}`;
    bodyHtml = `
      <div class="space-y-2">
        <table class="w-full text-left border-collapse text-xs table-fixed">
          <thead>
            <tr class="border-b-2 border-[#1b365d] bg-[#1b365d] text-white uppercase">
              <th class="py-2 px-2 w-1/4">Monday</th>
              <th class="py-2 px-2 w-1/4">Tuesday</th>
              <th class="py-2 px-2 w-1/4">Wednesday</th>
              <th class="py-2 px-2 w-1/4">Friday</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--line)]">
            ${weeks.map(w => `
              <tr>
                ${[1, 2, 3, 5].map(dow => {
                  const cell = w.slots[dow];
                  if (!cell) return `<td class="p-2 border border-[var(--line)] bg-black/5 align-top h-20"></td>`;
                  const dayNum = parseInt(cell.ds.slice(8, 10), 10);
                  const isClosed = cell.status === 'CLOSED' || !!cell.hol;
                  return `
                    <td class="p-2 border border-[var(--line)] align-top h-20 menu-cal-cell ${isClosed ? 'bg-red-50/40' : ''}">
                      <div class="flex items-center justify-between text-[11px] font-bold border-b border-[var(--line)]/60 pb-0.5 mb-1">
                        <span>${mo}/${dayNum}</span>
                        <span class="opacity-65 font-normal">${isClosed ? 'CLOSED' : (cell.status === 'SERVED' ? cell.portions + ' srv' : (cell.portions || 65) + ' port')}</span>
                      </div>
                      <div class="font-semibold leading-snug ${isClosed ? 'text-[#b3122b]' : ''}">${esc(cell.title || 'TBD')}</div>
                      ${cell.note ? `<div class="text-[10px] opacity-70 mt-0.5">${esc(cell.note)}</div>` : ''}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="text-[11px] opacity-75 pt-1 flex justify-between print-keep">
          <span>The Salvation Army &bull; 313 W. Cunningham St., Butler, PA &bull; Free Community Lunch (Mon/Tue/Wed/Fri)</span>
          <span>Daily Salad Bar included with every meal</span>
        </div>
      </div>
    `;
  }

  document.body.classList.add('printing-modal');
  openModal('Printable Daily, Weekly & Monthly Menu', `
    <div class="space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-black/5 border border-[var(--line)] no-print">
        <div class="flex flex-wrap items-center gap-1.5">
          ${[['daily', 'Daily Sheet'], ['weekly', 'Weekly Menu'], ['monthly', 'Monthly Calendar']].map(([k, lbl]) => `
            <button type="button" data-menu-print-period="${k}" class="px-3 py-1.5 rounded-lg font-bold border ${period === k ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'border-[var(--line)] bg-white text-slate-700'}">${lbl}</button>
          `).join('')}
        </div>
        <div class="flex items-center gap-2">
          <label class="font-bold">Date / Month:
            <input id="menu-print-ref-date" type="date" value="${esc(refDate)}" class="kms-input text-xs ml-1" />
          </label>
          <button type="button" onclick="window.print()" class="kms-btn-navy px-3.5 py-1.5 text-xs font-semibold">Print (Letter)</button>
        </div>
      </div>

      <div class="p-4 rounded-xl border border-[var(--line)] space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#b3122b] pb-2 print-keep">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-[#b3122b]">The Salvation Army · Butler Worship &amp; Service Center</div>
            <h2 class="text-base sm:text-lg font-extrabold text-[#1b365d]">${esc(subtitle)}</h2>
          </div>
          <div class="text-right text-[11px] opacity-75">
            <div>313 West Cunningham St. · Butler, PA</div>
            <div>Community Meals Program</div>
          </div>
        </div>
        ${bodyHtml}
      </div>
    </div>
  `);
}

export function showBulkMenuModal(customStart, customEnd) {
  const today = localDateStr();
  const start = customStart || addDays(today, -30);
  const end = customEnd || addDays(today, 45);
  const dates = allMonTueWedFriBetween(start, end);

  openModal('Bulk Enter & Edit Menus (Past & Future)', `
    <div class="space-y-4 text-xs">
      <details class="p-3 rounded-lg border border-[var(--line)] bg-black/5" open>
        <summary class="font-bold text-sm cursor-pointer">1. Paste Bulk Menu Rows (Past or Future Dates)</summary>
        <p class="opacity-75 mt-1">Paste 1 line per service day: <code>Date, Meal Title, Planned, Served (optional), Notes (optional)</code>. Any title matching a saved recipe links automatically.</p>
        <form id="form-bulk-menu-paste" class="space-y-2 mt-2">
          <textarea name="bulkMenuRaw" rows="4" required placeholder="2026-11-02, Spaghetti & Meatballs with Marinara, 65, 62, Cold morning&#10;2026-11-03, Hearty Beef & Bean Chili, 65, 68&#10;2026-12-01, Chicken Patty Sandwiches & Fries, 65&#10;12/25/2026, CLOSED - Christmas Day, 0, 0" class="kms-input w-full text-xs font-mono"></textarea>
          <button type="submit" class="kms-btn-ok px-4 py-1.5 text-xs font-semibold">Import Pasted Menu Rows</button>
        </form>
      </details>

      <div class="space-y-2.5">
        <div class="flex flex-wrap items-end justify-between gap-2 p-2.5 rounded-lg bg-black/5 border border-[var(--line)]">
          <div class="flex flex-wrap items-end gap-2">
            <label class="font-bold">From<input id="bmenu-start" type="date" value="${esc(start)}" class="kms-input block mt-1 text-xs" /></label>
            <label class="font-bold">To<input id="bmenu-end" type="date" value="${esc(end)}" class="kms-input block mt-1 text-xs" /></label>
            <button type="button" id="btn-bmenu-reload" class="kms-btn-navy px-3 py-1.5 text-xs">Load Dates (${dates.length})</button>
          </div>
          <div class="flex gap-1.5">
            <button type="button" data-bmenu-preset="past60" class="kms-btn-alt px-2.5 py-1 text-[11px]">Past 60d</button>
            <button type="button" data-bmenu-preset="next60" class="kms-btn-alt px-2.5 py-1 text-[11px]">Next 60d</button>
          </div>
        </div>

        <form id="form-bulk-menu-grid" class="space-y-2.5">
          <input type="hidden" name="rangeStart" value="${esc(start)}" />
          <input type="hidden" name="rangeEnd" value="${esc(end)}" />
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm">2. Edit Past &amp; Future Service Days (${dates.length} days)</span>
            <button type="submit" class="kms-btn-primary px-3.5 py-1.5 text-xs font-semibold">Save All Menu Changes</button>
          </div>
          <div class="max-h-72 overflow-y-auto border border-[var(--line)] rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                  <th class="p-1.5 w-32">Date</th>
                  <th class="p-1.5">Linked Recipe (Opt.)</th>
                  <th class="p-1.5">Menu Title / Description</th>
                  <th class="p-1.5 w-16 text-center">Plan</th>
                  <th class="p-1.5 w-16 text-center">Served</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--line)]">
                ${dates.map(ds => {
                  const hol = getFederalHoliday(ds);
                  const mp = (state.menuPlan || []).find(m => m.service_date === ds);
                  const titleVal = mp ? (mp.custom_title || '') : (hol ? `Office Closed (${hol})` : '');
                  const planVal = mp ? (mp.planned_portions || 0) : (hol ? 0 : forecastWeekday(ds));
                  const srvVal = mp && mp.served_portions != null ? mp.served_portions : '';
                  return `
                    <tr class="${ds < today ? 'bg-black/[0.02]' : ''}">
                      <td class="p-1.5 font-mono whitespace-nowrap">
                        <div>${esc(ds)}</div>
                        <div class="text-[10px] opacity-65">${dLabel(ds).split(',')[0]}${hol ? ' · Hol' : ''}</div>
                      </td>
                      <td class="p-1">
                        <select name="rec_${ds}" class="kms-input text-xs max-w-[155px]">
                          <option value="">-- Custom / None --</option>
                          ${state.recipes.map(r => `<option value="${r.id}" ${mp && mp.recipe_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
                        </select>
                      </td>
                      <td class="p-1"><input name="title_${ds}" type="text" value="${esc(titleVal)}" placeholder="Meal title..." class="kms-input w-full text-xs font-semibold" /></td>
                      <td class="p-1"><input name="plan_${ds}" type="number" min="0" value="${planVal}" class="kms-input w-16 text-xs text-center" /></td>
                      <td class="p-1"><input name="srv_${ds}" type="number" min="0" value="${srvVal}" placeholder="—" class="kms-input w-16 text-xs text-center font-bold" /></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          <button type="submit" class="kms-btn-primary w-full py-2 text-xs font-semibold">Save All Past &amp; Future Menus</button>
        </form>
      </div>
    </div>
  `);
}

export function renderDailySheet(main, dateStr) {
  const mp = state.menuPlan.find(m => m.service_date === dateStr) || {};
  const rec = state.recipes.find(r => r.id === mp.recipe_id);
  if (!rec) { state.selectedSheetDate = null; renderMenu(main); return; }
  const n = mp.planned_portions || predictedPortions(dateStr);
  const f = n / (rec.base_servings || 65);

  const byLoc = {};
  (rec.ingredients || []).forEach(g => {
    const x = g.inv_id ? state.items.find(i => i.id === g.inv_id) : null;
    if (x && g.per100) {
      (byLoc[x.location] = byLoc[x.location] || []).push({ item: x, amt: (g.per100 * n) / 100 });
    }
  });

  main.innerHTML = `
    <div class="kms-card print-flow p-5 space-y-4">
      <div class="flex flex-wrap gap-2 justify-between items-center no-print">
        <button type="button" id="btn-back-menu" class="kms-btn-alt px-3 py-1.5 text-xs">&larr; Back to Menu</button>
        <button type="button" onclick="window.print()" class="kms-btn-primary px-4 py-1.5 text-xs">Print Daily Sheet (Letter)</button>
      </div>
      <div class="print-keep">
        <div class="text-[11px] font-bold uppercase opacity-65">The Salvation Army Community Meals · Butler, PA</div>
        <h2 class="text-lg font-bold">${dLabel(dateStr)} — ${esc(rec.name)}</h2>
        ${(rec.allergens || []).length ? `<p class="text-xs font-bold text-[#b3122b]">ALLERGENS: ${esc(rec.allergens.join(', '))}</p>` : ''}
        <p class="text-xs mt-1"><strong>Portions Planned: ${n}</strong> &nbsp;|&nbsp; Served: _______ &nbsp;|&nbsp; Cook: ______________</p>
      </div>
      <div>
        <h3 class="text-sm font-bold border-b border-[var(--line)] pb-1 mb-2">Scaled Ingredients</h3>
        <table class="w-full text-xs">
          <thead><tr class="border-b border-[var(--line)] uppercase opacity-65"><th class="py-1 text-left">Ingredient</th><th class="py-1 text-right">Amount Needed</th></tr></thead>
          <tbody>
            ${(rec.ingredients || []).map(g => `<tr class="border-b border-[var(--line)]"><td class="py-1.5">&#9744; ${esc(g.name)}</td><td class="py-1.5 text-right font-bold">${esc(formatKitchenAmt((g.qty || 0) * f, g.unit))}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${(rec.steps || []).length ? `<div class="print-keep"><h3 class="text-sm font-bold mb-1">Directions</h3><ol class="list-decimal pl-5 text-xs space-y-1">${rec.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      ${Object.keys(byLoc).length ? `
        <div class="print-keep">
          <h3 class="text-sm font-bold border-b border-[var(--line)] pb-1 mb-2">Pull from Storage</h3>
          ${Object.keys(byLoc).map(L => `<div class="mb-2"><div class="text-xs font-bold">${esc(L)}</div>${byLoc[L].map(a => `<div class="text-xs flex justify-between border-b border-[var(--line)] py-1"><span>&#9744; ${esc(a.item.name)}</span><span><strong>${fmtNum(a.amt)} ${esc(a.item.unit)}</strong> (have ${a.item.on_hand})</span></div>`).join('')}</div>`).join('')}
        </div>
      ` : ''}
      <div class="print-keep">
        <h3 class="text-sm font-bold mb-1">Temperature Log</h3>
        <table class="w-full text-xs border-collapse">
          <thead><tr class="border-b border-[var(--line)] font-bold"><th class="py-1 text-left">Check</th><th class="text-left">Limit</th><th class="text-left">Temp °F</th><th class="text-left">Initials</th></tr></thead>
          <tbody>
            ${TEMP_CHECKS.map(c => `<tr class="border-b border-[var(--line)]"><td class="py-1.5">${esc(c[0])}</td><td>${c[1] === 'max' ? '≤' : '≥'} ${c[2]}°F</td><td>________</td><td>______</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-xs print-keep"><strong>Leftover Labels:</strong> Use cooked leftovers by <strong>${dLabel(addDays(dateStr, 6))}</strong> (7-day ServSafe rule).</p>
    </div>
  `;
}

export function renderMenu(main) {
  if (state.selectedSheetDate) {
    renderDailySheet(main, state.selectedSheetDate);
    return;
  }
  const today = localDateStr();
  const viewRange = state._menuViewRange || 'standard';
  const days = [];
  const startOffset = viewRange === 'past30' ? -30 : -7;
  const endOffset = viewRange === 'next60' ? 60 : 28;
  for (let i = startOffset; i <= endOffset; i++) {
    const ds = addDays(today, i);
    const dow = new Date(ds + 'T12:00:00').getDay();
    if ([1, 2, 3, 5].includes(dow)) days.push(ds);
  }
  const recOpts = state.recipes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  const isMgr = isMgmtOrHigher();

  main.innerHTML = `
    <div class="space-y-4">
      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold">Menu Planner (Mon / Tue / Wed / Fri)</h2>
            <p class="text-xs opacity-75">Bulk-enter past or future menus, assign recipes, and print formatted Daily, Weekly, or Monthly menus.</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 no-print">
            <button type="button" id="btn-open-menu-print-suite" class="kms-btn-navy px-3 py-1.5 text-xs font-semibold">Print Daily / Weekly / Monthly Menu</button>
            ${isMgr ? `<button type="button" id="btn-open-bulk-menu" class="kms-btn-primary px-3 py-1.5 text-xs font-semibold">+ Bulk Enter Menus (Past &amp; Future)</button>` : ''}
          </div>
        </div>
        ${(() => {
          const next1 = serviceDaysBetween(today, addDays(today, 7)).slice(0, 1);
          const next7 = serviceDaysBetween(today, addDays(today, 14)).slice(0, 4);
          const next30 = serviceDaysBetween(today, addDays(today, 30));
          const p1 = next1.reduce((s, d) => s + forecastWeekday(d), 0);
          const p7 = next7.reduce((s, d) => s + forecastWeekday(d), 0);
          const p30 = next30.reduce((s, d) => s + forecastWeekday(d), 0);
          return `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div class="p-2.5 rounded-lg bg-black/5 border border-[var(--line)]"><strong>Daily (Next Service):</strong> <span class="text-[#b3122b] font-bold">${p1} portions</span></div>
              <div class="p-2.5 rounded-lg bg-black/5 border border-[var(--line)]"><strong>Weekly (Next 4 Services):</strong> <span class="text-[#b3122b] font-bold">${p7} portions</span></div>
              <div class="p-2.5 rounded-lg bg-black/5 border border-[var(--line)]"><strong>Monthly (Next 30 Days):</strong> <span class="text-[#b3122b] font-bold">${p30} portions</span></div>
            </div>
          `;
        })()}
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)] text-xs no-print">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-bold opacity-70">Show Dates:</span>
            <button type="button" data-menu-range="past30" class="px-2.5 py-1 rounded-lg border font-semibold ${viewRange === 'past30' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)]'}">Past 30 Days + Upcoming</button>
            <button type="button" data-menu-range="standard" class="px-2.5 py-1 rounded-lg border font-semibold ${viewRange === 'standard' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)]'}">This Week &amp; Next 4 Weeks</button>
            <button type="button" data-menu-range="next60" class="px-2.5 py-1 rounded-lg border font-semibold ${viewRange === 'next60' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)]'}">Next 60 Days</button>
          </div>
          ${isMgr ? `
            <form id="form-bulk-menu" class="flex flex-wrap gap-1.5 items-center">
              <select name="recipeId" class="kms-input text-xs max-w-[180px]">${recOpts}</select>
              <select name="days" class="kms-input text-xs"><option value="7">Fill empty 7d</option><option value="30">Fill empty 30d</option></select>
              <button type="submit" class="kms-btn-alt px-2.5 py-1 text-xs">Quick Fill</button>
            </form>
          ` : `
            ${isStaffOrHigher() ? `<button type="button" id="btn-suggest-menu" class="kms-btn-primary px-3 py-1.5 text-xs">+ Suggest Recipe / Menu Change</button>` : ''}
          `}
        </div>
      </div>

      <div class="space-y-2">
        ${days.map(ds => {
          const hol = getFederalHoliday(ds);
          const mp = state.menuPlan.find(m => m.service_date === ds) || { service_date: ds, recipe_id: '', planned_portions: forecastWeekday(ds), status: hol ? 'CLOSED' : 'PLANNED' };
          return `
            <div class="kms-card p-3 flex flex-wrap items-center justify-between gap-2 menu-day-card">
              <div class="space-y-1 flex-1 min-w-[220px]">
                <div class="font-bold text-sm">${dLabel(ds)} ${ds === today ? '<span class="tag tag-OK">TODAY</span>' : ''} ${hol ? `<span class="tag tag-OUT">${esc(hol)}</span>` : ''} ${mp.custom_title && !mp.recipe_id ? `<span class="opacity-80 font-normal text-xs">— ${esc(mp.custom_title)}</span>` : ''}</div>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <select data-menu-rec="${ds}" ${!isMgr ? 'disabled' : ''} class="kms-input text-xs">
                    <option value="">Choose recipe...</option>
                    ${state.recipes.map(r => `<option value="${r.id}" ${mp.recipe_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
                  </select>
                  <span>Planned:</span>
                  <input type="number" min="0" value="${mp.planned_portions || predictedPortions(ds)}" data-menu-plan="${ds}" ${!isMgr ? 'disabled' : ''} class="kms-input w-16 text-xs text-center font-bold" />
                  ${mp.recipe_id ? `<button type="button" data-open-sheet="${ds}" class="text-[#1b365d] font-bold underline no-print">Daily Sheet</button>` : ''}
                  <button type="button" data-print-week-of="${ds}" class="text-emerald-700 font-semibold hover:underline no-print">Print Week</button>
                  ${isMgr && (mp.recipe_id || mp.custom_title) ? `<button type="button" data-clear-menu="${ds}" class="text-red-600 hover:underline font-semibold no-print">Clear</button>` : ''}
                </div>
              </div>
              <div class="no-print">
                ${mp.status === 'SERVED'
                  ? `<span class="tag tag-OK">Served ${mp.served_portions}</span>`
                  : isStaffOrHigher() ? `<div class="flex items-center gap-1.5"><input id="sv-note-${ds}" placeholder="Weather/event note" class="kms-input text-xs w-32" /><input id="sv-qty-${ds}" type="number" min="0" placeholder="Served" class="kms-input text-xs w-20" /><button type="button" data-mark-served="${ds}" class="kms-btn-ok px-3 py-1.5 text-xs">Served</button></div>`
                  : `<span class="tag tag-LOW">${esc(mp.status || 'PLANNED')}</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}