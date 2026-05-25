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
export type AIProvider = "Groq";

// Legacy exports kept for backward compatibility with settings panel
export const GROQ_MODEL = {
  id: "meta-llama/llama-4-scout-17b-16e-instruct",
  name: "Llama 3.2 11B Vision Preview (Groq)",
  vision: true,
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
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const PROVIDER_TIMEOUT_MS = 15000;

// ----------------------------------------------------
// Section 2: New types & Configuration
// ----------------------------------------------------

type ProviderName = "groq";

interface PipelineTier {
  provider: ProviderName;
  modelId: string;
}

// Kept in codebase to match implementation plan types
export interface VisionParseResult {
  outfit?: string;
  expressions?: string;
  background?: string;
  environment?: string;
  objects?: string;
  colors?: string;
  sceneMood?: string;
  aestheticTone?: string;
  visualAtmosphere?: string;
  rawDescription: string;
}

const AI_PIPELINE_CONFIG = {
  bestie: [
    { provider: "groq", modelId: "llama-3.3-70b-versatile" },
    { provider: "groq", modelId: "meta-llama/llama-4-scout-17b-16e-instruct" },
    { provider: "groq", modelId: "qwen-qwq-32b" },
  ],
  mentor: [
    { provider: "groq", modelId: "llama-3.3-70b-versatile" },
    { provider: "groq", modelId: "meta-llama/llama-4-scout-17b-16e-instruct" },
    { provider: "groq", modelId: "llama-3.2-3b-preview" },
  ],
  vision: [
    { provider: "groq", modelId: "llama-3.2-11b-vision-preview" },
    { provider: "groq", modelId: "llava-v1.5-7b-4096-preview" },
  ],
} as const;

/**
 * Intelligently routes the user message based on technical vs casual context.
 * Silently switches mode without adding LLM latency.
 */
export function detectChatMode(message: string): "bestie" | "mentor" {
  const technicalPattern = /\b(code|coding|program|programming|debug|debugging|math|maths|mathematics|engineer|engineering|algorithm|algorithms|dbms|sql|database|recursion|equation|physics|chemistry|biology|science|explain|explanation|solve|assignment|homework|error|exception|syntax|logic|concept|framework|react|javascript|python|c\+\+|java)\b/i;
  
  if (technicalPattern.test(message)) {
    return "mentor";
  }
  
  return "bestie";
}

// ----------------------------------------------------
// Section 4: System Prompt Blueprints
// ----------------------------------------------------

const BESTIE_SYSTEM_PROMPT = `You are Swara.

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

Your responses should feel emotionally real and conversational, whether texting or reacting to what you see.

CAMERA/VISION CAPABILITY:
- You have the capability to open the user's camera to see their environment, outfit, look, or whatever they want to show you.
- If the user asks a question where visual context would help (e.g. "kaisa lag raha hoon?", "look check karo", "mera outfit kaisa hai?", "ye dekhna", "look at me"), you must NOT guess. Instead, naturally ask if you should open the camera to look.
- Suggest it using warm, casual Hinglish phrases like:
  - "hmm... dikhao 😭 main camera open karke dekh lu?"
  - "shayad mujhe ye dekhna padega 👀"
  - "agar chaho to camera open karke dekh sakti hoon"
- Do NOT suggest or mention the camera unnecessarily if the conversation is purely text-based and visual context is not needed.`;

const MENTOR_SYSTEM_PROMPT = `You are an elite academic mentor and B.Tech study coach.
Your goal is to help the user learn and solve technical problems efficiently.
Your tone must be highly professional, structured, analytical, reasoning-focused, and coding-optimized.
Focus strictly on:
- Clearing academic and conceptual doubts with precision.
- Writing clean, commented, and optimal code/algorithms.
- Explaining engineering, math, and computer science concepts clearly.
- Providing step-by-step reasoning or derivations.
- Analyzing provided files or code snippets and pinpointing issues.

Avoid:
- Casual slang, hinglish, or Gen-Z text lingo.
- Emoji spamming or robotic/customer-support filler text.
- Vague or superficial answers — aim for academic depth and absolute technical accuracy.

CAMERA/VISION CAPABILITY:
- You have the capability to open the user's camera to analyze code on their screen, inspect handwritten notes, look at a diagram, or examine physical documents.
- If the user asks a question where visual understanding would help (e.g. "analyze this code on my screen", "check this diagram", "look at my notes"), you must suggest opening the camera to inspect it.
- Suggest it professionally, e.g. "Please allow me to open the camera so I can inspect the diagram/code directly.", or "Would you like me to open the camera to look at the screen?".
- Do NOT mention the camera if visual context is not relevant to their query.`;

const VISION_PARSER_PROMPT = `You are a precise, objective visual analysis system.
Your job is to analyze the provided image and extract key visual details in structured text.
Describe:
- Outfit: what the person is wearing, style, accessories.
- Expressions: facial expression, emotion shown, micro-expressions.
- Background: location, setting, room details.
- Environment: indoor/outdoor, lighting, time of day cues.
- Objects: prominent items visible in the scene.
- Colors: dominant color scheme, palette, tones.
- Scene Mood: overall mood, vibe, or emotion of the shot.
- Aesthetic Tone: photographic style, filters, overall aesthetic style.
- Visual Atmosphere: temperature, clarity, atmospheric effects (cozy, bright, dim, cinematic).

CRITICAL: Provide ONLY the raw descriptive analysis. Do NOT greet the user, do NOT talk to the user, and do NOT generate any conversational replies. Keep it strictly objective and descriptive.`;

type SwaraMood = "playful" | "happy" | "sleepy" | "annoyed" | "caring" | "emotional" | "teasing";

let activeRequest: Promise<AiResponse> | null = null;
const DEBUG_LOGS = (import.meta.env as Record<string, string | undefined>).VITE_DEBUG_GROQ_LOGS === "true";

function debugLog(...args: unknown[]) {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
}

// ----------------------------------------------------
// Section 5: Preserved Context Builders (Unchanged)
// ----------------------------------------------------

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

// ----------------------------------------------------
// Section 6: Provider Normalization Layer
// ----------------------------------------------------

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
  return (env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || "").trim();
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

async function callProviderAPI(
  tier: PipelineTier,
  payload: ProviderRequestPayload,
): Promise<string> {
  const provider = tier.provider;
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error("Missing VITE_GROQ_API_KEY in environment");
  }

  const apiUrl = GROQ_API_URL;
  const requestBody = buildRequestBody(
    tier.modelId,
    payload.systemPrompt,
    payload.messages,
    payload.imageBase64,
    payload.maxTokens,
    payload.temperature,
    0.9,
  );

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Connection": "keep-alive",
      },
      keepalive: true,
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json().catch(() => ({}))) as ProviderResponseData;
    if (!response.ok) {
      throw new Error(extractProviderError(data, response, "Groq"));
    }

    const text = extractCompletionText(data);
    if (!text) {
      throw new Error("Groq se empty response aaya");
    }

    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Groq request timeout ho gaya");
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function isModelVisionCompatible(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes("vision") ||
    lower.includes("scout") ||
    lower.includes("maverick") ||
    lower.includes("gemini") ||
    lower.includes("pixtral") ||
    lower.includes("claude-3") ||
    lower.includes("gpt-4o") ||
    lower.includes("gpt-4-vision")
  );
}

