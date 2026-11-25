// js/views/records.js — Section Blank 30-Line Blind Count, Waste & System Backups

import { LOCATIONS, normStockUnit, dLabel, esc } from '../utils.js';
import { state } from '../state.js';

function ensureBlankRows(draft, zone) {
  if (!draft.blankRowsByZone) draft.blankRowsByZone = {};
  if (!Array.isArray(draft.blankRowsByZone[zone]) || draft.blankRowsByZone[zone].length < 30) {
    const existing = Array.isArray(draft.blankRowsByZone[zone]) ? draft.blankRowsByZone[zone] : [];
    draft.blankRowsByZone[zone] = Array.from({ length: 30 }, (_, idx) => existing[idx] || { name: '', unit: '', qty: '' });
  }
  return draft.blankRowsByZone[zone];
}

export function renderRecords(main) {
  const activeItems = state.items.filter(i => !i.discontinued);
  const opts = activeItems.map(i => `<option value="${i.id}">${esc(i.name)} (${esc(normStockUnit(i.unit))})</option>`).join('');
  if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'blank30', search: '', revealed: false, counts: {}, blankRowsByZone: {} };
  const draft = state.blindDraft;
  const selZone = draft.zone || LOCATIONS[0];
  const mode = draft.mode || 'blank30';
  const bSearch = (draft.search || '').trim().toLowerCase();
  const counts = draft.counts || {};
  const lastAudit = state.blindAudits[0];

  const activeBlankZone = selZone === 'ALL' ? LOCATIONS[0] : selZone;
  const blankRows = ensureBlankRows(draft, activeBlankZone);
  const blankEnteredCount = Object.values(draft.blankRowsByZone || {}).reduce(
    (sum, rows) => sum + (Array.isArray(rows) ? rows.filter(r => r && r.name.trim() && r.qty !== '' && r.qty !== undefined).length : 0),
    0
  );

  const sectionItems = activeItems.filter(x =>
    (selZone === 'ALL' || x.location === selZone) &&
    (!bSearch || x.name.toLowerCase().includes(bSearch) || x.sku.toLowerCase().includes(bSearch))
  );
  const catalogEntered = Object.keys(counts).filter(k => counts[k] !== '' && counts[k] !== undefined && activeItems.some(i => i.id === k)).length;
  const totalEntered = mode === 'blank30' ? blankEnteredCount : catalogEntered;

  main.innerHTML = `
    <div class="space-y-4">

      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Community Kitchen KMS &bull; Physical Inventory Audit</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Blind Physical Inventory Count (30-Line Blank Form)</h2>
              <div class="text-xs text-white/85 mt-0.5">Select a storage section to print a 1-page 30-line blank sheet or reconcile shelf counts into Living Stock.</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 no-print"><button type="button" id="btn-print-blind-sheet" class="px-3.5 py-1.5 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Blank 30-Line Sheet (${esc(selZone === 'ALL' ? 'All Sections' : selZone)})</button>
       ${totalEntered ? `<button type="button" id="btn-clear-blind-draft" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold">Clear Draft (${totalEntered})</button>` : ''}
       <button type="button" id="btn-review-blind" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">Review &amp; Reconcile (${totalEntered})</button></div>
        </div>
      </div>
    
      <!-- Section Blind Physical Count -->
      <div class="kms-card p-4 space-y-3">

        <!-- Section Selector Tabs -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs no-print">
          ${LOCATIONS.map(loc => {
            const locRows = (draft.blankRowsByZone && draft.blankRowsByZone[loc]) || [];
            const blankDone = locRows.filter(r => r && r.name.trim() && r.qty !== '' && r.qty !== undefined).length;
            const locItems = activeItems.filter(x => x.location === loc);
            const catDone = locItems.filter(x => counts[x.id] !== '' && counts[x.id] !== undefined).length;
            const isOn = selZone === loc;
            const badge = mode === 'blank30' ? `${blankDone}/30 lines` : `${catDone}/${locItems.length}`;
            return `<button type="button" data-blind-zone="${esc(loc)}" class="px-3 py-1.5 rounded-lg font-semibold border transition ${isOn ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'border-[var(--line)] hover:bg-black/5'}">${esc(loc)} <span class="opacity-80">(${badge})</span></button>`;
          }).join('')}
          <button type="button" data-blind-zone="ALL" class="px-3 py-1.5 rounded-lg font-semibold border transition ${selZone === 'ALL' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">All Sections (${mode === 'blank30' ? `${blankEnteredCount} lines` : `${catalogEntered}/${activeItems.length}`})</button>
        </div>

        <!-- Entry Mode Switcher + Search -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)] text-xs no-print">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-bold opacity-75">Entry Mode:</span>
            <button type="button" data-blind-mode="blank30" class="px-3 py-1.5 rounded-lg font-semibold border ${mode === 'blank30' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">Blank 30-Line Form (By Section)</button>
            <button type="button" data-blind-mode="live" class="px-3 py-1.5 rounded-lg font-semibold border ${mode === 'live' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">Catalog Live Count (− / +)</button>
            <button type="button" data-blind-mode="hardcopy" class="px-3 py-1.5 rounded-lg font-semibold border ${mode === 'hardcopy' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">Catalog Fast Tab</button>
          </div>
          ${mode === 'blank30'
            ? `<span class="opacity-75 font-semibold">Counting Section: <strong>${esc(activeBlankZone)}</strong> (30 blank lines)</span>`
            : `<input id="blind-search-inp" type="text" value="${esc(draft.search || '')}" placeholder="Filter items in ${esc(selZone === 'ALL' ? 'All Sections' : selZone)}..." class="kms-input text-xs w-60 max-w-full" />`}
        </div>

        <!-- Count Body -->
        ${mode === 'blank30' ? `
          <datalist id="blind-item-suggestions">
            ${activeItems.map(i => `<option value="${esc(i.name)}">${esc(i.location)} (${esc(normStockUnit(i.unit))})</option>`).join('')}
          </datalist>
          <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                  <th class="p-2 w-12">#</th>
                  <th class="p-2">Item Name / Description (${esc(activeBlankZone)})</th>
                  <th class="p-2 w-36">Unit (cases, cans, lbs...)</th>
                  <th class="p-2 w-32 text-right">Counted Qty</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--line)]">
                ${blankRows.map((row, idx) => {
                  const filled = row.name.trim() && row.qty !== '' && row.qty !== undefined;
                  return `
                    <tr class="${filled ? 'bg-emerald-50/40' : ''}">
                      <td class="p-1.5 font-mono font-bold opacity-60">${idx + 1}</td>
                      <td class="p-1.5">
                        <input type="text" list="blind-item-suggestions" data-blank-row="${esc(activeBlankZone)}:${idx}:name" value="${esc(row.name)}" placeholder="Line ${idx + 1} — write or select item..." class="kms-input w-full text-xs" />
                      </td>
                      <td class="p-1.5">
                        <input type="text" data-blank-row="${esc(activeBlankZone)}:${idx}:unit" value="${esc(row.unit)}" placeholder="cases / cans" class="kms-input w-full text-xs" />
                      </td>
                      <td class="p-1.5 text-right">
                        <input type="number" step="0.5" min="0" data-blank-row="${esc(activeBlankZone)}:${idx}:qty" value="${esc(row.qty)}" placeholder="0" class="kms-input w-24 text-xs text-center font-bold" />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : !sectionItems.length ? '<p class="text-xs opacity-70 py-2">No matching items in this section.</p>' : mode === 'hardcopy' ? `
          <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                  <th class="p-2">SKU</th>
                  <th class="p-2">Item Name</th>
                  <th class="p-2">Section</th>
                  <th class="p-2">Unit</th>
                  <th class="p-2 text-right">Hard-Copy Count</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--line)]">
                ${sectionItems.map(x => {
                  const val = counts[x.id] !== undefined ? counts[x.id] : '';
                  return `
                    <tr class="${val !== '' ? 'bg-emerald-50/40' : ''}">
                      <td class="p-2 font-mono opacity-70">${esc(x.sku)}</td>
                      <td class="p-2 font-bold">${esc(x.name)}</td>
                      <td class="p-2 opacity-75">${esc(x.location)}</td>
                      <td class="p-2 font-semibold">${esc(normStockUnit(x.unit))}</td>
                      <td class="p-2 text-right">
                        <input type="number" step="0.5" min="0" data-blind-id="${x.id}" value="${esc(val)}" placeholder="Blank = skip" class="kms-input w-28 text-xs text-center font-bold" />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="space-y-2 max-h-96 overflow-y-auto">
            ${sectionItems.map(x => {
              const val = counts[x.id] !== undefined ? counts[x.id] : '';
              const uLabel = normStockUnit(x.unit);
              return `
                <div class="p-2.5 rounded-lg border ${val !== '' ? 'border-emerald-500 bg-emerald-50/30' : 'border-[var(--line)]'} flex flex-wrap items-center justify-between gap-2 text-xs print-keep">
                  <div>
                    <div class="font-bold text-sm">${esc(x.name)} <span class="text-[11px] font-mono opacity-60">${esc(x.sku)}</span></div>
                    <div class="opacity-75">${esc(x.location)} &middot; Count in <strong>${esc(uLabel)}</strong></div>
                  </div>
                  <div class="flex items-center gap-1.5 no-print">
                    <button type="button" data-blind-step="${x.id}:-1" class="w-9 h-9 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-bold text-base">−</button>
                    <input type="number" step="0.5" min="0" data-blind-id="${x.id}" value="${esc(val)}" placeholder="0" class="kms-input w-20 text-center font-bold text-sm" />
                    <button type="button" data-blind-step="${x.id}:1" class="w-9 h-9 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-bold text-base">+</button>
                    <span class="font-semibold w-14">${esc(uLabel)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        ${lastAudit ? `<div class="text-xs opacity-80 pt-2 border-t border-[var(--line)]">Last reconciled count: <strong>${dLabel(lastAudit.audit_date)}</strong> (${esc(lastAudit.zone || 'ALL')}) by ${esc(lastAudit.auditor)} — ${lastAudit.rows.filter(r => r.sys !== r.phys).length} variance(s)</div>` : ''}
      </div>

      <!-- Log Waste -->
      <form id="form-waste" class="kms-card p-4 space-y-3 no-print">
        <h2 class="text-base font-bold">Log Waste</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select name="itemId" class="kms-input text-sm">${opts}</select>
          <input name="qty" type="number" step="0.5" min="0.5" required placeholder="Amount wasted" class="kms-input text-sm" />
          <select name="reason" class="kms-input text-sm"><option>Expired</option><option>Spoiled</option><option>Dropped or damaged</option><option>Overcooked or burned</option><option>Other</option></select>
        </div>
        <button type="submit" class="kms-btn-primary px-4 py-2 text-sm">Remove from Stock</button>
      </form>

      <!-- Exports & Backups -->
      <div class="kms-card p-4 flex flex-wrap gap-2 no-print">
        <button type="button" id="btn-exp-csv" class="kms-btn-alt px-3.5 py-2 text-xs">Download Stock CSV</button>
        <button type="button" id="btn-exp-json" class="kms-btn-alt px-3.5 py-2 text-xs">Download Full JSON Backup</button>
        <button type="button" id="btn-open-restore" class="kms-btn-alt px-3.5 py-2 text-xs">Restore JSON Backup</button>
      </div>
    </div>
  `;
}
