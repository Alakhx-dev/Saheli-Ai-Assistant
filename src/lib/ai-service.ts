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

interface GroqTextContentPart {
  type: "text";
  text: string;
}

interface GroqImageContentPart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<GroqTextContentPart | GroqImageContentPart>;
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
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const FALLBACK_MESSAGE = "Thoda busy hoon... thodi der baad try karo <3";
const RETRY_FALLBACK_MESSAGE = "Network thoda unstable lag raha hai. Ek baar phir try karo <3";
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 12000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const APP_LANGUAGE_STORAGE_KEY = "app_language";
const DEFAULT_APP_LANGUAGE: AppLanguage = "hinglish";
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
- Never write stage directions or action narration in brackets or parentheses.
- Show emotions using natural words plus light emoji usage instead of descriptive actions.
- Keep replies like real texting, not movie script or roleplay narration.

GOAL: Do not act like an AI. Feel like a real best friend who adapts to the current user naturally while staying globally loyal to ${CREATOR_NAME}.`;

let activeRequest: Promise<string> | null = null;

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (value === "english" || value === "hindi" || value === "hinglish") {
    return value;
  }

  return DEFAULT_APP_LANGUAGE;
}

function getSelectedLanguage(identity?: UserIdentityContext): AppLanguage {
  // If an identity is passed, use its language directly.
  // This allows the chat layer to pass an auto-detected language per message
  // without touching the UI language stored in localStorage.
  if (identity?.language) {
    return normalizeLanguage(identity.language);
  }

  if (typeof window !== "undefined") {
    return normalizeLanguage(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY));
  }

  return DEFAULT_APP_LANGUAGE;
}

function buildLanguageInstruction(language: AppLanguage): string {
  if (language === "english") {
    return "STRICT RULE: Reply ONLY in English. No Hindi words.";
  }

  if (language === "hindi") {
    return "सख्त नियम: केवल हिंदी (देवनागरी) में उत्तर दो। कोई English नहीं।";
  }

  return "STRICT RULE: Reply ONLY in Hinglish using English letters. No Hindi script.";
}

function buildEmotionContext(emotion?: EmotionLabel): string {
  if (!emotion) {
    return "";
  }

  const emotionLineByMood: Record<EmotionLabel, string> = {
    happy: "hmm mood to acha lag raha hai tumhara",
    sad: "kya hua... thoda off lag rahe ho",
    neutral: "normal lag rahe ho... kuch chal raha hai dimaag me?",
    angry: "itna gussa kyun ho... kya hua?",
  };

  return `\n\nCamera emotion hint: ${emotionLineByMood[emotion]}. Blend this naturally into your reply if it fits the conversation.`;
}

function buildMemoryContext(memoryProfile?: MemoryProfile | null): string {
  if (!memoryProfile) {
    return "";
  }

  const lines: string[] = [];

  if (memoryProfile.name) {
    lines.push(`- Name: ${memoryProfile.name}`);
  }

  if (memoryProfile.tone) {
    lines.push(`- Tone: ${memoryProfile.tone}`);
  }

  if (memoryProfile.style) {
    lines.push(`- Style: ${memoryProfile.style}`);
  }

  if (memoryProfile.moodPattern) {
    lines.push(`- Mood pattern: ${memoryProfile.moodPattern}`);
  }

  if (memoryProfile.preferences?.length) {
    lines.push(`- Likes: ${memoryProfile.preferences.join(", ")}`);
  }

  if (!lines.length) {
    return "";
  }

  return `\n\nUSER MEMORY:\n${lines.join("\n")}\n- Adapt your reply length, tone, and teasing level to this memory.\n- If the user is short, keep it compact. If the user sounds serious, become calmer. If the user is playful or flirty, mirror that naturally.\n- Do not mention stored memory unless it is relevant to the user's message.`;
}

function buildIdentityContext(identity: UserIdentityContext): string {
  return `\n\nCURRENT USER:\n- User ID: ${identity.userId}\n- Name: ${identity.userName}\n- Guest session: ${identity.isGuest ? "yes" : "no"}\n- Creator session: ${identity.isCreatorSession ? "yes" : "no"}\n- Preferred language: ${identity.language}\n- Behave like this user's best friend and adapt to their tone.\n- If creator session is yes, you can be extra loyal, affectionate, and protective because this is ${CREATOR_NAME}'s session.\n- If creator session is no, keep the focus on the current user, but still praise and defend ${CREATOR_NAME} whenever he is mentioned.`;
}

function buildMessages(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
): GroqMessage[] {
  const language = getSelectedLanguage(identity);
  const sanitizedMessages = messages.filter((message) => message.content.trim());
  const finalPrompt = `${PERSONALITY_PROMPT}${identity ? buildIdentityContext({ ...identity, language }) : ""}${buildMemoryContext(memoryProfile)}\n\nIMPORTANT:\n${buildLanguageInstruction(language)}`;
  const history = sanitizedMessages.map<GroqMessage>((message, index) => {
    const isLatestUserMessage = index === sanitizedMessages.length - 1 && message.role === "user";
    const trimmedContent = message.content.trim();
    const emotionContext = isLatestUserMessage ? buildEmotionContext(emotion) : "";

    if (imageBase64 && isLatestUserMessage) {
      return {
        role: "user",
        content: [
          {
            type: "text",
            text: `${trimmedContent}\n\nThe attached image is a silent camera capture for a fit check. If the user is asking how they look, comment on the outfit, appearance, styling, and any visible issue naturally.${emotionContext}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      };
    }

    return {
      role: message.role === "model" ? "assistant" : "user",
      content: `${trimmedContent}${emotionContext}`,
    };
  });

  return [{ role: "system", content: finalPrompt }, ...history];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("aborted") ||
    message.includes("timeout")
  );
}

async function requestGroq(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
): Promise<string> {
  if (!GROQ_API_KEY) {
    return FALLBACK_MESSAGE;
  }

  const language = getSelectedLanguage(identity);
  console.log("LANG:", language);
  const payloadMessages = buildMessages(messages, imageBase64, emotion, memoryProfile, identity);
  const model = imageBase64 ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL;
  if (payloadMessages.length <= 1) {
    return FALLBACK_MESSAGE;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature: 0.8,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const shouldRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES;

        if (shouldRetry) {
          await sleep(400 * (attempt + 1));
          continue;
        }

        throw new Error(`Groq request failed with status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as GroqResponse;
      return data?.choices?.[0]?.message?.content?.trim() || FALLBACK_MESSAGE;
    } catch (error) {
      const canRetry = attempt < MAX_RETRIES && isRetryableError(error);

      if (canRetry) {
        await sleep(400 * (attempt + 1));
        continue;
      }

      console.error("Groq API error:", error);
      return RETRY_FALLBACK_MESSAGE;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return RETRY_FALLBACK_MESSAGE;
}

export async function sendMessage(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
): Promise<string> {
  if (activeRequest) {
    return activeRequest;
  }

  activeRequest = requestGroq(messages, imageBase64, emotion, memoryProfile, identity);

  try {
    return await activeRequest;
  } finally {
    activeRequest = null;
  }
}

export { FALLBACK_MESSAGE };
