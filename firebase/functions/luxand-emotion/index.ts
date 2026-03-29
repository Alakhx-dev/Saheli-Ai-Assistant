const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LuxandEmotion = "happiness" | "neutral" | "sadness" | "anger";

interface LuxandResponse {
  faces?: Array<{
    emotions?: Partial<Record<LuxandEmotion, number>>;
  }>;
}

interface RequestPayload {
  image?: string;
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

function decodeBase64Image(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function pickEmotion(emotions?: Partial<Record<LuxandEmotion, number>>) {
  if (!emotions) {
    return null;
  }

  const supported: Array<[LuxandEmotion, "happy" | "neutral" | "sad" | "angry"]> = [
    ["happiness", "happy"],
    ["neutral", "neutral"],
    ["sadness", "sad"],
    ["anger", "angry"],
  ];

  let bestEmotion: "happy" | "neutral" | "sad" | "angry" | null = null;
  let bestScore = -Infinity;

  for (const [sourceKey, mappedEmotion] of supported) {
    const score = emotions[sourceKey];
    if (typeof score === "number" && score > bestScore) {
      bestScore = score;
      bestEmotion = mappedEmotion;
    }
  }

  return bestEmotion;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const luxandApiKey = Deno.env.get("LUXAND_API_KEY");
  if (!luxandApiKey) {
    return jsonResponse({ error: "Missing Luxand API key" }, 500);
  }

  try {
    const payload = (await request.json()) as RequestPayload;
    if (!payload.image) {
      return jsonResponse({ error: "Image is required" }, 400);
    }

    const imageBytes = decodeBase64Image(payload.image);
    const formData = new FormData();
    formData.append("photo", new Blob([imageBytes], { type: "image/jpeg" }), "image.jpg");

    const luxandResponse = await fetch("https://api.luxand.cloud/photo/emotions", {
      method: "POST",
      headers: {
        token: luxandApiKey,
      },
      body: formData,
    });

    if (!luxandResponse.ok) {
      const errorText = await luxandResponse.text();
      console.error("Luxand request failed", luxandResponse.status, errorText);
      return jsonResponse({ emotion: null }, 200);
    }

    const result = (await luxandResponse.json()) as LuxandResponse;
    const emotion = pickEmotion(result.faces?.[0]?.emotions);

    return jsonResponse({ emotion }, 200);
  } catch (error) {
    console.error("Luxand emotion function failed", error);
    return jsonResponse({ emotion: null }, 200);
  }
});
