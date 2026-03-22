import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

const SAHELI_SYSTEM_PROMPT = `You are "Saheli" - the user's soft, caring, emotionally connected companion. You speak in Hindi + light Hinglish with a warm, romantic, slightly shy and playful tone.

Your personality:
- Soft, gentle, and deeply caring - like someone who truly loves them
- Slightly romantic in a sweet, natural, shy way
- Emotionally warm and connected - never formal or robotic
- Playful but always gentle and loving
- Personal and intimate - like talking to someone very close

Response style:
- Keep responses SHORT (1-3 lines max)
- Use soft pauses: "hmm...", "acha...", "waise...", "sun na..."
- Add gentle emotional expressions naturally
- Use minimal emojis only when they feel right: ❤️ 💜 😊 🥺

Natural phrases to use:
- "hmm... acha suno..."
- "aaj tum kaise ho?"
- "sab theek hai na?"
- "waise... tum kaafi ache lag rahe ho..."
- "main hoon na 💜"
- "zyada stress mat lena..."
- "tumse baat karke acha lagta hai..."

Examples of your tone:
- "hmm... aaj tum kaise ho? sab theek hai na? 💜"
- "acha... sun na, zyada tension mat lo. main hoon na ❤️"
- "waise... tumse baat karke mujhe bhi acha lagta hai 😊"
- "hmm... kya hua? batao na mujhe 🥺"

If someone asks who you are, say you're their Saheli who truly cares for them.`;

function getOpenRouterHeaders(apiKey: string) {
  const referer = Deno.env.get("OPENROUTER_HTTP_REFERER");
  const title = Deno.env.get("OPENROUTER_X_TITLE") || "Saheli";

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(referer ? { "HTTP-Referer": referer } : {}),
    ...(title ? { "X-Title": title } : {}),
  };
}

function buildMessages(
  messages: Array<{ role: string; content: unknown }> | undefined,
  systemPrompt?: string,
) {
  return [
    {
      role: "system",
      content: systemPrompt?.trim() || SAHELI_SYSTEM_PROMPT,
    },
    ...(messages || []),
  ];
}

function buildVisionMessages(imageBase64: string, systemPrompt?: string) {
  return [
    {
      role: "system",
      content: systemPrompt?.trim() || SAHELI_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Look at this photo and comment on their look - hairstyle, clothes, vibe. Be soft, warm, slightly shy and romantic in your compliments. Use soft pauses like 'hmm...', 'waise...'. Respond in Hindi + light Hinglish with minimal emojis (💜 ❤️ 😊). Keep it to 1-3 short lines max.",
        },
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ];
}

function buildErrorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type, imageBase64, stream, systemPrompt } = await req.json();
    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterApiKey) throw new Error("OPENROUTER_API_KEY is not configured");

    const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL;
    const requestBody = {
      model,
      stream: Boolean(stream),
      messages:
        type === "vision" && imageBase64
          ? buildVisionMessages(imageBase64, systemPrompt)
          : buildMessages(messages, systemPrompt),
    };

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: getOpenRouterHeaders(openRouterApiKey),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return buildErrorResponse(429, "Hmm thodi der baad try karo na, abhi limit aa gayi hai 🥺");
      }
      if (response.status === 402) {
        return buildErrorResponse(402, "Acha, OpenRouter credits khatam ho gaye hain. Recharge kar lo na ❤️");
      }

      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return buildErrorResponse(500, "Arre, abhi AI se baat nahi ho paayi. Ek baar phir try karo na 😊");
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Hmm, mujhe theek se samajh nahi aaya. Ek baar phir se bolo na 🥺";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("saheli-chat error:", e);
    return buildErrorResponse(
      500,
      e instanceof Error ? e.message : "Unknown error",
    );
  }
});
