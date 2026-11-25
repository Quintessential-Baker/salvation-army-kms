// js/views/recipes.js — Standardized Recipes, 40–80 Scaling, Web Import & Bulk Editor

import { KITCHEN_UNITS, normUnit, formatKitchenAmt, localDateStr, esc, fmtNum } from '../utils.js';
import { state, isMgmtOrHigher, predictedPortions, onOrderQty, normalizeRecipe } from '../state.js';

export function renderRecipes(main) {
  const rec = state.recipes.find(r => r.id === state.selectedRecipeId) || state.recipes[0];
  const scale = Number(state.recipeScale || (rec ? rec.base_servings : 65));
  const factor = rec ? scale / (rec.base_servings || 65) : 1;
  const predToday = Math.min(80, Math.max(40, predictedPortions(localDateStr())));
  const recQ = (state._recSearch || '').toLowerCase();
  const filteredRecs = state.recipes.filter(r => !recQ || (r.name || '').toLowerCase().includes(recQ) || (r.category || '').toLowerCase().includes(recQ));
  const showMatrix = !!state._showRecMatrix;

  main.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Standardized Recipes &amp; Scaling</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Kitchen Recipe Book &amp; 40–80 Portion Scaler</h2>
              <div class="text-xs text-white/85 mt-0.5">Scale ingredients dynamically, track FDA Big 9 allergens, import recipes, and print QR recipe cards.</div>
            </div>
          </div>
          
        </div>
      </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="space-y-3 no-print">
        ${isMgmtOrHigher() ? `
          <div class="kms-card p-4 space-y-2.5">
            <h2 class="text-sm font-bold">Search or Import Online Recipes</h2>
            <form id="form-search-web-recipes" class="flex gap-1.5">
              <input name="q" type="text" required value="${esc(state._webRecQuery || '')}" placeholder="Search online recipes (e.g. Lasagna, Chili)..." class="kms-input flex-1 text-xs" />
              <button type="submit" id="btn-search-web-rec" class="kms-btn-alt px-3 py-1.5 text-xs shrink-0">Search</button>
            </form>
            ${state._webRecQuery ? `
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-[11px] opacity-75">
                  <span>Results for "${esc(state._webRecQuery)}"</span>
                  <div class="flex items-center gap-2">
                    <a href="https://www.google.com/search?q=${encodeURIComponent(state._webRecQuery + ' recipe (site:allrecipes.com OR site:budgetbytes.com OR site:simplyrecipes.com)')}" target="_blank" rel="noopener noreferrer" class="underline font-semibold text-[#b3122b]">Search Recipe Sites ↗</a>
                    <button type="button" id="btn-clear-web-search" class="underline font-semibold opacity-80 hover:opacity-100">Clear</button>
                  </div>
                </div>
                ${!(state._webRecResults || []).length ? '<p class="text-[11px] opacity-70">No direct matches found — try Search Recipe Sites ↗ and paste the URL below.</p>' : `<div class="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">${(state._webRecResults || []).slice(0, 20).map(m => `
                  <div class="p-2 rounded border border-[var(--line)] flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                      <div class="font-bold truncate">${esc(m.title)}</div>
                      <div class="text-[10px] opacity-65">${esc(m.subtitle || 'Main')}</div>
                    </div>
                    <button type="button" data-import-mealdb="${esc(m.uid)}" class="kms-btn-ok px-2.5 py-1 text-[11px] shrink-0">Import</button>
                  </div>
                `).join('')}</div>`}
              </div>
            ` : ''}
            <form id="form-import-recipe-url" class="flex gap-1.5 pt-2 border-t border-[var(--line)]/60">
              <input name="url" type="url" required placeholder="Or paste any recipe URL (https://...)" class="kms-input flex-1 text-xs" />
              <button type="submit" id="btn-import-url" class="kms-btn-navy px-3 py-1.5 text-xs shrink-0">Import URL</button>
            </form>
          </div>
          <form id="form-paste-recipe" class="kms-card p-4 space-y-2.5">
            <h2 class="text-sm font-bold">Add / Paste a Recipe</h2>
            <textarea name="raw" rows="4" required placeholder="Title on line 1&#10;Servings: 50&#10;4 boxes Spaghetti&#10;1 cases Spaghetti sauce&#10;Directions:&#10;1. Boil pasta..." class="kms-input w-full text-xs"></textarea>
            <button type="submit" class="kms-btn-ok w-full py-2 text-xs">Read &amp; Save Recipe</button>
          </form>
        ` : `
          <form id="form-suggest-recipe" class="kms-card p-4 space-y-2.5">
            <h2 class="text-sm font-bold">Suggest a New Recipe</h2>
            <p class="text-[11px] opacity-75">Paste a recipe URL or recipe text—we'll format it cleanly and notify Management for approval.</p>
            <div class="flex gap-1.5">
              <input id="sug-url-inp" name="url" type="url" placeholder="Paste recipe URL (optional)..." class="kms-input flex-1 text-xs" />
              <button type="button" id="btn-sug-fetch-url" class="kms-btn-navy px-2.5 py-1.5 text-xs shrink-0">Fetch URL</button>
            </div>
            <input id="sug-photo-inp" name="photoUrl" type="hidden" value="" />
            <input id="sug-title-inp" name="title" type="text" placeholder="Recipe title (auto-filled from URL or type here)" class="kms-input w-full text-xs" />
            <div class="grid grid-cols-2 gap-1.5">
              <input id="sug-serv-inp" name="servings" type="number" min="1" max="250" value="65" class="kms-input text-xs" title="Base servings" />
              <input name="targetDate" type="date" class="kms-input text-xs" title="Optional target menu date" />
            </div>
            <textarea id="sug-raw-inp" name="raw" rows="4" placeholder="Paste ingredients &amp; directions (or use Fetch URL above)..." class="kms-input w-full text-xs"></textarea>
            <button type="submit" id="btn-submit-sug" class="kms-btn-primary w-full py-2 text-xs">Submit &amp; Notify Management</button>
          </form>
        `}

        ${(() => {
          const pendSug = (state.recipeSuggestions || []).filter(s => s.status === 'PENDING');
          if (!pendSug.length) return '';
          return `
            <div class="kms-card p-4 space-y-2 border-l-4 border-l-amber-500">
              <h3 class="text-xs font-bold uppercase">Pending Recipe Suggestions (${pendSug.length})</h3>
              ${pendSug.map(s => {
                const pr = s.parsed_recipe ? normalizeRecipe(s.parsed_recipe) : null;
                return `
                <div class="p-2.5 rounded border border-[var(--line)] text-xs space-y-1.5">
                  <div class="flex items-start gap-2">
                    ${pr && pr.photo_url ? `<img src="${esc(pr.photo_url)}" alt="${esc(s.title)}" class="w-10 h-10 rounded object-cover border border-[var(--line)] shrink-0" />` : ''}
                    <div>
                      <div class="font-bold">${esc(s.title)} <span class="opacity-65 font-normal">(Base ${s.servings || 65}${s.target_date ? ' · ' + esc(s.target_date) : ''})</span></div>
                      <div class="text-[11px] opacity-75">Suggested by ${esc(s.suggested_by)}${s.source_url ? ' · From URL' : ''}</div>
                    </div>
                  </div>
                  ${pr && (pr.ingredients || []).length ? `
                    <div class="p-2 rounded bg-black/5 space-y-1 text-[11px]">
                      <div class="font-bold uppercase opacity-65">Ingredients (${pr.ingredients.length})</div>
                      <ul class="space-y-0.5">${pr.ingredients.slice(0, 8).map(g => `<li>• <strong>${esc(formatKitchenAmt(g.qty, g.unit))}</strong> ${esc(g.name)}</li>`).join('')}${pr.ingredients.length > 8 ? `<li class="opacity-65">+ ${pr.ingredients.length - 8} more...</li>` : ''}</ul>
                      ${(pr.steps || []).length ? `<div class="opacity-75 pt-0.5">${pr.steps.length} step(s) included</div>` : ''}
                    </div>
                  ` : `<p class="text-[11px] opacity-85 whitespace-pre-line">${esc(s.raw)}</p>`}
                  ${isMgmtOrHigher() ? `
                    <div class="flex flex-wrap gap-1.5 pt-1">
                      <button type="button" data-review-recsug="${s.id}" class="kms-btn-navy px-2.5 py-1 text-[11px]">Review &amp; Edit</button>
                      <button type="button" data-approve-recsug="${s.id}" class="kms-btn-ok px-2.5 py-1 text-[11px]">Approve &amp; Add</button>
                      <button type="button" data-reject-recsug="${s.id}" class="kms-btn-alt px-2.5 py-1 text-[11px]">Reject</button>
                    </div>
                  ` : '<span class="tag tag-LOW">Awaiting Management Approval</span>'}
                </div>
              `; }).join('')}
            </div>
          `;
        })()}

        <div class="kms-card p-4 space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-bold">Saved Recipes (${state.recipes.length})</h3>
            <div class="flex items-center gap-1.5">
              ${isMgmtOrHigher() ? `<button type="button" id="btn-bulk-recipes" class="kms-btn-alt px-2.5 py-1 text-xs">Bulk Add / Edit</button>` : ''}
              <button type="button" id="btn-scan-recipe-qr" class="kms-btn-navy px-2.5 py-1 text-xs">Scan Recipe QR</button>
            </div>
          </div>
          <input id="rec-search-inp" type="text" value="${esc(state._recSearch || '')}" placeholder="Search or scan recipe code..." class="kms-input w-full text-xs" />
          <div id="rec-qr-wrap" class="hidden border border-[var(--line)] rounded-lg p-2 bg-black/5">
            <div id="rec-qr-reader" class="w-full"></div>
            <button type="button" id="btn-stop-recipe-qr" class="kms-btn-alt w-full py-1 text-xs mt-1.5">Stop Camera</button>
          </div>
          <div class="space-y-1.5 max-h-96 overflow-y-auto">
            ${!filteredRecs.length ? '<p class="text-xs opacity-65 py-2 text-center">No matching recipes.</p>' : filteredRecs.map(r => `
              <button type="button" data-sel-rec="${r.id}" class="w-full text-left p-2.5 rounded-lg border text-xs ${rec && r.id === rec.id ? 'border-[#b3122b] bg-[#b3122b]/10 font-bold' : 'border-[var(--line)] hover:bg-black/5'}">
                <div>${esc(r.name)}</div>
                <div class="opacity-65 font-normal">${esc(r.category)} · Base ${r.base_servings} servings</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 kms-card p-4 space-y-4">
        ${!rec ? '<p class="text-sm opacity-70">Select or add a recipe.</p>' : `
          <div class="flex flex-wrap justify-between items-start gap-2 border-b border-[var(--line)] pb-3 print-keep">
            <div class="flex items-start gap-3">
              ${rec.photo_url ? `<img src="${esc(rec.photo_url)}" alt="${esc(rec.name)}" class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-[var(--line)] shrink-0" />` : ''}
              <div>
                <div class="text-[11px] font-bold uppercase opacity-60">${esc(rec.category || 'Main')} &bull; Prep ${rec.prep_min || 20}m &bull; Cook ${rec.cook_min || 35}m &bull; ID: ${esc(rec.id)}</div>
                <h2 class="text-lg font-bold">${esc(rec.name)}</h2>
                ${(rec.allergens || []).length ? `<p class="text-xs font-bold text-[#b3122b]">Contains: ${esc(rec.allergens.join(', '))}</p>` : ''}
                ${rec.notes ? `<p class="text-xs opacity-75 mt-0.5">${esc(rec.notes)}</p>` : ''}
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5 no-print">
              <button type="button" id="btn-toggle-rec-matrix" class="kms-btn-alt px-3 py-1 text-xs">${showMatrix ? 'Single Scale View' : '40–80 Quick-Scan Table'}</button>
              <button type="button" id="btn-print-recipe-sheet" class="kms-btn-navy px-3 py-1 text-xs">Print Recipe + QR</button>
              ${isMgmtOrHigher() ? `<button type="button" data-edit-rec="${rec.id}" class="kms-btn-alt px-3 py-1 text-xs">Edit Details &amp; Directions</button><button type="button" data-del-rec="${rec.id}" class="kms-btn-alt px-3 py-1 text-xs">Delete</button>` : ''}
            </div>
          </div>

          <div class="bg-black/5 p-3.5 rounded-xl space-y-2.5 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-3">
                <label class="font-bold">Portions (40–80): <input id="rec-scale-inp" type="number" min="1" max="250" value="${scale}" class="kms-input w-20 text-center font-bold ml-1" /></label>
                <label class="font-bold opacity-80">Recipe Base: <input id="rec-base-inp" type="number" min="1" value="${rec.base_servings}" data-rec-base="${rec.id}" ${!isMgmtOrHigher() ? 'disabled' : ''} class="kms-input w-16 text-center font-bold ml-1" /></label>
              </div>
              <div class="flex flex-wrap gap-1 no-print">
                <button type="button" data-rec-preset="${predToday}" class="px-2.5 py-1 rounded-md font-bold ${scale === predToday ? 'bg-emerald-700 text-white' : 'bg-emerald-50 border border-emerald-300 text-emerald-800'}">Predicted (${predToday})</button>
                ${[40, 45, 50, 55, 60, 65, 70, 75, 80].map(p => `
                  <button type="button" data-rec-preset="${p}" class="px-2 py-1 rounded-md font-semibold border ${scale === p ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'kms-btn-alt'}">${p}</button>
                `).join('')}
              </div>
            </div>
            <input id="rec-scale-slider" type="range" min="40" max="80" step="1" value="${Math.min(80, Math.max(40, scale))}" class="w-full accent-[#b3122b] no-print" />
            <div class="flex justify-between text-[10px] opacity-60 font-semibold no-print">
              <span>40 portions</span><span>50</span><span>60</span><span>70</span><span>80 portions</span>
            </div>
          </div>

          ${showMatrix ? `
            <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                    <th class="p-2">Ingredient</th>
                    ${[40, 50, 60, 70, 80].map(p => `<th class="p-2 text-center ${scale === p ? 'text-[#b3122b] font-bold' : ''}">${p} Port.</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--line)]">
                  ${(rec.ingredients || []).map(g => `
                    <tr>
                      <td class="p-2 font-bold">${esc(g.name)}</td>
                      ${[40, 50, 60, 70, 80].map(p => {
                        const f = p / (rec.base_servings || 65);
                        return `<td class="p-2 text-center font-semibold ${scale === p ? 'bg-[#b3122b]/10 text-[#b3122b]' : ''}">${esc(formatKitchenAmt((g.qty || 0) * f, g.unit))}</td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="space-y-2">
              ${(rec.ingredients || []).map((g, i) => {
                const invItem = g.inv_id ? state.items.find(x => x.id === g.inv_id) : null;
                const deductAtScale = invItem && g.per100 ? fmtNum((g.per100 * scale) / 100) : null;
                const unitOpts = Array.from(new Set([...KITCHEN_UNITS, normUnit(g.unit)]));
                return `
                <div class="p-2.5 rounded-lg border border-[var(--line)] text-xs space-y-1.5 print-keep">
                  <div class="flex justify-between items-center gap-2 font-bold">
                    <span>${esc(g.name)}${g.inv_id && onOrderQty(g.inv_id) > 0 ? ` <span class="tag tag-LOW ml-1 no-print">On PO: ${onOrderQty(g.inv_id)}</span>` : ''}</span>
                    <span class="text-sm text-[#b3122b]">${esc(formatKitchenAmt((g.qty || 0) * factor, g.unit))}</span>
                  </div>
                  ${invItem && deductAtScale ? `<div class="text-[11px] opacity-65 no-print">Background inventory: deducts ~${deductAtScale} ${esc(invItem.unit)} of ${esc(invItem.name)} at ${scale} portions</div>` : ''}
                  ${isMgmtOrHigher() ? `
                    <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--line)]/60 opacity-85 no-print">
                      <input type="text" value="${esc(g.name)}" data-rec-ing="${rec.id}:${i}:name" class="kms-input w-36 text-xs font-semibold" title="Ingredient name" /><span class="font-semibold">Base (${rec.base_servings}):</span>
                      <input type="number" step="0.25" min="0" value="${g.qty || 0}" data-rec-ing="${rec.id}:${i}:qty" class="kms-input w-16 text-xs text-center" title="Kitchen amount at base servings" />
                      <select data-rec-ing="${rec.id}:${i}:unit" class="kms-input text-xs">${unitOpts.map(u => `<option value="${esc(u)}" ${normUnit(g.unit) === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
                      <span>→ Stock:</span>
                      <select data-rec-ing="${rec.id}:${i}:inv_id" class="kms-input text-xs max-w-[170px]">
                        <option value="">(not tracked)</option>
                        ${state.items.map(x => `<option value="${x.id}" ${g.inv_id === x.id ? 'selected' : ''}>${esc(x.name)} (${esc(x.unit)})</option>`).join('')}
                      </select>
                      ${invItem ? `
                        <span>1 ${esc(invItem.unit)} =</span>
                        <input type="number" step="0.5" min="0" value="${g.stock_per_unit || ''}" placeholder="auto" data-rec-ing="${rec.id}:${i}:stock_per_unit" class="kms-input w-16 text-xs text-center" title="How many recipe units are in 1 stock unit" />
                        <span>${esc(normUnit(g.unit))}</span>
                      ` : ''}
                      <button type="button" data-del-rec-ing="${rec.id}:${i}" class="ml-auto text-red-600 hover:underline font-semibold" title="Remove ingredient">Remove</button>
                    </div>
                  ` : ''}
                </div>
              `; }).join('')}
              ${isMgmtOrHigher() ? `
                <form id="form-add-rec-ing" data-rec-id="${esc(rec.id)}" class="p-2.5 rounded-lg border border-dashed border-[var(--line)] flex flex-wrap items-center gap-1.5 text-xs no-print">
                  <input name="name" type="text" required placeholder="+ Add ingredient (e.g. Garlic powder)" class="kms-input flex-1 min-w-[150px] text-xs" />
                  <input name="qty" type="number" step="0.25" min="0.1" required placeholder="Qty" class="kms-input w-16 text-xs text-center" />
                  <select name="unit" class="kms-input text-xs">${KITCHEN_UNITS.map(u => `<option value="${esc(u)}" ${u === 'cups' ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
                  <select name="inv_id" class="kms-input text-xs max-w-[160px]">
                    <option value="">Stock link (opt.)</option>
                    ${state.items.map(x => `<option value="${x.id}">${esc(x.name)} (${esc(x.unit)})</option>`).join('')}
                  </select>
                  <input name="stock_per_unit" type="number" step="0.5" min="0" placeholder="per stock unit" class="kms-input w-24 text-xs text-center" title="Recipe units per 1 stock unit" />
                  <button type="submit" class="kms-btn-alt px-2.5 py-1 text-xs font-semibold">+ Add</button>
                </form>
              ` : ''}
            </div>
          `}

          ${(rec.directions || (rec.steps && rec.steps.length)) ? `
            <div class="p-3 rounded-lg bg-black/5 text-xs space-y-1 print-keep">
              <div class="font-bold uppercase opacity-65">Directions</div>
              ${rec.steps && rec.steps.length
                ? `<ol class="list-decimal list-inside space-y-1 leading-relaxed">${rec.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
                : `<p class="whitespace-pre-line leading-relaxed">${esc(rec.directions)}</p>`}
            </div>
          ` : ''}
        `}
      </div>
    </div>
      </div>
  `;
}
