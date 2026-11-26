// js/views/dashboard.js — Home Dashboard & Active Announcements

import {
  LOCATIONS, TEMP_CHECKS, localDateStr, dLabel, esc, formatRepeatLabel, isAnnouncementActiveToday
} from '../utils.js';
import {
  state, getActiveUser, isMgmtOrHigher, isStaffOrHigher, itemStatus, forecastWeekday, getAutoHolidayAndOrderAnnouncements
} from '../state.js';

export function renderDashboard(main) {
  const today = localDateStr();
  const u = getActiveUser();
  const lowItems = state.items.filter(x => !x.discontinued && itemStatus(x) !== 'OK');
  const outItems = lowItems.filter(x => x.on_hand <= 0);
  const expTags = state.storageTags.filter(t => t.status === 'STORED' && t.use_by_date <= today);
  const carryTasks = state.checklists.filter(c => c.priority_carryover && !c.done);
  const todayLog = state.safetyLogs[today] || { temps: {}, cleaning: {} };
  const tempsDone = Object.keys(todayLog.temps || {}).filter(k => todayLog.temps[k] !== null && todayLog.temps[k] !== '').length;
  const todayMeal = state.menuPlan.find(m => m.service_date === today);
  const nextPred = forecastWeekday(today);

  const nowObj = new Date();
  const disAuto = (state.dismissedAutoAnns && state.dismissedAutoAnns[u.id]) || {};
  const autoAnns = getAutoHolidayAndOrderAnnouncements(today).filter(a => disAuto[a.id] !== today);
  const manualAnns = (state.announcements || []).filter(a => {
    if (a.dismissed_by && a.dismissed_by[u.id] === today) return false;
    return isAnnouncementActiveToday(a, nowObj);
  });
  const anns = [...autoAnns, ...manualAnns];

  main.innerHTML = `
    <div class="space-y-4">
      
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">${esc((state.orgConfig && state.orgConfig.badgeText) || "CK")}</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Community Kitchen KMS &bull; Operations Command Center</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Kitchen &amp; Community Meals Overview — ${dLabel(today)}</h2>
              <div class="text-xs text-white/85 mt-0.5">Signed in as <strong>${esc(u.name)}</strong> (${esc(u.role)}) &bull; Lunch Service: Mon, Tue, Wed &amp; Fri 11:30 AM – 12:30 PM</div>
            </div>
          </div>
          
        </div>
      </div>
    
      <div class="kms-card p-4 no-print">
        <div class="text-xs font-extrabold uppercase tracking-wider text-[#1b365d] mb-2">Quick Shift Actions</div>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-tab="stock" class="kms-btn-navy px-3.5 py-2 text-xs sm:text-sm">Count / Update Stock</button>
          ${isStaffOrHigher(u) ? `<button type="button" data-tab="receive" class="kms-btn-ok px-3.5 py-2 text-xs sm:text-sm">PO Check-In &amp; Donations</button>` : ''}
          <button type="button" data-tab="safety" class="kms-btn-primary px-3.5 py-2 text-xs sm:text-sm">Log Temps (${tempsDone}/${TEMP_CHECKS.length})</button>
          <button type="button" data-tab="prep" class="kms-btn-alt px-3.5 py-2 text-xs sm:text-sm">Next-Day Prep</button>
          <button type="button" data-tab="storage" class="kms-btn-alt px-3.5 py-2 text-xs sm:text-sm">Date-Label Leftovers</button>
          <button type="button" id="btn-start-tour" class="kms-btn-alt px-3.5 py-2 text-xs sm:text-sm">Guided Tour</button>
          <button type="button" data-tab="help" class="kms-btn-alt px-3.5 py-2 text-xs sm:text-sm">Training &amp; Self-Test</button>
        </div>
      </div>

      ${expTags.length ? `
        <div class="kms-card p-3.5 border-l-4 border-l-red-600 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs sm:text-sm"><span class="tag tag-OUT mr-1.5">USE OR DISCARD TODAY</span> <strong>${expTags.length} stored item(s)</strong> reached their Use-By date: ${expTags.map(t => esc(t.item_name)).join(', ')}</div>
          <button type="button" data-tab="storage" class="kms-btn-primary px-3 py-1.5 text-xs no-print">Review Tags</button>
        </div>
      ` : ''}

      ${carryTasks.length ? `
        <div class="kms-card p-3.5 border-l-4 border-l-amber-600 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs sm:text-sm"><span class="tag tag-LOW mr-1.5">PRIORITY CARRYOVER</span> <strong>${carryTasks.length} unfinished task(s)</strong> carried over.</div>
          <button type="button" data-tab="checklists" class="kms-btn-alt px-3 py-1.5 text-xs no-print">Open Checklists</button>
        </div>
      ` : ''}

      <div class="kms-card p-4 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold">Announcements &amp; Reminders</h2>
            <p class="text-xs opacity-70">Active kitchen notices, holiday closings, and recurring order reminders.</p>
          </div>
          ${isMgmtOrHigher(u) ? `
            <div class="flex flex-wrap gap-2 no-print">
              <button type="button" id="btn-new-announcement" class="kms-btn-primary px-3 py-1.5 text-xs">+ Post / Schedule</button>
              <button type="button" id="btn-manage-announcements" class="kms-btn-alt px-3 py-1.5 text-xs">Manage All (${(state.announcements || []).length})</button>
            </div>
          ` : ''}
        </div>
        ${!anns.length ? '<p class="text-xs opacity-65">No active announcements or reminders for today.</p>' : anns.map(a => {
          const borderCls = a.priority === 'urgent' ? 'border-l-red-600 bg-red-50/40' : a.priority === 'reminder' ? 'border-l-amber-500 bg-amber-50/40' : 'border-l-sky-600 bg-sky-50/40';
          const badgeCls = a.priority === 'urgent' ? 'tag-OUT' : a.priority === 'reminder' ? 'tag-LOW' : 'tag-OK';
          const tagLabel = a.priority === 'urgent' ? 'CRITICAL / ALERT' : a.priority === 'reminder' ? 'REMINDER' : 'INFO';
          return `
            <div class="p-3 rounded-lg border border-[var(--line)] border-l-4 ${borderCls} flex items-start justify-between gap-2 text-xs print-keep">
              <div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="tag ${badgeCls}">${tagLabel}</span>
                  <strong class="text-sm">${esc(a.title)}</strong>
                  ${formatRepeatLabel(a) ? `<span class="tag tag-OK">${esc(formatRepeatLabel(a))}</span>` : ''}
                  ${a.expires_at ? `<span class="opacity-65 text-[11px]">Ends ${esc(a.expires_at)}</span>` : ''}
                </div>
                <p class="opacity-85 mt-1 leading-relaxed">${esc(a.body)}</p>
                <div class="text-[11px] opacity-60 mt-1">Posted by ${esc(a.author || 'Management')} &bull; ${esc(a.created_at || today)}</div>
              </div>
              <button type="button" data-dismiss-ann="${a.id}" class="kms-btn-alt px-2.5 py-1 text-xs shrink-0 no-print">Dismiss</button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button type="button" data-tab="stock" class="kms-card p-4 text-left hover:border-[#b3122b] transition">
          <div class="text-xs uppercase opacity-60 font-semibold">Stock Items</div>
          <div class="text-2xl font-bold mt-1">${state.items.length}</div>
          <div class="text-xs opacity-75 mt-1">${lowItems.length} below par (${outItems.length} out)</div>
        </button>
        <button type="button" data-tab="menu" class="kms-card p-4 text-left hover:border-[#b3122b] transition">
          <div class="text-xs uppercase opacity-60 font-semibold">Today's Service (${today})</div>
          <div class="text-base font-bold mt-1 truncate">${todayMeal ? esc(todayMeal.custom_title) : 'No meal scheduled'}</div>
          <div class="text-xs opacity-75 mt-1">${todayMeal ? `${todayMeal.planned_portions} planned portions` : 'Tap to schedule'}</div>
        </button>
        <button type="button" data-tab="forecasting" class="kms-card p-4 text-left hover:border-[#b3122b] transition">
          <div class="text-xs uppercase opacity-60 font-semibold">Next Service Forecast</div>
          <div class="text-2xl font-bold text-[#b3122b] mt-1">${nextPred} Patrons</div>
          <div class="text-xs opacity-75 mt-1">Same-weekday average + 10%</div>
        </button>
        <button type="button" data-tab="safety" class="kms-card p-4 text-left hover:border-[#b3122b] transition">
          <div class="text-xs uppercase opacity-60 font-semibold">Today's Temp Checks</div>
          <div class="text-2xl font-bold mt-1">${tempsDone} / ${TEMP_CHECKS.length}</div>
          <div class="text-xs opacity-75 mt-1">Cooler ≤41°F · Freezer ≤0°F · Hot ≥135°F</div>
        </button>
      </div>

      <div class="kms-card p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold uppercase tracking-wide">Items Below Par (${lowItems.length})</h2>
          ${isStaffOrHigher(u) ? `<button type="button" data-tab="orders" class="text-xs font-bold text-[#b3122b] hover:underline no-print">Build Orders &rarr;</button>` : ''}
        </div>
        ${!lowItems.length ? '<p class="text-xs opacity-70">All items are at or above par.</p>' : `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${lowItems.slice(0, 8).map(x => `
              <div class="p-2.5 rounded-lg border border-[var(--line)] flex items-center justify-between text-xs print-keep">
                <div>
                  <div class="font-bold">${esc(x.name)}</div>
                  <div class="opacity-70">${esc(x.location)} · Have ${x.on_hand} / Par ${x.par} ${esc(x.unit)}</div>
                </div>
                <span class="tag tag-${itemStatus(x)}">${itemStatus(x)}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}