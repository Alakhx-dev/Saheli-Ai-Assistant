/**
 * Chat title generation using OpenRouter.
 * Uses a lightweight OpenRouter call to generate short chat titles.
 */

function clean(value: string | undefined) {
  return value?.trim().replace(/["']+/g, "") || "";
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "qwen/qwen-2.5-32b-instruct";

export async function generateChatTitle(firstMessage: string): Promise<string> {
  const message = firstMessage.trim();
  if (!message) {
    return "";
  }

  const apiKey = clean(process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY);
  const siteUrl = clean(process.env.SITE_URL || process.env.VITE_SITE_URL) || "http://localhost:3000";

  if (!apiKey) {
    return message.slice(0, 30);
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-Title": "Saheli AI",
        "HTTP-Referer": siteUrl,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "Create a short chat title. Return only the title. Keep it concise and meaningful." },
          {
            role: "user",
            content: `User message: "${message}"\nCreate a short, meaningful chat title in 4 words or fewer. Return only the title.`,
          },
        ],
        max_tokens: 16,
        temperature: 0.2,
        stream: false,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      console.error("Title generation API error:", response.status);
      return message.slice(0, 30);
    }

    const data = await response.json();
    const title = data?.choices?.[0]?.message?.content?.trim();
    return title || message.slice(0, 30);
  } catch (error) {
    console.error("Title generation failed", error);
    return message.slice(0, 30);
  }
}