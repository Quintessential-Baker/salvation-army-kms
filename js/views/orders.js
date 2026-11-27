// js/views/orders.js — Orders & Purchase Orders (Weekly Marberger / Monthly Jordan Banana)

import { VENDORS, localDateStr, addDays, serviceDaysBetween, esc, fmtNum } from '../utils.js';
import { state, getActiveUser, isMgmtOrHigher, demandForDays, suggestedOrderAmount , JORDAN_BANANA_CATALOG } from '../state.js';

export function renderOrders(main) {
  const hz = Number(state._orderHorizon || 7);
  const days = serviceDaysBetween(localDateStr(), addDays(localDateStr(), hz === 1 ? 4 : hz));
  const useDays = hz === 1 ? days.slice(0, 1) : days;
  const d7 = demandForDays(serviceDaysBetween(localDateStr(), addDays(localDateStr(), 7)));
  const d30 = demandForDays(serviceDaysBetween(localDateStr(), addDays(localDateStr(), 30)));
  const dd = demandForDays(useDays);
  const shortItems = state.items.filter(x => (dd[x.id] || 0) > x.on_hand);
  const u = getActiveUser();
  const isMgr = isMgmtOrHigher(u);

  const openPOs = (state.purchaseOrders || []).filter(p => p.status !== 'closed');
  const closedPOs = (state.purchaseOrders || []).filter(p => p.status === 'closed').slice(0, 3);

  main.innerHTML = `
    <div class="space-y-4">

      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Purchasing &amp; Vendor Orders</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Meal Forecast Shortages &amp; Purchase Orders</h2>
              <div class="text-xs text-white/85 mt-0.5">Checks upcoming planned recipes against current Living Stock &amp; Par levels.</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 no-print"><button type="button" onclick="document.body.classList.remove('printing-modal'); window.print();" class="px-3.5 py-1.5 rounded-lg bg-white text-[#1b365d] text-xs font-extrabold shadow hover:bg-slate-100">Print Orders (Letter)</button>
       <select id="order-hz" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold">
         <option value="1" ${hz === 1 ? 'selected' : ''}>Next Service Day</option>
         <option value="7" ${hz === 7 ? 'selected' : ''}>Next 7 Days</option>
         <option value="30" ${hz === 30 ? 'selected' : ''}>Next 30 Days</option>
       </select></div>
        </div>
      </div>
    
      <div class="kms-card p-4 space-y-2.5">
        <h3 class="text-sm font-extrabold uppercase tracking-wider text-[#1b365d]">Upcoming Recipe Ingredient Shortages</h3>
        ${!shortItems.length ? '<p class="text-xs opacity-70">No ingredient shortages for planned meals in this window.</p>' : `
          <div class="space-y-1.5">
            ${shortItems.map(x => `<div class="p-2 rounded-lg border border-amber-300 bg-amber-50/50 text-xs flex justify-between print-keep"><strong>${esc(x.name)}</strong><span>Need ${fmtNum(dd[x.id])}, Have ${x.on_hand} ${esc(x.unit)}</span></div>`).join('')}
          </div>
        `}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        ${['W', 'M'].map(cad => {
          const manual = (state.manualPoExtra && state.manualPoExtra[cad]) || {};
          const list = state.items.filter(x => !x.discontinued && x.cadence === cad).map(x => {
            const sug = suggestedOrderAmount(x, d7, d30);
            const manQ = Number(manual[x.id] || 0);
            const qty = manQ > 0 ? manQ : sug;
            return { item: x, qty, isManual: manQ > 0 };
          }).filter(o => o.qty > 0);
          const est = list.reduce((s, o) => s + o.qty * (o.item.unit_price || 0), 0);
          const addOpts = state.items.filter(x => !x.discontinued && x.cadence === cad).map(x => `<option value="${x.id}">${esc(x.name)} (${esc(x.unit)})</option>`).join('');
          return `
            <form class="form-create-po kms-card p-4 space-y-2.5" data-cad="${cad}">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
                <div>
                  <h3 class="text-sm font-bold">${VENDORS[cad]}</h3>
                  <span class="text-xs opacity-70">${list.length} item(s) · Whole cases only${est ? ` · est. $${est.toFixed(2)}` : ''}</span>
                </div>
                <div class="flex items-center gap-1.5 no-print">
                  ${list.length ? `<button type="button" data-po-sel-all="${cad}" class="kms-btn-alt px-2 py-1 text-xs">Toggle All</button><button type="submit" class="kms-btn-primary px-3 py-1.5 text-xs">Request Selected PO</button>` : ''}
                </div>
              </div>
              ${!list.length ? '<p class="text-xs opacity-70 py-2">Nothing below par. Add an item below to start a custom PO.</p>' : `
                <div class="max-h-72 overflow-y-auto space-y-1.5">
                  ${list.map(o => `
                    <div class="p-2 rounded border border-[var(--line)] text-xs flex flex-wrap items-center justify-between gap-2 print-keep">
                      <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-[160px]">
                        <input type="checkbox" name="inc_${o.item.id}" checked class="po-chk-${cad} accent-[#b3122b] no-print" />
                        <span><strong>${esc(o.item.name)}</strong> <span class="opacity-65">(Have ${o.item.on_hand}, Par ${o.item.par})</span></span>
                      </label>
                      <div class="flex items-center gap-1 shrink-0">
                        <input type="number" step="1" min="1" name="qty_${o.item.id}" value="${Math.max(1, Math.ceil(o.qty))}" class="kms-input w-16 text-xs text-center font-bold text-[#b3122b]" />
                        <span class="opacity-75">${esc(o.item.unit)}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
              <div class="grid grid-cols-2 gap-1.5 pt-1 text-xs no-print">
                <input type="text" name="customPoNum" value="${(cad === 'W' ? 'MAR-' : 'JB-') + localDateStr().replace(/-/g, '') + '-' + ((state.purchaseOrders || []).length + 1)}" placeholder="PO #" class="kms-input text-xs font-mono" title="PO Number" />
                <input type="text" name="customInvNum" placeholder="Vendor Invoice / Ref # (opt.)" class="kms-input text-xs font-mono" title="Vendor Invoice or Ref #" />
              </div>
              <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--line)] text-xs no-print">
                <select id="po-add-sel-${cad}" class="kms-input flex-1 min-w-[140px] text-xs">${addOpts}</select>
                <input id="po-add-qty-${cad}" type="number" step="1" min="1" value="1" class="kms-input w-16 text-xs text-center font-bold" />
                <button type="button" data-po-add-extra="${cad}" class="kms-btn-alt px-2.5 py-1 text-xs">+ Add Item</button>
              </div>
            </form>
          `;
        }).join('')}
      </div>

      <div class="kms-card p-4 space-y-3">
        <h3 class="text-sm font-bold">Purchase Orders in Progress (${openPOs.length})</h3>
        ${!openPOs.length ? '<p class="text-xs opacity-70">No open purchase orders.</p>' : openPOs.map(po => `
          <div class="p-3 rounded-xl border border-[var(--line)] space-y-2 print-keep">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="font-mono font-bold text-xs">${esc(po.po_number)}</span> · <strong class="text-sm">${esc(po.vendor)}</strong>
                <span class="tag ${po.status === 'rejected' ? 'tag-OUT' : po.status === 'approved' || po.status === 'ordered' ? 'tag-OK' : 'tag-LOW'} ml-1">${po.status.toUpperCase()}</span>
                <div class="text-xs opacity-70">Requested ${esc(po.requested_date)} by ${esc(po.requested_by)}${po.approved_by ? ` · Approved by ${esc(po.approved_by)}` : ''}${po.expected_arrival ? ` · Expected ${esc(po.expected_arrival)}` : ''}${po.vendor_conf ? ` · Conf #${esc(po.vendor_conf)}` : ''}</div>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 no-print">
                ${(isMgr || po.status === 'requested') && ['requested', 'approved', 'ordered'].includes(po.status) ? `<button type="button" data-po-edit="${po.id}" class="kms-btn-alt px-2.5 py-1 text-xs">Edit PO / Invoice #</button>` : ''}
                ${po.status === 'requested' && isMgr ? `<button type="button" data-po-decide="${po.id}:approved" class="kms-btn-ok px-2.5 py-1 text-xs" title="Approve PO, Copy Order Sheet & Open Vendor Email">Approve &amp; Place Order</button> <button type="button" data-copy-vendor-po="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1 text-xs">Copy Order</button><button type="button" data-po-decide="${po.id}:rejected" class="kms-btn-alt px-2.5 py-1 text-xs">Reject</button>` : ''}
                ${po.status === 'approved' && isMgr ? `<input id="conf-${po.id}" value="${esc(po.vendor_conf || '')}" placeholder="Vendor conf #" class="kms-input text-xs w-28" /><input id="eta-${po.id}" type="date" value="${esc(po.expected_arrival || '')}" title="Expected Delivery Date" class="kms-input text-xs" /><label class="flex items-center gap-1 text-[11px] opacity-80 cursor-pointer" title="Create system reminder for delivery date"><input type="checkbox" id="rem-${po.id}" checked class="accent-[#b3122b]" /><span>Remind</span></label><button type="button" data-po-order="${po.id}" class="kms-btn-navy px-2.5 py-1 text-xs">Mark Ordered</button>` : ''}
                ${po.status === 'ordered' ? `<button type="button" data-po-reconcile="${po.id}" class="kms-btn-ok px-2.5 py-1 text-xs">Reconcile &amp; Receive</button>` : ''}
                ${(isMgr || po.status === 'requested') ? `<button type="button" data-po-del="${po.id}" class="kms-btn-alt px-2.5 py-1 text-xs">Delete</button>` : ''}
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              ${(po.lines || []).map((ln, idx) => `
                <div class="p-2 rounded bg-black/5 flex items-center justify-between gap-2">
                  <span>${esc(ln.name)}</span>
                  ${po.status === 'ordered'
                    ? `<span class="flex items-center gap-1">Ord ${ln.qty} · Recv <input type="number" step="0.5" min="0" required id="rc-${po.id}-${idx}" value="" placeholder="Enter qty" class="kms-input w-20 text-xs text-center font-bold" /></span>`
                    : `<span class="font-bold">${ln.qty} ${esc(ln.unit)}</span>`}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        ${closedPOs.length ? `<div class="text-xs opacity-70 pt-2">Recently closed: ${closedPOs.map(p => esc(p.po_number)).join(', ')}</div>` : ''}
      </div>
    
      <div class="kms-card p-4 mt-4 border-l-4 border-l-amber-500 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-xs font-extrabold uppercase tracking-wide text-[#1b365d]">Jordan Banana Catalog · Quick-Add &amp; Costing Sync</h4>
            <p class="text-[11px] opacity-75">Net 7 Days · Tax Exempt (0%) · Need by 1:00 PM (92 Race St.) · Auto-adds $10.00 Delivery Fee &amp; converts Cases → Base Units on Check-In</p>
          </div>
          <button type="button" id="btn-sync-master-catalog" class="kms-btn-alt px-2.5 py-1 text-[11px] font-bold">Clean Dupes &amp; Sync Catalog Prices</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end text-xs">
          <label class="sm:col-span-5 font-bold">Jordan Banana Catalog Item
            <select id="jb-cat-item" class="kms-input w-full mt-1">
              ${(JORDAN_BANANA_CATALOG || []).map((it, idx) => `<option value="${idx}">[${esc(it.itemSku || 'JB')}] ${esc(it.name)} — ${Number(it.casePrice || 0).toFixed(2)}/${esc(it.orderUnit)} (${it.packQty} ${esc(it.baseUnit)})</option>`).join('')}
            </select>
          </label>
          <label class="sm:col-span-2 font-bold">Order Mode
            <select id="jb-cat-mode" class="kms-input w-full mt-1">
              <option value="case">Full Case / Bulk</option>
              <option value="single">Single Unit (ea)</option>
            </select>
          </label>
          <label class="sm:col-span-2 font-bold">Qty
            <input type="number" id="jb-cat-qty" step="0.5" min="0.5" value="1" class="kms-input w-full mt-1 text-center font-bold" />
          </label>
          <div class="sm:col-span-3">
            <button type="button" id="btn-jb-add-line" class="kms-btn-primary w-full py-2 text-xs font-bold">+ Add to Jordan Banana PO</button>
          </div>
        </div>
      </div>
    </div>
  `;
}