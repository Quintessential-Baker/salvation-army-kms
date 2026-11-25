// supabase/functions/notify-alert/index.ts — Background Email Notification Edge Function

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, text } = await req.json();
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [];
    if (!recipients.length || !subject || !text) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing recipients, subject, or text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "RESEND_API_KEY secret not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Salvation Army Butler KMS <onboarding@resend.dev>",
        to: recipients,
        subject,
        text,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ ok: res.ok, data }),
      { status: res.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});