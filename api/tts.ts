export const runtime = "edge";

const INWORLD_TTS_STREAM_URL = "https://api.inworld.ai/tts/v1/voice:stream";
const DEFAULT_MODEL_ID = "inworld-tts-1.5-max";
const DEFAULT_VOICE_ID = "default-exsg-odgaqb9kgydhmbw-w__design-voice-b48ec25d";
const DEFAULT_SPEAKING_RATE = 0.91;
const DEFAULT_TEMPERATURE = 0.89;

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

function getAuthHeader() {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env || {};
  const key = String(env.INWORLD_TTS_AUTH || "").trim();
  if (!key) {
    return "";
  }

  return key.startsWith("Basic ") ? key : `Basic ${key}`;
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = getAuthHeader();
  if (!authHeader) {
    return jsonResponse({ error: "Missing INWORLD_TTS_AUTH" }, 500);
  }

  try {
    const payload = (await request.json()) as TtsRequest;
    const text = payload.text?.trim() || "";
    if (!text) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    const response = await fetch(INWORLD_TTS_STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        text,
        voice_id: DEFAULT_VOICE_ID,
        model_id: DEFAULT_MODEL_ID,
        audio_config: {
          audio_encoding: "MP3",
          speaking_rate: DEFAULT_SPEAKING_RATE,
        },
        temperature: DEFAULT_TEMPERATURE,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text();
      return jsonResponse({ error: `Inworld TTS failed: ${response.status}`, details: errText }, 502);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("TTS route failed", error);
    return jsonResponse({ error: "TTS route failed" }, 500);
  }
}
