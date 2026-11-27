import { localDateStr, addDays, serviceDaysBetween, esc } from '../utils.js';
import { state, getActiveUser, isMgmtOrHigher, demandForDays, VENDOR_CATALOG, matchCatalogItem } from '../state.js';

export function renderOrders(main) {
  const hz = Number(state._orderHorizon || 30);
  const days = serviceDaysBetween(localDateStr(), addDays(localDateStr(), hz === 1 ? 4 : hz));
  const dd = demandForDays(hz === 1 ? days.slice(0, 1) : days);
  const isMgr = isMgmtOrHigher(getActiveUser());

  // Stage 1: Combine Menu Forecast Shortages + Below-Par Items
  const suggestions = (state.items || []).filter(x => {
    const need = Math.max(Number(x.par || 0), Number(dd[x.id] || 0));
    return Number(x.on_hand || 0) < need;
  }).map(x => {
    const cat = matchCatalogItem(x.sku) || matchCatalogItem(x.name);
    const vendor = cat?.vendor || (/milk|lemonade|tea|yogurt|butter/i.test(x.name) ? 'Marberger Dairy' : 'Jordan Banana');
    const need = Math.max(Number(x.par || 0), Number(dd[x.id] || 0));
    const deficit = Math.max(1, need - Number(x.on_hand || 0));
    const packQty = cat?.packQty || 1;
    const orderQty = Math.max(1, Math.ceil(deficit / packQty));
    return {
      itemId: x.id, sku: cat?.sku || x.sku || 'STK', cat: cat?.cat || x.zone || 'General',
      vendor, name: cat?.name || x.name, onHand: Number(x.on_hand || 0), target: need,
      baseUnit: x.unit || cat?.baseUnit || 'ea', orderQty, unit: cat?.orderUnit || x.unit || 'cs',
      packQty, unitPrice: cat?.casePrice || Number(x.unit_price || 0) || 0
    };
  });

  const pos = state.purchaseOrders || [];
  const requestedPOs = pos.filter(p => p.status === 'requested');
  const orderedPOs = pos.filter(p => p.status === 'ordered');
  const closedPOs = pos.filter(p => p.status === 'closed').slice(0, 5);

  const poCard = (po) => {
    const lines = po.lines || [];
    const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0), 0);
    const placed = po.status === 'ordered';
    return `
      <div class="kms-card p-4 space-y-3 border-l-4 ${placed ? 'border-l-emerald-500' : 'border-l-amber-500'}">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-extrabold text-sm">${esc(po.po_number || po.id)}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded bg-black/10">${esc(po.vendor)}</span>
              <span class="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${placed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black'}">${placed ? 'Stage 3 · Placed with Vendor' : 'Stage 2 · Request for Purchase'}</span>
            </div>
            <p class="text-xs opacity-75 mt-1">Created ${esc(po.created_at || '')} by ${esc(po.created_by || 'Staff')} · Est. Invoice Total: <strong>$${total.toFixed(2)}</strong></p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${(!placed && isMgr) ? `<button type="button" data-ord-approve="${esc(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">1-Click Approve &amp; Place Order</button>` : ''}
            ${placed ? `<button type="button" data-ord-recv="${esc(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">Open Invoice Check-In →</button>` : ''}
            <button type="button" data-ord-copy="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs">Copy Order Sheet</button>
            <button type="button" data-ord-del="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs text-red-600">Delete</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-[var(--line)] text-left opacity-70">
                <th class="py-1 pr-2">SKU</th><th class="py-1 pr-2">Category</th><th class="py-1 pr-2">Item</th>
                <th class="py-1 pr-2 text-right">Order Qty</th><th class="py-1 pr-2 text-right">Stock Gain</th>
                <th class="py-1 pr-2 text-right">Unit Price</th><th class="py-1 text-right">Ext. Total</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map(ln => `
                <tr class="border-b border-[var(--line)]/40">
                  <td class="py-1.5 pr-2 font-mono text-[11px] opacity-75">${esc(ln.sku || '—')}</td>
                  <td class="py-1.5 pr-2 opacity-75">${esc(ln.category || '—')}</td>
                  <td class="py-1.5 pr-2 font-semibold">${esc(ln.name)}</td>
                  <td class="py-1.5 pr-2 text-right font-bold">${ln.qty} ${esc(ln.unit)}</td>
                  <td class="py-1.5 pr-2 text-right opacity-75">${ln.isFee ? '—' : '+' + (Number(ln.qty || 0) * Number(ln.packQty || 1)) + ' ' + esc(ln.baseUnit || ln.unit)}</td>
                  <td class="py-1.5 pr-2 text-right">$${Number(ln.unit_price || 0).toFixed(2)}</td>
                  <td class="py-1.5 text-right font-bold">$${(Number(ln.qty || 0) * Number(ln.unit_price || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  main.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army · Butler, PA · Unified Procurement Pipeline</div>
            <h2 class="text-base sm:text-lg font-black">1. Stock Suggestions → 2. Purchase Request → 3. Approve &amp; Place → 4. Invoice Check-In</h2>
          </div>
          <select id="order-hz" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold">
            <option value="1" ${hz === 1 ? 'selected' : ''}>Next Service Day</option>
            <option value="7" ${hz === 7 ? 'selected' : ''}>7-Day Window</option>
            <option value="30" ${hz === 30 ? 'selected' : ''}>30-Day Monthly Window</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-7 kms-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
            <div>
              <h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 1A · Stock &amp; Menu Forecast Suggestions (${suggestions.length})</h3>
              <p class="text-[11px] opacity-75">Auto-calculated from Living Stock vs. Par &amp; Planned Menus</p>
            </div>
            <div class="flex gap-1.5">
              <button type="button" id="btn-req-all-jb" class="kms-btn-primary px-2.5 py-1.5 text-xs font-bold">+ Request All Jordan Banana</button>
              <button type="button" id="btn-req-all-md" class="kms-btn-alt px-2.5 py-1.5 text-xs font-bold">+ Request All Marberger</button>
            </div>
          </div>
          ${suggestions.length === 0 ? `<p class="text-xs opacity-70 py-4 text-center">All inventory items meet par &amp; menu needs.</p>` : `
            <div class="max-h-72 overflow-y-auto divide-y divide-[var(--line)]/50 text-xs">
              ${suggestions.map((sg, i) => `
                <div class="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/10 mr-1">${esc(sg.sku)}</span>
                    <strong>${esc(sg.name)}</strong>
                    <span class="text-[11px] opacity-70 ml-1">(${esc(sg.vendor)} · Have ${sg.onHand}/${sg.target} ${esc(sg.baseUnit)})</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-bold">${sg.orderQty} ${esc(sg.unit)} ($${(sg.orderQty * sg.unitPrice).toFixed(2)})</span>
                    <button type="button" data-add-sug="${i}" class="kms-btn-alt px-2 py-1 text-[11px] font-bold">+ Request</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="lg:col-span-5 kms-card p-4 space-y-3">
          <div class="border-b border-[var(--line)] pb-2">
            <h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 1B · Add From Vendor Invoice Catalog</h3>
            <p class="text-[11px] opacity-75">Exact invoice SKUs, Full Cases, Broken-Case Singles (ea) &amp; Catch-Weights (lb)</p>
          </div>
          <div class="space-y-2.5 text-xs">
            <label class="block font-bold">Catalog Item
              <select id="ord-cat-idx" class="kms-input w-full mt-1">
                ${VENDOR_CATALOG.map((c, idx) => `<option value="${idx}">[${esc(c.sku)}] ${esc(c.name)} — $${c.casePrice.toFixed(2)}/${esc(c.orderUnit)} (${c.packQty} ${esc(c.baseUnit)})</option>`).join('')}
              </select>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="font-bold">Order Mode
                <select id="ord-cat-mode" class="kms-input w-full mt-1">
                  <option value="case">Full Case / Bulk U/M</option>
                  <option value="single">Broken-Case Single (ea)</option>
                </select>
              </label>
              <label class="font-bold">Quantity
                <input type="number" id="ord-cat-qty" step="0.5" min="0.5" value="1" class="kms-input w-full mt-1 text-center font-bold" />
              </label>
            </div>
            <button type="button" id="btn-ord-cat-add" class="kms-btn-primary w-full py-2 text-xs font-bold">+ Add Line to Purchase Request</button>
            <p class="text-[11px] opacity-70">Jordan Banana requests automatically merge into one PO and include the flat <strong>$10.00 Delivery Charge</strong>.</p>
          </div>
        </div>
      </div>

      <div class="space-y-2.5">
        <h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 2 · Requests for Purchase Awaiting Approval (${requestedPOs.length})</h3>
        ${requestedPOs.length === 0 ? `<div class="kms-card p-4 text-xs opacity-70">No pending purchase requests.</div>` : requestedPOs.map(poCard).join('')}
      </div>

      <div class="space-y-2.5">
        <h3 class="text-xs font-extrabold uppercase tracking-wide">Stage 3 · Approved &amp; Placed Vendor Orders (${orderedPOs.length})</h3>
        ${orderedPOs.length === 0 ? `<div class="kms-card p-4 text-xs opacity-70">No orders currently awaiting truck delivery.</div>` : orderedPOs.map(poCard).join('')}
      </div>

      ${closedPOs.length ? `<div class="text-xs opacity-70">Recently closed invoices: ${closedPOs.map(p => esc(p.po_number || p.id)).join(', ')}</div>` : ''}
    </div>
  `;
}
