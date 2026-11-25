// js/views/safety.js — Daily HACCP Temperature Checks & Cleaning Checklist

import { TEMP_CHECKS, CLEANING_TASKS, localDateStr, dLabel, esc } from '../utils.js';
import { state } from '../state.js';

export function renderSafety(main) {
  const today = localDateStr();
  const log = state.safetyLogs[today] || { temps: {}, cleaning: {} };
  const completedTemps = TEMP_CHECKS.filter((_, i) => {
    const v = (log.temps || {})[i];
    return v !== undefined && v !== null && v !== '';
  }).length;
  const completedClean = CLEANING_TASKS.filter((_, i) => Boolean((log.cleaning || {})[i])).length;

  main.innerHTML = `
    <div class="space-y-4">
      <!-- SA Header Banner -->
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; ServSafe HACCP Log</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight">Daily Temperature &amp; Sanitation Log — ${dLabel(today)}</h2>
            </div>
          </div>
          <div class="flex items-center gap-2 no-print">
            <button type="button" onclick="document.body.classList.remove('printing-modal'); window.print();" class="px-4 py-2 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Daily Safety Log (Letter)</button>
          </div>
        </div>
        <div class="p-3 kms-card rounded-none border-0 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span><strong>Critical Limits:</strong> Coolers &le;41&deg;F &bull; Freezers &le;0&deg;F &bull; Hot Holding &ge;135&deg;F &bull; Cooking &ge;165&deg;F</span>
          <span class="font-bold">Completed Today: ${completedTemps}/${TEMP_CHECKS.length} Temps &bull; ${completedClean}/${CLEANING_TASKS.length} Sanitation</span>
        </div>
      </div>

      <!-- Daily Temperature Log -->
      <div class="kms-card p-4 space-y-2.5 print-keep">
        <div class="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">1. Daily Equipment &amp; Food Temperature Checkpoints</h3>
          <span class="text-[11px] opacity-75">Record °F before &amp; during service</span>
        </div>
        <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-[#1b365d] text-white uppercase text-[10px]">
                <th class="py-1.5 px-2.5">Checkpoint</th>
                <th class="py-1.5 px-2.5">Safe Limit</th>
                <th class="py-1.5 px-2.5 text-center w-28">Recorded Temp</th>
                <th class="py-1.5 px-2.5 text-center w-24">Status</th>
                <th class="py-1.5 px-2.5 w-36">Corrective Action / Initials</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--line)]">
              ${TEMP_CHECKS.map((c, i) => {
                const v = (log.temps || {})[i];
                const has = v !== undefined && v !== null && v !== '';
                const pass = has ? (c[1] === 'max' ? Number(v) <= c[2] : Number(v) >= c[2]) : null;
                return `
                  <tr class="${pass === false ? 'bg-red-50/60' : ''}">
                    <td class="py-2 px-2.5 font-bold">${esc(c[0])}</td>
                    <td class="py-2 px-2.5 opacity-80">${c[1] === 'max' ? 'At or below ' : 'At or above '}<strong>${c[2]}&deg;F</strong></td>
                    <td class="py-2 px-2.5 text-center">
                      <input type="number" step="0.1" value="${has ? v : ''}" data-temp-idx="${i}" placeholder="____ °F" class="kms-input w-20 text-center font-bold no-print" />
                      <span class="hidden print:inline font-mono font-bold">${has ? esc(v) + ' °F' : '________ °F'}</span>
                    </td>
                    <td class="py-2 px-2.5 text-center">
                      ${pass === null
                        ? '<span class="opacity-50 font-mono">PASS / FIX</span>'
                        : `<span class="tag tag-${pass ? 'OK' : 'OUT'}">${pass ? 'PASS' : 'FIX NOW'}</span>`}
                    </td>
                    <td class="py-2 px-2.5 font-mono opacity-65">__________________</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Daily Cleaning & Sanitation Checklist -->
      <div class="kms-card p-4 space-y-2.5 print-keep">
        <div class="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">2. Daily Cleaning &amp; Sanitation Sign-Off</h3>
          <span class="text-[11px] opacity-75">Wash, rinse, sanitize (200 ppm Quat / 50–100 ppm Chlorine)</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${CLEANING_TASKS.map((t, i) => {
            const done = Boolean((log.cleaning || {})[i]);
            return `
              <label class="flex items-center justify-between gap-2 p-2.5 rounded-lg border ${done ? 'border-emerald-500 bg-emerald-50/40' : 'border-[var(--line)]'} text-xs cursor-pointer print-keep">
                <span class="flex items-center gap-2">
                  <input type="checkbox" data-clean-idx="${i}" ${done ? 'checked' : ''} />
                  <span class="font-semibold">${esc(t)}</span>
                </span>
                <span class="font-mono text-[10px] opacity-60">Init: ____</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <!-- HACCP Sign-Off Footer -->
      <div class="kms-card p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 print-keep">
        <div class="border-b border-slate-400 pb-1 font-semibold">Date: ${dLabel(today)}</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">AM / Prep Cook:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Sanitizer PPM Check:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Manager / PIC Sign-Off:</div>
      </div>
    </div>
  `;
}