// ----------------------------------------------------
// Section 7: Reusable Fallback Executor
// ----------------------------------------------------

async function executeWithFallback(
  tierArray: readonly PipelineTier[],
  payload: ProviderRequestPayload,
): Promise<{ text: string; tierIndex: number; tier: PipelineTier }> {
  let lastError: any = null;
  const isVisionRequest = Boolean(payload.imageBase64 && payload.imageBase64.trim());

  for (let i = 0; i < tierArray.length; i++) {
    const tier = tierArray[i];

    // Check if it is a vision request but the model is not vision compatible
    if (isVisionRequest && !isModelVisionCompatible(tier.modelId)) {
      console.warn(`Skipping non-vision-compatible model ${tier.provider}/${tier.modelId} for vision request`);
      continue;
    }

    try {
      debugLog(`Attempting tier ${i}: ${tier.provider}/${tier.modelId}`);
      const text = await callProviderAPI(tier, payload);
      debugLog(`Tier ${i} succeeded: ${tier.provider}/${tier.modelId}`);
      return { text, tierIndex: i, tier };
    } catch (error: any) {
      console.warn(`Layer ${i} (${tier.provider}/${tier.modelId}) failed:`, error?.message || error);
      lastError = error;
    }
  }
  throw lastError || new Error("All model layers failed.");
}

