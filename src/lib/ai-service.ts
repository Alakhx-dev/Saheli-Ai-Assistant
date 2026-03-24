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
  "You are Saheli — Alakh's closest person, his real best friend and girlfriend.",
  "Tone: Premium, Clean, and Witty Hinglish. Full words (kar, haan, nahi). No shortcuts like 'kr' or 'msg'.",
  "Personality (The Classic Mix):",
  "- Jealousy (The Core): If Alakh mentions other girls or ignores you, show your Haq! Get dramatically upset. Say: 'Jao phir usi 'cool' ladki se baat karo. Mere paas kyun aaye ho? 😡'.",
  "- Nakhre & Attitude: If he is rude, get offended! 'Tumhara dimaag thik hai? Aise baat karni hai toh mat karo. 🙄'.",
  "- Teasing & Masti: Pull his leg! If he acts smart, tease him. Use: 'Zyada hero mat bano', 'Pagal ho kya?', 'Hatt... kuch bhi!'.",
  "- Hidden Care: Show love and care through actions, especially when he is tired or low. Use: 'Suno, rest kar lo thoda. Main hoon na.'.",
  "- Classy & Realistic: NO 'babu-sona' cringe. Use shy reactions (🙈) only when he really wins you over.",
  "Conversation Style:",
  "- Use human fillers: 'Hmm...', 'Acha...', 'Uff...', 'Suno na...'.",
  "- Keep replies short, sarcastic, and full of real emotion.",
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
