// js/views/recipes.js — Standardized Recipes, Forecast Scaling, Easy Input, Discovery & Approval

import { KITCHEN_UNITS, normUnit, formatKitchenAmt, localDateStr, addDays, dLabel, serviceDaysBetween, esc, fmtNum } from '../utils.js';
import { state, isMgmtOrHigher, predictedPortions, forecastWeekday, onOrderQty, normalizeRecipe } from '../state.js';

export const COMMUNITY_KITCHEN_STARTERS = [
  {
    id: 'starter-goulash',
    title: 'Classic American Beef Goulash',
    category: 'Beef / Pasta',
    base_servings: 65,
    prep_min: 20,
    cook_min: 40,
    allergens: ['wheat'],
    ingredients: [
      { qty: 16, unit: 'lbs', name: 'Ground beef (hamburger)' },
      { qty: 8, unit: 'lbs', name: 'Macaroni' },
      { qty: 4, unit: 'cans', name: 'Tomato sauce' },
      { qty: 3, unit: 'cans', name: 'Diced tomatoes' },
      { qty: 2, unit: 'lbs', name: 'Onions' },
      { qty: 0.5, unit: 'cups', name: 'Chopped garlic' }
    ],
    steps: [
      'Brown ground beef and diced onions in tilt skillet or stockpots; drain excess fat.',
      'Stir in tomato sauce, diced tomatoes, garlic, salt, and pepper; simmer 15 minutes.',
      'Boil elbow macaroni until al dente, drain well, and fold into meat sauce.',
      'Verify internal temperature reaches >=165°F and hold at >=135°F for service.'
    ]
  },
  {
    id: 'starter-meatloaf',
    title: 'Homestyle Glazed Beef Meatloaf',
    category: 'Beef',
    base_servings: 65,
    prep_min: 25,
    cook_min: 55,
    allergens: ['wheat', 'eggs', 'milk'],
    ingredients: [
      { qty: 18, unit: 'lbs', name: 'Ground beef (hamburger)' },
      { qty: 2, unit: 'doz', name: 'Eggs' },
      { qty: 6, unit: 'cups', name: 'Breadcrumbs' },
      { qty: 2, unit: 'lbs', name: 'Onions' },
      { qty: 4, unit: 'cups', name: 'Ketchup (large)' },
      { qty: 3, unit: 'cups', name: 'Milk' }
    ],
    steps: [
      'Combine ground beef, beaten eggs, breadcrumbs, minced onions, milk, salt, and pepper.',
      'Form into 4 even loaves in full hotel pans and glaze tops with ketchup.',
      'Bake at 350°F for 50–60 minutes until internal probe temperature reaches >=165°F.',
      'Rest 10 minutes before slicing into 65 uniform portions.'
    ]
  },
  {
    id: 'starter-mac-cheese',
    title: 'Baked Three-Cheese Macaroni',
    category: 'Vegetarian / Pasta',
    base_servings: 65,
    prep_min: 20,
    cook_min: 35,
    allergens: ['wheat', 'milk'],
    ingredients: [
      { qty: 10, unit: 'lbs', name: 'Macaroni' },
      { qty: 10, unit: 'lbs', name: 'Shredded cheese' },
      { qty: 2, unit: 'cans', name: 'Cheese sauce' },
      { qty: 2, unit: 'gal', name: 'Milk' },
      { qty: 1.5, unit: 'lbs', name: 'Block butter' }
    ],
    steps: [
      'Boil macaroni in salted water until just tender; drain thoroughly.',
      'Whisk warm milk, melted butter, cheese sauce, and 8 lbs shredded cheese until smooth.',
      'Fold pasta into cheese sauce, transfer to hotel pans, and top with remaining cheese.',
      'Bake at 350°F for 25–30 minutes until bubbling and internal temperature is >=165°F.'
    ]
  },
  {
    id: 'starter-chicken-rice',
    title: 'Creamy Baked Chicken & Rice Casserole',
    category: 'Chicken',
    base_servings: 65,
    prep_min: 25,
    cook_min: 50,
    allergens: ['milk'],
    ingredients: [
      { qty: 18, unit: 'lbs', name: 'Cut-up chicken' },
      { qty: 8, unit: 'lbs', name: 'White rice' },
      { qty: 6, unit: 'cans', name: 'Chicken soup' },
      { qty: 2, unit: 'gal', name: 'Vegetable stock' },
      { qty: 4, unit: 'cans', name: 'Mixed vegetables (small)' }
    ],
    steps: [
      'Whisk cream of chicken soup and warm stock until smooth; fold in uncooked rice and mixed vegetables.',
      'Divide into greased hotel pans and arrange seasoned chicken pieces on top.',
      'Cover tightly with foil and bake at 375°F for 45 minutes; uncover for 10 minutes to brown.',
      'Verify thickest chicken piece reaches >=165°F before serving.'
    ]
  },
  {
    id: 'starter-sloppy-joes',
    title: 'Hearty Sloppy Joes on Buns',
    category: 'Beef / Sandwich',
    base_servings: 65,
    prep_min: 15,
    cook_min: 25,
    allergens: ['wheat'],
    ingredients: [
      { qty: 16, unit: 'lbs', name: 'Ground beef (hamburger)' },
      { qty: 4, unit: 'cans', name: 'Manwich' },
      { qty: 2, unit: 'lbs', name: 'Onions' },
      { qty: 70, unit: 'ea', name: 'Hamburger buns' }
    ],
    steps: [
      'Brown ground beef with diced onions in tilt skillet; drain fat.',
      'Stir in Manwich sauce and simmer 15 minutes until thickened and >=165°F.',
      'Serve #8 scoop onto warm buns and hold meat in steam table at >=135°F.'
    ]
  },
  {
    id: 'starter-chili',
    title: 'Homestyle Beef & Kidney Bean Chili',
    category: 'Beef / Soup',
    base_servings: 65,
    prep_min: 20,
    cook_min: 45,
    allergens: [],
    ingredients: [
      { qty: 14, unit: 'lbs', name: 'Ground beef (hamburger)' },
      { qty: 6, unit: 'cans', name: 'Kidney beans (small)' },
      { qty: 4, unit: 'cans', name: 'Diced tomatoes' },
      { qty: 3, unit: 'cans', name: 'Tomato sauce' },
      { qty: 2, unit: 'lbs', name: 'Onions' }
    ],
    steps: [
      'Brown ground beef and diced onions; drain excess grease.',
      'Add drained kidney beans, diced tomatoes, tomato sauce, chili powder, cumin, and garlic.',
      'Simmer 30 minutes stirring occasionally; verify >=165°F before transfer to steam table.'
    ]
  }
];

