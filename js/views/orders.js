import { state, VENDOR_CATALOG, matchCatalogItem } from "../state.js";

const h = v => String(v ?? "").replace(/[&<>"\x27]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\x27":"&#39;" }[c]));

export function renderOrders() {
  const role = String(state.currentUser?.role || "").toLowerCase();
  const isMgr = role.includes("admin") || role.includes("manager") || role.includes("director");
  const items = Array.isArray(state.items) ? state.items : [];
  const pos = Array.isArray(state.purchaseOrders) ? state.purchaseOrders : [];

  // Stage 1: Automatic Stock & Par Suggestions grouped by Vendor
  const suggestions = items.filter(it => Number(it.qty || 0) < Number(it.par || 0)).map(it => {
    const cat = matchCatalogItem(it.sku) || matchCatalogItem(it.name);
    const vendor = cat?.vendor || (/milk|lemonade|tea|yogurt|butter/i.test(it.name) ? "Marberger Dairy" : "Jordan Banana");
    const packQty = cat?.packQty || 1;
    const deficit = Math.max(1, Number(it.par || 0) - Number(it.qty || 0));
    const orderQty = Math.max(1, Math.ceil(deficit / packQty));
    const unit = cat?.orderUnit || it.unit || "cs";
    const unitPrice = cat?.casePrice || Number(it.unit_price || 0) || 0;
    return { itemId: it.id, sku: cat?.sku || it.sku || "CUSTOM", cat: cat?.cat || it.zone || "General", vendor, name: cat?.name || it.name, onHand: Number(it.qty || 0), par: Number(it.par || 0), baseUnit: it.unit || cat?.baseUnit || "ea", orderQty, unit, packQty, unitPrice };
  });

  const requestedPOs = pos.filter(p => p.status === "requested");
  const orderedPOs = pos.filter(p => p.status === "ordered");
  const closedPOs = pos.filter(p => p.status === "received" || p.status === "closed").slice(0, 5);

  const renderPOCard = (po) => {
    const lines = Array.isArray(po.lines) ? po.lines : [];
    const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0), 0);
    const isOrdered = po.status === "ordered";
    return `
      <div class="kms-card p-4 space-y-3 border-l-4 ${isOrdered ? "border-l-emerald-500" : "border-l-amber-500"}">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-sm">${h(po.po_number || po.id)}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded bg-white/10">${h(po.vendor)}</span>
              <span class="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${isOrdered ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}">${isOrdered ? "STAGE 3: PLACED WITH VENDOR" : "STAGE 2: REQUESTED (AWAITING APPROVAL)"}</span>
            </div>
            <p class="text-[11px] opacity-75 mt-0.5">Created ${h(po.created_at || "")} by ${h(po.created_by || "Staff")} · Invoice Est. Total: <strong>$${total.toFixed(2)}</strong></p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${(!isOrdered && isMgr) ? `<button type="button" data-ord-approve="${h(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">1-Click Approve &amp; Place Order</button>` : ""}
            ${isOrdered ? `<button type="button" data-ord-goto-recv="${h(po.id)}" class="kms-btn-primary px-3 py-1.5 text-xs font-bold">Go to Invoice Check-In →</button>` : ""}
            <button type="button" data-ord-copy="${h(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs">Copy Order Sheet</button>
            <button type="button" data-ord-del="${h(po.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs text-red-400">Delete</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-[var(--line)] text-left opacity-70">
                <th class="py-1 pr-2">Item #</th>
                <th class="py-1 pr-2">Category</th>
                <th class="py-1 pr-2">Description</th>
                <th class="py-1 pr-2 text-right">Order Qty</th>
                <th class="py-1 pr-2 text-right">Stock Gain</th>
                <th class="py-1 pr-2 text-right">Unit Price</th>
                <th class="py-1 text-right">Ext. Total</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map(ln => {
                const ext = Number(ln.qty || 0) * Number(ln.unit_price || 0);
                const gain = ln.isFee ? "—" : `+${Number(ln.qty || 0) * Number(ln.packQty || 1)} ${h(ln.baseUnit || ln.unit)}`;
                return `
                  <tr class="border-b border-[var(--line)]/40">
                    <td class="py-1.5 pr-2 font-mono text-[11px] opacity-75">${h(ln.sku || "—")}</td>
                    <td class="py-1.5 pr-2 opacity-75">${h(ln.category || "—")}</td>
                    <td class="py-1.5 pr-2 font-semibold">${h(ln.name)}</td>
                    <td class="py-1.5 pr-2 text-right font-bold">${ln.qty} ${h(ln.unit)}</td>
                    <td class="py-1.5 pr-2 text-right opacity-80">${gain}</td>
                    <td class="py-1.5 pr-2 text-right">$${Number(ln.unit_price || 0).toFixed(2)}</td>
                    <td class="py-1.5 text-right font-bold">$${ext.toFixed(2)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  return `
    <div class="space-y-5">
      <!-- Pipeline Progress Header -->
      <div class="kms-card p-4 border-l-4 border-l-[#1b365d]">
        <h3 class="text-sm font-extrabold uppercase tracking-wide">4-Stage Kitchen Procurement &amp; Invoice Pipeline</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-xs">
          <div class="p-2 rounded bg-white/5 border border-[var(--line)]"><strong>1. Stock Suggestions</strong><div class="opacity-70 text-[11px]">${suggestions.length} items below par</div></div>
          <div class="p-2 rounded bg-white/5 border border-[var(--line)]"><strong>2. Purchase Requests</strong><div class="opacity-70 text-[11px]">${requestedPOs.length} awaiting approval</div></div>
          <div class="p-2 rounded bg-white/5 border border-[var(--line)]"><strong>3. Placed with Vendor</strong><div class="opacity-70 text-[11px]">${orderedPOs.length} en route to 92 Race St.</div></div>
          <div class="p-2 rounded bg-white/5 border border-[var(--line)]"><strong>4. Invoice Check-In</strong><div class="opacity-70 text-[11px]">Packs &amp; catch-weights synced</div></div>
        </div>
      </div>

      <!-- STAGE 1: Stock Suggestions + Invoice Catalog Builder -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-7 kms-card p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wide">Stage 1A · Automatic Stock &amp; Par Restock Suggestions</h4>
              <p class="text-[11px] opacity-70">Calculated from Living Stock vs. Par Levels using Jordan Banana &amp; Marberger invoice pack sizes</p>
            </div>
            <div class="flex gap-1.5">
              <button type="button" id="btn-req-all-jb" class="kms-btn-primary px-2.5 py-1.5 text-xs font-bold">+ Request All Jordan Banana</button>
              <button type="button" id="btn-req-all-md" class="kms-btn-alt px-2.5 py-1.5 text-xs font-bold">+ Request All Marberger</button>
            </div>
          </div>
          ${suggestions.length === 0 ? `<p class="text-xs opacity-70 py-4 text-center">All inventory items are currently at or above par level.</p>` : `
            <div class="max-h-72 overflow-y-auto divide-y divide-[var(--line)]/50 text-xs">
              ${suggestions.map((sg, i) => `
                <div class="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 mr-1">${h(sg.sku)}</span>
                    <strong>${h(sg.name)}</strong>
                    <span class="text-[11px] opacity-70 ml-1">(${h(sg.vendor)} · Have ${sg.onHand}/${sg.par} ${h(sg.baseUnit)})</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-bold">${sg.orderQty} ${h(sg.unit)} ($ ${(sg.orderQty * sg.unitPrice).toFixed(2)})</span>
                    <button type="button" data-add-sug="${i}" class="kms-btn-alt px-2 py-1 text-[11px] font-bold">+ Request</button>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <div class="lg:col-span-5 kms-card p-4 space-y-3">
          <div class="border-b border-[var(--line)] pb-2">
            <h4 class="text-xs font-extrabold uppercase tracking-wide">Stage 1B · Add From Vendor Invoice Catalog</h4>
            <p class="text-[11px] opacity-70">Order Full Case, Single Broken-Case (ea), or Catch-Weight (lb)</p>
          </div>
          <div class="space-y-2.5 text-xs">
            <label class="block font-bold">Catalog Item (SKU · Pack · Invoice Rate)
              <select id="ord-cat-idx" class="kms-input w-full mt-1">
                ${VENDOR_CATALOG.map((c, idx) => `<option value="${idx}">[${h(c.sku)}] ${h(c.name)} — $${c.casePrice.toFixed(2)}/${h(c.orderUnit)} (${c.packQty} ${h(c.baseUnit)})</option>`).join("")}
              </select>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="font-bold">Order U/M
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
            <p class="text-[11px] opacity-70">Jordan Banana orders automatically include the flat <strong>$10.00 Delivery Charge</strong> and merge into one active request per vendor.</p>
          </div>
        </div>
      </div>

      <!-- STAGE 2: Requests Awaiting Management Approval -->
      <div class="space-y-2.5">
        <h4 class="text-xs font-extrabold uppercase tracking-wide">Stage 2 · Purchase Requests Awaiting Approval (${requestedPOs.length})</h4>
        ${requestedPOs.length === 0 ? `<div class="kms-card p-4 text-xs opacity-70">No pending purchase requests. Add items from Stage 1 above to create a request.</div>` : requestedPOs.map(renderPOCard).join("")}
      </div>

      <!-- STAGE 3: Approved & Placed Orders (Ready for Stage 4 Invoice Receiving) -->
      <div class="space-y-2.5">
        <h4 class="text-xs font-extrabold uppercase tracking-wide">Stage 3 · Approved &amp; Placed Vendor Orders (${orderedPOs.length})</h4>
        ${orderedPOs.length === 0 ? `<div class="kms-card p-4 text-xs opacity-70">No open vendor orders in transit.</div>` : orderedPOs.map(renderPOCard).join("")}
      </div>

      ${closedPOs.length ? `<div class="text-xs opacity-70">Recently received invoices: ${closedPOs.map(p => h(p.po_number || p.id)).join(", ")}</div>` : ""}
    </div>
  `;
}
