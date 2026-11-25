// js/views/prep.js — Next-Day Prep Pulls & Stored Leftovers FIFO

import { LOCATIONS, localDateStr, dLabel, esc, fmtNum } from '../utils.js';
import { state, predictedPortions } from '../state.js';

export function renderPrep(main) {
  const today = localDateStr();
  const nextMeal = state.menuPlan.filter(m => m.service_date > today && m.status !== 'CLOSED' && m.recipe_id).sort((a, b) => a.service_date.localeCompare(b.service_date))[0];
  const rec = nextMeal ? state.recipes.find(r => r.id === nextMeal.recipe_id) : null;
  const byLoc = {};
  LOCATIONS.forEach(l => { byLoc[l] = []; });
  if (nextMeal && rec) {
    const n = nextMeal.planned_portions || predictedPortions(nextMeal.service_date);
    (rec.ingredients || []).forEach(g => {
      const x = g.inv_id ? state.items.find(i => i.id === g.inv_id) : null;
      if (x && g.per100) {
        (byLoc[x.location] = byLoc[x.location] || []).push({ item: x, amt: (g.per100 * n) / 100 });
      }
    });
  }
  const lefts = state.storageTags.filter(t => t.status === 'STORED' && t.tag_category !== 'SALAD_BAR').sort((a, b) => a.use_by_date.localeCompare(b.use_by_date));

  main.innerHTML = `
    <div class="space-y-4">
      <div class="kms-card p-4 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 class="text-base font-bold">Next-Day Prep Pulls</h2>
          <p class="text-xs opacity-75">${nextMeal && rec ? `Next service (${dLabel(nextMeal.service_date)}): <strong>${esc(rec.name)}</strong> (${nextMeal.planned_portions || predictedPortions(nextMeal.service_date)} portions)` : 'Schedule a recipe on the Menu tab to generate tomorrow’s prep pulls.'}</p>
        </div>
        <button type="button" onclick="window.print()" class="kms-btn-alt px-3 py-1.5 text-xs no-print">Print Prep Sheet</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${LOCATIONS.map(L => `
          <div class="kms-card p-4 space-y-2 print-keep">
            <h3 class="text-sm font-bold border-b border-[var(--line)] pb-1">${esc(L)}</h3>
            ${!(byLoc[L] || []).length ? '<p class="text-xs opacity-60">No pulls needed.</p>' : byLoc[L].map(p => `
              <label class="flex items-start gap-2 text-xs cursor-pointer">
                <input type="checkbox" data-prep-chk="${nextMeal.id}:${p.item.id}" ${(nextMeal.prep_checked_items || {})[p.item.id] ? 'checked' : ''} />
                <span><strong>${esc(p.item.name)}</strong> — ${fmtNum(p.amt)} ${esc(p.item.unit)} <span class="opacity-60">(have ${p.item.on_hand})</span></span>
              </label>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <div class="kms-card p-4 space-y-2">
        <h3 class="text-sm font-bold">Stored Meal Leftovers Ready to Use (FIFO: ${lefts.length})</h3>
        ${!lefts.length ? '<p class="text-xs opacity-70">No stored leftovers in coolers/freezers.</p>' : lefts.map(t => `
          <div class="p-2 rounded border border-[var(--line)] text-xs flex justify-between print-keep">
            <span><strong>${esc(t.item_name)}</strong> (${esc(t.zone)})</span>
            <span class="font-bold">Use by ${dLabel(t.use_by_date)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}