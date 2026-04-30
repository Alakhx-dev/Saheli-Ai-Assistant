import { processGroqChat } from "../lib/groqChat";

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

  const groqApiKey = clean(env.GROQ_API_KEY);

  if (!groqApiKey) {
    return jsonResponse({ error: "Missing GROQ_API_KEY in environment" }, 500);
  }

  try {
    console.log("Incoming chat request to /api/chat (Groq)");
    const payload = await request.json();
    const text = await processGroqChat(payload, { GROQ_API_KEY: groqApiKey });
    return jsonResponse({ ok: true, text });
  } catch (error: any) {
    console.error("Groq error:", error);
    return jsonResponse({ 
      ok: false, 
      error: error?.message || "Internal Server Error",
    }, 500);
  }
}
