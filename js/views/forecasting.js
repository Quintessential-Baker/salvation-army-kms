// js/views/forecasting.js — Patrons Served History & Attendance Forecasting Charts

import { localDateStr, addDays, dLabel, serviceDaysBetween, esc } from '../utils.js';
import { state, getForecastMetrics, forecastWeekday, predictedPortions } from '../state.js';

let forecastChart = null;

export function destroyForecastChart() {
  if (forecastChart) {
    forecastChart.destroy();
    forecastChart = null;
  }
}

export function renderForecasting(main) {
  destroyForecastChart();
  const today = localDateStr();
  const fc = getForecastMetrics();
  const hz = state.horizon || 'days';
  let rows = [];

  const whatIfMeal = state._fcMealFilter || '';
  const whatIfCirc = state._fcCircFilter || 'Normal Day';
  const circMult = fc.circFactor(whatIfCirc);
  const mealMult = whatIfMeal ? fc.mealFactor(whatIfMeal) : 1;

  if (hz === 'days') {
    const days = serviceDaysBetween(today, addDays(today, 14)).slice(0, 7);
    rows = days.map(d => {
      const pred = forecastWeekday(d, whatIfMeal, whatIfCirc);
      return { label: dLabel(d), predicted: pred, prep: pred > 0 ? Math.max(10, Math.ceil(pred / 5) * 5) : 0 };
    });
  } else if (hz === 'weeks') {
    for (let i = 1; i <= 8; i++) {
      const p = Math.round(fc.avgRecent * 4 * mealMult * circMult);
      rows.push({ label: 'Week +' + i, predicted: p, prep: Math.round(p * 1.05) });
    }
  } else if (hz === 'months') {
    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const curM = new Date().getMonth();
    for (let i = 1; i <= 12; i++) {
      const p = Math.round(fc.avgRecent * 17 * mealMult * circMult);
      rows.push({ label: mNames[(curM + i) % 12], predicted: p, prep: Math.round(p * 1.05) });
    }
  } else {
    const curY = new Date().getFullYear();
    for (let i = 0; i < 3; i++) {
      const p = Math.round(fc.avgRecent * 200 * (1 + 0.03 * i) * mealMult * circMult);
      rows.push({ label: String(curY + i), predicted: p, prep: Math.round(p * 1.05) });
    }
  }

  const history = (state.menuPlan || [])
    .filter(m => m.status === 'SERVED' || m.served_portions !== null && m.served_portions !== undefined)
    .sort((a, b) => b.service_date.localeCompare(a.service_date));

  main.innerHTML = `
    <div class="space-y-4">
      <form id="form-log-served" class="kms-card p-4 space-y-3 no-print">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold">Add or Update Patrons Served</h2>
            <p class="text-xs opacity-75">Enter any past or today's date to add or update attendance and refine weekday &amp; monthly trends.</p>
          </div>
          <div class="flex gap-1.5">
            <button type="button" onclick="window.print()" class="kms-btn-alt px-3 py-1.5 text-xs">Print Forecast</button>
            <button type="button" id="btn-bulk-served" class="kms-btn-alt px-3 py-1.5 text-xs">+ Bulk Enter Past Dates</button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input name="date" type="date" value="${today}" required class="kms-input text-sm" />
          <input name="planned" type="number" min="0" value="${predictedPortions(today)}" required placeholder="Planned" class="kms-input text-sm" />
          <input name="served" type="number" min="0" required placeholder="Actual served" class="kms-input text-sm" />
          <select name="circumstance" class="kms-input text-sm">
            <option>Normal Day</option>
            <option>Closed / Federal Holiday</option>
            <option>Snow / Cold Snap</option>
            <option>Heavy Rain / Storm</option>
            <option>Local Event / Drive</option>
            <option>Holiday Week</option>
          </select>
          <input name="note" placeholder="Notes (for next year)" class="kms-input text-sm" />
        </div>
        <button type="submit" class="kms-btn-primary px-4 py-2 text-sm">Save &amp; Update Forecast</button>
      </form>

      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 class="text-sm font-bold">Attendance Forecast &amp; Trend Breakdown</h3>
            <p class="text-xs opacity-75">${fc.openCount ? `Based on ${fc.openCount} open service(s) · Overall avg: <strong>${fc.avgAll.toFixed(1)}</strong>/day · Recent avg: <strong>${fc.avgRecent.toFixed(1)}</strong>/day` : 'No past attendance logged yet — using 65 baseline.'}</p>
            <div class="flex flex-wrap gap-1.5 mt-1.5">
              ${['Mon','Tue','Wed','Fri'].map(d => {
                const pct = Math.round(((fc.dowFactor[d] || 1) - 1) * 100);
                return `<span class="tag ${pct >= 5 ? 'tag-OUT' : pct <= -5 ? 'tag-LOW' : 'tag-OK'}">${d}: ${pct >= 0 ? '+' : ''}${pct}%</span>`;
              }).join('')}
            </div>
          </div>
          <div class="flex gap-1 no-print">
            ${[['days','Days (7)'],['weeks','Weeks (8)'],['months','Months (12)'],['years','Years (3)']].map(([k, l]) => `<button type="button" data-hz="${k}" class="px-2.5 py-1 rounded text-xs font-bold ${hz === k ? 'bg-[#b3122b] text-white' : 'kms-btn-alt'}">${l}</button>`).join('')}
          </div>
        </div>
        <div class="relative h-72 no-print"><canvas id="fc-canvas"></canvas></div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead><tr class="border-b border-[var(--line)] opacity-70 uppercase"><th class="py-1.5">Period</th><th class="py-1.5">Predicted Served</th><th class="py-1.5">Recommended Prep</th></tr></thead>
            <tbody>${rows.map(r => `<tr class="border-b border-[var(--line)]"><td class="py-1.5 font-semibold">${esc(r.label)}</td><td class="py-1.5 font-bold text-[#b3122b]">${r.predicted}</td><td class="py-1.5">${r.prep} portions</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold">Tracked Attendance Trends &amp; Meal / Holiday Planner</h3>
            <p class="text-xs opacity-75">See how specific days, meals, holidays, and weather affect turnout, and apply them to daily, weekly, and monthly forecasts.</p>
          </div>
          <div class="flex flex-wrap gap-2 no-print">
            <select id="fc-whatif-meal" class="kms-input text-xs">
              <option value="">Scheduled / Average Meal</option>
              ${state.recipes.map(r => `<option value="${r.id}" ${state._fcMealFilter === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}
            </select>
            <select id="fc-whatif-circ" class="kms-input text-xs">
              ${['Normal Day', 'Holiday Week', 'Local Event / Drive', 'Snow / Cold Snap', 'Heavy Rain / Storm'].map(c => `<option ${state._fcCircFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div class="p-3 rounded-lg border border-[var(--line)] space-y-1.5 print-keep">
            <div class="font-bold uppercase opacity-70">By Day of Week</div>
            ${['Mon', 'Tue', 'Wed', 'Fri'].map(d => {
              const pct = Math.round(((fc.dowFactor[d] || 1) - 1) * 100);
              return `<div class="flex justify-between"><span>${d}</span><span class="font-bold ${pct >= 5 ? 'text-emerald-700' : pct <= -5 ? 'text-[#b3122b]' : ''}">${pct >= 0 ? '+' : ''}${pct}%</span></div>`;
            }).join('')}
          </div>
          <div class="p-3 rounded-lg border border-[var(--line)] space-y-1.5 print-keep">
            <div class="font-bold uppercase opacity-70">By Meal Popularity</div>
            ${!fc.mealStats.length ? '<p class="opacity-65">Log more served meals to rank dishes.</p>' : fc.mealStats.slice(0, 5).map(ms => `
              <div class="flex justify-between gap-2"><span class="truncate">${esc(ms.title)}</span><span class="font-bold shrink-0 ${ms.pct >= 5 ? 'text-emerald-700' : ms.pct <= -5 ? 'text-[#b3122b]' : ''}">${ms.pct >= 0 ? '+' : ''}${ms.pct}% (${Math.round(ms.avg)})</span></div>
            `).join('')}
          </div>
          <div class="p-3 rounded-lg border border-[var(--line)] space-y-1.5 print-keep">
            <div class="font-bold uppercase opacity-70">Holiday &amp; Weather Impact</div>
            <div class="flex justify-between"><span>Near Federal Holiday (&plusmn;3d)</span><span class="font-bold">${Math.round((fc.nearHolFactor - 1) * 100) >= 0 ? '+' : ''}${Math.round((fc.nearHolFactor - 1) * 100)}%</span></div>
            ${fc.circStats.filter(c => c.name !== 'Normal Day').map(cs => `
              <div class="flex justify-between"><span>${esc(cs.name)}</span><span class="font-bold ${cs.pct < 0 ? 'text-[#b3122b]' : 'text-emerald-700'}">${cs.pct >= 0 ? '+' : ''}${cs.pct}% (${cs.count}x)</span></div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="kms-card p-4 space-y-2">
        <h3 class="text-sm font-bold">Past Patrons Served History (${history.length})</h3>
        ${!history.length ? '<p class="text-xs opacity-70">No past service records yet. Add one above or use Bulk Enter Past Dates.</p>' : `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead><tr class="border-b border-[var(--line)] opacity-70 uppercase"><th class="py-1.5">Date</th><th class="py-1.5">Planned</th><th class="py-1.5">Served</th><th class="py-1.5">Circumstance</th><th class="py-1.5">Notes</th><th class="py-1.5 text-right no-print">Actions</th></tr></thead>
              <tbody>
                ${history.map(m => `
                  <tr class="border-b border-[var(--line)]">
                    <td class="py-2 font-mono">${esc(m.service_date)}</td>
                    <td class="py-2">${m.planned_portions || 0}</td>
                    <td class="py-2 font-bold">${m.served_portions ?? 0}</td>
                    <td class="py-2">${esc(m.circumstance || 'Normal Day')}</td>
                    <td class="py-2 opacity-80">${esc(m.note || '—')}</td>
                    <td class="py-2 text-right space-x-1 whitespace-nowrap no-print">
                      <button type="button" data-edit-srv="${m.id}" class="kms-btn-alt px-2 py-1 text-xs">Edit</button>
                      <button type="button" data-del-srv="${m.id}" class="kms-btn-alt px-2 py-1 text-xs">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;

  const ctx = document.getElementById('fc-canvas');
  if (ctx && window.Chart) {
    forecastChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.label),
        datasets: [
          { label: 'Predicted Served', data: rows.map(r => r.predicted), backgroundColor: '#b3122b', borderRadius: 6 },
          { label: 'Recommended Prep', data: rows.map(r => r.prep), backgroundColor: '#1b365d', borderRadius: 6 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }
}