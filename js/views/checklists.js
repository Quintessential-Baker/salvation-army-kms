// js/views/checklists.js — Operational Checklists (Daily, Weekly, Monthly)

import { esc } from '../utils.js';
import { state, isMgmtOrHigher } from '../state.js';

export function renderChecklists(main) {
  const freq = state.checklistFreq || 'daily';
  const list = state.checklists.filter(c => c.freq === freq);
  const doneCount = list.filter(c => c.done).length;
  const isMgr = isMgmtOrHigher();

  main.innerHTML = `
    <div class="space-y-4">
      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 class="text-base font-bold">Operational Checklists (${doneCount}/${list.length})</h2>
            <p class="text-xs opacity-75">Ticks stamp your name &amp; time automatically.</p>
          </div>
          <div class="flex flex-wrap gap-1.5 no-print">
            <button type="button" onclick="window.print()" class="kms-btn-alt px-3 py-1.5 text-xs">Print Checklist</button>
            ${['daily', 'weekly', 'monthly'].map(f => `<button type="button" data-chk-freq="${f}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${freq === f ? 'bg-[#b3122b] text-white' : 'kms-btn-alt'}">${f.toUpperCase()}</button>`).join('')}
          </div>
        </div>
        ${isMgr ? `
          <form id="form-add-checklist" class="flex flex-wrap gap-2 pt-1 no-print">
            <input name="title" type="text" required placeholder="+ Add new ${esc(freq)} checklist task..." class="kms-input flex-1 min-w-[200px] text-xs" />
            <select name="category" class="kms-input text-xs">
              <option>Food Safety / Cleaning</option>
              <option>Ordering</option>
              <option>Inventory</option>
              <option>Prep &amp; Service</option>
            </select>
            <button type="submit" class="kms-btn-navy px-3 py-1.5 text-xs font-semibold">+ Add Task</button>
          </form>
        ` : ''}
        <div class="space-y-2">
          ${list.map(c => `
            <div class="p-3 rounded-lg border border-[var(--line)] flex items-center justify-between gap-2 chk-row-card">
              <label class="flex items-center gap-2.5 cursor-pointer flex-1">
                <input type="checkbox" data-chk-id="${c.id}" ${c.done ? 'checked' : ''} />
                <div>
                  <div class="text-sm font-semibold ${c.done ? 'line-through opacity-55' : ''}">${esc(c.title)}</div>
                  ${c.done ? `<div class="text-xs text-[#1f7a3d]">Done by ${esc(c.done_by)} @ ${esc(c.done_at)}</div>` : ''}
                </div>
              </label>
              <div class="flex items-center gap-1.5 shrink-0">
                ${c.priority_carryover && !c.done ? '<span class="tag tag-OUT">CARRYOVER</span>' : ''}
                ${isMgr ? `
                  <button type="button" data-edit-chk="${c.id}" class="kms-btn-alt px-2 py-0.5 text-[11px] no-print">Edit</button>
                  <button type="button" data-del-chk="${c.id}" class="text-red-600 hover:underline font-semibold text-[11px] px-1 no-print">Delete</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}