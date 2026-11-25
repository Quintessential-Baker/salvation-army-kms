// js/views/report.js — Management Executive, Funding & Donation Reports

import { TEMP_CHECKS, localDateStr, addDays, serviceDaysBetween, esc } from '../utils.js';
import {
  state, isMgmtOrHigher, itemStatus, itemNeed, getForecastMetrics, forecastWeekday
} from '../state.js';

export function renderReport(main) {
  if (!isMgmtOrHigher()) {
    main.innerHTML = `
    <div class="space-y-4">
      <!-- SA Executive Header Banner -->
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="bg-[#1b365d] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#b3122b]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler Worship &amp; Service Center &bull; Management Report</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight">Executive, Funding &amp; Donation Report — ${esc(periodLabel)}</h2>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 no-print">
            <button type="button" id="btn-copy-funding-brief" class="px-3 py-1.5 rounded-lg bg-[#b3122b] hover:bg-[#910d22] text-white text-xs font-bold">Copy Funding Brief</button>
            <button type="button" id="btn-export-exec-csv" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold">Export CSV</button>
            <button type="button" id="btn-print-exec-report" onclick="document.body.classList.remove('printing-modal');" class="px-3.5 py-1.5 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Report (Letter)</button>
          </div>
        </div>
        <div class="p-3 kms-card rounded-none border-0 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="opacity-80">313 West Cunningham St., Butler, PA &bull; Community Meals Program &bull; Generated ${esc(today)}</span>
          <div class="flex flex-wrap items-center gap-1.5 no-print">
            ${[['month', 'By Month'], ['30d', 'Last 30 Days'], ['90d', 'Last 90 Days'], ['ytd', 'Year-to-Date'], ['365d', 'Last 12 Months']].map(([k, lbl]) => `
              <button type="button" data-rep-range="${k}" class="px-2.5 py-1 rounded-lg border font-semibold ${rangeMode === k ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'border-[var(--line)] hover:bg-black/5'}">${lbl}</button>
            `).join('')}
            ${rangeMode === 'month' ? `<select id="rep-month" class="kms-input text-xs ml-1">${months.map(m => `<option ${m === rm ? 'selected' : ''}>${m}</option>`).join('')}</select>` : ''}
          </div>
        </div>
      </div>

      <!-- 4 Executive KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div class="kms-card p-3.5 border-t-4 border-t-[#b3122b] print-keep">
          <div class="text-[11px] uppercase opacity-70 font-bold">Meals Served</div>
          <div class="text-2xl font-black text-[#b3122b] mt-0.5">${meals.toLocaleString()}</div>
          <div class="text-xs opacity-75 mt-0.5">${servedDays.length} service day(s) &bull; Avg ${avgPerDay.toFixed(1)}/day</div>
        </div>
        <div class="kms-card p-3.5 border-t-4 border-t-[#1b365d] print-keep">
          <div class="text-[11px] uppercase opacity-70 font-bold">Food Spend &amp; Donations</div>
          <div class="text-2xl font-black mt-0.5">$${spend.toFixed(2)}</div>
          <div class="text-xs opacity-75 mt-0.5">${costPerMeal > 0 ? '$' + costPerMeal.toFixed(2) + ' / meal' : 'Est. $3.25/meal'} &bull; ${donatedRecvs.length} donated drop(s)</div>
        </div>
        <div class="kms-card p-3.5 border-t-4 border-t-[#1b365d] print-keep">
          <div class="text-[11px] uppercase opacity-70 font-bold">Inventory &amp; Restock Gap</div>
          <div class="text-2xl font-black mt-0.5">${parHealthPct}% At Par</div>
          <div class="text-xs opacity-75 mt-0.5">Stock value: $${stockValue.toFixed(2)} &bull; ${lowItems.length} below par</div>
        </div>
        <div class="kms-card p-3.5 border-t-4 border-t-emerald-600 print-keep">
          <div class="text-[11px] uppercase opacity-70 font-bold">Safety &amp; Stewardship</div>
          <div class="text-2xl font-black text-emerald-700 mt-0.5">${safetyPct !== null ? safetyPct + '% Pass' : 'N/A'}</div>
          <div class="text-xs opacity-75 mt-0.5">${checks} temp check(s), ${fails} flagged &bull; ${waste.length} waste / ${savedLeftovers} reused</div>
        </div>
      </div>

      <!-- Demand Forecasts & Funding Projections -->
      <div class="kms-card p-4 space-y-2.5 print-keep">
        <div class="flex flex-wrap justify-between items-center gap-2 border-b border-[var(--line)] pb-1.5">
          <div>
            <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">1. Demand Forecasts &amp; Funding Projections</h3>
            <p class="text-xs opacity-75">Based on ${fc.openCount} recorded open service day(s) (recent trend: ${fc.avgRecent.toFixed(1)} patrons/day)${usingBench ? ' &bull; Using $3.25/meal benchmark where item prices are blank' : ''}.</p>
          </div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div class="p-3 rounded-lg border border-[var(--line)] bg-black/5">
            <div class="font-bold uppercase opacity-65">Next 7 Service Days</div>
            <div class="text-lg font-black mt-0.5">${next7Meals.toLocaleString()} meals</div>
            <div class="opacity-75">Est. food need: $${Math.round(next7Meals * benchPerMeal).toLocaleString()}</div>
          </div>
          <div class="p-3 rounded-lg border border-[var(--line)] bg-black/5">
            <div class="font-bold uppercase opacity-65">Next 30 Days (Monthly)</div>
            <div class="text-lg font-black mt-0.5">${proj30Meals.toLocaleString()} meals</div>
            <div class="opacity-75">Est. budget: $${proj30Budget.toLocaleString()}</div>
          </div>
          <div class="p-3 rounded-lg border border-[var(--line)] bg-black/5">
            <div class="font-bold uppercase opacity-65">Next 90 Days (Quarterly)</div>
            <div class="text-lg font-black mt-0.5">${proj90Meals.toLocaleString()} meals</div>
            <div class="opacity-75">Est. budget: $${proj90Budget.toLocaleString()}</div>
          </div>
          <div class="p-3 rounded-lg border border-[var(--line)] bg-black/5">
            <div class="font-bold uppercase opacity-65">Annual Projection (12 Mo)</div>
            <div class="text-lg font-black text-[#b3122b] mt-0.5">${proj365Meals.toLocaleString()} meals</div>
            <div class="opacity-75">Est. annual budget: $${proj365Budget.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <!-- Executive Suggestions & Ready-to-Send Funding Brief -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="kms-card p-4 space-y-2 print-keep">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d] border-b border-[var(--line)] pb-1.5">2. Executive Suggestions &amp; Action Plan</h3>
          <ul class="space-y-1.5 text-xs leading-relaxed">
            ${suggestions.map(s => `<li class="p-2 rounded-lg border border-[var(--line)]">${s}</li>`).join('')}
          </ul>
        </div>

        <div class="kms-card p-4 space-y-2 print-keep">
          <div class="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-1.5">
            <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">3. Ready-to-Send Funding / Grant Brief</h3>
            <button type="button" id="btn-copy-funding-brief-2" class="kms-btn-alt px-2.5 py-1 text-xs no-print">Copy Text</button>
          </div>
          <textarea id="exec-funding-brief" rows="8" readonly class="kms-input w-full text-xs font-mono leading-relaxed no-print">${esc(fundingBrief)}</textarea>
          <div class="hidden print:block p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-[10.5px] font-mono whitespace-pre-line leading-snug">${esc(fundingBrief)}</div>
        </div>
      </div>

      <!-- Priority Restock & In-Kind Donation Needs -->
      <div class="kms-card p-4 space-y-2 print-keep">
        <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d] border-b border-[var(--line)] pb-1.5">4. Priority Restock &amp; In-Kind Donation Needs (${lowItems.length} Items Below Par)</h3>
        ${!lowItems.length ? '<p class="text-xs opacity-70">All active items are at or above Par Level.</p>' : `
          <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-[#1b365d] text-white uppercase text-[10px]">
                  <th class="py-1.5 px-2.5">Item</th>
                  <th class="py-1.5 px-2.5">Vendor</th>
                  <th class="py-1.5 px-2.5">On Hand / Par</th>
                  <th class="py-1.5 px-2.5">Cases Needed</th>
                  <th class="py-1.5 px-2.5 text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--line)]">
                ${lowItems.slice(0, 20).map(r => `
                  <tr>
                    <td class="py-1.5 px-2.5 font-bold">${esc(r.item.name)}</td>
                    <td class="py-1.5 px-2.5 opacity-75">${esc(r.item.vendor || '')}</td>
                    <td class="py-1.5 px-2.5">${r.item.on_hand} / ${r.item.par} ${esc(r.item.unit)}</td>
                    <td class="py-1.5 px-2.5 font-bold text-[#b3122b]">${r.needCases} whole case(s)</td>
                    <td class="py-1.5 px-2.5 text-right font-semibold">${r.estCost > 0 ? '$' + r.estCost.toFixed(2) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Leadership Sign-Off Footer -->
      <div class="kms-card p-3.5 text-xs grid grid-cols-3 gap-3 print-keep">
        <div class="border-b border-slate-400 pb-1 font-semibold">Prepared By:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Corps Officer / Director Review:</div>
        <div class="border-b border-slate-400 pb-1 font-semibold">Date Approved:</div>
      </div>
    </div>
  `;
}
}
