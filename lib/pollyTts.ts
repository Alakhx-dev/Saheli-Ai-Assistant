import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const DEFAULT_VOICE_ID = "Kajal";
const DEFAULT_ENGINE = "neural";
const BUBBLY_PLAYBACK_RATE = "0.88";
const BUBBLY_PITCH = "+35%";
const BUBBLY_VOLUME = "-6dB";
const FALLBACK_PLAYBACK_RATE = "100%";
const FALLBACK_PITCH = "+28%";
const FALLBACK_VOLUME = "-4dB";

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[#*0-9]\uFE0F?\u20E3)+/gu;
const INERT_CHAR_REGEX = /[\u200B-\u200F\u2060\uFE00-\uFE0F\u00AD]/g;

type PollyEnv = {
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
};

function getPollyClient(env: PollyEnv | NodeJS.ProcessEnv = process.env) {
  const region = env.AWS_REGION?.trim();
  if (!region) {
    throw new Error("Missing AWS_REGION");
  }

  const accessKeyId = env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY");
  }

  return new PollyClient({
    region: "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function normalizeTtsText(rawText: string) {
  return rawText
    .normalize("NFKC")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.[^\s]+/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(EMOJI_REGEX, " ")
    .replace(INERT_CHAR_REGEX, "")
    .replace(/['"’“”]/g, "")
    .replace(/[\u200D\uFE0E\uFE0F]/g, "")
    .replace(/[*_#~]/g, "")
    .replace(/[\[\]{}<>|^`+=\\/]/g, " ")
    .replace(/[:;]-?[()DPp]/g, "")
    .replace(/\b([A-Z]{2,})\b/g, (_, token: string) => token.toLowerCase())
    .replace(/\b(?:[A-Za-z]\.){2,}/g, (match) => match.replace(/\./g, ""))
    .replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (match) => match.replace(/\s+/g, ""))
    .replace(/\b[A-Z]{2,4}\b/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyHinglishPhoneticFixes(text: string) {
  return text
    .toLowerCase()
    .replace(EMOJI_REGEX, " ")
    .replace(INERT_CHAR_REGEX, "")
    .replace(/\bhelo\b/g, "helow")
    .replace(/\bhi\b/g, "heyy")
    .replace(/\bachhe\b/g, "ach-chey")
    .replace(/\bkaise\b/g, "kaisay")
    .replace(/\bkr\b/g, "kar")
    .replace(/\bkar\b/g, "karr")
    .replace(/\brhe\b/g, "rahe")
    .replace(/\bh\b/g, "hai")
    .replace(/\bhu\b/g, "hoon")
    .replace(/\bho\b/g, "hooo")
    .replace(/\bhai\b/g, "hai")
    .replace(/\btm\b/g, "tum")
    .replace(/\btum\b/g, "tummm")
    .replace(/\bthik\b/g, "theek")
    .replace(/\btheek\b/g, "theeyk hai")
    .replace(/\bkya\b/g, "kyaa")
    .replace(/['"’“”]/g, "")
    .replace(/[*_#~]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function preparePollyText(rawText: string) {
  return applyHinglishPhoneticFixes(normalizeTtsText(rawText));
}

function escapeForSsml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildBubblySsml(text: string) {
  const escaped = escapeForSsml(text);
  return `<speak><amazon:domain name="conversational"><prosody pitch="${BUBBLY_PITCH}" rate="${BUBBLY_PLAYBACK_RATE}" volume="${BUBBLY_VOLUME}"><amazon:effect name="softened"><amazon:breath duration="short" volume="soft"/>${escaped}<amazon:breath duration="short" volume="soft"/></amazon:effect></prosody></amazon:domain></speak>`;
}

function buildFallbackSsml(text: string) {
  const escaped = escapeForSsml(text);
  return `<speak><amazon:domain name="conversational"><prosody pitch="${FALLBACK_PITCH}" rate="${FALLBACK_PLAYBACK_RATE}" volume="${FALLBACK_VOLUME}">${escaped}</prosody></amazon:domain></speak>`;
}

export async function synthesizePollyAudioBase64(text: string, env?: PollyEnv) {
  const cleanText = preparePollyText(text);
  if (!cleanText) {
    return null;
  }

  const pollyClient = getPollyClient(env);
  let response;
  try {
    response = await pollyClient.send(new SynthesizeSpeechCommand({
      Text: buildBubblySsml(cleanText),
      TextType: "ssml",
      OutputFormat: "mp3",
      SampleRate: "22050",
      VoiceId: DEFAULT_VOICE_ID,
      Engine: DEFAULT_ENGINE,
      LanguageCode: "hi-IN",
    }));
  } catch {
    // Some voices/regions reject richer SSML combinations; fall back to a lighter SSML variant.
    response = await pollyClient.send(new SynthesizeSpeechCommand({
      Text: buildFallbackSsml(cleanText),
      TextType: "ssml",
      OutputFormat: "mp3",
      SampleRate: "22050",
      VoiceId: DEFAULT_VOICE_ID,
      Engine: DEFAULT_ENGINE,
      LanguageCode: "hi-IN",
    })).catch(() => {
      // Final fallback keeps speech available if SSML features are not supported for a request.
      return pollyClient.send(new SynthesizeSpeechCommand({
        Text: cleanText,
        OutputFormat: "mp3",
        SampleRate: "22050",
        VoiceId: DEFAULT_VOICE_ID,
        Engine: DEFAULT_ENGINE,
        LanguageCode: "hi-IN",
        TextType: "text",
      }));
    });
  }

  const audioStream = response.AudioStream;
  if (!audioStream || typeof (audioStream as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray !== "function") {
    return null;
  }

  const bytes = await (audioStream as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(bytes).toString("base64");
}
