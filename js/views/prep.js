// js/views/prep.js — Next-Day Prep Pulls, Kitchen Scaling & Stored Leftovers FIFO

import { LOCATIONS, localDateStr, dLabel, esc, fmtNum, formatKitchenAmt, normStockUnit } from '../utils.js';
import { state, predictedPortions } from '../state.js';

export function renderPrep(main) {
  const today = localDateStr();
  const todayMeal = state.menuPlan.find(m => m.service_date === today && m.status !== 'CLOSED' && (m.recipe_id || m.custom_title));
  const todayRec = todayMeal && todayMeal.recipe_id ? state.recipes.find(r => r.id === todayMeal.recipe_id) : null;
  const todayPortions = todayMeal ? (todayMeal.planned_portions || predictedPortions(today)) : 0;
  const todayScale = todayRec ? (todayPortions / (todayRec.base_servings || 65)) : 1;
  const todayIngs = (todayMeal && todayRec) ? (todayRec.ingredients || []).map(g => {
    const x = g.inv_id ? state.items.find(i => i.id === g.inv_id) : null;
    const stockAmt = x ? (g.per100 ? (g.per100 * todayPortions) / 100 : ((g.qty || 0) * todayScale)) : 0;
    return { name: g.name, kitchenAmt: formatKitchenAmt((g.qty || 0) * todayScale, g.unit), item: x, stockAmt };
  }) : [];

  const nextMeal = state.menuPlan
    .filter(m => m.service_date > today && m.status !== 'CLOSED' && (m.recipe_id || m.custom_title))
    .sort((a, b) => a.service_date.localeCompare(b.service_date))[0];
  const rec = nextMeal && nextMeal.recipe_id ? state.recipes.find(r => r.id === nextMeal.recipe_id) : null;
  const targetPortions = nextMeal ? (nextMeal.planned_portions || predictedPortions(nextMeal.service_date)) : 65;
  const scaleFactor = rec ? (targetPortions / (rec.base_servings || 65)) : 1;

  const byLoc = {};
  LOCATIONS.forEach(l => { byLoc[l] = []; });
  const unlinkedIngs = [];

  if (nextMeal && rec) {
    (rec.ingredients || []).forEach(g => {
      const kitchenAmt = formatKitchenAmt((g.qty || 0) * scaleFactor, g.unit);
      const x = g.inv_id ? state.items.find(i => i.id === g.inv_id) : null;
      if (x) {
        const stockAmt = g.per100 ? (g.per100 * targetPortions) / 100 : ((g.qty || 0) * scaleFactor);
        (byLoc[x.location] = byLoc[x.location] || []).push({
          item: x,
          stockAmt,
          kitchenAmt,
          ingName: g.name
        });
      } else {
        unlinkedIngs.push({ name: g.name, kitchenAmt });
      }
    });
  }

  const activeZones = LOCATIONS.filter(L => (byLoc[L] || []).length > 0);
  const emptyZones = LOCATIONS.filter(L => !(byLoc[L] || []).length);
  const totalPullCount = activeZones.reduce((sum, L) => sum + byLoc[L].length, 0);
  const lefts = state.storageTags
    .filter(t => t.status === 'STORED' && t.tag_category !== 'SALAD_BAR')
    .sort((a, b) => a.use_by_date.localeCompare(b.use_by_date));

  main.innerHTML = `
    <div class="space-y-4">
      <!-- Today's Active Production & 86 Alerts (Section 5 Part 2) -->
      ${(() => {
        const shortages = [
          ...todayIngs.filter(i => i.item && Number(i.item.on_hand || 0) < i.stockAmt).map(i => `Today: ${i.item.name} (need ${fmtNum(i.stockAmt)}, have ${fmtNum(i.item.on_hand)} ${normStockUnit(i.item.unit)})`),
          ...Object.values(byLoc).flat().filter(i => i.item && Number(i.item.on_hand || 0) < i.stockAmt).map(i => `Next Meal: ${i.item.name} (need ${fmtNum(i.stockAmt)}, have ${fmtNum(i.item.on_hand)} ${normStockUnit(i.item.unit)})`)
        ];
        const alertHtml = shortages.length ? `<div class="p-3 rounded-xl border-2 border-[#b3122b] bg-red-50 text-xs text-red-950 space-y-1 print-keep">
          <div class="font-extrabold uppercase tracking-wide text-[#b3122b]">86 / Ingredient Shortage Alert (${shortages.length})</div>
          <div>${shortages.map(s => `<span class="inline-block mr-3 font-semibold">&bull; ${esc(s)}</span>`).join('')}</div>
        </div>` : '';

        if (!todayMeal) return alertHtml;
        const alreadyDeducted = Boolean(todayMeal.prep_deducted);
        return alertHtml + `<div class="kms-card p-3.5 border-l-4 border-l-emerald-600 space-y-2 print-keep">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Today's Active Service Production &bull; ${dLabel(today)}</div>
              <div class="text-sm font-black text-[#1b365d]">${esc(todayRec ? todayRec.name : todayMeal.custom_title)} <span class="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-xs font-bold">${todayPortions} Portions</span></div>
            </div>
            ${todayIngs.some(i => i.item && i.stockAmt > 0) ? (alreadyDeducted
              ? '<span class="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold">Today\'s Prep Deducted from Stock</span>'
              : `<button type="button" data-deduct-today-prep="${esc(todayMeal.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold no-print">1-Click Deduct Today's Prep from Stock</button>`) : ''}
          </div>
          ${todayIngs.length ? `<div class="flex flex-wrap gap-1.5 text-xs pt-1">${todayIngs.map(i => `<span class="px-2 py-1 rounded border border-[var(--line)] bg-black/5"><strong>${esc(i.item ? i.item.name : i.name)}</strong>: ${i.item ? fmtNum(i.stockAmt) + ' ' + esc(normStockUnit(i.item.unit)) : esc(i.kitchenAmt)}</span>`).join('')}</div>` : ''}
        </div>`;
      })()}

      <!-- Top Control & Print Banner -->
      <div class="sa-print-shell rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div>
              <div class="sa-sub text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Kitchen Prep Sheet</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight">
                ${nextMeal ? `Next-Day Prep Pulls — ${dLabel(nextMeal.service_date)}` : 'Next-Day Prep Pulls'}
              </h2>
            </div>
          </div>
          <div class="flex items-center gap-2 no-print">
            <button type="button" onclick="window.print()" class="px-4 py-2 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Prep Sheet (Letter)</button>
          </div>
        </div>

        <div class="p-4 kms-card rounded-none border-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          ${nextMeal ? `
            <div class="space-y-1">
              <div class="text-sm sm:text-base font-extrabold text-[#1b365d]">
                ${esc(rec ? rec.name : (nextMeal.custom_title || 'Scheduled Meal'))}
                <span class="ml-2 px-2.5 py-0.5 rounded-full bg-[#b3122b] text-white text-xs font-bold">${targetPortions} Portions</span>
              </div>
              <div class="opacity-80 flex flex-wrap gap-x-3 gap-y-1">
                <span>Service Date: <strong>${dLabel(nextMeal.service_date)}</strong> (${esc(nextMeal.service_date)})</span>
                ${rec && rec.prep_mins ? `<span>&bull; Prep: <strong>${rec.prep_mins}m</strong></span>` : ''}
                ${rec && rec.cook_mins ? `<span>&bull; Cook: <strong>${rec.cook_mins}m</strong></span>` : ''}
                ${rec && (rec.allergens || []).length ? `<span class="text-[#b3122b] font-bold">&bull; Allergens: ${esc(rec.allergens.join(', '))}</span>` : ''}
              </div>
              ${nextMeal.note ? `<div class="text-xs italic opacity-75">Service Note: ${esc(nextMeal.note)}</div>` : ''}
            </div>
            <div class="flex items-center gap-2 text-right">
              <div class="px-3 py-1.5 rounded-lg bg-black/5 border border-[var(--line)]">
                <div class="text-[10px] uppercase font-bold opacity-65">Items to Pull</div>
                <div class="text-sm font-black">${totalPullCount} Item${totalPullCount === 1 ? '' : 's'}</div>
              </div>
              <div class="px-3 py-1.5 rounded-lg bg-black/5 border border-[var(--line)]">
                <div class="text-[10px] uppercase font-bold opacity-65">Active Zones</div>
                <div class="text-sm font-black">${activeZones.length} of ${LOCATIONS.length}</div>
              </div>
            </div>
          ` : '<p class="text-xs opacity-75">Schedule a recipe on the Menu tab to generate tomorrow’s prep pulls.</p>'}
        </div>
      </div>

      <!-- Storage Zone Pull Cards (Active Zones First, Full-Width Grid) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${[...activeZones, ...emptyZones].map(L => {
          const list = byLoc[L] || [];
          const isFreezer = L.toLowerCase().includes('freezer');
          const isCooler = L.toLowerCase().includes('cooler');
          const badge = isFreezer
            ? '<span class="px-2 py-0.5 rounded bg-sky-600/15 text-sky-800 text-[10px] font-bold">THAW IN COOLER</span>'
            : isCooler
              ? '<span class="px-2 py-0.5 rounded bg-emerald-600/15 text-emerald-800 text-[10px] font-bold">COLD PULL</span>'
              : '<span class="px-2 py-0.5 rounded bg-amber-600/15 text-amber-800 text-[10px] font-bold">DRY PULL</span>';
          return `
            <div class="kms-card p-3.5 space-y-2.5 border-t-4 ${list.length ? 'border-t-[#1b365d]' : 'border-t-slate-300 opacity-75'} print-keep">
              <div class="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-1.5">
                <h3 class="text-sm font-extrabold">${esc(L)}</h3>
                ${list.length ? badge : '<span class="text-[10px] font-semibold opacity-60">0 pulls</span>'}
              </div>
              ${!list.length ? '<p class="text-xs opacity-60 py-1">No pulls needed from this zone.</p>' : `
                <div class="space-y-2">
                  ${list.map(p => {
                    const checked = Boolean((nextMeal.prep_checked_items || {})[p.item.id]);
                    const unitLbl = normStockUnit(p.item.unit);
                    const lowStock = Number(p.item.on_hand || 0) < p.stockAmt;
                    return `
                      <label class="flex items-start gap-2.5 p-2 rounded-lg border ${checked ? 'border-emerald-500 bg-emerald-50/40' : 'border-[var(--line)]'} text-xs cursor-pointer">
                        <input type="checkbox" class="mt-0.5" data-prep-chk="${nextMeal.id}:${p.item.id}" ${checked ? 'checked' : ''} />
                        <div class="flex-1 space-y-0.5">
                          <div class="font-bold text-sm leading-tight">${esc(p.item.name)} <span class="font-mono text-[10px] opacity-60">${esc(p.item.sku)}</span></div>
                          <div class="font-semibold text-[#1b365d]">
                            Pull: <strong>${fmtNum(p.stockAmt)} ${esc(unitLbl)}</strong>
                            ${p.kitchenAmt ? `<span class="opacity-75 font-normal">(${esc(p.kitchenAmt)})</span>` : ''}
                          </div>
                          <div class="text-[11px] ${lowStock ? 'text-[#b3122b] font-bold' : 'opacity-70'}">
                            On Hand: ${fmtNum(p.item.on_hand)} ${esc(unitLbl)}${lowStock ? ' — LOW STOCK' : ''}
                          </div>
                        </div>
                      </label>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>

      ${unlinkedIngs.length ? `
        <div class="kms-card p-3.5 space-y-1.5 print-keep">
          <h3 class="text-xs font-extrabold uppercase tracking-wider opacity-75">Additional Pantry / Non-Catalog Recipe Items</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            ${unlinkedIngs.map(u => `
              <label class="flex items-center gap-2 p-2 rounded border border-[var(--line)]">
                <input type="checkbox" />
                <span><strong>${esc(u.name)}</strong> — ${esc(u.kitchenAmt)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- FIFO Leftovers & Recipe Prep Steps Side-by-Side -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="kms-card p-4 space-y-2 print-keep">
          <div class="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
            <h3 class="text-sm font-extrabold">Stored Meal Leftovers Ready to Use (FIFO: ${lefts.length})</h3>
            <span class="text-[10px] font-bold uppercase opacity-65">Use Oldest First</span>
          </div>
          ${!lefts.length
            ? '<p class="text-xs opacity-70 py-1">No stored meal leftovers in coolers or freezers.</p>'
            : lefts.map(t => `
              <div class="p-2 rounded-lg border border-[var(--line)] text-xs flex items-center justify-between gap-2">
                <div>
                  <div class="font-bold">${esc(t.item_name)}</div>
                  <div class="text-[11px] opacity-70">Zone: ${esc(t.zone)}</div>
                </div>
                <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-900 font-bold text-[11px]">Use by ${dLabel(t.use_by_date)}</span>
              </div>
            `).join('')}
        </div>

        <div class="kms-card p-4 space-y-2 print-keep">
          <div class="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
            <h3 class="text-sm font-extrabold">Prep &amp; HACCP Cooking Notes</h3>
            <span class="text-[10px] font-bold uppercase text-[#b3122b]">Cook &ge;165&deg;F &bull; Hold &ge;135&deg;F</span>
          </div>
          ${rec && (rec.steps || []).length ? `
            <ol class="list-decimal list-inside space-y-1 text-xs leading-relaxed">
              ${rec.steps.map(s => `<li>${esc(s)}</li>`).join('')}
            </ol>
          ` : '<p class="text-xs opacity-70 py-1">Check freezer pulls 24 hours ahead and transfer to Walk-in Cooler (≤41°F) on a drip pan.</p>'}
        </div>
      </div>

      <!-- Kitchen Prep Sign-Off Footer -->
      <div class="kms-card p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 print-keep">
        <div class="border-b border-slate-400 pb-1 font-semibold">Pulled By:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Pull Date / Time:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Cooler Temp (&le;41&deg;F):</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Lead Verified By:</div>
      </div>
    </div>
  `;
}
