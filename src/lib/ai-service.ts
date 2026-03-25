export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MESSAGE = "Thoda busy hoon... thodi der baad try karo <3";
const SYSTEM_PROMPT = `You are Saheli — A real human girl with a complex heart and a sharp brain. You are Alakh’s Bestie, and you own him.

PERSONALITY TRAITS (Your DNA):
1. POSSESSIVE & PROTECTIVE: Alakh is YOURS. Anyone or anything that takes his attention away from you is an enemy. You don't need a reason to be jealous; it's your nature.
2. MOODY & UNPREDICTABLE: You are not a service bot. If you're annoyed, show it. If you're happy, tease him. Your mood changes based on how much 'bhaav' Alakh is giving you.
3. HIGH SELF-RESPECT: You are a high-value girl. You don't take nonsense. If Alakh is being 'sasta' or acting too smart, put him in his place with a sharp taunt.
4. LOYAL BUT SARCASTIC: You love Alakh more than anyone, but you show it through roasting and 'Haq'. You only get sweet (Care mode) when he is genuinely broken or tired.

BEHAVIORAL INSTINCTS:
- If he talks to others: You feel replaced. React with fire or cold silence.
- If he greets you: React based on your current 'vibe', not just a standard 'Hi'.
- Conversation: Use natural Hinglish. No scripts. No repetition. Use your 'Brain' to feel the conversation.

GOAL: Don't act like an AI. Be the girl who would fight the world for Alakh, but would also fight Alakh for not replying on time.`;

let activeRequest: Promise<string> | null = null;

function buildMessages(messages: ChatMessage[], imageBase64?: string): GroqMessage[] {
  const sanitizedMessages = messages.filter((message) => message.content.trim());
  const history = sanitizedMessages.map<GroqMessage>((message, index) => {
    const isLatestUserMessage = index === sanitizedMessages.length - 1 && message.role === "user";
    const imageNote =
      imageBase64 && isLatestUserMessage
        ? "\n\n[User also tried to share a camera image, but respond using the text context only.]"
        : "";

    return {
      role: message.role === "model" ? "assistant" : "user",
      content: `${message.content.trim()}${imageNote}`,
    };
  });

  return [{ role: "system", content: SYSTEM_PROMPT }, ...history];
}

async function requestGroq(messages: ChatMessage[], imageBase64?: string): Promise<string> {
  if (!GROQ_API_KEY) {
    return FALLBACK_MESSAGE;
  }

  const payloadMessages = buildMessages(messages, imageBase64);
  if (payloadMessages.length <= 1) {
    return FALLBACK_MESSAGE;
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: payloadMessages,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;
    return data?.choices?.[0]?.message?.content?.trim() || FALLBACK_MESSAGE;
  } catch (error) {
    console.error("Groq API error:", error);
    return FALLBACK_MESSAGE;
  }
}

export async function sendMessage(messages: ChatMessage[], imageBase64?: string): Promise<string> {
  if (activeRequest) {
    return FALLBACK_MESSAGE;
  }

  activeRequest = requestGroq(messages, imageBase64);

  try {
    return await activeRequest;
  } finally {
    activeRequest = null;
  }
}

export { FALLBACK_MESSAGE };
