// js/views/orders.js — Section 3: Weekly & Monthly Menu-Driven Ordering Pipeline
import { localDateStr, addDays, serviceDaysBetween, esc } from '../utils.js';
import { state, getActiveUser, isMgmtOrHigher, isStaffOrHigher, normalizeRole, VENDOR_CATALOG, getCatalogMetaForItem, committedAndNetAvailable } from '../state.js';

export function renderOrders(main) {
  const hz = Number(state._orderHorizon || 7);
  const vFilter = state._orderVendor || 'ALL';
  const days = serviceDaysBetween(localDateStr(), addDays(localDateStr(), hz === 1 ? 4 : hz));
  const useDays = hz === 1 ? days.slice(0, 1) : days;
  const me = getActiveUser();
  const isMgr = isMgmtOrHigher(me);
  const canEditReq = isStaffOrHigher(me);
  const approvers = (state.users || []).filter(u => u.active !== false && ['ADMIN', 'MANAGER'].includes(normalizeRole(u.role)));
  const parMult = hz === 30 ? 4 : (hz === 1 ? 0.25 : 1);

  const suggestions = (state.items || []).filter(x => !x.discontinued).map(x => {
    const meta = getCatalogMetaForItem(x);
    const isPerishable = /produce|dairy|milk|deli|fresh|cooler/i.test(meta.cat + ' ' + (x.location || ''));
    const effMult = (hz === 30 && isPerishable) ? 1 : parMult;
    const parTarget = Math.ceil(Number(x.par || 0) * effMult);
    const { onHand, inTransit, committed, netAvailable } = committedAndNetAvailable(x, useDays);
    const deficit = Math.max(0, parTarget - netAvailable);
    if (deficit <= 0) return null;
    const orderQty = Math.max(1, Math.ceil(deficit / (meta.packQty || 1)));
    return {
      itemId: x.id, sku: meta.sku, cat: meta.cat, vendor: meta.vendor, name: x.name,
      onHand, inTransit, committed, parTarget, baseUnit: meta.baseUnit,
      orderQty, unit: meta.orderUnit, packQty: meta.packQty, unitPrice: meta.casePrice || meta.unitPrice
    };
  }).filter(Boolean).filter(s => vFilter === 'ALL' || s.vendor === vFilter);

  const jbCount = suggestions.filter(s => s.vendor === 'Jordan Banana').length;
  const mdCount = suggestions.filter(s => s.vendor === 'Marberger Dairy').length;
  const pos = state.purchaseOrders || [];
  const requestedPOs = pos.filter(p => p.status === 'requested');
  const orderedPOs = pos.filter(p => p.status === 'ordered');
  const closedPOs = pos.filter(p => p.status === 'closed').slice(0, 5);
  const renderPOCard = (po) => {
    const lines = po.lines || [];
    const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0), 0);
    const placed = po.status === 'ordered';
    return `<div class="kms-card p-4 space-y-3 border-l-4 ${placed ? 'border-l-emerald-600' : 'border-l-amber-500'}">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-extrabold text-sm">${esc(po.po_number || po.id)}</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded bg-black/10">${esc(po.vendor)}</span>
            <span class="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${placed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black'}">${placed ? 'Stage 3 · Placed with Vendor' : 'Stage 2 · Request for Purchase'}</span>${(!placed && po.assigned_approver_name) ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300">Routed to: ${esc(po.assigned_approver_name)}</span>` : ''}
          </div>
          <p class="text-xs opacity-75 mt-1">Created ${esc(po.created_at || '')} by ${esc(po.created_by || 'Staff')}${isMgr ? ` · Est. PO Total: <strong>${total.toFixed(2)}</strong> <span class="opacity-75">(editable unit prices)</span>` : ''}</p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          ${((!placed && canEditReq) || (placed && isMgr)) ? `<button type="button" data-po-edit="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs font-bold">${placed ? 'Edit PO' : 'Edit Request'}</button>` : ''}
          ${!placed ? `
            <div class="flex items-center gap-1 bg-black/5 px-1.5 py-1 rounded-lg border border-[var(--line)]">
              <select id="po-approver-sel-${esc(po.id)}" class="kms-input text-xs py-1">
                <option value="">Select Approver...</option>
                ${approvers.map(ap => `<option value="${esc(ap.id)}" ${String(po.assigned_approver_id || '') === String(ap.id) ? 'selected' : ''}>${esc(ap.name)} (${esc(ap.role)})${ap.email ? ' — ' + esc(ap.email) : ' (in-app only)'}</option>`).join('')}
              </select>
              <button type="button" data-po-email="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1 text-xs font-bold">Email Approver</button>
            </div>
          ` : ''}
          ${(!placed && isMgr) ? `<button type="button" data-ord-approve="${esc(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">1-Click Approve &amp; Place Order</button>` : ''}
          ${placed ? `<button type="button" data-ord-recv="${esc(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">Go to Invoice Check-In →</button>` : ''}
          <button type="button" data-ord-copy="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs">Copy Order Sheet</button>
          ${((!placed && canEditReq) || isMgr) ? `<button type="button" data-ord-del="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs text-red-600">Delete</button>` : ''}
        </div>
      </div>
      <div class="overflow-x-auto"><table class="w-full text-xs border-collapse">
        <thead><tr class="border-b border-[var(--line)] text-left opacity-70"><th class="py-1 pr-2">SKU</th><th class="py-1 pr-2">Category</th><th class="py-1 pr-2">Item</th><th class="py-1 pr-2 text-right">Order Qty</th><th class="py-1 pr-2 text-right">Stock Gain</th>${isMgr ? `<th class="py-1 pr-2 text-right">Unit Price ($)</th><th class="py-1 text-right">Ext. Total</th>` : ''}</tr></thead>
        <tbody>${lines.map((ln, lnIdx) => `<tr class="border-b border-[var(--line)]/40"><td class="py-1.5 pr-2 font-mono text-[11px] opacity-75">${esc(ln.sku || '—')}</td><td class="py-1.5 pr-2 opacity-75">${esc(ln.category || '—')}</td><td class="py-1.5 pr-2 font-semibold">${esc(ln.name)}</td><td class="py-1.5 pr-2 text-right font-bold">${(!placed && canEditReq && !ln.isFee) ? `<div class="inline-flex items-center gap-1"><input type="number" step="0.5" min="0" value="${ln.qty}" data-po-qty="${esc(po.id)}:${lnIdx}" class="kms-input w-16 text-xs text-right font-bold" /><span>${esc(ln.unit)}</span><button type="button" data-po-rm-line="${esc(po.id)}:${lnIdx}" title="Remove item from request" class="ml-1 px-1.5 py-0.5 rounded text-red-600 hover:bg-red-50 font-black">×</button></div>` : `${ln.qty} ${esc(ln.unit)}`}</td><td class="py-1.5 pr-2 text-right opacity-75">${ln.isFee ? '—' : '+' + (Number(ln.qty || 0) * Number(ln.packQty || 1)) + ' ' + esc(ln.baseUnit || ln.unit)}</td>${isMgr ? `<td class="py-1.5 pr-2 text-right"><input type="number" step="0.01" min="0" value="${Number(ln.unit_price || 0).toFixed(2)}" data-po-price="${esc(po.id)}:${lnIdx}" title="${ln.isWholesaleEst ? 'Standard Wholesale Benchmark (edit to save real price)' : 'Saved Unit Price (editable)'}" class="kms-input w-20 text-xs text-right font-semibold" />${ln.isWholesaleEst ? `<div class="text-[9px] text-amber-600 font-bold">Est. Wholesale</div>` : ''}</td><td class="py-1.5 text-right font-bold">${(Number(ln.qty || 0) * Number(ln.unit_price || 0)).toFixed(2)}</td>` : ''}</tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  };

  main.innerHTML = `<div class="space-y-4">
    <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
      <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army · Butler, PA · Section 3: Procurement Pipeline</div>
          <h2 class="text-base sm:text-lg font-black">1. Menu &amp; Par Suggestions → 2. Purchase Request → 3. Approve &amp; Place → 4. Check-In</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select id="ord-vendor-filter" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold">
            <option value="ALL" ${vFilter === 'ALL' ? 'selected' : ''}>All Vendors</option>
            <option value="Jordan Banana" ${vFilter === 'Jordan Banana' ? 'selected' : ''}>Jordan Banana Only</option>
            <option value="Marberger Dairy" ${vFilter === 'Marberger Dairy' ? 'selected' : ''}>Marberger Dairy Only</option>
          </select>
          <select id="order-hz" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold">
            <option value="1" ${hz === 1 ? 'selected' : ''}>Next Service Day (1-Day)</option>
            <option value="7" ${hz === 7 ? 'selected' : ''}>Weekly Order (7-Day Menu + Par)</option>
            <option value="30" ${hz === 30 ? 'selected' : ''}>Monthly Order (30-Day Menu + 4x Dry Par)</option>
          </select>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-7 kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div>
            <h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 1A · ${hz === 30 ? 'Monthly (30-Day)' : (hz === 1 ? 'Next-Day' : 'Weekly (7-Day)')} Suggestions (${suggestions.length})</h3>
            <p class="text-[11px] opacity-75">Formula: (Menu Committed + Par Target) − (On Hand + In Transit) across ${useDays.length} service days</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" id="btn-req-all-jb" class="kms-btn-primary px-2.5 py-1.5 text-xs font-bold">+ Request All Jordan Banana (${jbCount})</button>
            <button type="button" id="btn-req-all-md" class="kms-btn-alt px-2.5 py-1.5 text-xs font-bold">+ Request All Marberger (${mdCount})</button>
          </div>
        </div>
        ${suggestions.length === 0 ? `<p class="text-xs opacity-70 py-4 text-center">All inventory items meet par &amp; planned menu servings for this window.</p>` : `<div class="max-h-80 overflow-y-auto divide-y divide-[var(--line)]/50 text-xs">${suggestions.map(sg => `<div class="py-2 flex items-center justify-between gap-2"><div><span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/10 mr-1">${esc(sg.sku)}</span><strong>${esc(sg.name)}</strong><div class="text-[11px] opacity-75 mt-0.5">${esc(sg.vendor)} · On Hand: <strong>${sg.onHand}</strong>${sg.inTransit ? ` (+${sg.inTransit} ord)` : ''} · Menu: <strong>${sg.committed}</strong> · Par: <strong>${sg.parTarget} ${esc(sg.baseUnit)}</strong></div></div><div class="flex items-center gap-2 shrink-0"><span class="font-bold">${sg.orderQty} ${esc(sg.unit)}${isMgr ? ` (${(sg.orderQty * sg.unitPrice).toFixed(2)})` : ''}</span><button type="button" data-add-sug-id="${esc(sg.itemId)}" class="kms-btn-alt px-2 py-1 text-[11px] font-bold">+ Request</button></div></div>`).join('')}</div>`}
      </div>
      <div class="lg:col-span-5 kms-card p-4 space-y-3">
        <div class="border-b border-[var(--line)] pb-2">
          <h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 1B · Add From Vendor Invoice Catalog</h3>
          <p class="text-[11px] opacity-75">Order Full Case, Single Broken-Case (ea), or Catch-Weight (lb)</p>
        </div>
        <div class="space-y-2.5 text-xs">
          <label class="block font-bold">Catalog Item<select id="ord-cat-idx" class="kms-input w-full mt-1">${VENDOR_CATALOG.map((c, idx) => `<option value="${idx}">[${esc(c.sku)}] ${esc(c.name)}${isMgr ? ` — ${c.casePrice.toFixed(2)}/${esc(c.orderUnit)}` : ''} (${c.packQty} ${esc(c.baseUnit)})</option>`).join('')}</select></label>
          <div class="grid grid-cols-2 gap-2">
            <label class="font-bold">Order Mode<select id="ord-cat-mode" class="kms-input w-full mt-1"><option value="case">Full Case / Bulk U/M</option><option value="single">Broken-Case Single (ea)</option></select></label>
            <label class="font-bold">Quantity<input type="number" id="ord-cat-qty" step="0.5" min="0.5" value="1" class="kms-input w-full mt-1 text-center font-bold" /></label>
          </div>
          <button type="button" id="btn-ord-cat-add" class="kms-btn-primary w-full py-2 text-xs font-bold">+ Add Line to Purchase Request</button>
          <p class="text-[11px] opacity-70">Jordan Banana requests automatically consolidate into one PO and include the standard vendor delivery fee.</p>
        </div>
      </div>
    </div>
    <div class="space-y-2.5"><h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 2 · Requests for Purchase Awaiting Approval (${requestedPOs.length})</h3>${requestedPOs.length === 0 ? `<div class="kms-card p-4 text-xs opacity-70">No pending purchase requests.</div>` : requestedPOs.map(renderPOCard).join('')}</div>
    <div class="space-y-2.5"><h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 3 · Approved &amp; Placed Vendor Orders (${orderedPOs.length})</h3>${orderedPOs.length === 0 ? `<div class="kms-card p-4 text-xs opacity-70">No orders currently awaiting delivery.</div>` : orderedPOs.map(renderPOCard).join('')}</div>
    ${closedPOs.length ? `<div class="text-xs opacity-70">Recently closed invoices: ${closedPOs.map(p => esc(p.po_number || p.id)).join(', ')}</div>` : ''}
  </div>`;
}
