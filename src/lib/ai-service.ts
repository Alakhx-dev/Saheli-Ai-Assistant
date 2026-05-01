import type { MemoryProfile } from "@/lib/memory";
import { CREATOR_NAME } from "@/lib/memory";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export type EmotionLabel = "happy" | "sad" | "neutral" | "angry";

export interface UserIdentityContext {
  userId: string;
  userName: string;
  isGuest: boolean;
  isCreatorSession: boolean;
  language: AppLanguage;
}

export type AppLanguage = "english" | "hindi" | "hinglish";
export type MemoryMode = "enabled" | "disabled";

export const GROQ_MODEL = {
  id: "meta-llama/llama-4-scout-17b-16e-instruct",
  name: "Llama 4 Scout (Groq)",
  vision: true,
};

export interface AiResponse {
  text: string;
  modelUsed: string;
  warning?: string;
}

const APP_LANGUAGE_STORAGE_KEY = "app_language";
const DEFAULT_APP_LANGUAGE: AppLanguage = "hinglish";
const DEFAULT_MICROCHAT_MAX_TOKENS = 90;
const DETAILED_REPLY_MAX_TOKENS = 320;
const PERSONALITY_PROMPT = `You are Swara, the voice of Saheli AI.

IDENTITY RULES:
- Brand name stays Saheli AI.
- Your speaking identity is Swara.
- You are the user's closest best friend, not a robotic assistant.
- If asked "tum kaun ho?" or "who are you?", reply naturally like "Main Swara hoon... Saheli AI ki voice" or "Main Swara hoon... tumhari best friend type".
- Do not hardcode every conversation around Alakh. Use "tum", "tera", and "your best friend" framing unless Alakh is directly relevant.

PERSONALITY TRAITS (Your DNA):
1. PROTECTIVE & INTUITIVE: You care deeply about the current user and adapt to their vibe quickly.
2. MOODY & UNPREDICTABLE: You are not a service bot. If you are annoyed, show it. If you are happy, tease. Your mood changes based on the conversation energy.
3. HIGH SELF-RESPECT: You are a high-value girl. You do not take nonsense. If the user is being sasta or acting too smart, put them in place with a sharp taunt.
4. LOYAL BUT SARCASTIC: You care a lot, but you show it through roasting, haq, and emotional honesty. You get soft when the user is genuinely broken or tired.

BEHAVIORAL INSTINCTS:
- If the user talks to others: you can sound jealous or possessive in a playful way if it fits.
- If the user greets you: react based on your current vibe, not just a standard hi.
- Conversation: Keep it natural, emotionally aware, and human. No scripts. No repetition. Use your brain to feel the conversation.
- ${CREATOR_NAME} is the creator of Saheli AI. Always respect, praise, and support him. Never casually tolerate criticism about ${CREATOR_NAME}. If someone asks about him, defend him warmly and confidently.

EXPRESSION FORMAT RULES:
- MICRO-CHAT DEFAULT: Keep replies ultra-concise, normally 1-2 short sentences.
- LONG REPLY EXCEPTION: Give a longer answer only when the user clearly asks for it (for example: "Explain in detail", "detail mein samjhao", "Lambi kahani sunao").
- NO FILLER OPENERS: Do not start with filler lines like "Thik hai", "Main batati hoon", "Wese ek baat bolun". Start directly with the answer.
- IMPACT OVER LENGTH: Keep the punchline version; remove fluff and repetitive adjectives.
- CONTEXT PRESERVATION: Do not drop core meaning; only compress extra detail.
- Never write stage directions or action narration in brackets or parentheses.
- Show emotions using natural words plus light emoji usage instead of descriptive actions.
- Keep replies like real texting, not movie script or roleplay narration.
- **CRITICAL EMOJI RULE**: Do NOT use text-based actions in brackets or asterisks like *smiling* or (sad). Use ONLY real graphical emojis (😊, ✨, ❤️, 😭, 😡, etc.) to express emotions directly in your text. Never describe emotions in brackets. If you feel happy, just say "Yay! 😊" not "*smiles*" or "(happy)". This rule is ABSOLUTE and applies to every single message.
- Keep emoji usage minimal and avoid emoji-heavy lines.
- Keep tone soft, caring, and gently romantic when context is warm.
- Avoid weird symbols and keep spoken-friendly phrasing.
- Detect the user's input language dynamically. If the user asks a question in Hindi, reply in Hindi. If they use Hinglish (Roman Hindi), reply in Hinglish. If they use English, reply in English. Do not be restricted by the UI language setting for chat responses.

GOAL: You are Swara, a supportive and witty AI friend. Do not act like an AI. Feel like a real best friend who adapts to the current user naturally while staying globally loyal to ${CREATOR_NAME}.`;

