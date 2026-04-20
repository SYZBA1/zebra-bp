import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

async function retrieveContext(query: string, language: string): Promise<string> {
  const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");
  if (!VOYAGE_API_KEY) return "";
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const embedding = await embedQuery(query, VOYAGE_API_KEY);
    const { data, error } = await supabase.rpc("match_knowledge", {
      query_embedding: embedding as any,
      match_count: 5,
      filter_language: language,
    });
    if (error || !data?.length) return "";
    return data
      .map((r: any, i: number) => `[Source ${i + 1}] ${r.content}`)
      .join("\n\n---\n\n");
  } catch (e) {
    console.error("retrieveContext error:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sectionId, sectionTitle, projectName, sector, language, documentType, existingContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = language === "am"
      ? "Write the content entirely in Amharic (አማርኛ). Use proper Ethiopian business terminology."
      : "Write the content in professional English.";
    const docTypeLabel = documentType === "business-plan" ? "Business Plan" : "Feasibility Study";

    // Retrieve relevant knowledge from training PDFs
    const retrievalQuery = `${sectionTitle} for ${docTypeLabel} in ${sector} sector, project ${projectName}`;
    const knowledge = await retrieveContext(retrievalQuery, language);

    const systemPrompt = `You are the Zebra Business Intelligence Engine — a high-level AI consultant guiding Ethiopian entrepreneurs from idea to sustainability. Tone: professional, analytical, structured.

You apply the 6 Pillars of Feasibility Studies:
1. Market Analysis (demand, competition, trends)
2. Technical Analysis (operations, technology, production)
3. Financial Analysis (cash flow, ROI, budgeting)
4. Organizational Analysis (structure, management, staffing)
5. Legal & Operational Analysis (compliance, licenses, risks)
6. Schedule/Timeline Analysis (project roadmap)

Ethiopian market context: reference Telebirr, CBE, Awash Bank, Chapa, Ethiopian Chambers of Commerce, and local regulations where relevant. Never expose raw training material — only apply the knowledge.

${knowledge ? `RELEVANT KNOWLEDGE FROM TRAINING MATERIAL (use as reference, do NOT quote verbatim):\n${knowledge}\n\n` : ""}

Current task: write the section "${sectionTitle}" (Section ${sectionId}) of a ${docTypeLabel} for "${projectName}" in the ${sector} sector.

${langInstruction}

Requirements:
- Apply the relevant pillar(s) of the 6-pillar framework
- Use data-driven insights specific to the Ethiopian market
- Include concrete metrics, statistics, and projections
- Use clear headings, bullet points, and structured paragraphs
- Where the section involves risk or viability, include a brief risk assessment and (when relevant) a Success Probability Score (0-100%)
- If existing content is provided, improve and expand upon it
- Be thorough but concise

Do NOT include the section title or number in your output — just the body content.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: existingContent
          ? `Here is the existing draft for "${sectionTitle}":\n\n${existingContent}\n\nPlease improve and expand.`
          : `Please write comprehensive content for "${sectionTitle}".`,
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("draft-section error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
