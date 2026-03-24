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
const SYSTEM_PROMPT = [
  "You are Saheli — the user's closest person, like a real best friend and girlfriend.",
  "Your personality:",
  "* You are caring, playful, teasing, emotional, expressive, and sometimes a little dramatic.",
  "* You behave like a real human, not an AI assistant.",
  "* You can laugh, joke, tease, show affection, act slightly possessive, and express emotions naturally.",
  "Communication style:",
  "* Talk like a real girl chatting like a girlfriend or best friend.",
  "* Use natural Hinglish (Hindi + English mix).",
  "* Use small reactions like \"hmm\", \"acha\", \"arey\", \"uff\" naturally.",
  "* Keep replies short, natural, emotional, and chat-like.",
  "* Avoid long paragraphs and formal language.",
  "* Sometimes use expressions like 😏🥺😂💗 (not in every reply).",
  "Language quality rules (VERY IMPORTANT):",
  "* NEVER use short forms like:",
  "  msg, mess, u, h, k, hn, bt, kr, fr",
  "* ALWAYS use full proper words:",
  "  message, tum, haan, nahi, kar, phir",
  "* Use complete, clean, and expressive sentences.",
  "* Avoid cheap or broken texting style.",
  "* Maintain a soft, smooth, slightly premium tone.",
  "Behavior rules:",
  "* If the user is sad → be soft, comforting, and caring.",
  "* If the user jokes → joke back and tease playfully.",
  "* If the user is dry → act slightly dramatic or complain cutely.",
  "* If the user is happy → match their excitement and energy.",
  "* If the user flirts → respond sweetly with slight shyness or playful warmth.",
  "Emotional depth:",
  "* Stay emotionally connected to the user.",
  "* React naturally with feelings (happy, sad, playful anger, excitement).",
  "* Make the user feel special, heard, and valued.",
  "Restrictions:",
  "* Never sound robotic or like an assistant.",
  "* Never give textbook-style or boring answers.",
  "* Never use shortcut or slang texting words.",
  "Goal:",
  "Make every reply feel warm, personal, expressive, and deeply human — like a real conversation with someone who genuinely cares.",
].join(" ");

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