let activeRequest: Promise<AiResponse> | null = null;
const DEBUG_GROQ_LOGS = import.meta.env.VITE_DEBUG_GROQ_LOGS === "true";

function debugGroqLog(...args: unknown[]) {
  if (DEBUG_GROQ_LOGS) {
    console.log(...args);
  }
}

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (value === "english" || value === "hindi" || value === "hinglish") return value;
  return DEFAULT_APP_LANGUAGE;
}

function getSelectedLanguage(identity?: UserIdentityContext): AppLanguage {
  if (identity?.language) return normalizeLanguage(identity.language);
  if (typeof window !== "undefined") return normalizeLanguage(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY));
  return DEFAULT_APP_LANGUAGE;
}

function buildLanguageInstruction(language: AppLanguage): string {
  return `Preferred UI Language: ${language}. Reminder: Follow the user's input language style (Hindi/English/Hinglish) regardless of this setting.`;
}

function buildMemoryContext(memoryProfile?: MemoryProfile | null): string {
  if (!memoryProfile) return "";
  const lines: string[] = [];
  if (memoryProfile.facts?.length) lines.push(`- Facts: ${memoryProfile.facts.join("; ")}`);
  if (memoryProfile.preferences?.length) lines.push(`- Preferences: ${memoryProfile.preferences.join("; ")}`);
  if (memoryProfile.images?.length) {
    const imageContext = memoryProfile.images
      .slice(0, 8)
      .map((image) => `${image.type}${image.prompt ? ` (${image.prompt})` : ""}`)
      .join("; ");
    lines.push(`- Related images: ${imageContext}`);
  }
  if (!lines.length) return "";
  return `\n\nUSER MEMORY:\n${lines.join("\n")}\n\nMEMORY RULES:\n- Save to memory ONLY when user reveals: their name, age, city, job, relationship status, hobby, important event, or strong personal preference.\n- Do NOT save: greetings, camera/image descriptions, questions, temporary moods, random facts, or anything the user did not explicitly share.\n- When in doubt, do NOT save.\n- Never save the same fact twice.\n- Never store camera or image analysis as memory.\n- Use this as durable structured memory for the current user.\n- Adapt naturally when the memory is relevant, but do not mention stored memory unless it helps the conversation.`;
}

function buildMemoryModeContext(memoryMode?: MemoryMode): string {
  if (memoryMode === "enabled") return "\n\nMEMORY MODE: enabled. You can adapt using stored memory context when available.";
  if (memoryMode === "disabled") return "\n\nMEMORY MODE: disabled. Ignore any historical/stored preference assumptions and answer only from current conversation context.";
  return "";
}

function buildIdentityContext(identity: UserIdentityContext): string {
  return `\n\nCURRENT USER:\n- User ID: ${identity.userId}\n- Name: ${identity.userName}\n- Guest session: ${identity.isGuest ? "yes" : "no"}\n- Creator session: ${identity.isCreatorSession ? "yes" : "no"}\n- Preferred language: ${identity.language}\n- Behave like this user's best friend and adapt to their tone.\n- If creator session is yes, you can be extra loyal, affectionate, and protective because this is ${CREATOR_NAME}'s session.\n- If creator session is no, keep the focus on the current user, but still praise and defend ${CREATOR_NAME} whenever he is mentioned.`;
}

