// js/views/users.js — Team Roster, PIN Resets, Announcements Admin & Accountability Feed

import { localDateStr, esc, formatRepeatLabel } from '../utils.js';
import {
  state, getActiveUser, ROLE_RANK, normalizeRole, sortUsersByRoleAndName,
  isAdminRole, canManageUserAccount, isMgmtOrHigher, getAutoHolidayAndOrderAnnouncements
} from '../state.js';

export function renderUsers(main) {
  if (!isMgmtOrHigher()) {
    main.innerHTML = '<div class="kms-card p-6 text-center text-xs">ADMIN or MANAGER access required.</div>';
    return;
  }
  const me = getActiveUser();
  const myRank = ROLE_RANK[normalizeRole(me.role)] || 0;
  const assignableRoles = ['VOLUNTEER', 'STAFF', 'MANAGER', 'ADMIN'].filter(r => isAdminRole(me) ? ROLE_RANK[r] <= myRank : ROLE_RANK[r] < myRank);
  const todayAdm = localDateStr();

  main.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Team &amp; Accountability</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Users, Announcements &amp; Activity Audit Log</h2>
              <div class="text-xs text-white/85 mt-0.5">Manage volunteer/staff roles and PINs, post shift alerts, and review system audit history.</div>
            </div>
          </div>
          
        </div>
      </div>
    
      <div id="announcements-admin-section" class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold">Announcements, Reminders &amp; Alerts Manager</h2>
            <p class="text-xs opacity-70">Create, schedule, repeat, edit, or globally delete announcements. Dismissing on Home only hides an alert for that user for today.</p>
          </div>
          <button type="button" id="btn-new-announcement" class="kms-btn-primary px-3 py-1.5 text-xs no-print">+ Post / Schedule Announcement</button>
        </div>
        ${(() => {
          const autoList = getAutoHolidayAndOrderAnnouncements(todayAdm);
          if (!autoList.length) return '';
          return `
            <div class="p-3 rounded-lg bg-black/5 border border-[var(--line)] space-y-1.5 text-xs">
              <div class="font-bold uppercase opacity-70">Active Auto-Holiday &amp; Adjusted Order Alerts (${autoList.length})</div>
              ${autoList.map(a => `<div><span class="tag ${a.priority === 'urgent' ? 'tag-OUT' : 'tag-LOW'} mr-1">${a.priority.toUpperCase()}</span><strong>${esc(a.title)}</strong> — ${esc(a.body)}</div>`).join('')}
            </div>
          `;
        })()}
        ${!(state.announcements || []).length ? '<p class="text-xs opacity-70">No custom announcements configured.</p>' : `
          <div class="divide-y divide-[var(--line)] border border-[var(--line)] rounded-lg overflow-hidden">
            ${(state.announcements || []).map(a => {
              const disCount = a.dismissed_by ? Object.values(a.dismissed_by).filter(v => v === todayAdm).length : 0;
              const badgeCls = a.priority === 'urgent' ? 'tag-OUT' : a.priority === 'reminder' ? 'tag-LOW' : 'tag-OK';
              return `
                <div class="p-3 flex flex-wrap items-start justify-between gap-2 text-xs print-keep">
                  <div>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="tag ${badgeCls}">${esc((a.priority || 'info').toUpperCase())}</span>
                      <strong class="text-sm">${esc(a.title)}</strong>
                      ${formatRepeatLabel(a) ? `<span class="tag tag-OK">${esc(formatRepeatLabel(a))}</span>` : ''}
                      ${a.alert_at ? `<span class="opacity-70 text-[11px]">${a.repeat_rule && a.repeat_rule !== 'none' ? 'Starts / Time:' : 'Go-Live:'} ${esc(a.alert_at.replace('T', ' '))}</span>` : ''}
                      ${a.expires_at ? `<span class="opacity-70 text-[11px]">Ends: ${esc(a.expires_at)}</span>` : ''}
                    </div>
                    <p class="opacity-85 mt-1">${esc(a.body)}</p>
                    <div class="text-[11px] opacity-60 mt-0.5">By ${esc(a.author || 'Management')} &bull; Dismissed today by ${disCount} account(s)</div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0 no-print">
                    <button type="button" data-edit-announcement="${a.id}" class="kms-btn-alt px-2.5 py-1 text-xs">Edit</button>
                    <button type="button" data-del-announcement="${a.id}" class="kms-btn-primary px-2.5 py-1 text-xs">Delete Globally</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <div class="kms-card p-4 space-y-3 border-l-4 border-l-[#1b365d]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-extrabold uppercase tracking-wide text-[#1b365d]">Weekly Digest &amp; Smart Escalation Settings</h2>
            <p class="text-xs opacity-75">Leadership receives one consolidated <strong>Friday Weekly Digest</strong> by default—urgent emails only fire for HACCP temp violations, imminent menu "86" shortages, 3rd-Friday order deadlines, or tasks missed <strong>2+ service days in a row</strong>.</p>
          </div>
          <div class="flex flex-wrap gap-1.5 no-print">
            <button type="button" id="btn-send-weekly-digest-now" class="kms-btn-navy px-3 py-1.5 text-xs font-bold">Send Weekly Digest Now</button>
            <button type="button" id="btn-run-smart-alerts-now" class="kms-btn-alt px-3 py-1.5 text-xs font-semibold">Check &amp; Dispatch Urgent Alerts</button>
          </div>
        </div>
        ${(() => {
          const cfg = getAlertConfig();
          const activeTriggers = evaluateSmartAlertTriggers(todayAdm);
          const mgrEmails = (state.users || []).filter(u => u.active !== false && ['ADMIN', 'MANAGER'].includes(normalizeRole(u.role)) && u.email).map(u => u.email);
          return `
            <form id="form-smart-alert-config" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs pt-1">
              <label class="p-2.5 rounded-lg border border-[var(--line)] flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="weeklyDigestEnabled" ${cfg.weeklyDigestEnabled ? 'checked' : ''} class="accent-[#1b365d]" />
                <span><strong>Friday Weekly Digest</strong><br/><span class="text-[11px] opacity-70">Consolidated weekly summary</span></span>
              </label>
              <label class="p-2.5 rounded-lg border border-[var(--line)] flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="urgentHaccpEnabled" ${cfg.urgentHaccpEnabled ? 'checked' : ''} class="accent-[#b3122b]" />
                <span><strong>Urgent HACCP Alerts</strong><br/><span class="text-[11px] opacity-70">Immediate out-of-range temps</span></span>
              </label>
              <label class="p-2.5 rounded-lg border border-[var(--line)] flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="urgent86Enabled" ${cfg.urgent86Enabled ? 'checked' : ''} class="accent-[#b3122b]" />
                <span><strong>Imminent Menu 86s</strong><br/><span class="text-[11px] opacity-70">0 stock for next 2 service days</span></span>
              </label>
              <div class="p-2.5 rounded-lg border border-[var(--line)] flex items-center justify-between gap-2">
                <span><strong>Chronic Miss Limit</strong><br/><span class="text-[11px] opacity-70">Consecutive missed days</span></span>
                <input type="number" name="chronicMissThreshold" min="2" max="10" value="${cfg.chronicMissThreshold || 2}" class="kms-input w-14 text-center font-bold text-xs" />
              </div>
              <div class="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2 pt-1">
                <span class="text-[11px] opacity-75">Leadership Recipients: <strong>${mgrEmails.length ? esc(mgrEmails.join(', ')) : 'Add Manager/Admin emails in Team Roster below'}</strong> &bull; Active Triggers Today: <strong>${activeTriggers.length}</strong></span>
                <button type="submit" class="kms-btn-ok px-3.5 py-1.5 text-xs font-bold">Save Notification Rules</button>
              </div>
            </form>
          `;
        })()}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form id="form-add-user" class="kms-card p-4 space-y-2.5 no-print">
          <h2 class="text-sm font-bold">Add Staff / Volunteer</h2>
          <input name="name" required placeholder="Full name" class="kms-input w-full text-sm" />
          <div class="grid grid-cols-2 gap-2">
            <select name="role" class="kms-input text-sm">${assignableRoles.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
            <input name="initials" maxlength="4" required placeholder="Initials" class="kms-input text-sm uppercase" />
          </div>
          <input name="pin" required minlength="6" placeholder="Starting PIN (6+ chars)" class="kms-input w-full text-sm" />
          <input name="email" type="email" placeholder="Email (for alerts &amp; PO notifications)" class="kms-input w-full text-xs" />
          <button type="submit" class="kms-btn-primary w-full py-2 text-sm">Add User</button>
        </form>

        <div class="lg:col-span-2 kms-card p-4 space-y-2">
          <h3 class="text-sm font-bold">Team Roster</h3>
          ${sortUsersByRoleAndName(state.users).map(u => {
            const canManage = canManageUserAccount(me, u);
            const isSelfOwner = (u.id === 'usr-1' && me.id === 'usr-1');
            return `
            <div class="p-2.5 rounded-lg border border-[var(--line)] flex flex-wrap justify-between items-center gap-2 text-xs print-keep">
              <div><strong>${esc(u.name)}</strong> (${esc(u.initials)}) · ${esc(u.role)}${u.email ? ` · <span class="font-mono text-[11px] opacity-80">${esc(u.email)}</span>` : ''}${u.active === false ? ' <span class="tag tag-OUT ml-1">INACTIVE</span>' : ''}</div>
              <div class="flex flex-wrap gap-1.5 no-print">
                ${(canManage || isSelfOwner) ? `<button type="button" data-edit-usr="${u.id}" class="kms-btn-alt px-2.5 py-1 text-xs">Edit</button>` : ''}
                ${(canManage || isSelfOwner) ? `<button type="button" data-reset-pin="${u.id}" class="kms-btn-alt px-2.5 py-1 text-xs">Reset PIN</button>` : ''}
                ${canManage ? `<button type="button" data-toggle-usr="${u.id}" class="kms-btn-alt px-2.5 py-1 text-xs">${u.active !== false ? 'Deactivate' : 'Activate'}</button>` : ''}
                ${canManage && u.id !== me.id ? `<button type="button" data-del-usr="${u.id}" class="kms-btn-primary px-2.5 py-1 text-xs">Delete</button>` : ''}
              </div>
            </div>
          `; }).join('')}
        </div>
      </div>

      <div class="kms-card p-4 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-bold">Real-Time Accountability Feed (${state.activityLogs.length})</h3>
          <div class="flex flex-wrap gap-1.5 text-xs no-print">
            <button type="button" onclick="window.print()" class="kms-btn-alt px-2.5 py-1 text-xs">Print Audit Log</button>
            <select id="act-cat-filter" class="kms-input text-xs">
              <option value="ALL" ${(state._actCat || 'ALL') === 'ALL' ? 'selected' : ''}>All Actions</option>
              <option value="AUTH" ${state._actCat === 'AUTH' ? 'selected' : ''}>Sign-Ins &amp; Log Outs</option>
              <option value="STOCK" ${state._actCat === 'STOCK' ? 'selected' : ''}>Stock, POs &amp; Donations</option>
              <option value="RECIPE" ${state._actCat === 'RECIPE' ? 'selected' : ''}>Recipes &amp; Menu</option>
              <option value="SAFETY" ${state._actCat === 'SAFETY' ? 'selected' : ''}>Safety &amp; Users</option>
            </select>
            <input id="act-search-inp" type="text" value="${esc(state._actSearch || '')}" placeholder="Filter by user or action..." class="kms-input text-xs w-44" />
          </div>
        </div>
        <div class="max-h-80 overflow-y-auto space-y-1.5 text-xs">
          ${(() => {
            const cat = state._actCat || 'ALL';
            const q = (state._actSearch || '').toLowerCase();
            const filtered = (state.activityLogs || []).filter(a => {
              const c = String(a.category || '').toUpperCase();
              if (cat === 'AUTH' && !/LOGIN|LOGOUT|LOCK|AUTH/.test(c)) return false;
              if (cat === 'STOCK' && !/STOCK|PO |DONAT|WASTE|AUDIT|PAR/.test(c)) return false;
              if (cat === 'RECIPE' && !/RECIPE|MENU|SERVED/.test(c)) return false;
              if (cat === 'SAFETY' && !/TEMP|CLEANING|USER|ANNOUNCEMENT|CHECKLIST|TAG/.test(c)) return false;
              if (q && !`${a.actor_name} ${a.category} ${a.detail}`.toLowerCase().includes(q)) return false;
              return true;
            });
            if (!filtered.length) return '<p class="opacity-70">No matching actions logged.</p>';
            return filtered.slice(0, 120).map(a => `
              <div class="p-2 rounded border border-[var(--line)] flex justify-between gap-2 print-keep">
                <span><strong>${esc(a.actor_name)}</strong> <span class="font-mono text-[10px] px-1 py-0.5 rounded bg-black/5">[${esc(a.category)}]</span> ${esc(a.detail)}</span>
                <span class="opacity-60 font-mono shrink-0">${esc(a.timestamp_label)}</span>
              </div>
            `).join('');
          })()}
        </div>
      </div>
    </div>
  `;
}