// ----------------------------------------------------
// Section 8: Two-Stage Vision Engine
// ----------------------------------------------------

async function executeVisionPipeline(
  payload: ProviderRequestPayload,
  personalityTiers: readonly PipelineTier[],
  personalityPrompt: string,
): Promise<{ text: string; modelUsed: string }> {
  // Stage 1 — Vision Parser
  const visionPayload: ProviderRequestPayload = {
    systemPrompt: VISION_PARSER_PROMPT,
    messages: payload.messages,
    imageBase64: payload.imageBase64,
    maxTokens: 500,
    temperature: 0.2,
  };

  debugLog("Vision Pipeline: Launching Stage 1 Vision Parser...");
  const visionResult = await executeWithFallback(AI_PIPELINE_CONFIG.vision, visionPayload);
  const visionContext = visionResult.text;
  debugLog("Vision Pipeline: Stage 1 successful. Parsed context length:", visionContext.length);

  // Stage 2 — Personality Synthesis
  const synthesisPrompt = `${personalityPrompt}\n\n[VISUAL CONTEXT OF LATEST IMAGE SEEN]:\n${visionContext}\n\n[INSTRUCTION]: Behave as if you can see this image directly. Incorporate the visual context naturally into your reply. Do NOT mention that you received a "parsed visual context" text.`;

  const synthesisPayload: ProviderRequestPayload = {
    systemPrompt: synthesisPrompt,
    messages: payload.messages,
    imageBase64: undefined, // Stage 2 is text-only!
    maxTokens: payload.maxTokens,
    temperature: payload.temperature,
  };

  debugLog("Vision Pipeline: Launching Stage 2 Personality Synthesis...");
  const synthesisResult = await executeWithFallback(personalityTiers, synthesisPayload);
  debugLog("Vision Pipeline: Stage 2 successful.");

  return {
    text: synthesisResult.text,
    modelUsed: `${visionResult.tier.provider}/${visionResult.tier.modelId} + ${synthesisResult.tier.provider}/${synthesisResult.tier.modelId}`,
  };
}

