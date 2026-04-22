import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT = "samyos3560@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const name = (body.name ?? "").toString().slice(0, 100).trim();
    const email = (body.email ?? "").toString().slice(0, 255).trim();
    const rating = Number(body.rating);
    const comment = (body.comment ?? "").toString().slice(0, 1000).trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "Invalid rating" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Persist
    const { error: dbErr } = await supabase.from("visitor_feedback").insert({
      name: name || null,
      email: email || null,
      rating,
      comment: comment || null,
    });
    if (dbErr) console.error("DB insert error:", dbErr);

    // Email via Resend gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (LOVABLE_API_KEY && RESEND_API_KEY) {
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;color:#111;">
          <h2 style="color:#FF7A1A;margin:0 0 16px;">New Zebra Visitor Feedback</h2>
          <p style="font-size:24px;margin:0 0 12px;color:#FF7A1A;">${stars} <span style="color:#666;font-size:14px;">(${rating}/5)</span></p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#666;width:120px;">Name</td><td style="padding:6px 0;"><strong>${escapeHtml(name) || "Anonymous"}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;">${escapeHtml(email) || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#666;vertical-align:top;">Comment</td><td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(comment) || "—"}</td></tr>
          </table>
          <p style="font-size:12px;color:#888;margin-top:24px;">Sent from zebra-bp.lovable.app</p>
        </div>`;

      const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "Zebra Feedback <onboarding@resend.dev>",
          to: [RECIPIENT],
          subject: `New visitor feedback — ${rating}/5 stars`,
          html,
          reply_to: email || undefined,
        }),
      });

      if (!emailRes.ok) {
        const t = await emailRes.text();
        console.error("Resend error:", emailRes.status, t);
      }
    } else {
      console.warn("Missing LOVABLE_API_KEY or RESEND_API_KEY — feedback saved but email not sent");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-feedback error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
