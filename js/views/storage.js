// js/views/storage.js — FIFO Date Labels & Daily Salad Bar Shelf-Life Tracking

import { LOCATIONS, SHELF_PRESETS, localDateStr, dLabel, esc } from '../utils.js';
import { state, isMgmtOrHigher } from '../state.js';

export function renderStorage(main) {
  const today = localDateStr();
  const isMgr = isMgmtOrHigher();
  const activeLeft = state.storageTags.filter(t => t.status === 'STORED' && t.tag_category !== 'SALAD_BAR').sort((a, b) => a.use_by_date.localeCompare(b.use_by_date));
  const activeSalad = state.storageTags.filter(t => t.status === 'STORED' && t.tag_category === 'SALAD_BAR').sort((a, b) => a.use_by_date.localeCompare(b.use_by_date));

  const tagCard = (t) => {
    const diff = Math.round((new Date(t.use_by_date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000);
    const cls = diff < 0 ? 'OUT' : diff <= 1 ? 'LOW' : 'OK';
    return `
      <div class="p-3 rounded-lg border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs tag-row-card">
        <div>
          <div class="font-bold text-sm">${esc(t.item_name)} ${t.qty_label ? `— ${esc(t.qty_label)}` : ''}</div>
          <div class="opacity-75">${esc(t.zone)} · Prepped ${dLabel(t.prep_date)} · Use by <strong>${dLabel(t.use_by_date)}</strong> <span class="tag tag-${cls}">${diff < 0 ? 'PAST – THROW OUT' : diff === 0 ? 'USE TODAY' : diff + ' day(s) left'}</span></div>
        </div>
        <div class="flex flex-wrap gap-1.5 no-print">
          <button type="button" data-tag-act="${t.id}:USED" class="kms-btn-ok px-2.5 py-1 text-xs">Used</button>
          <button type="button" data-tag-act="${t.id}:DISCARDED" class="kms-btn-alt px-2.5 py-1 text-xs">Toss</button>
          ${isMgr ? `<button type="button" data-del-tag="${t.id}" class="text-red-600 hover:underline font-semibold px-1.5 py-1 text-xs">Delete</button>` : ''}
        </div>
      </div>
    `;
  };

  main.innerHTML = `
    <div class="space-y-4">
      <form id="form-add-tag" class="kms-card p-4 space-y-3 no-print">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base font-bold">Date-Label Leftovers &amp; Salad Bar (&gt;24 Hours)</h2>
          <button type="button" onclick="window.print()" class="kms-btn-alt px-3 py-1.5 text-xs">Print FIFO Sheet</button>
        </div>
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

      <div class="kms-card p-4 space-y-2">
        <h3 class="text-sm font-bold">Meal Leftovers FIFO (${activeLeft.length})</h3>
        ${!activeLeft.length ? '<p class="text-xs opacity-70">No meal leftovers logged.</p>' : activeLeft.map(tagCard).join('')}
      </div>

      <div class="kms-card p-4 space-y-2">
        <h3 class="text-sm font-bold">Daily Salad Bar &amp; Cold Prep FIFO (${activeSalad.length})</h3>
        ${!activeSalad.length ? '<p class="text-xs opacity-70">No Salad Bar items logged.</p>' : activeSalad.map(tagCard).join('')}
      </div>
    </div>
  `;
}