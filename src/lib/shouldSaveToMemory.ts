const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function shouldSaveToMemory(fact: string): Promise<{ save: boolean; reason: string }> {
  const trimmedFact = fact.trim();
  if (!trimmedFact) {
    return { save: false, reason: "empty fact" };
  }

  if (!GROQ_API_KEY) {
    return { save: false, reason: "missing groq api key" };
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Is this worth saving to long-term memory about a user?
Fact: "${trimmedFact}"
Save ONLY if it is: users name, age, city, relationship status, job, hobby,
important life event, strong preference, or recurring emotional pattern.
Do NOT save: casual greetings, random sentences, image descriptions,
camera outputs, temporary moods, generic questions.
Reply with JSON only: {"save": true/false, "reason": "one line"}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return { save: false, reason: `groq http ${response.status}` };
  }

  const data = (await response.json().catch(() => ({}))) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  try {
    const parsed = JSON.parse(text) as { save?: boolean; reason?: string };
    return {
      save: Boolean(parsed.save),
      reason: typeof parsed.reason === "string" && parsed.reason.trim() ? parsed.reason.trim() : "ok",
    };
  } catch {
    return { save: false, reason: "parse error" };
  }
}
