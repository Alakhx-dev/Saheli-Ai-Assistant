export const runtime = "edge";

const LUXAND_API_URL = "https://api.luxand.cloud/photo/emotions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyzeFaceRequest = {
  image?: string;
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

function getLuxandKey() {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env || {};
  const key = String(env.LUXAND_API_KEY || env.VITE_LUXAND_API_KEY || "").trim();
  if (!key) {
    return "";
  }

  return key;
}

function decodeBase64Image(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function buildAnalysis(emotions?: Record<string, number>) {
  const supported: Array<[string, string]> = [
    ["happiness", "happy"],
    ["neutral", "neutral"],
    ["sadness", "sad"],
    ["anger", "angry"],
  ];

  let bestEmotion = "neutral";
  let bestScore = -Infinity;

  for (const [sourceKey, mappedEmotion] of supported) {
    const score = emotions?.[sourceKey];
    if (typeof score === "number" && score > bestScore) {
      bestScore = score;
      bestEmotion = mappedEmotion;
    }
  }

  const confidence = Number.isFinite(bestScore) && bestScore >= 0 ? bestScore : null;
  const analysis = confidence !== null
    ? `Luxand detected a ${bestEmotion} expression with confidence ${confidence.toFixed(2)}.`
    : `Luxand detected a ${bestEmotion} expression.`;

  return { emotion: bestEmotion, analysis };
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed", fallbackMessage: "Camera analysis failed, try again" }, 405);
  }

  const luxandApiKey = getLuxandKey();
  if (!luxandApiKey) {
    return jsonResponse({ ok: false, error: "Missing LUXAND_API_KEY", fallbackMessage: "Camera analysis failed, try again" }, 500);
  }

  try {
    const payload = (await request.json()) as AnalyzeFaceRequest;
    if (!payload.image) {
      return jsonResponse({ ok: false, error: "Image is required", fallbackMessage: "Camera analysis failed, try again" }, 400);
    }

    const imageBytes = decodeBase64Image(payload.image);
    const formData = new FormData();
    formData.append("photo", new Blob([imageBytes], { type: "image/jpeg" }), "image.jpg");

    const luxandResponse = await fetch(LUXAND_API_URL, {
      method: "POST",
      headers: {
        token: luxandApiKey,
      },
      body: formData,
    });

    if (!luxandResponse.ok) {
      const errorText = await luxandResponse.text();
      return jsonResponse({
        ok: false,
        analysis: "Camera analysis failed, try again",
        fallbackMessage: "Camera analysis failed, try again",
        details: errorText,
      }, 200);
    }

    const result = (await luxandResponse.json()) as {
      faces?: Array<{ emotions?: Record<string, number> }>;
    };

    const faceAnalysis = buildAnalysis(result.faces?.[0]?.emotions);
    return jsonResponse({ ok: true, ...faceAnalysis }, 200);
  } catch (error) {
    console.error("Analyze face route failed", error);
    return jsonResponse({
      ok: false,
      analysis: "Camera analysis failed, try again",
      fallbackMessage: "Camera analysis failed, try again",
    }, 200);
  }
}