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

interface SessionRequestPayload {
  userId?: string;
  userName?: string;
  characterName?: string;
  characterPath?: string;
  scene?: string;
  languageCode?: string;
  voiceId?: string;
}

interface InworldSessionTokenResponse {
  token?: string;
  type?: string;
  expirationTime?: string;
  sessionId?: string;
  sessionToken?: {
    token?: string;
    type?: string;
    expirationTime?: string;
    sessionId?: string;
  };
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

async function requestSessionToken(payload: SessionRequestPayload, apiKey: string, apiSecret: string) {
  const authHeader = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;

  const body = {
    user: {
      id: payload.userId || crypto.randomUUID(),
      fullName: payload.userName || "Saheli User",
    },
    scene: payload.scene || payload.characterPath,
    character: payload.characterName || "Swara",
    sessionConfiguration: {
      languageCode: payload.languageCode || "hi-IN",
      fallbackLanguageCode: "en-US",
      audio: {
        voice: payload.voiceId || "Riya",
      },
    },
  };

  const endpoints = [
    "https://api.inworld.ai/v1/sessionTokens",
    "https://api.inworld.ai/v1alpha/sessionTokens",
  ];

  let lastError = "";

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        lastError = `${endpoint} -> ${response.status} ${await response.text()}`;
        continue;
      }

      const result = (await response.json()) as InworldSessionTokenResponse;
      const tokenPayload = result.sessionToken || result;

      if (!tokenPayload.token || !tokenPayload.type || !tokenPayload.expirationTime || !tokenPayload.sessionId) {
        lastError = `${endpoint} -> invalid session token payload`;
        continue;
      }

      return {
        token: tokenPayload.token,
        type: tokenPayload.type,
        expirationTime: tokenPayload.expirationTime,
        sessionId: tokenPayload.sessionId,
      };
    } catch (error) {
      lastError = `${endpoint} -> ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  throw new Error(lastError || "Inworld session token request failed");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const inworldApiKey = Deno.env.get("INWORLD_JWT_KEY") || Deno.env.get("INWORLD_API_KEY");
  const inworldApiSecret = Deno.env.get("INWORLD_JWT_SECRET") || Deno.env.get("INWORLD_API_SECRET");

  if (!inworldApiKey || !inworldApiSecret) {
    return jsonResponse({ error: "Missing Inworld credentials" }, 500);
  }

  try {
    const payload = (await request.json()) as SessionRequestPayload;
    const token = await requestSessionToken(payload, inworldApiKey, inworldApiSecret);

    return jsonResponse(token);
  } catch (error) {
    console.error("Failed to create Inworld session token", error);
    return jsonResponse({ error: "Failed to create Inworld session token" }, 500);
  }
});
