// js/views/records.js — True Blank Zone-Sectioned Blind Inventory Form, Smart Spelling/Unit Matching & Variance Approval

import {
  LOCATIONS, STOCK_UNITS, normStockUnit, cleanItemName,
  convertCulinaryUnit, dLabel, esc, fmtNum
} from '../utils.js';
import { state, isMgmtOrHigher } from '../state.js';

// Levenshtein edit distance for typo-tolerant item name matching
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeWords(str) {
  return cleanItemName(str)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w);
}

// Match a typed blind-count item name & unit against Living Stock (accounting for spelling & unit conversions)
export function matchBlindEntry(rawName, rawQty, rawUnit, zone) {
  const cleanedName = cleanItemName(rawName);
  const countedQty = Math.max(0, parseFloat(rawQty) || 0);
  const countedUnit = normStockUnit(rawUnit || 'cases');
  const activeItems = (state.items || []).filter(i => !i.discontinued);

  const qNorm = cleanedName.toLowerCase().replace(/\s+/g, ' ').trim();
  const qWords = normalizeWords(cleanedName);

  let bestItem = null;
  let bestScore = 0;
  let matchType = 'UNMATCHED';

  activeItems.forEach(item => {
    const iNorm = item.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const iWords = normalizeWords(item.name);
    const sameZoneBonus = item.location === zone ? 0.06 : 0;

    if (iNorm === qNorm) {
      const sc = 1.0 + sameZoneBonus;
      if (sc > bestScore) { bestScore = sc; bestItem = item; matchType = 'EXACT'; }
      return;
    }

    // Token overlap score
    const overlap = qWords.filter(w => iWords.includes(w)).length;
    const union = new Set([...qWords, ...iWords]).size || 1;
    const jaccard = overlap / union;

    // Fuzzy edit similarity on full string
    const maxLen = Math.max(qNorm.length, iNorm.length) || 1;
    const dist = editDistance(qNorm, iNorm);
    const sim = 1 - dist / maxLen;

    const score = Math.max(jaccard * 0.95, sim) + sameZoneBonus;
    if (score > bestScore && score >= 0.62) {
      bestScore = score;
      bestItem = item;
      matchType = sim >= 0.92 && overlap === iWords.length ? 'SPELLING_FIXED' : 'FUZZY';
    }
  });

  if (!bestItem) {
    return {
      enteredName: rawName.trim(),
      cleanedName,
      zone,
      countedQty,
      countedUnit,
      matchedItem: null,
      matchType: 'UNMATCHED',
      unitStatus: 'NEW_ITEM',
      comparableCountedQty: countedQty,
      systemQty: 0,
      systemUnit: countedUnit,
      variance: countedQty,
      zoneMoved: false
    };
  }

  const sysUnit = normStockUnit(bestItem.unit);
  const sysQty = Number(bestItem.on_hand) || 0;
  let unitStatus = 'MATCH';
  let comparableCountedQty = countedQty;

  if (countedUnit !== sysUnit) {
    const converted = convertCulinaryUnit(countedQty, countedUnit, sysUnit);
    if (converted !== null) {
      unitStatus = 'CONVERTED';
      comparableCountedQty = Math.round(converted * 100) / 100;
    } else {
      unitStatus = 'MISMATCH';
    }
  }

  const variance = unitStatus === 'MISMATCH'
    ? null
    : Math.round((comparableCountedQty - sysQty) * 100) / 100;

  return {
    enteredName: rawName.trim(),
    cleanedName,
    zone,
    countedQty,
    countedUnit,
    matchedItem: bestItem,
    matchType,
    unitStatus,
    comparableCountedQty,
    systemQty: sysQty,
    systemUnit: sysUnit,
    variance,
    zoneMoved: bestItem.location !== zone
  };
}

export function ensureBlindZoneForm() {
  if (!state.blindZoneForm || typeof state.blindZoneForm !== 'object') {
    state.blindZoneForm = {};
  }
  LOCATIONS.forEach(loc => {
    if (!Array.isArray(state.blindZoneForm[loc]) || !state.blindZoneForm[loc].length) {
      state.blindZoneForm[loc] = Array.from({ length: 4 }, () => ({ name: '', qty: '', unit: 'cases', note: '' }));
    }
  });
  return state.blindZoneForm;
}

