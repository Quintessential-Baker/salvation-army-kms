// Supabase Edge Function: notify-alert
// Deploy in Supabase Dashboard -> Edge Functions -> Create a new function named "notify-alert"
// Secrets (Edge Functions -> Secrets): RESEND_API_KEY = re_xxxxxxxxx
//   Optional: FROM_EMAIL = "Salvation Army KMS <onboarding@resend.dev>"
//   Optional: ALLOWED_ORIGIN = https://YOUR-USER.github.io

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ") || !SB_URL || !SB_ANON) return false;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: auth } });
    if (!r.ok) return false;
    const u = await r.json();
    return !!(u && u.id);
  } catch {
    return false;
  }
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function knownEmails(): Promise<Set<string>> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const r = await fetch(`${SB_URL}/rest/v1/kms_users?select=email&active=eq.true`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) return new Set();
  const rows = await r.json();
  return new Set((rows as Array<{ email?: string }>).map((x) => String(x.email || "").trim().toLowerCase()).filter(Boolean));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isSignedIn(req))) return json({ error: "Sign in required" }, 401);

  try {
    const { to, subject, text } = await req.json();
    const asked = (Array.isArray(to) ? to : [to]).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);
    if (!asked.length || !subject || !text) return json({ error: "Missing to, subject, or text" }, 400);
    if (asked.length > 25 || String(subject).length > 200 || String(text).length > 5000) {
      return json({ error: "Message too large" }, 400);
    }

    const allowed = await knownEmails();
    const recipients = asked.filter((e) => allowed.has(e));
    if (!recipients.length) return json({ error: "No recipients match active KMS user e-mail addresses" }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY secret not configured" }, 500);
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Salvation Army KMS <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: recipients, subject: String(subject), text: String(text) }),
    });
    const data = await res.json();
    return json({ ok: res.ok, sent: recipients.length, data }, res.ok ? 200 : res.status);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});