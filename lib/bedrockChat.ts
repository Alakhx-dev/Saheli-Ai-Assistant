import { BedrockRuntimeClient, ConverseCommand, Message, ContentBlock } from "@aws-sdk/client-bedrock-runtime";

export interface BedrockChatConfig {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION?: string;
}

export interface BedrockChatRequest {
  systemPrompt: string;
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  history?: Array<{ role: string; content: string }>;
  image?: string;
  imageBase64?: string;
  maxTokens?: number;
  temperature?: number;
}

export const BEDROCK_MODELS = [
  {
    id: "anthropic.claude-3-haiku-20240307-v1:0",
    name: "Haiku (Primary)",
    vision: true,
  },
  {
    id: "meta.llama4-maverick-17b-instruct-v1:0",
    name: "Maverick (Backup)",
    vision: false,
  },
  {
    id: "anthropic.claude-3-sonnet-20240229-v1:0",
    name: "Sonnet (Final fallback)",
    vision: true,
  },
];

function extractFormatAndDecode(base64: string): { format: string; bytes: Uint8Array; mediaType: string } {
  const match = base64.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
  const rawFormat = match ? match[1].toLowerCase() : "jpeg";
  let format = "jpeg";
  let mediaType = "image/jpeg";
  if (rawFormat === "png") {
    format = "png";
    mediaType = "image/png";
  }
  if (rawFormat === "webp") {
    format = "webp";
    mediaType = "image/webp";
  }
  if (rawFormat === "gif") {
    format = "gif";
    mediaType = "image/gif";
  }

  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined") {
    bytes = Buffer.from(cleanBase64, "base64");
  } else {
    const binary = atob(cleanBase64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  }

  return { format, bytes, mediaType };
}

function isRetryableError(err: any) {
  const msg = (err?.message || "" + (err || "")).toString().toLowerCase();
  return (
    msg.includes("access denied") ||
    msg.includes("legacy") ||
    msg.includes("resourcenotfound") ||
    msg.includes("resource not found") ||
    msg.includes("429") ||
    msg.includes("throttling")
  );
}

export async function processBedrockChat(payload: BedrockChatRequest, config: BedrockChatConfig) {
  const { systemPrompt, message, messages, history, image, imageBase64, maxTokens, temperature } = payload;

  const region = (config.AWS_REGION || process.env.AWS_REGION || "us-east-1").trim();

  const latestImage = imageBase64 || image;
  const rawMessages = (history && history.length ? history : messages && messages.length ? messages : []) as Array<{ role: string; content: string }>;
  const normalizedMessages = rawMessages.length
    ? rawMessages
    : message
      ? [{ role: "user", content: message }]
      : [];

  if (!normalizedMessages.length) {
    throw new Error("Message is required");
  }

  for (const model of BEDROCK_MODELS) {
    try {
      console.log(`Trying model: ${model.id}`);

      if (latestImage && model.vision === false) {
        console.log(`Skipped (no vision): ${model.id}`);
        continue;
      }

      const bedrockClient = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        },
      });

      const mappedMessages: Message[] = normalizedMessages.map((msg, index) => {
        const contentBlocks: ContentBlock[] = [];

        if (msg.role === "user" && index === normalizedMessages.length - 1 && latestImage) {
          contentBlocks.push({ text: msg.content });
          const { format, bytes } = extractFormatAndDecode(latestImage);
          contentBlocks.push({
            image: {
              format: format as any,
              source: {
                bytes,
              },
            },
          });
        } else {
          contentBlocks.push({ text: msg.content });
        }

        return {
          role: msg.role === "assistant" || msg.role === "model" ? "assistant" : "user",
          content: contentBlocks,
        };
      });

      const command = new ConverseCommand({
        modelId: model.id,
        messages: mappedMessages,
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          maxTokens: maxTokens || 320,
          temperature: temperature || 0.8,
        },
      });

      const response = await bedrockClient.send(command);

      const textBlock = response.output?.message?.content?.find((block) => "text" in block) as { text?: string } | undefined;
      const textOutput = textBlock?.text?.trim();

      if (!textOutput) {
        console.log(`Model failed (empty response): ${model.id}`);
        // continue to next model
        continue;
      }

      console.log(`Model success: ${model.id}`);
      return textOutput;
    } catch (error: any) {
      console.error(`Model failed: ${model.id}`, error?.message || error);
      if (isRetryableError(error)) {
        // Try next model
        continue;
      }
      // Non-retryable, rethrow
      throw error;
    }
  }

  // All models failed — final fail-safe
  const fallback = "AI models abhi available nahi hain. Thodi der baad try karo.";
  console.log("All Bedrock models failed — returning fallback message.");
  return fallback;
}
