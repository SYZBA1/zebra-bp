import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IngestDoc {
  title: string;
  source?: string;
  sector?: string;
  language?: string;
  description?: string;
  chunks: string[];
}

async function embedBatch(texts: string[], apiKey: string, inputType: "document" | "query" = "document"): Promise<number[][]> {
  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts, model: "voyage-3", input_type: inputType }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Voyage error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  return data.data.map((d: any) => d.embedding);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();
    const documents: IngestDoc[] = body.documents ?? [];
    const replace: boolean = body.replace ?? true;

    if (replace) {
      // wipe prior knowledge if a doc with same source exists
      for (const d of documents) {
        if (d.source) {
          await supabase.from("knowledge_documents").delete().eq("source", d.source);
        }
      }
    }

    const results = [];
    for (const doc of documents) {
      const { data: docRow, error: docErr } = await supabase
        .from("knowledge_documents")
        .insert({
          title: doc.title,
          source: doc.source ?? null,
          sector: doc.sector ?? null,
          language: doc.language ?? "en",
          description: doc.description ?? null,
          total_chunks: doc.chunks.length,
        })
        .select()
        .single();
      if (docErr) throw new Error(`Insert doc failed: ${docErr.message}`);

      // batch embed (Voyage limit ~128 per call, we go 32 to be safe)
      const BATCH = 32;
      let idx = 0;
      for (let i = 0; i < doc.chunks.length; i += BATCH) {
        const batch = doc.chunks.slice(i, i + BATCH);
        const embeddings = await embedBatch(batch, VOYAGE_API_KEY);
        const rows = batch.map((content, j) => ({
          document_id: docRow.id,
          chunk_index: idx + j,
          content,
          embedding: embeddings[j] as any,
          metadata: { source: doc.source, title: doc.title },
        }));
        const { error: chunkErr } = await supabase.from("knowledge_chunks").insert(rows);
        if (chunkErr) throw new Error(`Insert chunks failed: ${chunkErr.message}`);
        idx += batch.length;
      }
      results.push({ document: doc.title, chunks_inserted: doc.chunks.length });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ingest-knowledge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
