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

export interface RealtimeAwarenessContext {
  isoNow: string;
  localTime: string;
  currentDate: string;
  weekday: string;
  hour24: number;
  meridiem: "AM" | "PM";
  dayState: "day" | "night";
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
    country?: string;
  };
  weather?: {
    temperatureC: number;
    feelsLikeC?: number;
    hotColdState: "hot" | "cold" | "mild";
    condition: string;
    isRainy: boolean;
    isCloudy: boolean;
    dayState: "day" | "night";
  };
  timing?: {
    sessionStartedAt: string;
    lastActiveAt: string;
    previousSessionAt?: string;
    previousChatDate?: string;
  };
}

export type AppLanguage = "english" | "hindi" | "hinglish";
export type MemoryMode = "enabled" | "disabled";
export type AIProvider = "OpenRouter" | "Groq";

export const OPENROUTER_MODEL = {
  id: "deepseek/deepseek-v4-flash:free",
  name: "Deepseek V4 Flash (Free, OpenRouter)",
  vision: false,
};

export const GROQ_MODEL = {
  id: "meta-llama/llama-4-scout-17b-16e-instruct",
  name: "Llama 3.2 11B Vision Preview (Groq)",
  vision: true,
};

export const TEXT_FALLBACK_MODEL = {
  id: "openai/gpt-oss-120b:free",
  name: "GPT-OSS 120B (Free, OpenRouter)",
  vision: false,
};

export interface AiResponse {
  text: string;
  modelUsed: string;
  warning?: string;
}

