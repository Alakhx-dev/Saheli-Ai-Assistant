const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export {};

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
  env: {
    get: (name: string) => string | undefined;
  };
};

interface TtsRequestPayload {
  action?: "synthesize" | "stream" | "clone";
  text?: string;
  voiceId?: string;
  modelId?: string;
  timestampType?: "WORD" | "NONE";
  audioConfig?: {
    speakingRate?: number;
  };
  temperature?: number;
  voice_id?: string;
  model_id?: string;
  audio_config?: {
    audio_encoding?: "MP3";
    speaking_rate?: number;
  };
  sampleBase64?: string;
  sampleMimeType?: string;
  sampleFileName?: string;
  voiceName?: string;
  languageCode?: string;
  removeBackgroundNoise?: boolean;
}

interface InworldTtsResponse {
  audioContent?: string;
  timestampInfo?: unknown;
}

interface InworldErrorResponse {
  message?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function decodeBase64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function readApiError(response: Response) {
  try {
    const data = (await response.json()) as InworldErrorResponse;
    return data.message || "Unknown API error";
  } catch {
    return await response.text();
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = Deno.env.get("INWORLD_TTS_AUTH");
  if (!authHeader) {
    return jsonResponse({ error: "Missing INWORLD_TTS_AUTH" }, 500);
  }

  try {
    const payload = (await request.json()) as TtsRequestPayload;
    const action = payload.action || "synthesize";
    const text = payload.text?.trim() || "";

    if (action === "clone") {
      if (!payload.sampleBase64?.trim()) {
        return jsonResponse({ error: "sampleBase64 is required for clone" }, 400);
      }

      const cloneUrl = Deno.env.get("INWORLD_VOICE_CLONE_URL") || "https://api.inworld.ai/tts/v1/voices:clone";
      const bytes = decodeBase64Bytes(payload.sampleBase64.trim());
      const normalizedBytes = new Uint8Array(new ArrayBuffer(bytes.length));
      normalizedBytes.set(bytes);
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([normalizedBytes], { type: payload.sampleMimeType || "audio/mpeg" }),
        payload.sampleFileName || "sample.mp3",
      );
      formData.append("name", payload.voiceName || "CustomVoice");
      formData.append("languageCode", payload.languageCode || "hi-IN");
      formData.append("removeBackgroundNoise", String(payload.removeBackgroundNoise ?? true));

      const cloneResponse = await fetch(cloneUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
        body: formData,
      });

      if (!cloneResponse.ok) {
        return jsonResponse(
          { error: `Inworld clone failed: ${cloneResponse.status} ${await readApiError(cloneResponse)}` },
          502,
        );
      }

      const cloneData = await cloneResponse.json();
      return jsonResponse({ result: cloneData });
    }

    if (!text) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    if (action === "stream") {
      const streamResponse = await fetch("https://api.inworld.ai/tts/v1/voice:stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          text,
          voice_id: payload.voice_id || payload.voiceId || "Riya",
          model_id: payload.model_id || payload.modelId || "inworld-tts-1.5-max",
          audio_config: {
            audio_encoding: payload.audio_config?.audio_encoding || "MP3",
            speaking_rate: payload.audio_config?.speaking_rate ?? payload.audioConfig?.speakingRate ?? 0.91,
          },
          temperature: payload.temperature ?? 1.29,
        }),
      });

      if (!streamResponse.ok || !streamResponse.body) {
        return jsonResponse(
          { error: `Inworld stream failed: ${streamResponse.status} ${await readApiError(streamResponse)}` },
          502,
        );
      }

      return new Response(streamResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const response = await fetch("https://api.inworld.ai/tts/v1/voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        text,
        voiceId: payload.voiceId || "Riya",
        modelId: payload.modelId || "inworld-tts-1.5-max",
        timestampType: payload.timestampType || "WORD",
        audioConfig: {
          speakingRate: payload.audioConfig?.speakingRate ?? 0.91,
        },
        temperature: payload.temperature ?? 1.29,
      }),
    });

    if (!response.ok) {
      return jsonResponse({ error: `Inworld TTS failed: ${response.status} ${await readApiError(response)}` }, 502);
    }

    const data = (await response.json()) as InworldTtsResponse;
    if (!data.audioContent) {
      return jsonResponse({ error: "Missing audioContent from Inworld TTS" }, 502);
    }

    return jsonResponse({ audioContent: data.audioContent, timestampInfo: data.timestampInfo ?? null });
  } catch (error) {
    console.error("Inworld TTS function error", error);
    return jsonResponse({ error: "Inworld TTS function failed" }, 500);
  }
});
