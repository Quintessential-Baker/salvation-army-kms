import { state, JORDAN_BANANA_CATALOG } from '../state.js';
import { esc } from '../utils.js';

export function renderOrders() {
  const isMgr = ['manager', 'director', 'admin'].includes((state.currentUser?.role || '').toLowerCase());
  const pos = state.purchaseOrders || [];
  const activePOs = pos.filter(p => p.status !== 'received' && p.status !== 'closed');
  const closedPOs = pos.filter(p => p.status === 'received' || p.status === 'closed').slice(0, 6);

  const catalogByCat = (JORDAN_BANANA_CATALOG || []).reduce((acc, it, idx) => {
    const cat = it.category || it.zone || 'General Provisions';
    (acc[cat] = acc[cat] || []).push({ ...it, idx });
    return acc;
  }, {});

  return `
    <div class="space-y-4">
      <!-- Unified Procurement Header & Master Sync -->
      <div class="kms-card p-4 border-l-4 border-l-[#1b365d] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-extrabold uppercase tracking-wide text-[#1b365d]">Unified Procurement &amp; Jordan Banana PO Engine</h3>
          <p class="text-xs opacity-75">Single-source ordering · Auto-populates SKUs, categories, case/unit pricing, $10.00 delivery fee &amp; syncs Master Inventory</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" id="btn-sync-master-catalog" class="kms-btn-alt px-3 py-1.5 text-xs font-bold">Sync All SKUs, Prices &amp; Inventory</button>
          <button type="button" id="btn-auto-par-po" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">Auto-Build PO from Low Stock / Pars</button>
        </div>
      </div>

      <!-- Unified Catalog & Custom Line Builder -->
      <div class="kms-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <span class="text-xs font-extrabold uppercase tracking-wide">Add Items to Purchase Order (Catalog-Linked)</span>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">Jordan Banana · Net 7 Days · Tax Exempt (0%) · Need by 1:00 PM</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
          <label class="sm:col-span-3 font-bold">Vendor
            <select id="uni-po-vendor" class="kms-input w-full mt-1">
              <option value="Jordan Banana">Jordan Banana (Produce &amp; Provisions)</option>
              <option value="Marberger Dairy">Marberger Dairy (Milk &amp; Dairy)</option>
              <option value="Local Food Bank">Greater Pittsburgh Food Bank</option>
            </select>
          </label>

          <label class="sm:col-span-4 font-bold">Catalog Item (SKU · Category · Pack)
            <select id="jb-cat-item" class="kms-input w-full mt-1">
              ${Object.entries(catalogByCat).map(([cat, list]) => `
                <optgroup label="${esc(cat)}">
                  ${list.map(it => `<option value="${it.idx}">[${esc(it.itemSku || 'JB')}] ${esc(it.name)} — $${it.casePrice.toFixed(2)}/${esc(it.orderUnit)} (${it.packQty} ${esc(it.baseUnit)})</option>`).join('')}
                </optgroup>
              `).join('')}
            </select>
          </label>

          <label class="sm:col-span-2 font-bold">Order Unit
            <select id="jb-cat-mode" class="kms-input w-full mt-1">
              <option value="case">Full Case / Bulk</option>
              <option value="single">Single Unit (ea)</option>
            </select>
          </label>

          <label class="sm:col-span-1 font-bold">Qty
            <input type="number" id="jb-cat-qty" step="0.5" min="0.5" value="1" class="kms-input w-full mt-1 text-center font-bold" />
          </label>

          <div class="sm:col-span-2">
            <button type="button" id="btn-jb-add-line" class="kms-btn-primary w-full py-2 text-xs font-bold">+ Add Line</button>
          </div>
        </div>
      </div>

      <!-- Active Purchase Orders -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-extrabold uppercase tracking-wide opacity-80">Purchase Orders in Progress (${activePOs.length})</h4>
        </div>

        ${activePOs.length === 0 ? `
          <div class="kms-card p-6 text-center text-xs opacity-70">
            No active purchase orders. Select a catalog item above or click <strong>Auto-Build PO from Low Stock / Pars</strong> to generate a complete order.
          </div>
        ` : activePOs.map(po => {
          const lines = po.lines || [];
          const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0), 0);
          return `
            <div class="kms-card p-4 space-y-3 border-l-4 ${po.status === 'ordered' ? 'border-l-emerald-600' : 'border-l-amber-500'}">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-sm text-[#1b365d]">${esc(po.po_number || po.id)}</span>
                    <span class="text-xs font-bold px-2 py-0.5 rounded bg-black/5">${esc(po.vendor)}</span>
                    <span class="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${po.status === 'ordered' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}">${esc(po.status)}</span>
                  </div>
                  <p class="text-[11px] opacity-70 mt-0.5">Created ${esc(po.created_at || '')} by ${esc(po.created_by || 'Kitchen')} · Estimated Total: <strong class="text-black">$${total.toFixed(2)}</strong></p>
                </div>

                <div class="flex flex-wrap items-center gap-1.5">
                  ${(isMgr && po.status === 'requested') ? `
                    <button type="button" data-po-approve="${esc(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">1-Click Approve &amp; Place Order</button>
                  ` : ''}
                  <button type="button" data-copy-vendor-po="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs">Copy Order Sheet</button>
                  ${(isMgr || po.status === 'requested') ? `
                    <button type="button" data-po-del="${esc(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs text-red-700">Delete</button>
                  ` : ''}
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-[var(--line)] text-left opacity-70">
                      <th class="py-1.5 pr-2">SKU</th>
                      <th class="py-1.5 pr-2">Category</th>
                      <th class="py-1.5 pr-2">Item Description</th>
                      <th class="py-1.5 pr-2 text-right">Order Qty</th>
                      <th class="py-1.5 pr-2 text-right">Base Stock Equivalent</th>
                      <th class="py-1.5 pr-2 text-right">Unit Price</th>
                      <th class="py-1.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lines.map(ln => {
                      const lineTotal = Number(ln.qty || 0) * Number(ln.unit_price || 0);
                      const baseEq = ln.isFee ? '—' : `${(Number(ln.qty || 0) * Number(ln.packQty || 1)).toFixed(1).replace(/\.0$/, '')} ${esc(ln.baseUnit || ln.unit)}`;
                      return `
                        <tr class="border-b border-[var(--line)]/50">
                          <td class="py-1.5 pr-2 font-mono text-[11px] opacity-75">${esc(ln.sku || (ln.isFee ? 'FEE' : '—'))}</td>
                          <td class="py-1.5 pr-2 opacity-80">${esc(ln.category || (ln.isFee ? 'Delivery' : 'Provisions'))}</td>
                          <td class="py-1.5 pr-2 font-semibold">${esc(ln.name)}</td>
                          <td class="py-1.5 pr-2 text-right font-bold">${ln.qty} ${esc(ln.unit)}</td>
                          <td class="py-1.5 pr-2 text-right opacity-80">${baseEq}</td>
                          <td class="py-1.5 pr-2 text-right">$${Number(ln.unit_price || 0).toFixed(2)}</td>
                          <td class="py-1.5 text-right font-bold">$${lineTotal.toFixed(2)}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${closedPOs.length ? `
        <div class="text-xs opacity-70 pt-2">Recently received / closed POs: ${closedPOs.map(p => esc(p.po_number || p.id)).join(', ')}</div>
      ` : ''}
    </div>
  `;
}
