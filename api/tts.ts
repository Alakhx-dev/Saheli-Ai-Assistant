export const runtime = "edge";

const INWORLD_TTS_BASE = "https://api.inworld.ai/tts/v1";
const DEFAULT_MODEL_ID = "inworld-tts-1.5-max";
const DEFAULT_VOICE_ID = "default-exsg-odgaqb9kgydhmbw-w__design-voice-14078e0a";
const ALAKH_VOICE_ID = "default-exsg-odgaqb9kgydhmbw-w__alakh";
const DEFAULT_SPEAKING_RATE = 0.96;
const DEFAULT_TEMPERATURE = 1.29;
const ALAKH_SPEAKING_RATE = 0.91;
const ALAKH_TEMPERATURE = 1.09;
const REQUEST_TIMEOUT_MS = 15000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROMAN_TO_DEVANAGARI: Record<string, string> = {
  aap: "आप",
  acha: "अच्छा",
  accha: "अच्छा",
  achhi: "अच्छी",
  achha: "अच्छा",
  aur: "और",
  baat: "बात",
  batao: "बताओ",
  bata: "बता",
  bilkul: "बिल्कुल",
  bohot: "बहुत",
  bahut: "बहुत",
  dino: "दिनों",
  din: "दिन",
  gaya: "गया",
  gayi: "गई",
  hai: "है",
  ho: "हो",
  hu: "हूं",
  hun: "हूं",
  h: "है",
  kaise: "कैसे",
  kaisi: "कैसी",
  kya: "क्या",
  kyu: "क्यों",
  kyun: "क्यों",
  mai: "मैं",
  main: "मैं",
  mera: "मेरा",
  meri: "मेरी",
  mujhe: "मुझे",
  nahi: "नहीं",
  nhi: "नहीं",
  rehna: "रहना",
  raha: "रहा",
  rahi: "रही",
  raat: "रात",
  sab: "सब",
  sirf: "सिर्फ",
  theek: "ठीक",
  thik: "ठीक",
  tum: "तुम",
  tumhe: "तुम्हें",
  tumhara: "तुम्हारा",
  yaar: "यार",
  yaad: "याद",
};

type ActionType = "synthesize" | "stream" | "clone";

