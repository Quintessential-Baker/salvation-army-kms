// js/views/users.js — Team Roster, PIN Resets, Announcements Admin & Accountability Feed

import { localDateStr, esc, formatRepeatLabel , applyOrgTheme } from '../utils.js';
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

      <!-- White-Label Organization & Branding Customizer -->
      <div class="kms-card p-4 space-y-3 border-t-4 border-t-[var(--sa-navy)]">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div>
            <h3 class="text-sm font-extrabold">Organization Branding &amp; White-Label Customization</h3>
            <p class="text-xs opacity-75">Personalize organization identity, colors, schedule, and export/import turnkey client profiles.</p>
          </div>
          <div class="flex gap-1.5">
            <button type="button" id="btn-export-org-profile" class="kms-btn-alt px-3 py-1.5 text-xs">Export Profile (.json)</button>
            <label class="kms-btn-alt px-3 py-1.5 text-xs cursor-pointer">Import Profile<input type="file" id="inp-import-org-profile" accept=".json" class="hidden" /></label>
          </div>
        </div>
        <form id="form-org-branding" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <label class="font-bold">Organization Name
            <input name="orgName" value="${esc((state.orgConfig && state.orgConfig.orgName) || 'Community Kitchen KMS')}" required class="kms-input w-full mt-1" />
          </label>
          <label class="font-bold">Location / Program Subtitle
            <input name="orgSubtitle" value="${esc((state.orgConfig && state.orgConfig.orgSubtitle) || 'Meal & Pantry Operations')}" class="kms-input w-full mt-1" />
          </label>
          <label class="font-bold">Street Address (Receipts &amp; Menus)
            <input name="orgAddress" value="${esc((state.orgConfig && state.orgConfig.orgAddress) || '')}" class="kms-input w-full mt-1" />
          </label>
          <label class="font-bold">Shield / Badge Initials (2–3 chars)
            <input name="badgeText" maxlength="3" value="${esc((state.orgConfig && state.orgConfig.badgeText) || 'CK')}" class="kms-input w-full mt-1 uppercase" />
          </label>
          <label class="font-bold">Custom Logo URL (Optional)
            <input name="logoUrl" placeholder="https://..." value="${esc((state.orgConfig && state.orgConfig.logoUrl) || '')}" class="kms-input w-full mt-1" />
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="font-bold">Primary Header
              <input type="color" name="primaryColor" value="${esc((state.orgConfig && state.orgConfig.primaryColor) || '#1b365d')}" class="w-full h-9 mt-1 rounded cursor-pointer border border-[var(--line)]" />
            </label>
            <label class="font-bold">Accent Color
              <input type="color" name="accentColor" value="${esc((state.orgConfig && state.orgConfig.accentColor) || '#b3122b')}" class="w-full h-9 mt-1 rounded cursor-pointer border border-[var(--line)]" />
            </label>
          </div>
          <label class="font-bold">Service Days
            <input name="serviceDays" value="${esc((state.orgConfig && state.orgConfig.serviceDays) || 'Mon / Tue / Wed / Fri')}" class="kms-input w-full mt-1" />
          </label>
          <label class="font-bold">Service Hours
            <input name="serviceHours" value="${esc((state.orgConfig && state.orgConfig.serviceHours) || '11:30 AM – 12:30 PM')}" class="kms-input w-full mt-1" />
          </label>
          <label class="font-bold">Recipe Portion Presets (comma-separated)
            <input name="portionPresets" value="${esc(((state.orgConfig && state.orgConfig.portionPresets) || [40,50,60,70,80]).join(', '))}" class="kms-input w-full mt-1" />
          </label>
          <div class="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2 pt-1">
            <div class="flex flex-wrap gap-1.5">
              <button type="button" data-theme-preset="#1b365d,#b3122b" class="kms-btn-alt px-2.5 py-1 text-[11px]">Classic Navy &amp; Crimson</button>
              <button type="button" data-theme-preset="#14532d,#d97706" class="kms-btn-alt px-2.5 py-1 text-[11px]">Forest &amp; Gold</button>
              <button type="button" data-theme-preset="#1e293b,#0284c7" class="kms-btn-alt px-2.5 py-1 text-[11px]">Slate &amp; Cobalt</button>
              <button type="button" data-theme-preset="#4c1d95,#db2777" class="kms-btn-alt px-2.5 py-1 text-[11px]">Royal &amp; Berry</button>
            </div>
            <button type="submit" class="kms-btn-primary px-4 py-2 text-xs">Save Branding &amp; Apply Theme</button>
          </div>
        </form>
      </div>

      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Community Kitchen KMS &bull; Team &amp; Accountability</div>
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
              <div><strong>${esc(u.name)}</strong> (${esc(u.initials)}) · ${esc(u.role)}${u.active === false ? ' <span class="tag tag-OUT ml-1">INACTIVE</span>' : ''}</div>
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