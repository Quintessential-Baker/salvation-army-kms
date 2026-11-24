// supabase/functions/scrape-recipe/index.ts — Online Recipe Search & Schema.org JSON-LD URL Scraper

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseIsoMinutes(iso: unknown): number {
  const s = String(iso || "");
  const h = s.match(/(\d+)H/i);
  const m = s.match(/(\d+)M/i);
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function extractJsonLdRecipe(html: string) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
        const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        if (types.some((t) => String(t || "").toLowerCase() === "recipe")) {
          const rawYield = Array.isArray(node.recipeYield) ? node.recipeYield[0] : node.recipeYield;
          const servMatch = String(rawYield || "").match(/(\d+)/);
          const ingredients = Array.isArray(node.recipeIngredient)
            ? node.recipeIngredient.map((x: unknown) => String(x || "").trim()).filter(Boolean)
            : [];
          const rawInst = Array.isArray(node.recipeInstructions)
            ? node.recipeInstructions
            : typeof node.recipeInstructions === "string"
            ? node.recipeInstructions.split(/\r?\n+/)
            : [];
          const steps = rawInst
            .map((st: unknown) => (typeof st === "string" ? st : (st as Record<string, unknown>)?.text || ""))
            .map((s: unknown) => String(s).replace(/<[^>]+>/g, "").trim())
            .filter(Boolean);
          const imgVal = Array.isArray(node.image) ? node.image[0] : node.image;
          const image = typeof imgVal === "string" ? imgVal : (imgVal as Record<string, unknown>)?.url || "";

          if (ingredients.length) {
            return {
              name: String(node.name || "Imported Recipe").trim(),
              category: "Main Entree",
              base_servings: servMatch ? Math.max(1, parseInt(servMatch[1], 10)) : 8,
              prep_min: parseIsoMinutes(node.prepTime) || 20,
              cook_min: parseIsoMinutes(node.cookTime) || 35,
              image: String(image || ""),
              ingredients,
              steps,
            };
          }
        }
      }
    } catch (_) {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.url) {
      const res = await fetch(String(body.url), {
        headers: { "User-Agent": "Mozilla/5.0 (SalvationArmyButlerKMS)" },
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: `Failed to load URL (HTTP ${res.status})` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const html = await res.text();
      const recipe = extractJsonLdRecipe(html);
      if (!recipe) {
        return new Response(
          JSON.stringify({ ok: false, error: "No structured recipe data found on that URL." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ ok: true, recipe }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.query) {
      const q = encodeURIComponent(String(body.query).trim());
      const [mdbRes, djRes] = await Promise.allSettled([
        fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${q}`).then((r) => r.json()),
        fetch(`https://dummyjson.com/recipes/search?q=${q}`).then((r) => r.json()),
      ]);
      const results: Record<string, unknown>[] = [];
      const seen = new Set<string>();

      if (mdbRes.status === "fulfilled" && Array.isArray(mdbRes.value.meals)) {
        for (const m of mdbRes.value.meals) {
          const key = String(m.strMeal || "").toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const rawLines: string[] = [];
          for (let k = 1; k <= 20; k++) {
            const ing = String(m[`strIngredient${k}`] || "").trim();
            const meas = String(m[`strMeasure${k}`] || "").trim();
            if (ing) rawLines.push((meas ? `${meas} ` : "") + ing);
          }
          results.push({
            uid: `mdb-${m.idMeal}`,
            type: "direct",
            title: m.strMeal,
            category: m.strCategory || "Main Entree",
            subtitle: `TheMealDB · ${m.strCategory || "Main"}${m.strArea ? ` · ${m.strArea}` : ""}`,
            base_servings: 4,
            prep_min: 20,
            cook_min: 35,
            rawLines,
            steps: String(m.strInstructions || "").split(/\r?\n+/).map((s) => s.trim()).filter(Boolean),
          });
        }
      }

      if (djRes.status === "fulfilled" && Array.isArray(djRes.value.recipes)) {
        for (const d of djRes.value.recipes) {
          const key = String(d.name || "").toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          results.push({
            uid: `dj-${d.id}`,
            type: "direct",
            title: d.name,
            category: (Array.isArray(d.mealType) && d.mealType[0]) || "Main Entree",
            subtitle: `Open Recipe · ${d.cuisine || "Classic"}${d.servings ? ` · Serves ${d.servings}` : ""}`,
            base_servings: Number(d.servings) || 4,
            prep_min: Number(d.prepTimeMinutes) || 20,
            cook_min: Number(d.cookTimeMinutes) || 35,
            photo_url: d.image || "",
            rawLines: Array.isArray(d.ingredients) ? d.ingredients : [],
            steps: Array.isArray(d.instructions) ? d.instructions : [],
          });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "Provide a recipe query or URL" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});