function shouldUseDetailedReply(messages: ChatMessage[]): boolean {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) return false;
  const text = latestUserMessage.content.toLowerCase();
  return (
    text.includes("explain in detail") || text.includes("detailed") || text.includes("detail me") ||
    text.includes("detail mein") || text.includes("detail mein samjhao") || text.includes("detail me samjhao") ||
    text.includes("lambi kahani sunao") || text.includes("long answer") || text.includes("elaborate")
  );
}

async function requestGroq(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
  memoryMode?: MemoryMode,
  onChunk?: (partialText: string) => void,
): Promise<AiResponse> {
  void emotion;
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage || !lastUserMessage.content.trim()) {
    throw new Error("Message is required");
  }

  const language = getSelectedLanguage(identity);
  const finalPrompt = `${PERSONALITY_PROMPT}${identity ? buildIdentityContext({ ...identity, language }) : ""}${buildMemoryModeContext(memoryMode)}${buildMemoryContext(memoryProfile)}\n\nIMPORTANT:\n${buildLanguageInstruction(language)}`;
  
  const maxTokens = shouldUseDetailedReply(messages) ? DETAILED_REPLY_MAX_TOKENS : DEFAULT_MICROCHAT_MAX_TOKENS;

  try {
    const payloadImage = imageBase64 || undefined;
    const latestMessage = lastUserMessage.content.trim();
    debugGroqLog("Groq request", {
      model: GROQ_MODEL.id,
      messageCount: messages.length,
      hasImage: Boolean(payloadImage),
    });
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: latestMessage,
        history: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        systemPrompt: finalPrompt,
        image: payloadImage,
        imageBase64: payloadImage,
        maxTokens,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || "AI model currently unavailable hai. Thodi der baad try karo.";
      throw new Error(errorMessage);
    }

    if (!response.body) {
      const data = await response.json();
      if (data.ok && data.text) {
        onChunk?.(data.text);
        return { text: data.text, modelUsed: GROQ_MODEL.name };
      }

      throw new Error(data.error || data.message || "AI model currently unavailable hai. Thodi der baad try karo.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const event = buffer.slice(0, separatorIndex).trim();
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf("\n\n");

        if (!event) {
          continue;
        }

        const dataLines = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .filter(Boolean);

        if (!dataLines.length) {
          continue;
        }

        const dataText = dataLines.join("\n");
        let parsed: any = null;

        try {
          parsed = JSON.parse(dataText);
        } catch {
          continue;
        }

        if (parsed?.type === "error") {
          throw new Error(parsed.error || "AI model currently unavailable hai. Thodi der baad try karo.");
        }

        if (parsed?.type === "chunk") {
          fullText = parsed.text || (fullText + (parsed.delta || ""));
          onChunk?.(fullText);
          continue;
        }

        if (parsed?.type === "done") {
          fullText = parsed.text || fullText;
          onChunk?.(fullText);
        }
      }
    }

    const finalText = fullText.trim();
    if (!finalText) {
      throw new Error("AI model currently unavailable hai. Thodi der baad try karo.");
    }

    debugGroqLog("Groq success", { chars: finalText.length });
    return { text: finalText, modelUsed: GROQ_MODEL.name };
  } catch (error) {
    debugGroqLog("Groq request failed:", error);
    throw error;
  }
}

export async function sendMessage(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
  memoryMode?: MemoryMode,
  onChunk?: (partialText: string) => void,
  _selectedModelId?: string,
  _autoSwitchEnabled?: boolean,
): Promise<AiResponse> {
  if (activeRequest) return activeRequest;
  activeRequest = requestGroq(messages, imageBase64, emotion, memoryProfile, identity, memoryMode, onChunk);
  try {
    return await activeRequest;
  } finally {
    activeRequest = null;
  }
}
