// Supabase Edge Function: scrape-recipe
// Deploy in Supabase Dashboard -> Edge Functions -> Create a new function named "scrape-recipe"
// Free tier: included in Supabase Free plan (up to 500,000 invocations/month, no extra API keys needed).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeEntities(str: string): string {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const target = String(url || "").trim();
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

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SalvationArmyKMS/1.0; +https://supabase.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Site returned HTTP ${res.status}` }), {
        status: 502,
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
