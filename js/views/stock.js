// js/views/stock.js — Living Stock & Bulk Stock Manager

import { LOCATIONS, STOCK_UNITS, normStockUnit, esc } from '../utils.js';
import { state, isMgmtOrHigher, isStaffOrHigher, learnMessage, itemStatus } from '../state.js';

export function renderStock(main) {
  const q = (state._stockSearch || '').toLowerCase();
  const locFilter = state._stockLoc || 'ALL';
  const isMgr = isMgmtOrHigher();
  const canEdit = isStaffOrHigher();
  main.innerHTML = `
    <div class="space-y-4">

      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Community Kitchen KMS &bull; Inventory Control</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Living Stock &amp; Par Levels</h2>
              <div class="text-xs text-white/85 mt-0.5">${learnMessage()}</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 no-print"><button type="button" onclick="document.body.classList.remove('printing-modal'); window.print();" class="px-3 py-1.5 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Stock Sheet</button>
       <button type="button" id="btn-stock-undo" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold">Undo − / +</button>
       ${isMgr ? `<button type="button" id="btn-bulk-stock" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold">Bulk Edit / Delete</button>` : ''}
       ${canEdit ? `<button type="button" id="btn-add-item-modal" class="px-3 py-1.5 rounded-lg bg-[#b3122b] hover:bg-[#910d22] text-white text-xs font-bold">+ Add Item</button>` : ''}</div>
        </div>
      </div>
    
      <div class="kms-card p-3.5 no-print">
        <div class="flex flex-wrap gap-2 no-print">
          <input id="stock-search" type="text" value="${esc(state._stockSearch || '')}" placeholder="Search item name or SKU..." class="kms-input flex-1 min-w-[180px] text-sm" />
          <select id="stock-loc" class="kms-input text-sm">
            <option value="ALL">All Locations</option>
            ${LOCATIONS.map(l => `<option value="${esc(l)}" ${locFilter === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
          </select>
        </div>
      </div>

      ${LOCATIONS.filter(L => locFilter === 'ALL' || locFilter === L).map(L => {
        const list = state.items.filter(x => !x.discontinued && x.location === L && (!q || x.name.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q)));
        if (!list.length) return '';
        return `
          <div class="space-y-2">
            <h3 class="text-sm font-bold uppercase tracking-wide pb-1 border-b-2 border-[#b3122b]">${esc(L)} (${list.length})</h3>
            ${list.map(x => {
              const st = itemStatus(x);
              const curUnit = normStockUnit(x.unit);
              const unitOpts = Array.from(new Set([...STOCK_UNITS, curUnit]));
              return `
                <div class="kms-card p-3 flex flex-wrap items-center justify-between gap-2 stock-row-card">
                  <div class="min-w-[200px] flex-1">
                    <div class="font-bold text-sm">${esc(x.name)} <span class="text-[11px] font-mono opacity-60">${esc(x.sku)}</span></div>
                    <div class="text-xs opacity-75 flex flex-wrap items-center gap-1.5 mt-1">
                      <span class="tag tag-${st}">${st}</span>
                      <span>Par${x.par_learned ? ' (learned)' : ''}:</span>
                      <input type="number" step="0.5" min="0" value="${x.par}" data-item-field="${x.id}:par" ${!isMgr ? 'disabled' : ''} class="kms-input w-16 text-xs text-center font-bold" />
                      <select data-item-field="${x.id}:unit" ${!isMgr ? 'disabled' : ''} class="kms-input text-xs font-semibold" title="Stock Unit">
                        ${unitOpts.map(u => `<option value="${esc(u)}" ${curUnit === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
                      </select>
                      <span>· $</span>
                      <input type="number" step="0.01" min="0" value="${x.unit_price || ''}" placeholder="0.00" data-item-field="${x.id}:unit_price" ${!isMgr ? 'disabled' : ''} class="kms-input w-16 text-xs text-center" />
                      <select data-item-field="${x.id}:cadence" ${!isMgr ? 'disabled' : ''} class="kms-input text-xs">
                        <option value="W" ${x.cadence === 'W' ? 'selected' : ''}>Weekly</option>
                        <option value="M" ${x.cadence === 'M' ? 'selected' : ''}>Monthly</option>
                      </select>
                      <select data-item-field="${x.id}:location" ${!isMgr ? 'disabled' : ''} class="kms-input text-xs no-print" title="Storage location">
                        ${Array.from(new Set([...LOCATIONS, x.location])).map(loc => `<option value="${esc(loc)}" ${x.location === loc ? 'selected' : ''}>${esc(loc)}</option>`).join('')}
                      </select>
                      ${isMgr ? `<button type="button" data-edit-item="${x.id}" class="kms-btn-alt px-2 py-0.5 text-[11px] no-print">Edit</button><button type="button" data-del-item="${x.id}" class="text-red-600 hover:underline font-semibold text-[11px] px-1 no-print">Delete</button>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button type="button" data-adj="${x.id}:-1" class="w-10 h-10 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-bold text-lg no-print">−</button>
                    <input type="number" step="0.5" min="0" value="${x.on_hand}" data-item-field="${x.id}:on_hand" class="kms-input w-16 text-center font-bold text-sm" />
                    <button type="button" data-adj="${x.id}:1" class="w-10 h-10 rounded-lg border border-[var(--line)] bg-[var(--bg)] font-bold text-lg no-print">+</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}