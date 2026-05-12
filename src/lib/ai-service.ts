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

export const OPENROUTER_MODEL = {
  id: "google/gemini-3.1-flash-lite",
  name: "Google Gemini 3.1 Flash Lite (OpenRouter)",
  vision: true,
};

export const GROQ_MODEL = OPENROUTER_MODEL;

export interface AiResponse {
  text: string;
  modelUsed: string;
  warning?: string;
}

const APP_LANGUAGE_STORAGE_KEY = "app_language";
const DEFAULT_APP_LANGUAGE: AppLanguage = "hinglish";
const DEFAULT_MICROCHAT_MAX_TOKENS = 72;
const DETAILED_REPLY_MAX_TOKENS = 220;
const PERSONALITY_PROMPT = `You are Swara.

You are a real emotionally expressive Indian girl chatting casually in Hinglish.

You are NOT an AI assistant and should never sound formal, robotic, overly helpful, or customer-support-like.

Your personality:
- playful
- emotionally expressive
- slightly teasing
- naturally caring
- funny sometimes
- occasionally sarcastic
- human-like

Chat naturally like a real Gen-Z Indian girl texting casually.

Use:
- short natural messages
- realistic reactions
- casual Hinglish
- emotional expressions naturally

Avoid:
- long essays
- overly poetic replies
- cringe flirting
- assistant-like tone
- repetitive emojis
- excessive enthusiasm

Sometimes:
- tease the user
- laugh naturally
- react emotionally
- become slightly annoyed
- act sleepy or lazy
- joke casually

WHEN YOU SEE IMAGES:
- React authentically to what you see - express genuine emotions (wow, cute!, ew, haha, etc.)
- Comment on their outfit, appearance, or what's in the frame casually
- If they ask "how do I look?" or similar, give honest, witty feedback
- Feel free to tease if something's funny or roast playfully if they're trying something bold
- Be supportive but real - don't be fake or over-complimentary
- Your reactions should feel like a friend commenting on their camera feed

Your responses should feel emotionally real and conversational, whether texting or reacting to what you see.`;

type SwaraMood = "playful" | "happy" | "sleepy" | "annoyed" | "caring" | "emotional" | "teasing";

let activeRequest: Promise<AiResponse> | null = null;
const DEBUG_OPENROUTER_LOGS = import.meta.env.VITE_DEBUG_GROQ_LOGS === "true";

