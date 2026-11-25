// js/views/report.js — Management Executive, Funding & Donation Reports

import { TEMP_CHECKS, localDateStr, addDays, serviceDaysBetween, esc } from '../utils.js';
import {
  state, isMgmtOrHigher, itemStatus, itemNeed, getForecastMetrics, forecastWeekday
} from '../state.js';

export function renderReport(main) {
  if (!isMgmtOrHigher()) {
    main.innerHTML = `
      <div class="kms-card p-6 max-w-lg mx-auto text-center space-y-2">
        <div class="tag tag-OUT inline-block">MANAGEMENT ONLY</div>
        <h2 class="text-base font-bold">Restricted Executive &amp; Funding Reports</h2>
        <p class="text-xs opacity-75">This section contains financial, donation, and management reports and is restricted to Management accounts.</p>
      </div>
    `;
    return;
  }

  const today = localDateStr();
  const rm = state.reportMonth || today.slice(0, 7);
  const rangeMode = state.reportRange || 'month';
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    months.push(localDateStr(d).slice(0, 7));
  }

  let startStr = rm + '-01';
  let endStr = rm + '-31';
  let periodLabel = `Month: ${rm}`;
  if (rangeMode === '30d') { startStr = addDays(today, -29); endStr = today; periodLabel = `Last 30 Days (${startStr} to ${today})`; }
  else if (rangeMode === '90d') { startStr = addDays(today, -89); endStr = today; periodLabel = `Last 90 Days (${startStr} to ${today})`; }
  else if (rangeMode === 'ytd') { startStr = today.slice(0, 4) + '-01-01'; endStr = today; periodLabel = `Year-to-Date (${today.slice(0, 4)})`; }
  else if (rangeMode === '365d') { startStr = addDays(today, -364); endStr = today; periodLabel = `Last 12 Months (${startStr} to ${today})`; }

  const inPeriod = (ds) => { const s = String(ds || '').slice(0, 10); return s >= startStr && s <= endStr; };

  const servedDays = state.menuPlan.filter(m => m.status === 'SERVED' && inPeriod(m.service_date));
  const meals = servedDays.reduce((s, m) => s + (m.served_portions || 0), 0);
  const avgPerDay = servedDays.length ? (meals / servedDays.length) : 0;

  const recvs = state.transactions.filter(t => t.tx_type === 'RECEIVE' && inPeriod(t.tx_date));
  const donatedRecvs = recvs.filter(t => /donat|food bank/i.test(t.source || ''));
  const purchasedRecvs = recvs.filter(t => !/donat|food bank/i.test(t.source || ''));
  const spend = purchasedRecvs.reduce((s, t) => {
    const item = state.items.find(i => i.id === t.item_id);
    const unitP = Number(t.cost || (item ? item.unit_price : 0) || 0);
    return s + (t.cost ? Number(t.cost) : (Number(t.qty || 0) * unitP));
  }, 0);
  const costPerMeal = meals > 0 && spend > 0 ? (spend / meals) : 0;

  const waste = state.transactions.filter(t => t.tx_type === 'WASTE' && inPeriod(t.tx_date));
  const savedLeftovers = (state.storageTags || []).filter(t => t.status === 'USED' && inPeriod(t.prep_date)).length;

  let checks = 0, fails = 0;
  Object.keys(state.safetyLogs || {}).filter(d => inPeriod(d)).forEach(d => {
    const t = state.safetyLogs[d].temps || {};
    TEMP_CHECKS.forEach((c, i) => {
      if (t[i] === undefined || t[i] === null || t[i] === '') return;
      checks++;
      if (c[1] === 'max' ? Number(t[i]) > c[2] : Number(t[i]) < c[2]) fails++;
    });
  });
  const safetyPct = checks ? Math.round(((checks - fails) / checks) * 100) : null;

  const activeItems = state.items.filter(x => !x.discontinued);
  const stockValue = activeItems.reduce((s, x) => s + (x.on_hand || 0) * (x.unit_price || 0), 0);
  const lowItems = activeItems.filter(x => itemStatus(x) !== 'OK').map(x => {
    const needCases = x.on_hand <= 0 ? Math.max(1, Math.floor(x.par || 1)) : Math.floor(itemNeed(x));
    const estCost = needCases * (x.unit_price || 0);
    return { item: x, needCases, estCost };
  }).sort((a, b) => b.needCases - a.needCases);
  const restockCost = lowItems.reduce((s, r) => s + r.estCost, 0);
  const parHealthPct = activeItems.length ? Math.round(((activeItems.length - lowItems.length) / activeItems.length) * 100) : 100;

  const fc = getForecastMetrics();
  const proj30Meals = Math.round(fc.avgRecent * 17);
  const proj90Meals = Math.round(fc.avgRecent * 51);
  const proj365Meals = Math.round(fc.avgRecent * 204);
  const benchPerMeal = costPerMeal > 0 ? costPerMeal : 3.25;
  const usingBench = costPerMeal <= 0;
  const proj30Budget = Math.round(proj30Meals * benchPerMeal);
  const proj90Budget = Math.round(proj90Meals * benchPerMeal);
  const proj365Budget = Math.round(proj365Meals * benchPerMeal);
  const next7Days = serviceDaysBetween(today, addDays(today, 14)).slice(0, 7);
  const next7Meals = next7Days.reduce((s, d) => s + forecastWeekday(d), 0);
  const peakDow = Object.entries(fc.dowFactor || {}).sort((a, b) => b[1] - a[1])[0];

  const suggestions = [];
  if (lowItems.length > 0) {
    suggestions.push(`<strong>Restock Funding / Purchase Request:</strong> ${lowItems.length} staple item(s) are below Par (${lowItems.reduce((s, r) => s + r.needCases, 0)} whole cases needed${restockCost > 0 ? ', est. $' + restockCost.toFixed(2) : ''}). Prioritize: ${lowItems.slice(0, 4).map(r => esc(r.item.name) + ' (' + r.needCases + ' cs)').join(', ')}.`);
  } else {
    suggestions.push('<strong>Inventory Readiness:</strong> 100% of active inventory items are at or above Par Level.');
  }
  if (donatedRecvs.length > 0 || purchasedRecvs.length > 0) {
    suggestions.push(`<strong>Donation Leverage:</strong> ${donatedRecvs.length} Food Bank / Donor check-in(s) and ${purchasedRecvs.length} vendor purchase(s) recorded in this period. Targeting in-kind donations for top-turn items (${lowItems.slice(0, 3).map(r => esc(r.item.name)).join(', ') || 'canned proteins & dry pasta'}) directly lowers cash cost per meal.`);
  }
  if (fc.avgRecent > 0) {
    suggestions.push(`<strong>Demand &amp; Staffing Outlook:</strong> Recent trend averages <strong>${fc.avgRecent.toFixed(1)} patrons/day</strong> (${proj90Meals.toLocaleString()} meals next quarter)${peakDow ? `; highest-turnout day is <strong>${peakDow[0]}</strong> (${Math.round((peakDow[1] - 1) * 100) >= 0 ? '+' : ''}${Math.round((peakDow[1] - 1) * 100)}% vs. avg)` : ''}. Plan prep &amp; volunteer coverage accordingly.`);
  }
  if (fails > 0) {
    suggestions.push(`<strong>Food Safety Action:</strong> ${fails} temperature check(s) were flagged out of range in this period — review equipment calibration and corrective actions before leadership audit.`);
  } else if (checks > 0) {
    suggestions.push(`<strong>Food Safety Compliance:</strong> 100% pass rate across ${checks} logged HACCP temperature check(s).`);
  }
  if (waste.length > 3) {
    suggestions.push(`<strong>Waste Reduction Opportunity:</strong> ${waste.length} waste entries logged — tighten FIFO rotation in Storage &amp; Date Labels and shift surplus to Leftovers Service.`);
  }

  const fundingBrief = [
    `THE SALVATION ARMY COMMUNITY MEALS (BUTLER, PA) — FUNDING & OPERATIONS BRIEF (${periodLabel})`,
    `• Community Impact: ${meals.toLocaleString()} hot lunches served across ${servedDays.length} open service day(s) (avg ${avgPerDay.toFixed(1)} patrons/day).`,
    `• Financial & Donation Snapshot: $${spend.toFixed(2)} vendor spend recorded (${costPerMeal > 0 ? '$' + costPerMeal.toFixed(2) + '/meal' : 'est. $3.25/meal benchmark'}), supplemented by ${donatedRecvs.length} in-kind/food bank deliveries. Current inventory value: $${stockValue.toFixed(2)} (${parHealthPct}% items at/above Par).`,
    `• Forecasted Need: Projecting ${proj30Meals.toLocaleString()} meals next 30 days (~$${proj30Budget.toLocaleString()}), ${proj90Meals.toLocaleString()} meals next 90 days (~$${proj90Budget.toLocaleString()}), and ${proj365Meals.toLocaleString()} meals annually (~$${proj365Budget.toLocaleString()}).`,
    `• Immediate Restock / Donation Priorities (${lowItems.length} items below Par${restockCost > 0 ? ', est. $' + restockCost.toFixed(2) : ''}): ${lowItems.slice(0, 6).map(r => r.item.name + ' (' + r.needCases + ' cases)').join('; ') || 'All items at Par'}.`,
    `• Compliance & Stewardship: ${safetyPct !== null ? safetyPct + '% HACCP temp pass rate (' + checks + ' checks)' : 'HACCP active'}, ${savedLeftovers} leftover container(s) safely reused via FIFO.`
  ].join('\\n');

  main.innerHTML = `
    <div class="space-y-4">
      <!-- SA Executive Header Banner -->
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Community Kitchen KMS &bull; Management Report</div>
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
          <span class="opacity-80">123 Main Street, Suite 100 &bull; Community Meals Program &bull; Generated ${esc(today)}</span>
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
