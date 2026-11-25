// js/views/storage.js — FIFO Date Labels & Daily Salad Bar Shelf-Life Tracking

import { LOCATIONS, SHELF_PRESETS, localDateStr, dLabel, esc } from '../utils.js';
import { state, isMgmtOrHigher } from '../state.js';

export function renderStorage(main) {
  const today = localDateStr();
  const isMgr = isMgmtOrHigher();
  const activeLeft = state.storageTags.filter(t => t.status === 'STORED' && t.tag_category !== 'SALAD_BAR').sort((a, b) => a.use_by_date.localeCompare(b.use_by_date));
  const activeSalad = state.storageTags.filter(t => t.status === 'STORED' && t.tag_category === 'SALAD_BAR').sort((a, b) => a.use_by_date.localeCompare(b.use_by_date));

  const renderFifoTable = (items, emptyMsg) => {
    if (!items.length) return `<p class="text-xs opacity-70 py-1">${emptyMsg}</p>`;
    return `
      <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#1b365d] text-white uppercase text-[10px]">
              <th class="py-1.5 px-2.5">Item / Container</th>
              <th class="py-1.5 px-2.5">Storage Zone</th>
              <th class="py-1.5 px-2.5">Prep Date</th>
              <th class="py-1.5 px-2.5">Use-By Date</th>
              <th class="py-1.5 px-2.5 text-center">Status</th>
              <th class="py-1.5 px-2.5 text-right no-print">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--line)]">
            ${items.map(t => {
              const diff = Math.round((new Date(t.use_by_date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000);
              const cls = diff < 0 ? 'OUT' : diff <= 1 ? 'LOW' : 'OK';
              const badgeTxt = diff < 0 ? 'PAST – DISCARD' : diff === 0 ? 'USE TODAY' : `${diff} day(s) left`;
              return `
                <tr class="tag-row-card ${diff < 0 ? 'bg-red-50/60' : ''}">
                  <td class="py-2 px-2.5 font-bold">${esc(t.item_name)} ${t.qty_label ? `<span class="font-normal opacity-75">(${esc(t.qty_label)})</span>` : ''}</td>
                  <td class="py-2 px-2.5">${esc(t.zone)}</td>
                  <td class="py-2 px-2.5">${dLabel(t.prep_date)}</td>
                  <td class="py-2 px-2.5 font-bold">${dLabel(t.use_by_date)}</td>
                  <td class="py-2 px-2.5 text-center"><span class="tag tag-${cls}">${badgeTxt}</span></td>
                  <td class="py-2 px-2.5 text-right no-print">
                    <div class="inline-flex flex-wrap gap-1.5">
                      <button type="button" data-tag-act="${t.id}:USED" class="kms-btn-ok px-2.5 py-1 text-xs">Used</button>
                      <button type="button" data-tag-act="${t.id}:DISCARDED" class="kms-btn-alt px-2.5 py-1 text-xs">Toss</button>
                      ${isMgr ? `<button type="button" data-del-tag="${t.id}" class="text-red-600 hover:underline font-semibold px-1.5 py-1 text-xs">Delete</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  main.innerHTML = `
    <div class="space-y-4">
      <!-- SA FIFO Header Banner -->
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="bg-[#1b365d] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#b3122b]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; ServSafe 7-Day Rule</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight">FIFO Date-Label &amp; Shelf-Life Tracking Log — ${dLabel(today)}</h2>
            </div>
          </div>
          <div class="flex items-center gap-2 no-print">
            <button type="button" onclick="document.body.classList.remove('printing-modal'); window.print();" class="px-4 py-2 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print FIFO Sheet (Letter)</button>
          </div>
        </div>
      </div>

      <!-- Add Date-Label Form (Hidden on Print) -->
      <form id="form-add-tag" class="kms-card p-4 space-y-3 no-print">
        <h3 class="text-sm font-bold">Add Date-Label for Leftovers &amp; Salad Bar (&gt;24 Hours)</h3>
        <div class="flex flex-wrap gap-1.5">
          ${SHELF_PRESETS.map((p, idx) => `<button type="button" data-tag-preset="${idx}" class="kms-btn-alt px-2.5 py-1 text-xs">${esc(p.label)}</button>`).join('')}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input name="itemName" required placeholder="What is it?" class="kms-input text-sm lg:col-span-2" />
          <input name="qtyLabel" placeholder="Amount (e.g. 2 pans)" class="kms-input text-sm" />
          <select name="tagCategory" class="kms-input text-sm">
            <option value="LEFTOVER">Meal Leftover</option>
            <option value="SALAD_BAR">Daily Salad Bar</option>
          </select>
          <select name="days" class="kms-input text-sm">
            <option value="7">Cooked Entree (7 days)</option>
            <option value="4">Dairy / Deli Salad (4 days)</option>
            <option value="3">Cut Greens / Fruit (3 days)</option>
            <option value="90">Freezer (90 days)</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <select name="zone" class="kms-input text-sm">${LOCATIONS.map(l => `<option>${esc(l)}</option>`).join('')}</select>
          <button type="submit" class="kms-btn-primary px-4 py-2 text-sm">Add &amp; Date-Label</button>
        </div>
      </form>

      <div class="kms-card p-4 space-y-2 print-keep">
        <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">1. Stored Meal Leftovers FIFO (${activeLeft.length})</h3>
        ${renderFifoTable(activeLeft, 'No meal leftovers currently stored.')}
      </div>

      <div class="kms-card p-4 space-y-2 print-keep">
        <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">2. Daily Salad Bar &amp; Cold Prep FIFO (${activeSalad.length})</h3>
        ${renderFifoTable(activeSalad, 'No Salad Bar items currently stored.')}
      </div>

      <div class="kms-card p-3.5 text-xs grid grid-cols-3 gap-3 print-keep">
        <div class="border-b border-slate-400 pb-1 font-semibold">Cooler Inspection Date: ${dLabel(today)}</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Expired Items Discarded By:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Verified By (PIC):</div>
      </div>
    </div>
  `;
}