export function renderRecords(main) {
  const activeItems = state.items.filter(i => !i.discontinued);
  const opts = activeItems.map(i => `<option value="${i.id}">${esc(i.name)} (${esc(normStockUnit(i.unit))})</option>`).join('');
  const zoneForm = ensureBlindZoneForm();
  const isMgr = isMgmtOrHigher();
  const pendingRecons = (state.blindReconciliations || []).filter(r => r.status === 'PENDING');
  const lastAudit = (state.blindAudits || [])[0];

  const totalFilledRows = LOCATIONS.reduce((sum, loc) => {
    return sum + (zoneForm[loc] || []).filter(r => String(r.name || '').trim() && r.qty !== '').length;
  }, 0);

  main.innerHTML = `
    <div class="space-y-4">
      <!-- Pending Reconciliation & Manager Approval Queue -->
      ${pendingRecons.length ? `
        <div class="kms-card p-4 border-l-4 border-l-amber-500 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="tag tag-LOW">AWAITING RECONCILIATION &amp; APPROVAL (${pendingRecons.length})</span>
                <h2 class="text-base font-bold">Submitted Blind Count Sheets</h2>
              </div>
              <p class="text-xs opacity-75">Review spelling matches, unit comparisons, and variances before approving updates into Living Stock.</p>
            </div>
          </div>

          <div class="space-y-3">
            ${pendingRecons.map(sub => {
              const varLines = (sub.lines || []).filter(l => l.variance !== 0 || l.unitStatus === 'MISMATCH' || l.matchType === 'UNMATCHED');
              return `
                <div class="p-3 rounded-xl border border-[var(--line)] bg-black/5 space-y-2.5 print-keep">
                  <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <strong>Count Sheet #${esc(sub.id.slice(-5).toUpperCase())}</strong> &bull;
                      Counted by <strong>${esc(sub.submitted_by)}</strong> on <strong>${esc(sub.submitted_at)}</strong> &bull;
                      ${(sub.lines || []).length} item(s), <strong>${varLines.length}</strong> variance/flag(s)
                    </div>
                    <div class="flex flex-wrap gap-1.5 no-print">
                      <button type="button" data-review-recon="${esc(sub.id)}" class="kms-btn-navy px-3 py-1.5 text-xs font-semibold">
                        ${isMgr ? 'Review Variances &amp; Approve' : 'View Variance Report'}
                      </button>
                      ${isMgr ? `<button type="button" data-reject-recon="${esc(sub.id)}" class="kms-btn-alt px-2.5 py-1.5 text-xs">Dismiss</button>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Blank Zone-Sectioned Blind Physical Inventory Form -->
      <div class="kms-card p-4 border-l-4 border-l-[#1b365d] space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 class="text-base font-bold">Blind Physical Inventory Form (Sectioned by Zone)</h2>
            <p class="text-xs opacity-75">Walk each storage zone and record what you find on the shelves (or print the blank zone form first). System counts stay hidden until submitted for variance reconciliation and manager approval.</p>
          </div>
          <div class="flex flex-wrap gap-1.5 no-print">
            <button type="button" id="btn-print-blind-form" class="kms-btn-alt px-3 py-1.5 text-xs">Print Blank Zone Form</button>
            ${totalFilledRows ? `<button type="button" id="btn-clear-blind-form" class="kms-btn-alt px-3 py-1.5 text-xs">Clear Form (${totalFilledRows})</button>` : ''}
            <button type="button" id="btn-submit-blind-form" class="kms-btn-ok px-3.5 py-1.5 text-xs font-semibold">Compare &amp; Submit for Approval (${totalFilledRows})</button>
          </div>
        </div>

        <datalist id="blind-unit-datalist">
          ${STOCK_UNITS.map(u => `<option value="${esc(u)}"></option>`).join('')}
        </datalist>

        <div class="space-y-4">
          ${LOCATIONS.map(loc => {
            const rows = zoneForm[loc] || [];
            const filledInZone = rows.filter(r => String(r.name || '').trim() && r.qty !== '').length;
            return `
              <div class="rounded-xl border border-[var(--line)] overflow-hidden print-keep">
                <div class="px-3.5 py-2.5 bg-black/5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-bold text-[#1b365d]">${esc(loc)}</h3>
                    <span class="tag ${filledInZone ? 'tag-OK' : 'tag-LOW'}">${filledInZone} entered</span>
                  </div>
                  <div class="flex items-center gap-1.5 no-print">
                    <button type="button" data-add-zone-rows="${esc(loc)}:1" class="kms-btn-alt px-2.5 py-1 text-xs">+ Add Row</button>
                    <button type="button" data-add-zone-rows="${esc(loc)}:5" class="kms-btn-alt px-2.5 py-1 text-xs">+ Add 5 Rows</button>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-[var(--line)] uppercase opacity-70">
                        <th class="py-2 px-2.5 w-10">#</th>
                        <th class="py-2 px-2.5">Item Name (Auto-Spellchecks on Compare)</th>
                        <th class="py-2 px-2.5 w-28">Count Amt</th>
                        <th class="py-2 px-2.5 w-32">Unit</th>
                        <th class="py-2 px-2.5">Condition / Notes (Opt.)</th>
                        <th class="py-2 px-2 w-10 no-print"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--line)]">
                      ${rows.map((r, idx) => `
                        <tr>
                          <td class="py-1.5 px-2.5 font-mono opacity-65">${idx + 1}</td>
                          <td class="py-1.5 px-2">
                            <input type="text" data-zform="${esc(loc)}:${idx}:name" value="${esc(r.name || '')}" placeholder="Write/type item name found on shelf..." class="kms-input w-full text-xs font-semibold" />
                          </td>
                          <td class="py-1.5 px-2">
                            <input type="number" step="0.5" min="0" data-zform="${esc(loc)}:${idx}:qty" value="${esc(r.qty ?? '')}" placeholder="0" class="kms-input w-full text-xs text-center font-bold" />
                          </td>
                          <td class="py-1.5 px-2">
                            <input type="text" list="blind-unit-datalist" data-zform="${esc(loc)}:${idx}:unit" value="${esc(r.unit || 'cases')}" placeholder="cases, cans..." class="kms-input w-full text-xs" />
                          </td>
                          <td class="py-1.5 px-2">
                            <input type="text" data-zform="${esc(loc)}:${idx}:note" value="${esc(r.note || '')}" placeholder="e.g. 1 dented can, near front..." class="kms-input w-full text-xs" />
                          </td>
                          <td class="py-1.5 px-2 text-center no-print">
                            <button type="button" data-rm-zone-row="${esc(loc)}:${idx}" class="text-red-600 font-bold text-sm px-1" title="Remove row">&times;</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)] no-print">
          <span class="text-xs opacity-75">Spelling typos (e.g. <em>spagetti</em>, <em>peirogies</em>) and compatible units (e.g. <em>oz</em> vs. <em>lbs</em>) are compared automatically.</span>
          <button type="button" id="btn-submit-blind-form-2" class="kms-btn-ok px-4 py-2 text-xs font-semibold">Compare &amp; Submit for Variance Approval (${totalFilledRows})</button>
        </div>

        ${lastAudit ? `<div class="text-xs opacity-80 pt-2 border-t border-[var(--line)]">Last approved count: <strong>${dLabel(lastAudit.audit_date)}</strong> (${esc(lastAudit.zone || 'All Zones')}) approved by ${esc(lastAudit.auditor)} — ${lastAudit.rows.filter(r => r.sys !== r.phys).length} variance(s) reconciled</div>` : ''}
      </div>

      <!-- Log Waste -->
      <form id="form-waste" class="kms-card p-4 space-y-3 no-print">
        <h2 class="text-base font-bold">Log Waste</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select name="itemId" class="kms-input text-sm">${opts}</select>
          <input name="qty" type="number" step="0.5" min="0.5" required placeholder="Amount wasted" class="kms-input text-sm" />
          <select name="reason" class="kms-input text-sm"><option>Expired</option><option>Spoiled</option><option>Dropped or damaged</option><option>Overcooked or burned</option><option>Other</option></select>
        </div>
        <button type="submit" class="kms-btn-primary px-4 py-2 text-sm">Remove from Stock</button>
      </form>

      <!-- Exports & Backups -->
      <div class="kms-card p-4 flex flex-wrap gap-2 no-print">
        <button type="button" id="btn-exp-csv" class="kms-btn-alt px-3.5 py-2 text-xs">Download Stock CSV</button>
        <button type="button" id="btn-exp-json" class="kms-btn-alt px-3.5 py-2 text-xs">Download Full JSON Backup</button>
        <button type="button" id="btn-open-restore" class="kms-btn-alt px-3.5 py-2 text-xs">Restore JSON Backup</button>
      </div>
    </div>
  `;
}