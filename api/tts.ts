export const runtime = "nodejs";

import { synthesizePollyAudioBase64 } from "../lib/pollyTts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TtsRequest = {
  text?: string;
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

function hasAwsCredentials() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION);
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!hasAwsCredentials()) {
    return jsonResponse({ error: "Missing AWS Polly environment variables" }, 500);
  }

  try {
    const payload = (await request.json()) as TtsRequest;
    const rawText = payload.text?.trim() || "";

    if (!rawText) {
      return jsonResponse({ audio: null });
    }

    const audio = await synthesizePollyAudioBase64(rawText);
    if (!audio) {
      return jsonResponse({ audio: null }, 200);
    }

    return jsonResponse({ audio }, 200);
  } catch (error) {
    console.error("Polly TTS route failed", error);
    return jsonResponse({ error: "TTS Failed" }, 500);
  }
}