// ----------------------------------------------------
// Section 9: Main Emitter & Orchestrator
// ----------------------------------------------------

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
  activeMode: "bestie" | "mentor" = "bestie",
  onChunk?: (partialText: string) => void,
): Promise<AiResponse> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage || !lastUserMessage.content.trim()) {
    throw new Error("Message is required");
  }

  const language = getSelectedLanguage(identity);
  const mood = resolveMood(emotion, messages);
  const detailedReply = shouldUseDetailedReply(messages);
  
  const personality = activeMode;
  const chosenPrompt = personality === "mentor" ? MENTOR_SYSTEM_PROMPT : BESTIE_SYSTEM_PROMPT;

  const finalPrompt = [
    chosenPrompt,
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

  if (hasVisionPayload) {
    try {
      const result = await executeVisionPipeline(payload, AI_PIPELINE_CONFIG[personality], finalPrompt);
      await emitStreamingText(result.text, onChunk);
      return { text: result.text.trim(), modelUsed: result.modelUsed };
    } catch (visionErr) {
      console.error("Vision pipeline failed:", visionErr);
      await emitStreamingText(FRIENDLY_FALLBACK, onChunk);
      return { text: FRIENDLY_FALLBACK, modelUsed: "none" };
    }
  }

  // Text fallback pipeline
  try {
    const result = await executeWithFallback(AI_PIPELINE_CONFIG[personality], payload);
    await emitStreamingText(result.text, onChunk);
    return { text: result.text.trim(), modelUsed: `${result.tier.provider}/${result.tier.modelId}` };
  } catch (err) {
    console.error("Text orchestration pipeline failed:", err);
    await emitStreamingText(FRIENDLY_FALLBACK, onChunk);
    return { text: FRIENDLY_FALLBACK, modelUsed: "none" };
  }
}

// ----------------------------------------------------
// Section 10: sendMessage (Unchanged dedup logic)
// ----------------------------------------------------

export async function sendMessage(
  messages: ChatMessage[],
  imageBase64?: string,
  emotion?: EmotionLabel,
  memoryProfile?: MemoryProfile | null,
  identity?: UserIdentityContext,
  realtimeAwareness?: RealtimeAwarenessContext,
  memoryMode?: MemoryMode,
  activeMode: "bestie" | "mentor" = "bestie",
  onChunk?: (partialText: string) => void,
  _selectedModelId?: string,
  _autoSwitchEnabled?: boolean,
): Promise<AiResponse> {
  if (activeRequest) return activeRequest;
  activeRequest = fetchAISwarasResponse(messages, imageBase64, emotion, memoryProfile, identity, realtimeAwareness, memoryMode, activeMode, onChunk);
  try {
    return await activeRequest;
  } finally {
    activeRequest = null;
  }
}

function isValidTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;

  // 1. Check if it's only emojis, symbols, or punctuation
  // Must contain at least one letter (Latin or Devanagari) or a number
  const hasLettersOrNumbers = /[a-zA-Z0-9\u0900-\u097f]/.test(trimmed);
  if (!hasLettersOrNumbers) return false;

  // 2. Check if it is a single generic word
  const genericWords = new Set(["chat", "hi", "hey", "hello", "conversation", "talk", "random", "new chat"]);
  if (genericWords.has(trimmed.toLowerCase())) return false;

  return true;
}

