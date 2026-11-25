// js/views/checklists.js — Operational Checklists (Daily, Weekly, Monthly)

import { localDateStr, dLabel, esc } from '../utils.js';
import { state, isMgmtOrHigher } from '../state.js';

export function renderChecklists(main) {
  const today = localDateStr();
  const freq = state.checklistFreq || 'daily';
  const list = state.checklists.filter(c => c.freq === freq);
  const doneCount = list.filter(c => c.done).length;
  const isMgr = isMgmtOrHigher();

  main.innerHTML = `
    <div class="space-y-4">
      <!-- SA Checklist Banner -->
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Kitchen Operations</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight">${esc(freq.toUpperCase())} Operational Checklist — ${dLabel(today)} (${doneCount}/${list.length})</h2>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 no-print">
            <button type="button" onclick="document.body.classList.remove('printing-modal'); window.print();" class="px-3.5 py-1.5 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Checklist (Letter)</button>
            ${['daily', 'weekly', 'monthly'].map(f => `<button type="button" data-chk-freq="${f}" class="px-3 py-1.5 rounded-lg text-xs font-bold ${freq === f ? 'bg-[#b3122b] text-white' : 'bg-white/15 text-white hover:bg-white/25'}">${f.toUpperCase()}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="kms-card p-4 space-y-3">
        ${isMgr ? `
          <form id="form-add-checklist" class="flex flex-wrap gap-2 no-print">
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
        <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-[#1b365d] text-white uppercase text-[10px]">
                <th class="py-1.5 px-2.5 w-10 text-center">Done</th>
                <th class="py-1.5 px-2.5">Task Description</th>
                <th class="py-1.5 px-2.5 w-36">Area / Category</th>
                <th class="py-1.5 px-2.5 w-44">Completed By &amp; Time</th>
                ${isMgr ? '<th class="py-1.5 px-2.5 text-right w-24 no-print">Manage</th>' : ''}
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--line)]">
              ${list.map(c => `
                <tr class="chk-row-card ${c.done ? 'bg-emerald-50/40' : ''}">
                  <td class="py-2 px-2.5 text-center">
                    <input type="checkbox" data-chk-id="${c.id}" ${c.done ? 'checked' : ''} />
                  </td>
                  <td class="py-2 px-2.5 font-semibold ${c.done ? 'line-through opacity-65' : ''}">
                    ${esc(c.title)}
                    ${c.priority_carryover && !c.done ? ' <span class="tag tag-OUT ml-1">CARRYOVER</span>' : ''}
                  </td>
                  <td class="py-2 px-2.5 opacity-75">${esc(c.category || 'Operations')}</td>
                  <td class="py-2 px-2.5">
                    ${c.done
                      ? `<span class="font-bold text-[#1f7a3d]">${esc(c.done_by)} @ ${esc(c.done_at)}</span>`
                      : '<span class="font-mono opacity-55">______________________</span>'}
                  </td>
                  ${isMgr ? `
                    <td class="py-2 px-2.5 text-right no-print">
                      <button type="button" data-edit-chk="${c.id}" class="kms-btn-alt px-2 py-0.5 text-[11px]">Edit</button>
                      <button type="button" data-del-chk="${c.id}" class="text-red-600 hover:underline font-semibold text-[11px] px-1">Delete</button>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="kms-card p-3.5 text-xs grid grid-cols-3 gap-3 print-keep">
        <div class="border-b border-slate-400 pb-1 font-semibold">Schedule: ${esc(freq.toUpperCase())} (${dLabel(today)})</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Lead Volunteer / Cook:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Kitchen Manager Review:</div>
      </div>
    </div>
  `;
}