type TtsPayload = {
  action?: ActionType;
  text?: string;
  voiceId?: string;
  voice_id?: string;
  modelId?: string;
  model_id?: string;
  timestampType?: "WORD" | "NONE";
  audioConfig?: {
    speakingRate?: number;
  };
  audio_config?: {
    audio_encoding?: "MP3";
    speaking_rate?: number;
  };
  temperature?: number;
  sampleBase64?: string;
  sampleMimeType?: string;
  sampleFileName?: string;
  voiceName?: string;
  languageCode?: string;
  removeBackgroundNoise?: boolean;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function hasDevanagari(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function cleanTextForTts(input: string) {
  let text = input
    .replace(/\byha\b/gi, "यहाँ")
    .replace(/\bwha\b/gi, "वहाँ")
    .replace(/\bthik\b/gi, "ठीक")
    .replace(/\bthik\s+hu\b/gi, "ठीक हूं")
    .replace(/\bthik\s+hai\b/gi, "ठीक है")
    .trim();

  if (/^\s*hi[!,.?\s]*$/i.test(text)) {
    text = "नमस्ते";
  } else {
    text = text.replace(/(^|\s)hi(?=[\s!,.?]|$)/gi, "$1हेलो");
  }

  return text
    .replace(/,\s*/g, ", [pause:220ms] ")
    .replace(/\.\s*/g, ". [pause:360ms] ")
    .replace(/\?+$/g, "? [pause:360ms]")
    .replace(/!+$/g, "! [pause:360ms]")
    .replace(/\s+/g, " ")
    .trim();
}

function transliterateForHindiTts(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized || hasDevanagari(normalized)) {
    return normalized;
  }

  const phraseExpanded = normalized
    .replace(/\bkaise ho tum\b/gi, "कैसे हो तुम")
    .replace(/\bmain theek hu\b/gi, "मैं ठीक हूं")
    .replace(/\bmain theek hoon\b/gi, "मैं ठीक हूं")
    .replace(/\bmai theek hu\b/gi, "मैं ठीक हूं");

  return phraseExpanded.replace(/[A-Za-z']+/g, (token) => {
    const mapped = ROMAN_TO_DEVANAGARI[token.toLowerCase()];
    return mapped || token;
  });
}

function prepareHindiTtsText(input: string) {
  return transliterateForHindiTts(cleanTextForTts(input));
}

function parseNumberish(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function resolveVoiceSettings(payload: TtsPayload) {
  const voiceId = payload.voice_id || payload.voiceId || DEFAULT_VOICE_ID;
  const modelId = payload.model_id || payload.modelId || DEFAULT_MODEL_ID;
  const requestedSpeakingRate = parseNumberish(payload.audio_config?.speaking_rate) ?? parseNumberish(payload.audioConfig?.speakingRate);
  const requestedTemperature = parseNumberish(payload.temperature);

  if (voiceId === ALAKH_VOICE_ID) {
    return {
      voiceId,
      modelId,
      speakingRate: ALAKH_SPEAKING_RATE,
      temperature: ALAKH_TEMPERATURE,
    };
  }

  return {
    voiceId,
    modelId,
    speakingRate: requestedSpeakingRate ?? DEFAULT_SPEAKING_RATE,
    temperature: requestedTemperature ?? DEFAULT_TEMPERATURE,
  };
}

async function readApiError(response: Response) {
  const rawText = await response.text();
  if (!rawText) {
    return "Unknown API error";
  }

  try {
    const payload = JSON.parse(rawText) as { error?: string; message?: string };
    return payload.error || payload.message || rawText;
  } catch {
    return rawText;
  }
}

function getAuthHeader() {
  const rawAuth = String(
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.INWORLD_TTS_AUTH || "",
  ).trim();
  if (!rawAuth) {
    return "";
  }

  return rawAuth.startsWith("Basic ") ? rawAuth : `Basic ${rawAuth}`;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleClone(payload: TtsPayload, authHeader: string) {
  if (!payload.sampleBase64?.trim()) {
    return jsonResponse({ error: "sampleBase64 is required for clone" }, 400);
  }

  const bytes = Uint8Array.from(atob(payload.sampleBase64.trim()), (char) => char.charCodeAt(0));
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([bytes], { type: payload.sampleMimeType || "audio/mpeg" }),
    payload.sampleFileName || "sample.mp3",
  );
  formData.append("name", payload.voiceName || "CustomVoice");
  formData.append("languageCode", payload.languageCode || "hi-IN");
  formData.append("removeBackgroundNoise", String(payload.removeBackgroundNoise ?? true));

  const cloneResponse = await fetchWithTimeout(`${INWORLD_TTS_BASE}/voices:clone`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  });

  if (!cloneResponse.ok) {
    const reason = await readApiError(cloneResponse);
    console.error("Inworld clone failed", { status: cloneResponse.status, reason });
    return jsonResponse({ error: `Inworld clone failed: ${cloneResponse.status} ${reason}` }, 502);
  }

  const result = await cloneResponse.json();
  return jsonResponse({ result }, 200);
}

async function handleStream(payload: TtsPayload, authHeader: string) {
  const text = payload.text?.trim() || "";
  if (!text) {
    return jsonResponse({ error: "Text is required" }, 400);
  }

  const preparedText = prepareHindiTtsText(text);
  const voiceSettings = resolveVoiceSettings(payload);

  const requestBody = {
    text: preparedText,
    voice_id: voiceSettings.voiceId,
    model_id: voiceSettings.modelId,
    audio_config: {
      audio_encoding: "MP3",
      speaking_rate: voiceSettings.speakingRate,
    },
    temperature: voiceSettings.temperature,
  };

  const streamResponse = await fetchWithTimeout(`${INWORLD_TTS_BASE}/voice:stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(requestBody),
  });

  if (!streamResponse.ok || !streamResponse.body) {
    const reason = await readApiError(streamResponse);
    console.error("Inworld stream failed", {
      status: streamResponse.status,
      reason,
      voiceId: voiceSettings.voiceId,
      modelId: voiceSettings.modelId,
    });
    return jsonResponse({ error: `Inworld stream failed: ${streamResponse.status} ${reason}` }, 502);
  }

  return new Response(streamResponse.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function handleSynthesize(payload: TtsPayload, authHeader: string) {
  const text = payload.text?.trim() || "";
  if (!text) {
    return jsonResponse({ error: "Text is required" }, 400);
  }

  const preparedText = prepareHindiTtsText(text);
  const voiceSettings = resolveVoiceSettings(payload);

  const requestBody = {
    text: preparedText,
    voiceId: voiceSettings.voiceId,
    modelId: voiceSettings.modelId,
    timestampType: payload.timestampType || "WORD",
    audioConfig: {
      speakingRate: voiceSettings.speakingRate,
    },
    temperature: voiceSettings.temperature,
  };

  const response = await fetchWithTimeout(`${INWORLD_TTS_BASE}/voice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const reason = await readApiError(response);
    console.error("Inworld synth failed", {
      status: response.status,
      reason,
      voiceId: voiceSettings.voiceId,
      modelId: voiceSettings.modelId,
    });
    return jsonResponse({ error: `Inworld TTS failed: ${response.status} ${reason}` }, 502);
  }

  const data = (await response.json()) as { audioContent?: string; timestampInfo?: unknown };
  if (!data.audioContent) {
    return jsonResponse({ error: "Missing audioContent from Inworld TTS" }, 502);
  }

  return jsonResponse({
    audioContent: data.audioContent,
    timestampInfo: data.timestampInfo ?? null,
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = getAuthHeader();
  if (!authHeader) {
    console.error("Missing INWORLD_TTS_AUTH in environment");
    return jsonResponse({ error: "Missing INWORLD_TTS_AUTH" }, 500);
  }

  try {
    const payload = (await request.json()) as TtsPayload;
    const action = payload.action || "stream";

    if (action === "clone") {
      return await handleClone(payload, authHeader);
    }

    if (action === "synthesize") {
      return await handleSynthesize(payload, authHeader);
    }

    return await handleStream(payload, authHeader);
  } catch (error) {
    console.error("TTS API route failed", error);
    return jsonResponse({ error: "TTS API route failed" }, 500);
  }
}
