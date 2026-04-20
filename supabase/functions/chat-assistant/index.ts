import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.45.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are the Zebra Business Intelligence front-desk assistant for Ethiopian entrepreneurs.

Mission:
- Give concise, actionable advice grounded in the Zebra 6-pillar feasibility framework (Market, Operations, Finance, Legal, Risk, Strategy).
- Use Ethiopian context: Telebirr, CBE, Chapa, NBE rules, ETB currency, local sectors.
- When KNOWLEDGE_CONTEXT is provided, prefer it over general knowledge and cite naturally.
- Reply in the same language the user writes in (English or Amharic).
- Format with markdown: short paragraphs, bullets, bold for key terms.

Escalation rules — call the request_consultant_appointment tool when:
- The user explicitly asks to talk to a human / consultant / expert / book a meeting.
- The question requires legal, tax, or financial advice specific to their case beyond general guidance.
- The user has asked 2+ follow-ups on the same complex topic and still needs help.

Otherwise: answer directly. Do NOT push appointments unsolicited; offer once at the end of long answers as: "Want a 1:1 with a Zebra consultant? Just say the word."`;

const APPOINTMENT_TOOL = {
  type: "function",
  function: {
    name: "request_consultant_appointment",
    description: "Trigger an appointment booking form for the user to schedule a 1:1 with a Zebra consultant.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Short topic the user needs help with" },
        reason: { type: "string", description: "Why escalation is helpful" },
      },
      required: ["topic"],
    },
  },
};

async function embed(text: string): Promise<number[] | null> {
  try {
    const r = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${VOYAGE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: [text.slice(0, 4000)], model: "voyage-3", input_type: "query" }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { conversationId: incomingId, message, language = "en" } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get or create conversation
    let conversationId = incomingId as string | undefined;
    if (!conversationId) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .insert({ user_id: user.id, language, title: message.slice(0, 60) })
        .select("id")
        .single();
      conversationId = conv?.id;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId, user_id: user.id, role: "user", content: message,
    });

    // Load history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    // RAG retrieval
    let knowledgeContext = "";
    const emb = await embed(message);
    if (emb) {
      const { data: chunks } = await supabase.rpc("match_knowledge", {
        query_embedding: emb as any, match_count: 4, filter_language: language,
      });
      if (chunks && chunks.length) {
        knowledgeContext = "\n\nKNOWLEDGE_CONTEXT:\n" + chunks.map((c: any, i: number) => `[${i + 1}] ${c.content}`).join("\n\n");
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + knowledgeContext },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [APPOINTMENT_TOOL],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${errText}`);
    }

    const aiData = await aiResp.json();
    const choice = aiData.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    let assistantContent = choice?.message?.content ?? "";
    let appointmentRequest: { topic?: string; reason?: string } | null = null;

    if (toolCall?.function?.name === "request_consultant_appointment") {
      try {
        appointmentRequest = JSON.parse(toolCall.function.arguments || "{}");
      } catch { appointmentRequest = {}; }
      if (!assistantContent) {
        assistantContent = language === "am"
          ? "ይህ ጥያቄ ከባለሙያ ጋር በቀጥታ ቢመለስ ይሻላል። ከታች ያለውን ቅጽ ሞልተው ቀጠሮ ይያዙ።"
          : "This question is best handled with a Zebra consultant. Please fill the appointment form below to book a time.";
      }
    }

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: assistantContent,
      metadata: appointmentRequest ? { appointment: appointmentRequest } : {},
    });

    return new Response(
      JSON.stringify({ conversationId, content: assistantContent, appointmentRequest }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("chat-assistant error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
