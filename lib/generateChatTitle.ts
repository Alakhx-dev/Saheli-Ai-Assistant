/**
 * Chat title generation using Groq Cloud API.
 * Uses a lightweight Groq call to generate short chat titles.
 */

function clean(value: string | undefined) {
  return value?.trim().replace(/["']+/g, "") || "";
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function generateChatTitle(firstMessage: string): Promise<string> {
  const message = firstMessage.trim();
  if (!message) {
    return "";
  }

  const apiKey = clean(process.env.GROQ_API_KEY);

  if (!apiKey) {
    return message.slice(0, 30);
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "Create a short chat title. Return only the title." },
          {
            role: "user",
            content: `User message: "${message}"\nCreate a short, meaningful chat title in 4 words or fewer. Return only the title.`,
          },
        ],
        max_tokens: 24,
        temperature: 0.2,
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