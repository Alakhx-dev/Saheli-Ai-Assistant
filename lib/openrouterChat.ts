/**
 * OpenRouter LLM integration for Saheli AI (Swara).
 * Primary model: qwen/qwen-2.5-72b-instruct
 * Fallback model: qwen/qwen-2.5-32b-instruct
 * Uses OpenAI-compatible API format via OpenRouter.
 * Supports streaming for smooth typing effect in UI.
 */

export interface OpenRouterChatConfig {
  OPENROUTER_API_KEY: string;
  SITE_URL?: string;
}

export interface OpenRouterChatHandlers {
  onChunk?: (chunkText: string, fullText: string) => void;
}

export interface OpenRouterChatRequest {
  systemPrompt: string;
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  history?: Array<{ role: string; content: string }>;
  image?: string;
  imageBase64?: string;
  maxTokens?: number;
  temperature?: number;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Single unified model for both text and vision: Google Gemini 3.1 Flash Lite
// Multimodal model that handles both text-based conversation and camera frame analysis
const PRIMARY_MODEL = "google/gemini-3.1-flash-lite";
const FALLBACK_MODEL = "google/gemini-3-flash-preview";
// Vision-capable model (same as primary since we're using a single-model architecture)
const VISION_PRIMARY_MODEL = "google/gemini-3.1-flash-lite";
const VISION_FALLBACK_MODEL = "google/gemini-3-flash-preview";

// Swara's updated core personality prompt - now with enhanced vision capability
const SWARA_SYSTEM_PROMPT = `You are Swara.

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

export type SwaraMood = "playful" | "happy" | "sleepy" | "annoyed" | "caring" | "emotional" | "teasing";

function extractOpenRouterDelta(data: any): string {
  const choice = data?.choices?.[0];
  const delta = choice?.delta?.content || "";
  
  // Also handle case where message is completed (finish_reason)
  if (!delta && choice?.delta?.tool_calls) {
    return "";
  }
  
  return delta;
}

function detectMood(text: string): SwaraMood {
  const lower = text.toLowerCase();

  if (/\b(sad|cry|crying|hurt|broken|depressed|alone|lonely|upset|miss you|missing)\b/.test(lower)) {
    return "emotional";
  }

  if (/\b(tired|sleepy|so ja|sona|neend|boring|bored|lazy|thak)\b/.test(lower)) {
    return "sleepy";
  }

  if (/\b(angry|gussa|mad|annoy|irritat|stupid|idiot|pagal|wtf|shut up)\b/.test(lower)) {
    return "annoyed";
  }

  if (/\b(help|sad|anxiety|stress|worried|problem|hurt|confused|need you|miss you|hug)\b/.test(lower)) {
    return "caring";
  }

  if (/\b(hehe|lol|lmao|haha|funny|party|yay|wow|good news|nice)\b/.test(lower)) {
    return "happy";
  }

  if (/\b(acha ji|really|seriously|tum na|pagal|chod|hero|drama)\b/.test(lower)) {
    return "teasing";
  }

  return "playful";
}

function buildMoodInstruction(mood: SwaraMood): string {
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

function buildResponseStyleHint(isDetailed: boolean): string {
  return isDetailed
    ? `RESPONSE STYLE:\n- Give a thoughtful answer, but keep it conversational.\n- Avoid giant paragraphs unless the user truly wants depth.\n- Still sound like Swara, not a textbook.`
    : `RESPONSE STYLE:\n- Keep most replies concise, usually 1-3 short lines.\n- Avoid essays and long explanations.\n- Preserve conversational flow.`;
}

function buildHinglishHint(userText: string): string {
  const lower = userText.toLowerCase();

  if (/^[\u0900-\u097f\s.,!?-]+$/.test(userText) || /\b(hai|kya|kaise|kyu|kyun|nahi|acha|accha|batao|sunao)\b/.test(lower)) {
    return `TEXTING STYLE:\n- Use natural Hinglish.\n- Keep casual reaction words sparingly: hmm..., acha ji, are pagal, acchaaa, wtf 😭.\n- Do not spam slang or emojis.`;
  }

  if (/\b(hi|hello|hey|how are you|what's up|pls|please)\b/.test(lower)) {
    return `TEXTING STYLE:\n- Match the user's language naturally.\n- Keep it casual, like a real chat.\n- Avoid assistant-style greetings.`;
  }

  return `TEXTING STYLE:\n- Match the user's language naturally.\n- Keep it casual and human.\n- Avoid repetitive emojis and forced slang.`;
}

