// Supabase Edge Function: scrape-recipe
// Deploy in Supabase Dashboard -> Edge Functions -> Create a new function named "scrape-recipe"
// Supports both:
//   1) POST { "query": "meatloaf" } -> searches Budget Bytes, Skinnytaste, Sally's Baking Addiction, TheMealDB, and DummyJSON
//   2) POST { "url": "https://..." } -> scrapes Schema.org Recipe JSON-LD (with automatic reader-proxy fallback for 403-protected sites)
// Free tier: included in Supabase Free plan (up to 500,000 invocations/month, no extra API keys needed).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function decodeEntities(str: string): string {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIsoMinutes(iso: unknown): number {
  const s = String(iso || "");
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (Number(m[1] || 0) * 60) + Number(m[2] || 0);
}

function parseYieldNumber(y: unknown): number {
  const raw = Array.isArray(y) ? String(y[0] || "") : String(y || "");
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  return m ? Math.max(1, Math.round(Number(m[1]))) : 8;
}

function extractSteps(inst: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      const clean = decodeEntities(node);
      if (clean) out.push(clean);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (obj.itemListElement) walk(obj.itemListElement);
      else if (obj.text) walk(obj.text);
      else if (obj.name && !obj.itemListElement) walk(obj.name);
    }
  };
  walk(inst);
  return out;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.some((x) => String(x || "").toLowerCase() === "recipe")) return obj;
    if (obj["@graph"]) {
      const found = findRecipeNode(obj["@graph"]);
      if (found) return found;
    }
  }
  return null;
}

