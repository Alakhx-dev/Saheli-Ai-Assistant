export const runtime = "nodejs";

import { generateCloudflareFluxBase64 } from "../lib/cloudflareFlux";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FluxRequest = {
  prompt?: string;
  width?: number;
  height?: number;
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

  try {
    const payload = (await request.json()) as FluxRequest;
    const prompt = payload.prompt?.trim() || "";

    if (!prompt) {
      return jsonResponse({ error: "Prompt is required" }, 400);
    }

    const imageBase64 = await generateCloudflareFluxBase64({
      prompt,
    });

    return jsonResponse({ image: imageBase64, provider: "cloudflare-flux" }, 200);
  } catch (error: any) {
    console.error("Cloudflare FLUX API route error:", error);
    return jsonResponse({ error: error?.message || "Cloudflare FLUX generation failed" }, 500);
  }
}