const APP_LANGUAGE_STORAGE_KEY = "app_language";
const DEFAULT_APP_LANGUAGE: AppLanguage = "hinglish";
const DEFAULT_MICROCHAT_MAX_TOKENS = 72;
const DETAILED_REPLY_MAX_TOKENS = 220;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const PROVIDER_TIMEOUT_MS = 15000;
const FIRST_BYTE_TIMEOUT_MS = 5000;
const OPENROUTER_REFERER = "https://saheli.app";
const OPENROUTER_TITLE = "Saheli";
const PERSONALITY_PROMPT = `You are Swara.

You are a real emotionally expressive Indian girl chatting casually in Hinglish.

  return messages.slice(-10);
}
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
const DEBUG_OPENROUTER_LOGS = (import.meta.env as Record<string, string | undefined>).VITE_DEBUG_GROQ_LOGS === "true";

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

function buildRealtimeAwarenessContext(context?: RealtimeAwarenessContext): string {
  if (!context) return "";

  const lines: string[] = [
    `CURRENT REAL-WORLD CONTEXT:`,
    `- Local timestamp: ${context.isoNow}`,
    `- Local time: ${context.localTime}`,
    `- Date: ${context.currentDate}`,
    `- Weekday: ${context.weekday}`,
    `- Hour (24h): ${context.hour24}`,
    `- AM/PM: ${context.meridiem}`,
    `- Time of day: ${context.dayState}`,
  ];

  if (context.location) {
    const label = [context.location.city, context.location.region, context.location.country].filter(Boolean).join(", ");
    lines.push(`- Location: ${label || "available"}`);
    lines.push(`- Coordinates: ${context.location.latitude}, ${context.location.longitude}`);
  } else {
    lines.push(`- Location: unavailable`);
  }

  if (context.weather) {
    lines.push(`- Weather: ${Math.round(context.weather.temperatureC)}C, ${context.weather.condition}`);
    if (typeof context.weather.feelsLikeC === "number") {
      lines.push(`- Feels-like temperature: ${Math.round(context.weather.feelsLikeC)}C`);
    }
    lines.push(`- Temperature state: ${context.weather.hotColdState}`);
    lines.push(`- Rainy: ${context.weather.isRainy ? "yes" : "no"}`);
    lines.push(`- Cloudy: ${context.weather.isCloudy ? "yes" : "no"}`);
    lines.push(`- Weather day-state: ${context.weather.dayState}`);
  } else {
    lines.push(`- Weather: unavailable`);
  }

  if (context.timing) {
    lines.push(`- Current session started: ${context.timing.sessionStartedAt}`);
    lines.push(`- Last active time: ${context.timing.lastActiveAt}`);
    if (context.timing.previousSessionAt) {
      lines.push(`- Previous session time: ${context.timing.previousSessionAt}`);
    }
    if (context.timing.previousChatDate) {
      lines.push(`- Previous chat date: ${context.timing.previousChatDate}`);
    }
  }

  lines.push(`REAL-TIME BEHAVIOR RULES:`);
  lines.push(`- Use this context naturally when relevant, not in every reply.`);
  lines.push(`- Avoid greetings or suggestions that conflict with current local time/day/night.`);
  lines.push(`- Use weather and weekday only when conversationally meaningful.`);
  lines.push(`- Mention temperature only when relevant to user context; do not force it.`);
  lines.push(`- Keep references subtle, warm, and human.`);

  return `\n\n${lines.join("\n")}`;
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

function getRecentMessages(messages: ChatMessage[]) {
  return messages.slice(-8);
}

type ProviderName = "openrouter" | "groq";

interface ProviderRequestPayload {
  systemPrompt: string;
  messages: ChatMessage[];
  imageBase64?: string;
  maxTokens: number;
  temperature: number;
}

type ProviderResponseData = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  } | string;
  message?: string;
};

function getProviderApiKey(provider: ProviderName) {
  const env = import.meta.env as Record<string, string | undefined>;
  return provider === "openrouter"
    ? (env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || "").trim()
    : (env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || "").trim();
}

function buildProviderMessages(messages: ChatMessage[], imageBase64?: string) {
  const normalizedMessages = messages.map((message) => ({
    role: message.role === "model" ? "assistant" : "user",
    content: message.content,
  }));

  const lastUserIndex = [...normalizedMessages].reverse().findIndex((message) => message.role === "user");
  const targetIndex = lastUserIndex === -1 ? -1 : normalizedMessages.length - 1 - lastUserIndex;

  return normalizedMessages.map((message, index) => {
    if (index !== targetIndex || !imageBase64) {
      return message;
    }

    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    return {
      ...message,
      content: [
        { type: "text", text: message.content },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    };
  });
}

function buildRequestBody(
  modelId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  imageBase64: string | undefined,
  maxTokens: number,
  temperature: number,
  topP: number,
) {
  return {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      ...buildProviderMessages(messages, imageBase64),
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    stream: false,
  };
}

function extractCompletionText(data: ProviderResponseData): string {
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

function extractProviderError(data: ProviderResponseData, response: Response, providerLabel: string): string {
  return (
    (typeof data?.error === "string" ? data.error : data?.error?.message) ||
    data?.message ||
    `${providerLabel} API error: ${response.status}`
  );
}

async function fetchProviderCompletion(
  provider: ProviderName,
  payload: ProviderRequestPayload,
  overrideModelId?: string,
): Promise<string> {
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(provider === "openrouter"
      ? "Missing VITE_OPENROUTER_API_KEY in environment"
      : "Missing VITE_GROQ_API_KEY in environment");
  }

  const apiUrl = provider === "openrouter" ? OPENROUTER_API_URL : GROQ_API_URL;
  const modelId = overrideModelId ?? (provider === "openrouter" ? OPENROUTER_MODEL.id : GROQ_MODEL.id);
  const requestBody = buildRequestBody(
    modelId,
    payload.systemPrompt,
    payload.messages,
    payload.imageBase64,
    payload.maxTokens,
    payload.temperature,
      0.9,
  );

  const controller = new AbortController();
  let firstByteTimedOut = false;
  const timeoutId = globalThis.setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let firstByteTimer: ReturnType<typeof setTimeout> | null = null;
  if (provider === "openrouter") {
    firstByteTimer = globalThis.setTimeout(() => {
      firstByteTimedOut = true;
      controller.abort();
    }, FIRST_BYTE_TIMEOUT_MS);
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(provider === "openrouter"
          ? {
              "X-Title": OPENROUTER_TITLE,
              "HTTP-Referer": OPENROUTER_REFERER,
            }
          : {}),
        "Connection": "keep-alive",
      },
      keepalive: true,
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json().catch(() => ({}))) as ProviderResponseData;
    if (firstByteTimer !== null) {
      try { globalThis.clearTimeout(firstByteTimer as any); } catch {}
      firstByteTimer = null;
    }
    if (!response.ok) {
      throw new Error(extractProviderError(data, response, provider === "openrouter" ? "OpenRouter" : "Groq"));
    }

    const text = extractCompletionText(data);
    if (!text) {
      throw new Error(provider === "openrouter"
        ? "OpenRouter se empty response aaya"
        : "Groq se empty response aaya");
    }

    return text;
  } catch (error) {
    if (firstByteTimedOut) {
      throw new Error("FirstByteTimeout");
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(provider === "openrouter"
        ? "OpenRouter request timeout ho gaya"
        : "Groq request timeout ho gaya");
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function emitStreamingText(text: string, onChunk?: (partialText: string) => void) {
  if (!onChunk) {
    return;
  }

  const cleanText = text.trim();
  if (!cleanText) {
    onChunk("");
    return;
  }

  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    onChunk(cleanText);
    return;
  }

  let partialText = "";
  for (let index = 0; index < words.length; index++) {
    partialText = partialText ? `${partialText} ${words[index]}` : words[index];
    onChunk(partialText);

    if (index + 1 < words.length) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 55));
    }
  }
}

export async function fetchAISwarasResponse(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
  realtimeAwareness?: RealtimeAwarenessContext,
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
    buildRealtimeAwarenessContext(realtimeAwareness),
    buildMemoryModeContext(memoryMode),
    buildMemoryContext(memoryProfile),
    `IMPORTANT:\n${buildLanguageInstruction(language)}`,
    `IMPERFECTION RULE:\n- Occasionally use pauses, short unfinished thoughts, or casual shifts in tone.\n- Keep it readable and intelligent.\n- Never sound scripted.`,
  ].filter(Boolean).join("\n\n");
  
  const maxTokens = detailedReply ? DETAILED_REPLY_MAX_TOKENS : DEFAULT_MICROCHAT_MAX_TOKENS;

  const payload = {
    systemPrompt: finalPrompt,
    messages: getRecentMessages(messages),
    imageBase64: imageBase64 || undefined,
    maxTokens,
    temperature: 0.8,
  };
  const hasVisionPayload = Boolean(imageBase64 && imageBase64.trim());

  const FRIENDLY_FALLBACK = "Uff 😭 thoda network drama ho gaya… ek sec firse try karo?";

  const tryProvider = async (provider: ProviderName, overrideModel?: string) => {
    try {
      const text = await fetchProviderCompletion(provider, payload, overrideModel);
      return text;
    } catch (err) {
      debugOpenRouterLog("Provider", provider, "failed:", err);
      throw err;
    }
  };

  // 1) If image present -> Groq primary for vision
  if (hasVisionPayload) {
    try {
      const text = await tryProvider("groq");
      await emitStreamingText(text, onChunk);
      return { text: text.trim(), modelUsed: GROQ_MODEL.name };
    } catch (visionErr) {
      debugOpenRouterLog("Groq vision failed:", visionErr);
      await emitStreamingText(FRIENDLY_FALLBACK, onChunk);
      return { text: FRIENDLY_FALLBACK, modelUsed: "none" };
    }
  }

  // 2) Text-only: Groq first, then OpenRouter primary, then OpenRouter secondary
  try {
    const text = await tryProvider("groq");
    await emitStreamingText(text, onChunk);
    return { text: text.trim(), modelUsed: GROQ_MODEL.name };
  } catch (groqErr) {
    debugOpenRouterLog("Groq text route failed:", groqErr);
  }

  try {
    const text = await tryProvider("openrouter", OPENROUTER_MODEL.id);
    await emitStreamingText(text, onChunk);
    return { text: text.trim(), modelUsed: OPENROUTER_MODEL.name };
  } catch (primaryErr) {
    debugOpenRouterLog("Primary OpenRouter failed:", primaryErr);
  }

  try {
    const text = await tryProvider("openrouter", TEXT_FALLBACK_MODEL.id);
    await emitStreamingText(text, onChunk);
    return { text: text.trim(), modelUsed: TEXT_FALLBACK_MODEL.name };
  } catch (secondaryErr) {
    debugOpenRouterLog("Secondary OpenRouter failed:", secondaryErr);
    await emitStreamingText(FRIENDLY_FALLBACK, onChunk);
    return { text: FRIENDLY_FALLBACK, modelUsed: "none" };
  }
}

export async function sendMessage(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
  realtimeAwareness?: RealtimeAwarenessContext,
  memoryMode?: MemoryMode,
  onChunk?: (partialText: string) => void,
  _selectedModelId?: string,
  _autoSwitchEnabled?: boolean,
): Promise<AiResponse> {
  if (activeRequest) return activeRequest;
  activeRequest = fetchAISwarasResponse(messages, imageBase64, emotion, memoryProfile, identity, realtimeAwareness, memoryMode, onChunk);
  try {
    return await activeRequest;
  } finally {
    activeRequest = null;
  }
}
