/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent as HttpsAgent } from "node:https";

const DEFAULT_VOICE_ID = "Kajal";
const DEFAULT_ENGINE = "neural";
const BUBBLY_PLAYBACK_RATE = "0.88";
const BUBBLY_PITCH = "+35%";
const BUBBLY_VOLUME = "-6dB";
const FALLBACK_PLAYBACK_RATE = "100%";
const FALLBACK_PITCH = "+28%";
const FALLBACK_VOLUME = "-4dB";
const POLLY_REGION = "ap-south-1";

const keepAliveAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 60_000,
});

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[#*0-9]\uFE0F?\u20E3)+/gu;
const INERT_CHAR_REGEX = /[\u200B-\u200F\u2060\uFE00-\uFE0F\u00AD]/g;

function getPollyClient() {
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || "").trim();
  const region = (process.env.AWS_REGION || POLLY_REGION).trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in environment");
  }

  return new PollyClient({
    region,
    requestHandler: new NodeHttpHandler({
      httpsAgent: keepAliveAgent,
    }),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function normalizeTtsText(rawText: string) {
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

function preparePollyText(rawText: string) {
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

function buildBubblySsml(text: string) {
  const escaped = escapeForSsml(text);
  return `<speak><amazon:domain name="conversational"><prosody pitch="${BUBBLY_PITCH}" rate="${BUBBLY_PLAYBACK_RATE}" volume="${BUBBLY_VOLUME}"><amazon:effect name="softened"><amazon:breath duration="short" volume="soft"/>${escaped}<amazon:breath duration="short" volume="soft"/></amazon:effect></prosody></amazon:domain></speak>`;
}

function buildFallbackSsml(text: string) {
  const escaped = escapeForSsml(text);
  return `<speak><amazon:domain name="conversational"><prosody pitch="${FALLBACK_PITCH}" rate="${FALLBACK_PLAYBACK_RATE}" volume="${FALLBACK_VOLUME}">${escaped}</prosody></amazon:domain></speak>`;
}

async function synthesizePollyAudioBase64(text: string) {
  const cleanText = preparePollyText(text);
  if (!cleanText) {
    return null;
  }

  const pollyClient = getPollyClient();
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
    response = await pollyClient.send(new SynthesizeSpeechCommand({
      Text: buildFallbackSsml(cleanText),
      TextType: "ssml",
      OutputFormat: "mp3",
      SampleRate: "22050",
      VoiceId: DEFAULT_VOICE_ID,
      Engine: DEFAULT_ENGINE,
      LanguageCode: "hi-IN",
    })).catch(() => {
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

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hasAwsCredentials() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

async function parseBodyText(req: any): Promise<string> {
  if (typeof req.json === "function") {
    try {
      const data = await req.json();
      return String(data?.text || "").trim();
    } catch {
      return "";
    }
  }

  if (req.body) {
    if (typeof req.body === "object") {
      return String(req.body.text || "").trim();
    }
    if (typeof req.body === "string") {
      try {
        const parsed = JSON.parse(req.body);
        return String(parsed?.text || "").trim();
      } catch {
        return req.body.trim();
      }
    }
  }

  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(String(parsed?.text || "").trim());
      } catch {
        resolve(raw.trim());
      }
    });
    req.on("error", () => resolve(""));
  });
}

export default async function handler(req: any, res?: any) {
  // 1. Node.js Serverless Function mode (Vercel standard runtime)
  if (res && (typeof res.setHeader === "function" || typeof res.status === "function")) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (typeof res.setHeader === "function") {
        res.setHeader(key, value);
      }
    }

    if (req.method === "OPTIONS") {
      if (typeof res.status === "function") {
        return res.status(200).end("ok");
      }
      res.statusCode = 200;
      return res.end("ok");
    }

    if (req.method !== "POST") {
      const errJson = JSON.stringify({ error: "Method not allowed" });
      if (typeof res.status === "function") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      return res.end(errJson);
    }

    if (!hasAwsCredentials()) {
      const errJson = JSON.stringify({ error: "Missing AWS Polly credentials in Vercel environment variables" });
      if (typeof res.status === "function") {
        return res.status(500).json({ error: "Missing AWS Polly credentials in Vercel environment variables" });
      }
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(errJson);
    }

    try {
      const rawText = await parseBodyText(req);
      if (!rawText) {
        res.statusCode = 204;
        return res.end();
      }

      const audioBase64 = await synthesizePollyAudioBase64(rawText);
      if (!audioBase64) {
        res.statusCode = 204;
        return res.end();
      }

      const bytes = Buffer.from(audioBase64, "base64");
      res.statusCode = 200;
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-cache");
      return res.end(bytes);
    } catch (error: any) {
      console.error("Polly TTS route failed:", error);
      const errJson = JSON.stringify({ error: error?.message || "TTS Failed" });
      if (typeof res.status === "function") {
        return res.status(500).json({ error: error?.message || "TTS Failed" });
      }
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(errJson);
    }
  }

  // 2. Web Standard Request/Response mode (Edge runtime / Fetch event)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!hasAwsCredentials()) {
    return new Response(JSON.stringify({ error: "Missing AWS Polly credentials in Vercel environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawText = await parseBodyText(req);
    if (!rawText) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const audioBase64 = await synthesizePollyAudioBase64(rawText);
    if (!audioBase64) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const bytes = Buffer.from(audioBase64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Polly TTS route failed:", error);
    return new Response(JSON.stringify({ error: error?.message || "TTS Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
