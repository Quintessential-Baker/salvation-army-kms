// js/views/records.js — Section Blind Physical Count, Waste & System Backups

import { LOCATIONS, normStockUnit, dLabel, esc } from '../utils.js';
import { state } from '../state.js';

export function renderRecords(main) {
  const activeItems = state.items.filter(i => !i.discontinued);
  const opts = activeItems.map(i => `<option value="${i.id}">${esc(i.name)} (${esc(normStockUnit(i.unit))})</option>`).join('');
  if (!state.blindDraft) state.blindDraft = { zone: LOCATIONS[0], mode: 'live', search: '', revealed: false, counts: {} };
  const draft = state.blindDraft;
  const selZone = draft.zone || LOCATIONS[0];
  const mode = draft.mode || 'live';
  const bSearch = (draft.search || '').trim().toLowerCase();
  const counts = draft.counts || {};
  const lastAudit = state.blindAudits[0];

  const sectionItems = activeItems.filter(x =>
    (selZone === 'ALL' || x.location === selZone) &&
    (!bSearch || x.name.toLowerCase().includes(bSearch) || x.sku.toLowerCase().includes(bSearch))
  );
  const totalEntered = Object.keys(counts).filter(k => counts[k] !== '' && counts[k] !== undefined && activeItems.some(i => i.id === k)).length;

  main.innerHTML = `
    <div class="space-y-4">
      <!-- Section Blind Physical Count -->
      <div class="kms-card p-4 border-l-4 border-l-[#1b365d] space-y-3">
        <div class="flex flex-wrap justify-between items-start gap-2">
          <div>
            <h2 class="text-base font-bold">Blind Physical Inventory Count (By Section)</h2>
            <p class="text-xs opacity-75">System stock stays hidden so shelf counts stay honest. Select a section, count live on your tablet or print a blank sheet and type in hard-copy numbers later.</p>
          </div>
          <div class="flex flex-wrap gap-1.5 no-print">
            <button type="button" id="btn-print-blind-sheet" class="kms-btn-alt px-3 py-1.5 text-xs">Print Blank Count Sheet</button>
            ${totalEntered ? `<button type="button" id="btn-clear-blind-draft" class="kms-btn-alt px-3 py-1.5 text-xs">Clear Draft (${totalEntered})</button>` : ''}
            <button type="button" id="btn-review-blind" class="kms-btn-ok px-3.5 py-1.5 text-xs font-semibold">Review &amp; Reconcile Count (${totalEntered})</button>
          </div>
        </div>

        <!-- Section Selector Tabs -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs no-print">
          ${LOCATIONS.map(loc => {
            const locItems = activeItems.filter(x => x.location === loc);
            const locDone = locItems.filter(x => counts[x.id] !== '' && counts[x.id] !== undefined).length;
            const isOn = selZone === loc;
            return `<button type="button" data-blind-zone="${esc(loc)}" class="px-3 py-1.5 rounded-lg font-semibold border transition ${isOn ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'border-[var(--line)] hover:bg-black/5'}">${esc(loc)} <span class="opacity-80">(${locDone}/${locItems.length})</span></button>`;
          }).join('')}
          <button type="button" data-blind-zone="ALL" class="px-3 py-1.5 rounded-lg font-semibold border transition ${selZone === 'ALL' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">All Sections (${totalEntered}/${activeItems.length})</button>
        </div>

        <!-- Entry Mode Switcher + Search -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)] text-xs no-print">
          <div class="flex items-center gap-1.5">
            <span class="font-bold opacity-75">Entry Mode:</span>
            <button type="button" data-blind-mode="live" class="px-3 py-1.5 rounded-lg font-semibold border ${mode === 'live' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">Live Shelf Count (Tablet / − +)</button>
            <button type="button" data-blind-mode="hardcopy" class="px-3 py-1.5 rounded-lg font-semibold border ${mode === 'hardcopy' ? 'bg-[#1b365d] text-white border-[#1b365d]' : 'border-[var(--line)] hover:bg-black/5'}">Hard-Copy Sheet Entry (Fast Tab)</button>
          </div>
          <input id="blind-search-inp" type="text" value="${esc(draft.search || '')}" placeholder="Filter items in ${esc(selZone === 'ALL' ? 'All Sections' : selZone)}..." class="kms-input text-xs w-60 max-w-full" />
        </div>

        <!-- Count Rows -->
        ${!sectionItems.length ? '<p class="text-xs opacity-70 py-2">No matching items in this section.</p>' : mode === 'hardcopy' ? `
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