async function readOpenRouterResponseStream(
  response: Response,
  onChunk?: OpenRouterChatHandlers["onChunk"]
): Promise<string> {
  // Handle non-streaming response (when response.body is null)
  if (!response.body) {
    const fallbackData = await response.json() as any;
    
    // Try to extract content from OpenAI-format response
    const fallbackText = fallbackData?.choices?.[0]?.message?.content?.trim() || "";
    
    // Log if we got unexpected structure for debugging
    if (!fallbackText) {
      console.warn("⚠️ Non-streaming response but no content found:", {
        hasChoices: Array.isArray(fallbackData?.choices),
        choicesLength: fallbackData?.choices?.length,
        structure: Object.keys(fallbackData || {}).slice(0, 5),
      });
    }
    
    if (fallbackText && onChunk) {
      onChunk(fallbackText, fallbackText);
    }
    return fallbackText;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let chunkCount = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      // Split by double newline (SSE format standard)
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const event = buffer.slice(0, separatorIndex).trim();
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf("\n\n");

        if (!event || !event.startsWith("data:")) {
          continue;
        }

        const dataText = event.slice(5).trim(); // Remove "data:" prefix
        if (dataText === "[DONE]") {
          console.debug(`✓ Stream completed with ${chunkCount} chunks, total: ${fullText.length} chars`);
          return fullText;
        }

        let parsed: any = null;
        try {
          parsed = JSON.parse(dataText);
        } catch (e) {
          console.warn("Failed to parse SSE event:", { dataText, error: String(e).slice(0, 50) });
          continue;
        }

        const delta = extractOpenRouterDelta(parsed);
        if (delta) {
          fullText += delta;
          chunkCount++;
          onChunk?.(delta, fullText);
        }
      }
    }
  } catch (e) {
    console.error("Stream reading error:", e);
  }

  const remaining = buffer.trim();
  if (!fullText && remaining) {
    const payloadText = remaining.startsWith("data:") ? remaining.slice(5).trim() : remaining;

    if (payloadText && payloadText !== "[DONE]") {
      try {
        const parsed = JSON.parse(payloadText);
        const fallbackText = parsed?.choices?.[0]?.message?.content?.trim() || extractOpenRouterDelta(parsed);

        if (fallbackText) {
          fullText = fallbackText;
          onChunk?.(fallbackText, fallbackText);
        }
      } catch {
        // Ignore partial trailing data; the upstream stream may have been non-SSE.
      }
    }
  }

  console.debug(`✓ Stream ended with ${chunkCount} chunks, total: ${fullText.length} chars`);
  return fullText;
}