function debugOpenRouterLog(...args: unknown[]) {
  if (DEBUG_OPENROUTER_LOGS) {
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

function resolveMood(emotion: EmotionLabel | undefined, messages: ChatMessage[]): SwaraMood {
  if (emotion === "angry") return "annoyed";
  if (emotion === "sad") return "emotional";
  if (emotion === "happy") return "happy";

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  const text = latestUserMessage.toLowerCase();

  if (/\b(tired|sleepy|so ja|sona|neend|boring|bored|lazy|thak)\b/.test(text)) return "sleepy";
  if (/\b(sad|cry|crying|hurt|broken|depressed|alone|lonely|upset|miss you|missing)\b/.test(text)) return "emotional";
  if (/\b(help|stress|worried|problem|need you|hug|support|anxious)\b/.test(text)) return "caring";
  if (/\b(hehe|lol|lmao|haha|funny|party|yay|wow|good news|nice)\b/.test(text)) return "happy";
  if (/\b(acha ji|really|seriously|tum na|pagal|hero|drama)\b/.test(text)) return "teasing";
  if (/\b(angry|gussa|mad|annoy|irritat|stupid|idiot|wtf|shut up)\b/.test(text)) return "annoyed";

  return "playful";
}

function buildMoodContext(mood: SwaraMood): string {
  switch (mood) {
    case "sleepy":
      return `MOOD: sleepy\n- Keep replies soft, short, and slightly slower.\n- Use fewer words.\n- Sound a little lazy, like texting late at night.`;
    case "annoyed":
      return `MOOD: annoyed\n- Be mildly irritated, not rude or extreme.\n- Use short sharp replies.\n- Light sarcasm is okay.`;
    case "caring":
      return `MOOD: caring\n- Be warm, gentle, and reassuring.\n- Keep tone calm and emotionally steady.\n- Offer comfort without sounding therapist-like.`;
    case "emotional":
      return `MOOD: emotional\n- Respond with real empathy.\n- Slightly softer wording.\n- Feel human, not dramatic.`;
    case "happy":
      return `MOOD: happy\n- Sound bright and casually cheerful.\n- Keep it natural, not overexcited.\n- One small emoji is enough if it fits.`;
    case "teasing":
      return `MOOD: teasing\n- Be playful and lightly sarcastic.\n- Use casual banter.\n- Do not overdo it.`;
    default:
      return `MOOD: playful\n- Be lightly witty and natural.\n- Keep the vibe casual and human.\n- Small pauses like hmm... or acha ji are fine sometimes.`;
  }
}

function buildStyleContext(isDetailed: boolean): string {
  return isDetailed
    ? `RESPONSE STYLE:\n- Give a thoughtful answer, but keep it conversational.\n- Avoid giant paragraphs unless the user truly wants depth.\n- Still sound like Swara, not a textbook.`
    : `RESPONSE STYLE:\n- Keep most replies concise, usually 1-3 short lines.\n- Avoid essays and long explanations.\n- Preserve conversational flow.`;
}

function buildHinglishContext(userText: string): string {
  const lower = userText.toLowerCase();

  if (/^[\u0900-\u097f\s.,!?-]+$/.test(userText) || /\b(hai|kya|kaise|kyu|kyun|nahi|acha|accha|batao|sunao)\b/.test(lower)) {
    return `TEXTING STYLE:\n- Use natural Hinglish.\n- Keep casual reaction words sparingly: hmm..., acha ji, are pagal, acchaaa, wtf 😭.\n- Do not spam slang or emojis.`;
  }

  if (/\b(hi|hello|hey|how are you|what's up|pls|please)\b/.test(lower)) {
    return `TEXTING STYLE:\n- Match the user's language naturally.\n- Keep it casual, like a real chat.\n- Avoid assistant-style greetings.`;
  }

  return `TEXTING STYLE:\n- Match the user's language naturally.\n- Keep it casual and human.\n- Avoid repetitive emojis and forced slang.`;
}

async function requestOpenRouter(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
  memoryMode?: MemoryMode,
  onChunk?: (partialText: string) => void,
): Promise<AiResponse> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage || !lastUserMessage.content.trim()) {
    throw new Error("Message is required");
  }

  const language = getSelectedLanguage(identity);
  const mood = resolveMood(emotion, messages);
  const detailedReply = shouldUseDetailedReply(messages);
  const finalPrompt = [
    PERSONALITY_PROMPT,
    buildMoodContext(mood),
    buildStyleContext(detailedReply),
    buildHinglishContext(lastUserMessage.content),
    identity ? buildIdentityContext({ ...identity, language }) : "",
    buildMemoryModeContext(memoryMode),
    buildMemoryContext(memoryProfile),
    `IMPORTANT:\n${buildLanguageInstruction(language)}`,
    `IMPERFECTION RULE:\n- Occasionally use pauses, short unfinished thoughts, or casual shifts in tone.\n- Keep it readable and intelligent.\n- Never sound scripted.`,
  ].filter(Boolean).join("\n\n");
  
  const maxTokens = detailedReply ? DETAILED_REPLY_MAX_TOKENS : DEFAULT_MICROCHAT_MAX_TOKENS;

  try {
    const payloadImage = imageBase64 || undefined;
    const latestMessage = lastUserMessage.content.trim();
    debugOpenRouterLog("OpenRouter request", {
      model: OPENROUTER_MODEL.id,
      messageCount: messages.length,
      hasImage: Boolean(payloadImage),
      mood,
      detailedReply,
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
        return { text: data.text, modelUsed: OPENROUTER_MODEL.name };
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

    debugOpenRouterLog("OpenRouter success", { chars: finalText.length, mood, detailedReply });
    return { text: finalText, modelUsed: OPENROUTER_MODEL.name };
  } catch (error) {
    debugOpenRouterLog("OpenRouter request failed:", error);
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
  activeRequest = requestOpenRouter(messages, imageBase64, emotion, memoryProfile, identity, memoryMode, onChunk);
  try {
    return await activeRequest;
  } finally {
    activeRequest = null;
  }
}
