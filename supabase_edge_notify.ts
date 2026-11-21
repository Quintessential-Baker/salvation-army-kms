// Supabase Edge Function: notify-alert
// Deploy in Supabase Dashboard -> Edge Functions -> Create a new function named "notify-alert"
// Set secret in Supabase Dashboard -> Edge Functions -> Secrets: RESEND_API_KEY = re_xxxxxxxxx
// Optional secret: FROM_EMAIL = "Salvation Army KMS <onboarding@resend.dev>" (or your verified domain)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, text } = await req.json();
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!recipients.length || !subject || !text) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = Deno.env.get("FROM_EMAIL") || "Salvation Army KMS <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        text,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