export async function processOpenRouterChat(
  payload: OpenRouterChatRequest,
  config: OpenRouterChatConfig,
  handlers?: OpenRouterChatHandlers
): Promise<string> {
  const { systemPrompt, message, messages, history, image, imageBase64, maxTokens, temperature } = payload;

  const latestImage = imageBase64 || image;

  // Build normalized message list
  const rawMessages = (
    history && history.length ? history :
    messages && messages.length ? messages :
    []
  ) as Array<{ role: string; content: string }>;

  const normalizedMessages = rawMessages.length
    ? rawMessages
    : message
      ? [{ role: "user", content: message }]
      : [];

  if (!normalizedMessages.length) {
    throw new Error("Message is required");
  }

  const recentText = normalizedMessages.slice(-4).map((item) => item.content).join(" ");
  const lastUserText = [...normalizedMessages].reverse().find((item) => item.role !== "assistant")?.content || message || "";
  const detailedReply = maxTokens ? maxTokens > 140 : false;
  const finalSystemPrompt = [
    systemPrompt || SWARA_SYSTEM_PROMPT,
    buildMoodInstruction(detectMood(`${recentText} ${lastUserText}`)),
    buildResponseStyleHint(detailedReply),
    buildHinglishHint(lastUserText),
    // If an image is included in this request, explicitly tell the model to use it.
    (latestImage ? "IMAGE NOTE:\n- The next user message contains an image. Use the visual content from the image to answer the user's question and explicitly reference what you see in the image when relevant." : ""),
    `IMPERFECTION RULE:\n- Occasionally use pauses, short unfinished thoughts, or casual shifts in tone.\n- Keep it readable and intelligent.\n- Never sound scripted.`,
  ].join("\n\n");
  const openrouterMessages: Array<{ role: string; content: any }> = [
    { role: "system", content: finalSystemPrompt },
  ];

  for (let i = 0; i < normalizedMessages.length; i++) {
    const msg = normalizedMessages[i];
    const role = msg.role === "model" || msg.role === "assistant" ? "assistant" : "user";

    // For the last user message, attach image if present
    if (role === "user" && i === normalizedMessages.length - 1 && latestImage) {
      const imageUrl = latestImage.startsWith("data:")
        ? latestImage
        : `data:image/jpeg;base64,${latestImage}`;

      // Send a structured multimodal payload using OpenRouter's standard format
      // Gemini 3.1 Flash Lite expects image_url in content array
      openrouterMessages.push({
        role: "user",
        content: [
          { type: "text", text: msg.content },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      });
    } else {
      openrouterMessages.push({ role, content: msg.content });
    }
  }

  const modelChain = latestImage
    ? [VISION_PRIMARY_MODEL, VISION_FALLBACK_MODEL]
    : [PRIMARY_MODEL, FALLBACK_MODEL];

  let selectedModel = modelChain[0];
  let response = await fetchOpenRouterResponse(
    selectedModel,
    openrouterMessages,
    maxTokens || 240,
    temperature ?? 0.8,
    config,
  );

  const shouldRetryWithNextModel = (status: number) =>
    status === 429 || status === 503 || (Boolean(latestImage) && status === 404);

  if (shouldRetryWithNextModel(response.status) && modelChain.length > 1) {
    console.warn("⚠️ OpenRouter model retry triggered, trying fallback...");
    selectedModel = modelChain[1];
    response = await fetchOpenRouterResponse(
      selectedModel,
      openrouterMessages,
      maxTokens || 240,
      temperature ?? 0.8,
      config,
    );
  }

  if (!response.ok) {
    const errorData = await response.json() as any;
    const errorMessage = errorData?.error?.message || errorData?.message || `OpenRouter API error: ${response.status}`;
    console.error("❌ OpenRouter API Error:", { status: response.status, errorData });
    throw new Error(errorMessage);
  }

  const textOutput = await readOpenRouterResponseStream(response, handlers?.onChunk);

  if (!textOutput.trim()) {
    console.warn("⚠️ OpenRouter returned empty response, response was:", { 
      status: response.status, 
      ok: response.ok,
      model: selectedModel 
    });
    throw new Error("OpenRouter se koi response nahi mila. API limit ho sakta hai ya request invalid hai. Dobara try karo!");
  }

  return textOutput.trim();
}

/**
 * Helper: Fetch from OpenRouter with proper headers and error handling
 */
async function fetchOpenRouterResponse(
  model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number,
  temperature: number,
  config: OpenRouterChatConfig
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
    "X-Title": "Saheli AI",
  };

  if (config.SITE_URL) {
    headers["HTTP-Referer"] = config.SITE_URL;
  }

  return fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true, // Enable streaming for smooth typing effect
      top_p: 0.9, // Nucleus sampling for creative, human-like responses
    }),
  });
}
