/**
 * Groq Cloud LLM integration for Saheli AI (Swara).
 * Model: llama-3.2-11b-vision-preview (free, fast, vision-capable)
 * Uses OpenAI-compatible API format via direct fetch.
 */

export interface GroqChatConfig {
  GROQ_API_KEY: string;
}

export interface GroqChatHandlers {
  onChunk?: (chunkText: string, fullText: string) => void;
}

export interface GroqChatRequest {
  systemPrompt: string;
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  history?: Array<{ role: string; content: string }>;
  image?: string;
  imageBase64?: string;
  maxTokens?: number;
  temperature?: number;
}

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function extractGroqDelta(data: any): string {
  const choice = data?.choices?.[0];
  return (
    choice?.delta?.content ||
    choice?.message?.content ||
    data?.delta?.content ||
    data?.content ||
    ""
  );
}

async function readGroqResponseStream(response: Response, onChunk?: GroqChatHandlers["onChunk"]): Promise<string> {
  if (!response.body) {
    const fallbackData = await response.json();
    const fallbackText = fallbackData?.choices?.[0]?.message?.content?.trim() || "";
    if (fallbackText && onChunk) {
      onChunk(fallbackText, fallbackText);
    }
    return fallbackText;
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
      if (dataText === "[DONE]") {
        return fullText;
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(dataText);
      } catch {
        continue;
      }

      const delta = extractGroqDelta(parsed);
      if (!delta) {
        const finalText = parsed?.choices?.[0]?.message?.content?.trim();
        if (finalText && !fullText) {
          fullText = finalText;
          onChunk?.(fullText, fullText);
        }
        continue;
      }

      fullText += delta;
      onChunk?.(delta, fullText);
    }
  }

  const trailingText = buffer.trim();
  if (trailingText) {
    try {
      const parsed = JSON.parse(trailingText);
      const delta = extractGroqDelta(parsed);
      if (delta) {
        fullText += delta;
        onChunk?.(delta, fullText);
      }
    } catch {
      // Ignore trailing partial frames.
    }
  }

  return fullText;
}

export async function processGroqChat(
  payload: GroqChatRequest,
  config: GroqChatConfig,
  handlers?: GroqChatHandlers,
): Promise<string> {
  const { systemPrompt, message, messages, history, image, imageBase64, maxTokens, temperature } = payload;

  const latestImage = imageBase64 || image;

  // Build normalized message list from history/messages/single message
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

  // Build OpenAI-compatible messages array
  const groqMessages: Array<{ role: string; content: any }> = [
    { role: "system", content: systemPrompt },
  ];

  for (let i = 0; i < normalizedMessages.length; i++) {
    const msg = normalizedMessages[i];
    const role = msg.role === "model" || msg.role === "assistant" ? "assistant" : "user";

    // For the last user message, attach the image if present
    if (role === "user" && i === normalizedMessages.length - 1 && latestImage) {
      // Ensure the image has the data URI prefix
      const imageUrl = latestImage.startsWith("data:")
        ? latestImage
        : `data:image/jpeg;base64,${latestImage}`;

      groqMessages.push({
        role: "user",
        content: [
          { type: "text", text: msg.content },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      });
    } else {
      groqMessages.push({ role, content: msg.content });
    }
  }

  console.log(`🚀 Groq request → model: ${GROQ_MODEL}, messages: ${groqMessages.length}, hasImage: ${!!latestImage}`);

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      max_tokens: maxTokens || 320,
      temperature: temperature || 0.8,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || errorData?.message || `Groq API error: ${response.status}`;
    console.error("❌ Groq API Error:", errorData);
    throw new Error(errorMessage);
  }

  const textOutput = await readGroqResponseStream(response, handlers?.onChunk);

  if (!textOutput.trim()) {
    console.warn("⚠️ Groq returned empty response");
    throw new Error("AI se koi response nahi aaya. Dobara try karo.");
  }

  const finalText = textOutput.trim();
  console.log(`✅ Groq success → ${finalText.length} chars`);
  return finalText;
}