async function fetchJsonSafe(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseMarkdownRecipe(md: string, sourceUrl: string) {
  const lines = String(md || "").split(/\r?\n/).map((l) => l.trim());
  let name = "";
  let baseServings = 4;
  const ingredients: string[] = [];
  const steps: string[] = [];
  let mode: "none" | "ing" | "step" = "none";

  for (const rawLine of lines) {
    if (!rawLine) continue;
    const titleMeta = rawLine.match(/^Title:\s*(.+)$/i);
    if (titleMeta && !name) {
      name = titleMeta[1].replace(/\s*[-|].*(Food Network|Allrecipes|Recipe).*$/i, "").trim();
      continue;
    }
    if (!name && /^#\s+/.test(rawLine)) {
      name = rawLine.replace(/^#+\s*/, "").trim();
      continue;
    }
    const yieldMatch = rawLine.match(/^(?:Yield|Servings|Serves)\s*:?\s*(\d+)/i);
    if (yieldMatch) {
      baseServings = Math.max(1, Number(yieldMatch[1]));
      continue;
    }
    if (/^#{1,4}\s*Ingredients\b|^Ingredients\s*:?$/i.test(rawLine)) {
      mode = "ing";
      continue;
    }
    if (/^#{1,4}\s*(?:Directions|Instructions|Method|Preparation|Steps)\b|^(?:Directions|Instructions|Method|Preparation)\s*:?$/i.test(rawLine)) {
      mode = "step";
      continue;
    }
    if (/^#{1,4}\s*(?:Nutrition|Reviews|Shop|Related|More|Video|Cook's Note|Notes|Equipment)\b/i.test(rawLine)) {
      if (mode !== "none" && ingredients.length && steps.length) break;
      mode = "none";
      continue;
    }

    const clean = rawLine.replace(/^[-*•\[\]xX\s]+(?=[A-Za-z0-9¼½¾⅓⅔⅛])/, "").replace(/^\*+|\*+$/g, "").trim();
    if (!clean || /^(Deselect All|Select All|Get Ingredients|Add to Shopping List|View Shopping List|Save Recipe|Print|Email)$/i.test(clean)) continue;
    if (/^!\[|^\[.*\]\(http/.test(rawLine)) continue;

    if (mode === "ing") {
      if (clean.length < 180) ingredients.push(clean);
    } else if (mode === "step") {
      const stepTxt = clean.replace(/^\d+[\.\)]\s*/, "").trim();
      if (stepTxt.length > 8) steps.push(stepTxt);
    }
  }

  if (!ingredients.length) return null;
  return {
    name: name || "Imported Recipe",
    category: "Main Entree",
    base_servings: baseServings,
    prep_min: 20,
    cook_min: 35,
    ingredients,
    steps,
    source_url: sourceUrl,
  };
}

async function fetchViaReaderFallback(targetUrl: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(`https://r.jina.ai/${targetUrl}`, {
      headers: { "Accept": "text/plain" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    return parseMarkdownRecipe(text, targetUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchAllRecipeSources(query: string) {
  const q = encodeURIComponent(query);
  const wpSites = [
    { name: "Budget Bytes", base: "https://www.budgetbytes.com/wp-json/wp/v2/posts?per_page=8&search=" },
    { name: "Skinnytaste", base: "https://www.skinnytaste.com/wp-json/wp/v2/posts?per_page=6&search=" },
    { name: "Sally's Baking", base: "https://sallysbakingaddiction.com/wp-json/wp/v2/posts?per_page=6&search=" },
  ];

  const [mdb, dj, ...wpResults] = await Promise.all([
    fetchJsonSafe(`https://www.themealdb.com/api/json/v1/1/search.php?s=${q}`),
    fetchJsonSafe(`https://dummyjson.com/recipes/search?q=${q}`),
    ...wpSites.map((s) => fetchJsonSafe(s.base + q)),
  ]);

  const results: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  wpSites.forEach((site, idx) => {
    const posts = wpResults[idx];
    if (!Array.isArray(posts)) return;
    posts.forEach((p: Record<string, unknown>) => {
      const titleObj = p.title as Record<string, unknown> | undefined;
      const title = decodeEntities(String(titleObj?.rendered || ""));
      const link = String(p.link || "");
      const key = title.toLowerCase();
      if (!title || !link || seen.has(key)) return;
      seen.add(key);
      results.push({
        uid: `wp-${site.name.toLowerCase().replace(/[^a-z]/g, "")}-${p.id}`,
        type: "url",
        title,
        subtitle: site.name,
        url: link,
      });
    });
  });

  if (mdb && Array.isArray(mdb.meals)) {
    mdb.meals.forEach((m: Record<string, unknown>) => {
      const title = String(m.strMeal || "").trim();
      const key = title.toLowerCase();
      if (!title || seen.has(key)) return;
      seen.add(key);
      const rawLines: string[] = [];
      for (let k = 1; k <= 20; k++) {
        const ing = String(m["strIngredient" + k] || "").trim();
        const meas = String(m["strMeasure" + k] || "").trim();
        if (ing) rawLines.push((meas ? meas + " " : "") + ing);
      }
      results.push({
        uid: "mdb-" + m.idMeal,
        type: "direct",
        title,
        category: String(m.strCategory || "Main Entree"),
        subtitle: `TheMealDB · ${m.strCategory || "Main"}${m.strArea ? " · " + m.strArea : ""}`,
        base_servings: 4,
        prep_min: 20,
        cook_min: 35,
        rawLines,
        steps: String(m.strInstructions || "").split(/\r?\n+/).map((s) => s.trim()).filter(Boolean),
      });
    });
  }

  if (dj && Array.isArray(dj.recipes)) {
    dj.recipes.forEach((d: Record<string, unknown>) => {
      const title = String(d.name || "").trim();
      const key = title.toLowerCase();
      if (!title || seen.has(key)) return;
      seen.add(key);
      const mealType = Array.isArray(d.mealType) && d.mealType[0] ? String(d.mealType[0]) : "Main Entree";
      results.push({
        uid: "dj-" + d.id,
        type: "direct",
        title,
        category: mealType,
        subtitle: `Open Recipe · ${d.cuisine || "Classic"}${d.servings ? " · Serves " + d.servings : ""}`,
        base_servings: Number(d.servings) || 4,
        prep_min: Number(d.prepTimeMinutes) || 20,
        cook_min: Number(d.cookTimeMinutes) || 35,
        rawLines: Array.isArray(d.ingredients) ? d.ingredients : [],
        steps: Array.isArray(d.instructions) ? d.instructions : [],
      });
    });
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = String(body?.query || "").trim();
    if (query) {
      const results = await searchAllRecipeSources(query);
      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = String(body?.url || "").trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: "Only http/https URLs are supported" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(parsedUrl.toString(), { headers: BROWSER_HEADERS });
    if (!res.ok) {
      if ([401, 403, 429].includes(res.status)) {
        const fallbackRecipe = await fetchViaReaderFallback(parsedUrl.toString());
        if (fallbackRecipe) {
          return new Response(JSON.stringify({ ok: true, recipe: fallbackRecipe }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const msg = res.status === 403
        ? `${parsedUrl.hostname} blocks automated imports (HTTP 403). Copy & paste the recipe text into "Add / Paste a Recipe" below.`
        : `${parsedUrl.hostname} returned HTTP ${res.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: res.status === 403 ? 403 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await res.text();
    const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    let recipeObj: Record<string, unknown> | null = null;
    for (const m of ldMatches) {
      try {
        const json = JSON.parse(m[1].trim());
        recipeObj = findRecipeNode(json);
        if (recipeObj) break;
      } catch {
        // Skip malformed JSON-LD blocks
      }
    }

    if (!recipeObj) {
      const fallbackRecipe = await fetchViaReaderFallback(parsedUrl.toString());
      if (fallbackRecipe) {
        return new Response(JSON.stringify({ ok: true, recipe: fallbackRecipe }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "No structured Recipe data found on that page. Copy and paste the recipe text instead." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawIngs = Array.isArray(recipeObj.recipeIngredient) ? recipeObj.recipeIngredient : [];
    const ingredients = rawIngs.map((x) => decodeEntities(String(x || ""))).filter(Boolean);
    const steps = extractSteps(recipeObj.recipeInstructions);
    const catRaw = Array.isArray(recipeObj.recipeCategory) ? recipeObj.recipeCategory[0] : recipeObj.recipeCategory;

    return new Response(JSON.stringify({
      ok: true,
      recipe: {
        name: decodeEntities(String(recipeObj.name || "Imported Recipe")),
        category: decodeEntities(String(catRaw || "Main Entree")) || "Main Entree",
        base_servings: parseYieldNumber(recipeObj.recipeYield),
        prep_min: parseIsoMinutes(recipeObj.prepTime) || 20,
        cook_min: parseIsoMinutes(recipeObj.cookTime) || 35,
        ingredients,
        steps,
        image: (() => {
          const im = recipeObj.image;
          if (typeof im === "string") return im;
          if (Array.isArray(im) && im[0]) return typeof im[0] === "string" ? im[0] : String((im[0] as Record<string, unknown>)?.url || "");
          if (im && typeof im === "object") return String((im as Record<string, unknown>).url || "");
          return "";
        })(),
        source_url: parsedUrl.toString(),
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});