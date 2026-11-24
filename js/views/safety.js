// js/views/safety.js — Daily HACCP Temperature Checks & Cleaning Checklist

import { TEMP_CHECKS, CLEANING_TASKS, localDateStr, dLabel, esc } from '../utils.js';
import { state } from '../state.js';

export function renderSafety(main) {
  const today = localDateStr();
  const log = state.safetyLogs[today] || { temps: {}, cleaning: {} };
  main.innerHTML = `
    <div class="space-y-4">
      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold">Daily Temperature Log — ${dLabel(today)}</h2>
            <p class="text-xs opacity-75">Coolers: ≤41°F · Freezers: ≤0°F · Hot Hold: ≥135°F</p>
          </div>
          <button type="button" onclick="window.print()" class="kms-btn-navy px-3 py-1.5 text-xs no-print">Print Daily Safety Log</button>
        </div>
        <div class="space-y-2">
          ${TEMP_CHECKS.map((c, i) => {
            const v = (log.temps || {})[i];
            const has = v !== undefined && v !== null && v !== '';
            const pass = has ? (c[1] === 'max' ? Number(v) <= c[2] : Number(v) >= c[2]) : null;
            return `
              <div class="p-2.5 rounded-lg border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm print-keep">
                <div><strong>${esc(c[0])}</strong> <span class="opacity-70 text-xs">(${c[1] === 'max' ? 'at or below ' : 'at or above '}${c[2]}°F)</span></div>
                <div class="flex items-center gap-2">
                  ${pass === null ? '' : `<span class="tag tag-${pass ? 'OK' : 'OUT'}">${pass ? 'PASS' : 'FIX NOW'}</span>`}
                  <input type="number" step="0.1" value="${has ? v : ''}" data-temp-idx="${i}" placeholder="°F" class="kms-input w-20 text-center font-bold" />
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="kms-card p-4 space-y-2">
        <h3 class="text-sm font-bold">Daily Cleaning Checklist</h3>
        ${CLEANING_TASKS.map((t, i) => `
          <label class="flex items-center gap-2.5 p-2 rounded border border-[var(--line)] text-xs sm:text-sm cursor-pointer print-keep">
            <input type="checkbox" data-clean-idx="${i}" ${(log.cleaning || {})[i] ? 'checked' : ''} />
            <span>${esc(t)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}