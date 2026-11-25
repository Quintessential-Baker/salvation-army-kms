// js/views/receive.js — PO Check-In & In-Kind Food Donations with IRS Tax Receipts

import { localDateStr, esc, fmtNum, openModal } from '../utils.js';
import { state, getActiveUser, isMgmtOrHigher } from '../state.js';

export function showDonationTaxReceiptModal(donId) {
  const don = (state.donations || []).find(d => d.id === donId);
  if (!don) return;
  document.body.classList.add('printing-modal');
  openModal(`In-Kind Donation Tax Receipt — ${don.receipt_number}`, `
    <div class="space-y-4 text-xs">
      <div class="p-4 rounded-xl border border-[var(--line)] space-y-3 print-keep">
        <div class="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div>
            <div class="font-extrabold text-base text-[#1b365d]">THE SALVATION ARMY</div>
            <div class="font-bold">Butler Worship &amp; Service Center · Community Meals Program</div>
            <div class="opacity-80">313 West Cunningham Street · Butler, PA 16001</div>
            <div class="opacity-75 text-[11px]">501(c)(3) Non-Profit Religious &amp; Charitable Organization</div>
          </div>
          <div class="text-right">
            <div class="tag tag-OK">OFFICIAL TAX RECEIPT</div>
            <div class="font-mono font-bold mt-1">${esc(don.receipt_number)}</div>
            <div class="opacity-80">Date: <strong>${esc(don.donation_date)}</strong></div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/5 p-3 rounded-lg">
          <div>
            <div class="text-[10px] font-bold uppercase opacity-65">Donor Information</div>
            <div class="font-bold text-sm mt-0.5">${esc(don.donor_name)}</div>
            ${don.donor_org ? `<div class="opacity-85">${esc(don.donor_org)}</div>` : ''}
            ${don.donor_address ? `<div class="opacity-80 whitespace-pre-line">${esc(don.donor_address)}</div>` : ''}
            ${don.donor_contact ? `<div class="opacity-75 mt-0.5">${esc(don.donor_contact)}</div>` : ''}
          </div>
          <div>
            <div class="text-[10px] font-bold uppercase opacity-65">Donation Purpose &amp; Acknowledgment</div>
            <div class="mt-0.5">In-Kind Food &amp; Kitchen Supply Contribution for the Butler Community Meals Program.</div>
            <div class="opacity-75 mt-1">Received By: <strong>${esc(don.received_by || getActiveUser().name)}</strong></div>
          </div>
        </div>

        <div>
          <div class="font-bold uppercase opacity-70 mb-1">Itemized Description of Donated Goods</div>
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                <th class="py-1.5 px-2">#</th>
                <th class="py-1.5 px-2">Item Description</th>
                <th class="py-1.5 px-2 text-right">Quantity</th>
                <th class="py-1.5 px-2">Condition / Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--line)]">
              ${(don.items || []).map((it, idx) => `
                <tr>
                  <td class="py-1.5 px-2 font-mono">${idx + 1}</td>
                  <td class="py-1.5 px-2 font-semibold">${esc(it.name)}</td>
                  <td class="py-1.5 px-2 text-right font-bold">${fmtNum(it.qty)} ${esc(it.unit)}</td>
                  <td class="py-1.5 px-2 opacity-75">${esc(it.condition || 'Good / Unopened')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${don.notes ? `<div class="text-xs opacity-85"><strong>Notes:</strong> ${esc(don.notes)}</div>` : ''}

        <div class="p-3 rounded-lg border border-[var(--line)] bg-black/5 text-[11px] leading-relaxed space-y-1">
          <div class="font-bold">IRS Contemporaneous Written Acknowledgment (IRC &sect; 170(f)(8)):</div>
          <p>Thank you for your generous in-kind contribution to The Salvation Army Community Meals Program in Butler, Pennsylvania. In accordance with Internal Revenue Service guidelines, no goods or services were provided to the donor in exchange for this contribution. Please retain this receipt for your tax records; valuation of non-cash property is the responsibility of the donor.</p>
        </div>

        <div class="grid grid-cols-2 gap-6 pt-4 text-xs">
          <div class="border-t border-gray-400 pt-1">Authorized Representative: <strong>${esc(don.received_by || getActiveUser().name)}</strong></div>
          <div class="border-t border-gray-400 pt-1">Date Issued: <strong>${esc(don.donation_date)}</strong></div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 no-print">
        <button type="button" onclick="window.print()" class="kms-btn-navy flex-1 py-2 text-xs font-semibold">Print / Save PDF Tax Receipt (Letter)</button>
        <button type="button" data-close-modal="1" class="kms-btn-alt px-4 py-2 text-xs font-semibold">Close</button>
      </div>
    </div>
  `);
}

export function renderReceive(main) {
  const today = localDateStr();
  const isMgr = isMgmtOrHigher();
  const expectedPos = (state.purchaseOrders || []).filter(p => ['requested', 'ordered', 'approved', 'APPROVED_ORDERED'].includes(p.status));
  const donations = state.donations || [];
  const invOpts = state.items.filter(i => !i.discontinued).map(i => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join('');

  main.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="bg-[#1b365d] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#b3122b]">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Receiving &amp; Donor Stewardship</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">PO Check-In &amp; In-Kind Food Donations</h2>
              <div class="text-xs text-white/85 mt-0.5">Verify incoming vendor deliveries into Living Stock and issue IRS 501(c)(3) donation receipts.</div>
            </div>
          </div>
          
        </div>
      </div>
    
      <!-- Section 1: PO Check-In System -->
      <div class="kms-card p-4 border-l-4 border-l-blue-600 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold">1. Purchase Order (PO) Check-In &amp; Reconciliation</h2>
            <p class="text-xs opacity-75">You must physically count the delivery and enter the <strong>Actually Received</strong> amount for every item (enter <code>0</code> if shorted) before accepting the order.</p>
          </div>
          <button type="button" data-tab="orders" class="kms-btn-alt px-3 py-1.5 text-xs font-semibold no-print">+ Create New PO</button>
        </div>
        ${!expectedPos.length ? '<p class="text-xs opacity-70 py-1">No open Purchase Orders waiting for delivery. Create or approve a PO in <strong>Orders &amp; POs</strong> first.</p>' : expectedPos.map(po => `
          <form class="form-reconcile-po p-3 rounded-lg border border-[var(--line)] bg-black/5 space-y-2.5 print-keep" data-po-id="${esc(po.id)}">
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div class="flex flex-wrap items-center gap-2">
                <input type="text" name="recPoNum" value="${esc(po.po_number)}" placeholder="PO #" class="kms-input text-xs font-mono font-bold w-32" title="PO #" />
                <span>&middot; <strong>${esc(po.vendor)}</strong></span>
                <span class="tag ${po.status === 'requested' ? 'tag-LOW' : 'tag-OK'}">${esc(po.status.toUpperCase())}</span>
                <input type="text" name="recInvNum" value="${esc(po.vendor_conf || '')}" placeholder="Vendor Invoice #" class="kms-input text-xs font-mono w-32" title="Vendor Invoice #" />
              </div>
              <button type="submit" class="kms-btn-ok px-3 py-1.5 text-xs no-print">Reconcile &amp; Check In PO</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead><tr class="border-b border-[var(--line)] opacity-70 uppercase"><th class="py-1 pr-2">Item</th><th class="py-1 pr-2">Ordered</th><th class="py-1">Actually Received (Required)</th></tr></thead>
                <tbody class="divide-y divide-[var(--line)]">
                  ${(po.lines || []).filter(l => (l.qty || 0) > 0).map(ln => `
                    <tr>
                      <td class="py-1.5 pr-2 font-semibold">${esc(ln.name)}</td>
                      <td class="py-1.5 pr-2">${ln.qty} ${esc(ln.unit || '')}</td>
                      <td class="py-1.5"><input type="number" step="0.5" min="0" required name="rec_${esc(ln.item_id)}" value="" placeholder="Enter qty" class="kms-input w-24 text-xs font-bold text-center" /></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </form>
        `).join('')}
      </div>

      <!-- Section 2: In-Kind Donation Form & Printable Tax Receipt -->
      <form id="form-log-donation" class="kms-card p-4 border-l-4 border-l-emerald-600 space-y-3 no-print">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold">2. Record In-Kind Food Donation &amp; Generate Tax Receipt</h2>
            <p class="text-xs opacity-75">Logs donated food straight into Living Stock and generates a printable IRS tax receipt (<code>IRC &sect; 170(f)(8)</code>) for the donor.</p>
          </div>
          <button type="button" id="btn-add-don-row" class="kms-btn-navy px-3 py-1.5 text-xs font-semibold">+ Add Donation Line</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label class="block font-semibold mb-1">Donor Name *</label>
            <input name="donorName" type="text" required placeholder="e.g. St. Paul Church / Jane Doe" class="kms-input w-full text-xs" />
          </div>
          <div>
            <label class="block font-semibold mb-1">Organization / Business (Opt.)</label>
            <input name="donorOrg" type="text" placeholder="Company or group name" class="kms-input w-full text-xs" />
          </div>
          <div>
            <label class="block font-semibold mb-1">Donation Date *</label>
            <input name="donationDate" type="date" value="${today}" required class="kms-input w-full text-xs" />
          </div>
          <div>
            <label class="block font-semibold mb-1">Email or Phone (Opt.)</label>
            <input name="donorContact" type="text" placeholder="donor@example.com / 724-..." class="kms-input w-full text-xs" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div>
            <label class="block font-semibold mb-1">Donor Mailing Address (Printed on Tax Receipt)</label>
            <input name="donorAddress" type="text" placeholder="Street, City, State, ZIP" class="kms-input w-full text-xs" />
          </div>
          <div>
            <label class="block font-semibold mb-1">Notes / Food Drive Name (Optional)</label>
            <input name="notes" type="text" placeholder="e.g. Annual Thanksgiving Food Drive" class="kms-input w-full text-xs" />
          </div>
        </div>

        <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                <th class="p-2">Link to Stock Item (Auto-adds to Stock)</th>
                <th class="p-2">Or Custom Item Description</th>
                <th class="p-2 w-24">Qty</th>
                <th class="p-2 w-24">Unit</th>
                <th class="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody id="don-rows-body" class="divide-y divide-[var(--line)]">
              ${[0, 1, 2].map(() => `
                <tr class="don-row">
                  <td class="p-1.5">
                    <select name="donItemId" class="kms-input w-full text-xs">
                      <option value="">-- Custom / Non-Catalog Item --</option>
                      ${invOpts}
                    </select>
                  </td>
                  <td class="p-1.5"><input name="donCustomName" type="text" placeholder="e.g. Fresh produce box / Pies" class="kms-input w-full text-xs" /></td>
                  <td class="p-1.5"><input name="donQty" type="number" step="0.5" min="0" placeholder="0" class="kms-input w-full text-xs text-center font-bold" /></td>
                  <td class="p-1.5"><input name="donUnit" type="text" value="cases" placeholder="cases, lbs..." class="kms-input w-full text-xs" /></td>
                  <td class="p-1.5 text-center"><button type="button" class="btn-rm-don-row text-rose-600 font-bold text-sm">&times;</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <button type="submit" class="kms-btn-ok px-4 py-2 text-sm">Log Donation into Stock &amp; Open Printable Tax Receipt</button>
      </form>

      <!-- Section 3: Saved Donation Tax Receipts Archive -->
      <div class="kms-card p-4 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold">3. Saved Donation Tax Receipts (${donations.length})</h3>
            <p class="text-xs opacity-75">Click <strong>View / Print Tax Receipt</strong> on any donation to print a Letter-size IRS donor acknowledgment.</p>
          </div>
          <button type="button" onclick="window.print()" class="kms-btn-alt px-3 py-1.5 text-xs no-print">Print Donation Log</button>
        </div>
        ${!donations.length ? '<p class="text-xs opacity-70">No donations logged yet. Use the form above to record a donation and print a tax receipt.</p>' : `
          <div class="space-y-2">
            ${donations.map(d => `
              <div class="p-3 rounded-lg border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs print-keep">
                <div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-mono font-bold text-[#1b365d]">${esc(d.receipt_number)}</span>
                    <strong class="text-sm">${esc(d.donor_name)}</strong>
                    ${d.donor_org ? `<span class="opacity-75">(${esc(d.donor_org)})</span>` : ''}
                    <span class="tag tag-OK">${esc(d.donation_date)}</span>
                  </div>
                  <div class="opacity-85 mt-1">${(d.items || []).map(it => `<strong>${fmtNum(it.qty)} ${esc(it.unit)}</strong> ${esc(it.name)}`).join(', ')}</div>
                  <div class="text-[11px] opacity-60 mt-0.5">Logged by ${esc(d.received_by || 'Staff')}</div>
                </div>
                <div class="flex items-center gap-1.5 no-print">
                  <button type="button" data-view-don-receipt="${esc(d.id)}" class="kms-btn-navy px-3 py-1.5 text-xs font-semibold">View / Print Tax Receipt</button>
                  ${isMgr ? `<button type="button" data-del-don="${esc(d.id)}" class="text-red-600 hover:underline font-semibold px-1.5 py-1 text-xs">Delete</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}