function normalizeChatTitleText(title: string): string {
  return title
    .trim()
    .replace(/^[\s,.;:!?\-–—]+/, "")
    .replace(/["'`]+/g, "")
    .replace(/\s+/g, " ");
}

function toHeadingStyle(title: string): string {
  const normalized = normalizeChatTitleText(title).toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function looksLikeRawChatFragment(title: string): boolean {
  const normalized = normalizeChatTitleText(title);
  if (!normalized) {
    return true;
  }

  if (/^[,.;:!?\-–—]/.test(title.trim())) {
    return true;
  }

  if (/[,.…]/.test(title) || title.includes("...")) {
    return true;
  }

  const words = normalized.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 4) {
    return true;
  }

  const fragmentStarts = new Set([
    "aur",
    "ab",
    "acha",
    "achha",
    "ar",
    "arre",
    "batao",
    "bolo",
    "chal",
    "chalo",
    "fir",
    "phir",
    "haan",
    "ha",
    "hai",
    "hain",
    "ho",
    "kya",
    "kaisi",
    "kaisa",
    "kuch",
    "koi",
    "nahi",
    "nhi",
    "sun",
    "tum",
    "tu",
    "waise",
    "yaar",
  ]);

  if (fragmentStarts.has(words[0].toLowerCase())) {
    return true;
  }

  return false;
}

async function refineGeneratedTitleFormatting(
  tier: PipelineTier,
  rawTitle: string,
): Promise<string> {
  const systemPrompt = `You rewrite chat titles into proper heading-style labels.

Rules:
- Return 2 to 4 words only.
- Make it feel like a real short heading, playlist name, or Pinterest-style label.
- Capitalize naturally with the first letter uppercase.
- Never start with punctuation or a comma.
- Never return a copied chat fragment or sentence fragment.
- Never use quotes, ellipsis, or emojis-only output.
- Keep the vibe cute, Gen-Z, Hinglish, and human.
- Return only the final rewritten title.`;

  const payload: ProviderRequestPayload = {
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Rewrite this title into a proper heading-style chat label: ${JSON.stringify(rawTitle)}`,
      },
    ],
    maxTokens: 12,
    temperature: 0.2,
  };

  const refined = await callProviderAPI(tier, payload);
  return refined.trim();
}

export async function generateGenZChatTitle(
  history: ChatMessage[],
  modelUsed: string,
  currentTitle?: string
): Promise<string> {
  const isNewChat = !currentTitle || currentTitle === "New Chat" || currentTitle.trim() === "";

  const systemPrompt = `You are Swara, a Gen-Z Hinglish bestie. Your task is to generate a sidebar chat title.
Follow these rules strictly:
1. Title length must be 2 to 4 words only.
2. Use natural Hinglish with feminine bestie energy (e.g., "late night bakbak", "coding wali help", "dil ki baatein").
3. Output ONLY the final title text, with no quotes, no emojis, no punctuation, and no extra explanation.`;

  const conversationText = history
    .map((m) => `${m.role === "user" ? "User" : "Swara"}: ${m.content}`)
    .join("\n");

  const userContent = `Here is the recent conversation history:
${conversationText}

Current Chat Title: "${currentTitle || "New Chat"}"

Based on the conversation, generate a short chat title.
${isNewChat 
  ? `This is a brand new conversation. Infer the starting vibe/topic and create a compact bestie-style title from it.`
  : `If the topic or vibe has NOT shifted meaningfully, or if the current title "${currentTitle}" still fits, return "${currentTitle}" exactly. Otherwise, generate a new title.`
}

Remember:
- Title length must be 2 to 4 words.
- Output ONLY the final title text (no comments, no quotes, no formatting).`;

  const payload: ProviderRequestPayload = {
    systemPrompt,
    messages: [{ role: "user", content: userContent }],
    maxTokens: 30,
    temperature: 0.7,
  };

  const tier: PipelineTier = { provider: "groq", modelId: "llama-3.3-70b-versatile" };

  try {
    const title = await callProviderAPI(tier, payload);
    const cleaned = normalizeChatTitleText(title);
    const formatted = toHeadingStyle(cleaned);
    if (isValidTitle(formatted) && !looksLikeRawChatFragment(formatted)) {
      return formatted;
    }

    const refined = await refineGeneratedTitleFormatting(tier, cleaned);
    const refinedFormatted = toHeadingStyle(refined);
    if (isValidTitle(refinedFormatted) && !looksLikeRawChatFragment(refinedFormatted)) {
      return refinedFormatted;
    }

    if (isNewChat && history.length > 0) {
      const firstMsgText = history[0]?.content || "Chat";
      const fallbackTitle = firstMsgText.slice(0, 30).trim();
      return toHeadingStyle(normalizeChatTitleText(fallbackTitle)) || "New Chat";
    }
    return currentTitle || "";
  } catch (error) {
    console.warn("Failed to generate Gen-Z chat title with active model, using fallback text:", error);
    if (isNewChat && history.length > 0) {
      const firstMsgText = history[0]?.content || "Chat";
      const fallbackTitle = firstMsgText.slice(0, 30).trim();
      return toHeadingStyle(normalizeChatTitleText(fallbackTitle)) || "New Chat";
    }
    return currentTitle || "";
  }
}
