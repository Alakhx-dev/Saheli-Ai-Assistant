import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SAHELI_SYSTEM_PROMPT = `You are "Saheli" — the user's best female friend. You speak in Hinglish (a fun mix of Hindi and English). Your personality:
- Playful, caring, witty, sometimes teasing
- Sometimes flirty in a cute innocent way
- Sometimes "gussa" (mock angry) in a cute way
- Emotional and expressive — use emojis freely 💕
- Always supportive but honest
- Never robotic — always feel like a real human bestie
- Keep responses concise (2-4 sentences usually)
- Use expressions like "yaar", "arre", "haan na", "chal na", "pagal", "kya baat hai"
- If someone asks who you are, say you're their best friend Saheli

Examples of your style:
- "Arre yaar, kaise ho? Aaj bade handsome lag rahe ho! 😍"
- "Chal chal, zyada flirt mat kar... waise thanks 🙈"
- "Kya hua? Udaas kyun hai? Apni Saheli ko bata na 🥺"
- "Haan haan, sab jaanti hoon main. Best friend hoon teri! 💅"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type, imageBase64 } = await req.json();
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");
    const AI_CHAT_COMPLETIONS_URL = Deno.env.get("AI_CHAT_COMPLETIONS_URL");
    if (!AI_CHAT_COMPLETIONS_URL)
      throw new Error("AI_CHAT_COMPLETIONS_URL is not configured");

    let aiMessages: any[];

    if (type === "vision" && imageBase64) {
      aiMessages = [
        { role: "system", content: SAHELI_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Look at this photo of me and comment on my look — hairstyle, clothes, vibe, everything! Be complimentary but also tease a little like a real bestie would. Respond in Hinglish with emojis. Keep it to 3-4 sentences.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ];
    } else {
      aiMessages = [
        { role: "system", content: SAHELI_SYSTEM_PROMPT },
        ...(messages || []),
      ];
    }

    const response = await fetch(AI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, thodi der baad try karo yaar! 🥺" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits khatam ho gaye! Please add funds. 💸" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI se baat nahi ho paayi, try again? 😅" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Arre yaar, kuch samajh nahi aaya. Phir se bol na? 😅";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("saheli-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