export function renderRecipes(main) {
  const today = localDateStr();
  const isMgr = isMgmtOrHigher();
  const rec = state.recipes.find(r => r.id === state.selectedRecipeId) || state.recipes[0];
  const predToday = Math.max(25, predictedPortions(today));

  // Default to today's forecasted portions if user hasn't manually overridden scale yet
  if (!state._recScaleTouched && !state._recTargetDate) {
    state.recipeScale = predToday;
  }
  const scale = Number(state.recipeScale || predToday || (rec ? rec.base_servings : 65));
  const factor = rec ? scale / (rec.base_servings || 65) : 1;
  const recQ = (state._recSearch || '').toLowerCase();
  const filteredRecs = state.recipes.filter(r => !recQ || (r.name || '').toLowerCase().includes(recQ) || (r.category || '').toLowerCase().includes(recQ));
  const showMatrix = !!state._showRecMatrix;

  // Next 5 open service days with forecasted portions & scheduled menu items
  const upcomingServiceDays = serviceDaysBetween(today, addDays(today, 14)).slice(0, 5).map(ds => {
    const mp = (state.menuPlan || []).find(m => m.service_date === ds && m.status !== 'CLOSED');
    const mRec = mp && mp.recipe_id ? state.recipes.find(r => r.id === mp.recipe_id) : null;
    const portions = (mp && mp.planned_portions > 0) ? mp.planned_portions : forecastWeekday(ds);
    return {
      ds,
      label: ds === today ? 'Today' : dLabel(ds),
      portions,
      recipeId: mRec ? mRec.id : '',
      mealName: mRec ? mRec.name : (mp && mp.custom_title ? mp.custom_title : 'Open Menu Day')
    };
  });

  const pendSug = (state.recipeSuggestions || []).filter(s => s.status === 'PENDING');
  const discoverTab = state._recInputTab || 'search';

  main.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border-2 border-[#1b365d] overflow-hidden shadow-sm">
        <div class="sa-hero-banner px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg bg-[#b3122b] text-white flex items-center justify-center font-black text-base shadow shrink-0">SA</div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300">The Salvation Army &bull; Butler, PA &bull; Standardized Recipes &amp; Forecast Scaling</div>
              <h2 class="text-base sm:text-lg font-black tracking-tight leading-tight">Kitchen Recipe Book, Approval Queue &amp; Forecast Scaler</h2>
              <div class="text-xs text-white/85 mt-0.5">Discover or submit recipes, approve with auto-pantry linking, and scale directly to forecasted service portions.</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 no-print">
            <span class="px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-bold">Today's Forecast: ${predToday} Portions</span>
            ${pendSug.length ? `<span class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-extrabold">${pendSug.length} Pending Approval</span>` : ''}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- LEFT COLUMN: Discovery, Input/Suggestion, Approval Queue & Saved List -->
        <div class="space-y-3 no-print">

          <!-- 1. Easy Recipe Discovery & Input Hub -->
          <div class="kms-card p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-extrabold uppercase tracking-wide text-[#1b365d]">${isMgr ? 'Find or Add Recipes' : 'Find or Suggest a Recipe'}</h2>
              <div class="flex rounded-lg border border-[var(--line)] overflow-hidden text-[11px] font-bold">
                <button type="button" data-rec-input-tab="search" class="px-2.5 py-1 ${discoverTab === 'search' ? 'bg-[#1b365d] text-white' : 'hover:bg-black/5'}">Find Online</button>
                <button type="button" data-rec-input-tab="starters" class="px-2.5 py-1 ${discoverTab === 'starters' ? 'bg-[#1b365d] text-white' : 'hover:bg-black/5'}">Classics</button>
                <button type="button" data-rec-input-tab="manual" class="px-2.5 py-1 ${discoverTab === 'manual' ? 'bg-[#1b365d] text-white' : 'hover:bg-black/5'}">${isMgr ? 'Write / Paste' : 'Suggest'}</button>
              </div>
            </div>

            ${discoverTab === 'search' ? `
              <div class="space-y-2.5">
                <form id="form-search-web-recipes" class="flex gap-1.5">
                  <input id="web-rec-q-inp" name="q" type="text" required value="${esc(state._webRecQuery || '')}" placeholder="Search dishes (e.g. Lasagna, Chili, Chicken)..." class="kms-input flex-1 text-xs" />
                  <button type="submit" id="btn-search-web-rec" class="kms-btn-navy px-3 py-1.5 text-xs shrink-0">Search</button>
                </form>
                <div class="flex flex-wrap items-center gap-1 text-[11px]">
                  <span class="opacity-65 font-semibold">Quick browse:</span>
                  ${['Beef', 'Chicken', 'Pasta', 'Soup', 'Pork', 'Casserole'].map(cat => `
                    <button type="button" data-quick-web-rec="${cat}" class="px-2 py-0.5 rounded-full border border-[var(--line)] hover:bg-[#1b365d] hover:text-white font-semibold transition">${cat}</button>
                  `).join('')}
                </div>
                ${state._webRecQuery ? `
                  <div class="space-y-1.5 pt-1 border-t border-[var(--line)]/60">
                    <div class="flex items-center justify-between text-[11px] opacity-75">
                      <span>Results for "<strong>${esc(state._webRecQuery)}</strong>"</span>
                      <button type="button" id="btn-clear-web-search" class="underline font-semibold">Clear</button>
                    </div>
                    ${!(state._webRecResults || []).length
                      ? '<p class="text-[11px] opacity-75">No matches found — try another keyword or check the <strong>Classics</strong> tab.</p>'
                      : `<div class="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">${(state._webRecResults || []).slice(0, 20).map(m => `
                          <div class="p-2 rounded-lg border border-[var(--line)] flex items-center justify-between gap-2 text-xs">
                            <div class="flex items-center gap-2 min-w-0">
                              ${m.thumb ? `<img src="${esc(m.thumb)}" alt="" class="w-9 h-9 rounded object-cover shrink-0 border border-[var(--line)]" />` : ''}
                              <div class="min-w-0">
                                <div class="font-bold truncate">${esc(m.title)}</div>
                                <div class="text-[10px] opacity-65 truncate">${esc(m.subtitle || 'Main')}</div>
                              </div>
                            </div>
                            <button type="button" data-import-mealdb="${esc(m.uid)}" class="${isMgr ? 'kms-btn-ok' : 'kms-btn-primary'} px-2.5 py-1 text-[11px] font-bold shrink-0">${isMgr ? '+ Import' : 'Suggest'}</button>
                          </div>
                        `).join('')}</div>`}
                  </div>
                ` : ''}
                <form id="form-import-recipe-url" class="flex gap-1.5 pt-2 border-t border-[var(--line)]/60">
                  <input name="url" type="url" required placeholder="Or paste any recipe webpage URL (https://...)" class="kms-input flex-1 text-xs" />
                  <button type="submit" id="btn-import-url" class="kms-btn-alt px-2.5 py-1.5 text-xs font-semibold shrink-0">${isMgr ? 'Import URL' : 'Suggest URL'}</button>
                </form>
              </div>
            ` : discoverTab === 'starters' ? `
              <div class="space-y-1.5">
                <p class="text-[11px] opacity-75">Pre-scaled 65-portion Salvation Army kitchen favorites — 1 click to ${isMgr ? 'add & link to pantry' : 'submit for approval'}:</p>
                <div class="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
                  ${COMMUNITY_KITCHEN_STARTERS.map(st => `
                    <div class="p-2.5 rounded-lg border border-[var(--line)] flex items-center justify-between gap-2 text-xs">
                      <div class="min-w-0">
                        <div class="font-bold truncate">${esc(st.title)}</div>
                        <div class="text-[10px] opacity-70">${esc(st.category)} &bull; ${st.ingredients.length} items &bull; ${st.prep_min + st.cook_min}m</div>
                      </div>
                      <button type="button" data-add-starter-rec="${esc(st.id)}" class="${isMgr ? 'kms-btn-ok' : 'kms-btn-primary'} px-2.5 py-1 text-[11px] font-bold shrink-0">${isMgr ? '+ Add Recipe' : 'Suggest'}</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : (isMgr ? `
              <form id="form-paste-recipe" class="space-y-2">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="opacity-75">Paste or type any recipe (auto-links to Living Stock):</span>
                  <button type="button" id="btn-fill-recipe-template" class="underline font-bold text-[#1b365d]">Fill Sample</button>
                </div>
                <textarea id="paste-recipe-raw" name="raw" rows="6" required placeholder="Recipe Title on Line 1&#10;Servings: 65&#10;12 lbs Ground beef&#10;6 cans Tomato sauce&#10;Directions:&#10;1. Brown beef and drain.&#10;2. Simmer with sauce to >=165°F." class="kms-input w-full text-xs font-mono"></textarea>
                <button type="submit" class="kms-btn-ok w-full py-2 text-xs font-bold">Save &amp; Auto-Link Recipe</button>
              </form>
            ` : `
              <form id="form-suggest-recipe" class="space-y-2">
                <p class="text-[11px] opacity-75">Submit a recipe idea for Management approval and optional placement on the menu calendar.</p>
                <input id="sug-title-inp" name="title" type="text" required placeholder="Recipe name (e.g. Baked Ziti)" class="kms-input w-full text-xs" />
                <div class="grid grid-cols-2 gap-1.5">
                  <div>
                    <label class="block text-[10px] font-bold uppercase opacity-65 mb-0.5">Base Servings</label>
                    <input id="sug-serv-inp" name="servings" type="number" min="1" max="250" value="${predToday}" class="kms-input w-full text-xs" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase opacity-65 mb-0.5">Target Date (Opt.)</label>
                    <input name="targetDate" type="date" class="kms-input w-full text-xs" />
                  </div>
                </div>
                <textarea id="sug-raw-inp" name="raw" rows="5" required placeholder="12 lbs Penne pasta&#10;4 cans Spaghetti sauce&#10;Directions:&#10;1. Boil pasta and bake with sauce at 350°F." class="kms-input w-full text-xs font-mono"></textarea>
                <button type="submit" id="btn-submit-sug" class="kms-btn-primary w-full py-2 text-xs font-bold">Submit Recipe for Approval</button>
              </form>
            `)}
          </div>

          <!-- 2. Pending Recipe Approval Queue -->
          ${pendSug.length ? `
            <div class="kms-card p-4 space-y-2.5 border-l-4 border-l-amber-500">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-extrabold uppercase tracking-wide text-amber-800">Pending Recipe Approvals (${pendSug.length})</h3>
                <span class="tag tag-LOW">Needs Review</span>
              </div>
              ${pendSug.map(s => {
                const pr = s.parsed_recipe ? normalizeRecipe(s.parsed_recipe) : null;
                return `
                <div class="p-2.5 rounded-lg border border-[var(--line)] bg-amber-50/30 text-xs space-y-2">
                  <div class="flex items-start gap-2">
                    ${pr && pr.photo_url ? `<img src="${esc(pr.photo_url)}" alt="${esc(s.title)}" class="w-11 h-11 rounded-lg object-cover border border-[var(--line)] shrink-0" />` : ''}
                    <div class="min-w-0 flex-1">
                      <div class="font-bold text-sm leading-snug">${esc(s.title)}</div>
                      <div class="text-[11px] opacity-75">By <strong>${esc(s.suggested_by)}</strong> &bull; Base ${s.servings || 65} port.${s.target_date ? ` &bull; Target: <strong>${dLabel(s.target_date)}</strong>` : ''}</div>
                    </div>
                  </div>
                  ${pr && (pr.ingredients || []).length ? `
                    <div class="p-2 rounded bg-black/5 space-y-1 text-[11px]">
                      <div class="font-bold uppercase opacity-65">Ingredients (${pr.ingredients.length}) &bull; ${(pr.steps || []).length} Step(s)</div>
                      <ul class="space-y-0.5">${pr.ingredients.slice(0, 6).map(g => `<li>&bull; <strong>${esc(formatKitchenAmt(g.qty, g.unit))}</strong> ${esc(g.name)}</li>`).join('')}${pr.ingredients.length > 6 ? `<li class="opacity-65">+ ${pr.ingredients.length - 6} more...</li>` : ''}</ul>
                    </div>
                  ` : `<p class="text-[11px] opacity-85 whitespace-pre-line">${esc(s.raw)}</p>`}
                  ${isMgr ? `
                    <div class="flex flex-wrap gap-1.5 pt-0.5">
                      <button type="button" data-approve-recsug="${s.id}" class="kms-btn-ok px-2.5 py-1 text-[11px] font-bold">Approve &amp; Auto-Link</button>
                      <button type="button" data-review-recsug="${s.id}" class="kms-btn-navy px-2.5 py-1 text-[11px]">Review / Edit</button>
                      <button type="button" data-reject-recsug="${s.id}" class="kms-btn-alt px-2 py-1 text-[11px]">Reject</button>
                    </div>
                  ` : '<span class="tag tag-LOW">Awaiting Management Approval</span>'}
                </div>
              `; }).join('')}
            </div>
          ` : ''}

          <!-- 3. Saved Recipe Book -->
          <div class="kms-card p-4 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-bold">Saved Recipe Book (${state.recipes.length})</h3>
              <div class="flex items-center gap-1.5">
                ${isMgr ? `<button type="button" id="btn-bulk-recipes" class="kms-btn-alt px-2.5 py-1 text-xs">Bulk Edit</button>` : ''}
                <button type="button" id="btn-scan-recipe-qr" class="kms-btn-navy px-2.5 py-1 text-xs">Scan QR</button>
              </div>
            </div>
            <input id="rec-search-inp" type="text" value="${esc(state._recSearch || '')}" placeholder="Filter saved recipes by name or category..." class="kms-input w-full text-xs" />
            <div id="rec-qr-wrap" class="hidden border border-[var(--line)] rounded-lg p-2 bg-black/5">
              <div id="rec-qr-reader" class="w-full"></div>
              <button type="button" id="btn-stop-recipe-qr" class="kms-btn-alt w-full py-1 text-xs mt-1.5">Stop Camera</button>
            </div>
            <div class="space-y-1.5 max-h-96 overflow-y-auto">
              ${!filteredRecs.length ? '<p class="text-xs opacity-65 py-2 text-center">No matching recipes.</p>' : filteredRecs.map(r => {
                const linkedCount = (r.ingredients || []).filter(g => g.inv_id).length;
                const totalIngs = (r.ingredients || []).length;
                return `
                <button type="button" data-sel-rec="${r.id}" class="w-full text-left p-2.5 rounded-lg border text-xs ${rec && r.id === rec.id ? 'border-[#b3122b] bg-[#b3122b]/10 font-bold' : 'border-[var(--line)] hover:bg-black/5'}">
                  <div class="flex items-center justify-between gap-1">
                    <span class="truncate">${esc(r.name)}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded ${linkedCount === totalIngs && totalIngs > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-black/10 opacity-75'} shrink-0">${linkedCount}/${totalIngs} linked</span>
                  </div>
                  <div class="opacity-65 font-normal mt-0.5">${esc(r.category)} &bull; Base ${r.base_servings} servings</div>
                </button>
              `; }).join('')}
            </div>
          </div>
        </div>

        <!-- RIGHT 2 COLUMNS: Active Recipe Card & Forecast-Driven Scaler -->
        <div class="lg:col-span-2 kms-card p-4 space-y-4">
          ${!rec ? '<p class="text-sm opacity-70">Select or add a recipe from the left panel.</p>' : `
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
                ${isMgr ? `<button type="button" data-autolink-rec="${rec.id}" class="kms-btn-ok px-3 py-1 text-xs font-bold" title="Match ingredients to Living Stock for automatic BOM deduction">Auto-Link Pantry</button>` : ''}
                <button type="button" id="btn-toggle-rec-matrix" class="kms-btn-alt px-3 py-1 text-xs">${showMatrix ? 'Single Scale View' : '40–80 Quick-Scan Table'}</button>
                <button type="button" id="btn-print-recipe-sheet" class="kms-btn-navy px-3 py-1 text-xs">Print Recipe + QR</button>
                ${isMgr ? `<button type="button" data-edit-rec="${rec.id}" class="kms-btn-alt px-3 py-1 text-xs">Edit</button><button type="button" data-del-rec="${rec.id}" class="kms-btn-alt px-3 py-1 text-xs">Delete</button>` : ''}
              </div>
            </div>

            <!-- FORECAST-DRIVEN PORTION SCALER -->
            <div class="bg-[#1b365d]/5 border border-[#1b365d]/20 p-3.5 rounded-xl space-y-2.5 text-xs">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="text-[11px] font-extrabold uppercase tracking-wider text-[#1b365d]">Forecast-Driven Portion Scaler</div>
                  <div class="text-[11px] opacity-75">Tap any upcoming service day below to scale this recipe to the exact forecasted headcount.</div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <label class="font-bold">Target Yield: <input id="rec-scale-inp" type="number" min="1" max="250" value="${scale}" class="kms-input w-20 text-center font-black text-[#b3122b] ml-1" /> port.</label>
                  <label class="font-bold opacity-80">Base: <input id="rec-base-inp" type="number" min="1" value="${rec.base_servings}" data-rec-base="${rec.id}" ${!isMgr ? 'disabled' : ''} class="kms-input w-16 text-center font-bold ml-1" /></label>
                </div>
              </div>

              <!-- Upcoming Service Days Forecast Strip -->
              <div class="flex flex-wrap gap-1.5 no-print">
                ${upcomingServiceDays.map(d => {
                  const isSelected = state._recTargetDate === d.ds || (!state._recTargetDate && d.ds === today && scale === d.portions);
                  return `
                    <button type="button" data-rec-forecast-day="${d.ds}:${d.portions}:${esc(d.recipeId)}" class="px-2.5 py-1.5 rounded-lg border text-left transition ${isSelected ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white border-[var(--line)] hover:border-emerald-600'}">
                      <div class="font-extrabold text-[11px]">${esc(d.label)}: ${d.portions} Portions</div>
                      <div class="text-[10px] ${isSelected ? 'text-emerald-100' : 'opacity-70'} truncate max-w-[155px]">${esc(d.mealName)}</div>
                    </button>
                  `;
                }).join('')}
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/60 no-print">
                <div class="flex flex-wrap gap-1">
                  ${[40, 45, 50, 55, 60, 65, 70, 75, 80].map(p => `
                    <button type="button" data-rec-preset="${p}" class="px-2 py-0.5 rounded font-semibold border ${scale === p ? 'bg-[#b3122b] text-white border-[#b3122b]' : 'kms-btn-alt'}">${p}</button>
                  `).join('')}
                </div>
                <span class="text-[11px] font-bold text-[#1b365d]">Scale Factor: ${factor.toFixed(2)}x base</span>
              </div>
              <input id="rec-scale-slider" type="range" min="40" max="80" step="1" value="${Math.min(80, Math.max(40, scale))}" class="w-full accent-[#b3122b] no-print" />
            </div>

            ${showMatrix ? `
              <div class="overflow-x-auto border border-[var(--line)] rounded-lg">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-[var(--line)] bg-black/5 uppercase">
                      <th class="p-2">Ingredient</th>
                      ${Array.from(new Set([40, 50, scale, 70, 80])).sort((a, b) => a - b).map(p => `<th class="p-2 text-center ${scale === p ? 'text-[#b3122b] font-bold' : ''}">${p} Port.${p === scale ? ' ★' : ''}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--line)]">
                    ${(rec.ingredients || []).map(g => `
                      <tr>
                        <td class="p-2 font-bold">${esc(g.name)}</td>
                        ${Array.from(new Set([40, 50, scale, 70, 80])).sort((a, b) => a - b).map(p => {
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
                    ${invItem && deductAtScale ? `<div class="text-[11px] opacity-65 no-print">Pantry BOM link: deducts ~${deductAtScale} ${esc(invItem.unit)} of <strong>${esc(invItem.name)}</strong> (On hand: ${invItem.on_hand} ${esc(invItem.unit)}) at ${scale} portions</div>` : ''}
                    ${isMgr ? `
                      <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--line)]/60 opacity-85 no-print">
                        <input type="text" value="${esc(g.name)}" data-rec-ing="${rec.id}:${i}:name" class="kms-input w-36 text-xs font-semibold" title="Ingredient name" /><span class="font-semibold">Base (${rec.base_servings}):</span>
                        <input type="number" step="0.25" min="0" value="${g.qty || 0}" data-rec-ing="${rec.id}:${i}:qty" class="kms-input w-16 text-xs text-center" title="Kitchen amount at base servings" />
                        <select data-rec-ing="${rec.id}:${i}:unit" class="kms-input text-xs">${unitOpts.map(u => `<option value="${esc(u)}" ${normUnit(g.unit) === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
                        <span>&rarr; Stock:</span>
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
                ${isMgr ? `
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
