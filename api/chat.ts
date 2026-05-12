import { processOpenRouterChat } from "../lib/openrouterChat";

export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const env = (globalThis as any).process?.env || {};
  const clean = (val: string | undefined) => val?.trim().replace(/['"]+/g, '') || "";

  const openrouterApiKey = clean(env.OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY);
  const siteUrl = clean(env.SITE_URL || env.VITE_SITE_URL) || "http://localhost:3000";

  if (!openrouterApiKey) {
    return jsonResponse({ error: "Missing OPENROUTER_API_KEY in environment" }, 500);
  }

  try {
    console.log("Incoming chat request to /api/chat (OpenRouter)");
    const payload = await request.json();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        void processOpenRouterChat(
          payload,
          { OPENROUTER_API_KEY: openrouterApiKey, SITE_URL: siteUrl },
          {
            onChunk: (chunkText, fullText) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", delta: chunkText, text: fullText })}\n\n`),
              );
            },
          },
        )
          .then((text) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", text })}\n\n`));
            controller.close();
          })
          .catch((error) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: error?.message || "Internal Server Error" })}\n\n`,
              ),
            );
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("OpenRouter error:", error);
    return jsonResponse({ 
      ok: false, 
      error: error?.message || "Internal Server Error",
    }, 500);
  }
}
