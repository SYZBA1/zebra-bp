import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: [text], model: "voyage-3", input_type: "query" }),
  });
  if (!resp.ok) throw new Error(`Voyage embed error ${resp.status}`);
  const data = await resp.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessName, sector, language, answers, projectId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: get user from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUserClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Retrieve context from knowledge base
    let knowledge = "";
    if (VOYAGE_API_KEY) {
      try {
        const supabaseSvc = createClient(SUPABASE_URL, SERVICE_ROLE);
        const summary = Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join("; ");
        const embedding = await embedQuery(`Business health diagnosis for ${sector}: ${summary}`, VOYAGE_API_KEY);
        const { data } = await supabaseSvc.rpc("match_knowledge", {
          query_embedding: embedding as any,
          match_count: 6,
          filter_language: language,
        });
        if (data?.length) {
          knowledge = data.map((r: any, i: number) => `[Ref ${i + 1}] ${r.content}`).join("\n\n---\n\n");
        }
      } catch (e) { console.error("retrieval failed:", e); }
    }

    const langLine = language === "am"
      ? "Respond entirely in Amharic (አማርኛ). Use proper Ethiopian business terminology."
      : "Respond in professional English.";

    const systemPrompt = `You are the Zebra Business Intelligence Engine running the Business Health Diagnostic.

Apply the 6-pillar framework (Market, Technical, Financial, Organizational, Legal, Schedule). Use Ethiopian context (Telebirr, CBE, Awash, Chapa, local regulations).

${knowledge ? `RELEVANT KNOWLEDGE (apply, do not quote):\n${knowledge}\n\n` : ""}

Analyze the entrepreneur's diagnostic answers, identify gaps (where they ARE vs where they SHOULD BE), score each pillar 0-100, give an overall score and rating, and propose 3 actionable solutions per gap.

${langLine}

Return STRICTLY valid JSON via the diagnose tool. No prose outside the tool call.`;

    const userPrompt = `Business: ${businessName}
Sector: ${sector}
Diagnostic answers:
${Object.entries(answers).map(([q, a]) => `- ${q}\n  Answer: ${a}`).join("\n")}`;

    const tools = [{
      type: "function",
      function: {
        name: "diagnose",
        description: "Return structured business health diagnosis.",
        parameters: {
          type: "object",
          properties: {
            overall_score: { type: "integer", minimum: 0, maximum: 100 },
            rating: { type: "string", description: "One of: Critical, At Risk, Stable, Healthy, Thriving" },
            summary: { type: "string", description: "2-4 sentence executive summary" },
            pillar_scores: {
              type: "object",
              properties: {
                Market: { type: "integer", minimum: 0, maximum: 100 },
                Technical: { type: "integer", minimum: 0, maximum: 100 },
                Financial: { type: "integer", minimum: 0, maximum: 100 },
                Organizational: { type: "integer", minimum: 0, maximum: 100 },
                Legal: { type: "integer", minimum: 0, maximum: 100 },
                Strategic: { type: "integer", minimum: 0, maximum: 100 },
              },
              required: ["Market", "Technical", "Financial", "Organizational", "Legal", "Strategic"],
              additionalProperties: false,
            },
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pillar: { type: "string" },
                  title: { type: "string" },
                  current_state: { type: "string" },
                  target_state: { type: "string" },
                  severity: { type: "string", description: "low | medium | high" },
                  solutions: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    items: { type: "string" },
                  },
                },
                required: ["pillar", "title", "current_state", "target_state", "severity", "solutions"],
                additionalProperties: false,
              },
            },
          },
          required: ["overall_score", "rating", "summary", "pillar_scores", "gaps"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "diagnose" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error:", aiResp.status, text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(aiJson).slice(0, 500));
      return new Response(JSON.stringify({ error: "Diagnostic could not be structured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = JSON.parse(toolCall.function.arguments);

    // Persist
    const supabaseSvc = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: assessment, error: insErr } = await supabaseSvc
      .from("health_assessments")
      .insert({
        user_id: user.id,
        project_id: projectId ?? null,
        business_name: businessName,
        sector,
        language,
        answers,
        overall_score: result.overall_score,
        rating: result.rating,
        pillar_scores: result.pillar_scores,
        gaps: result.gaps,
        solutions: result.gaps.flatMap((g: any) => g.solutions),
        summary: result.summary,
      })
      .select()
      .single();
    if (insErr) console.error("Save assessment error:", insErr);

    return new Response(JSON.stringify({ ok: true, assessment_id: assessment?.id, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("health-diagnose error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
