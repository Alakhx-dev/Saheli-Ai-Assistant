import {
  DEFAULT_SPEAKING_RATE,
  DEFAULT_TEMPERATURE,
  INWORLD_TTS_DEFAULT_VOICE_ID,
  INWORLD_TTS_MODEL_ID,
} from "@/lib/tts-config";
import { speakWithBrowserTts } from "@/lib/browser-tts";

const INWORLD_TTS_VOICE_ID = INWORLD_TTS_DEFAULT_VOICE_ID;
const INWORLD_TTS_LANGUAGE_CODE = "hi-IN";
const INWORLD_TTS_SPEAKING_RATE = DEFAULT_SPEAKING_RATE;
const INWORLD_TTS_TEMPERATURE = DEFAULT_TEMPERATURE;
const INWORLD_TTS_API_URL = "/api/tts";

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

interface WordAlignmentItem {
  word?: string;
  startMs?: number;
  endMs?: number;
}

interface TimestampInfo {
  wordAlignment?: WordAlignmentItem[];
}

interface TtsSynthesizeResponse {
  audioContent: string;
  timestampInfo?: TimestampInfo | null;
}

interface TtsApiError {
  error?: string;
  message?: string;
}

interface StreamChunk {
  result?: {
    audioContent?: string;
  };
  error?: {
    message?: string;
  };
}

interface PlayInworldVoiceOptions {
  onPlayingChange?: (isPlaying: boolean) => void;
  voiceId?: string;
  modelId?: string;
  speakingRate?: number;
  temperature?: number;
}

interface SynthesizeOptions {
  voiceId?: string;
  modelId?: string;
  speakingRate?: number;
  temperature?: number;
  timestampType?: "WORD" | "NONE";
}

interface StreamOptions {
  voiceId?: string;
  modelId?: string;
  speakingRate?: number;
  temperature?: number;
  onChunk?: (base64Audio: string, index: number) => void;
  onComplete?: () => void;
}

interface CloneVoiceOptions {
  sampleBase64: string;
  sampleMimeType?: string;
  sampleFileName?: string;
  voiceName: string;
  languageCode?: string;
  removeBackgroundNoise?: boolean;
}

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

function hasDevanagari(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function transliterateForHindiTts(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return normalized;
  }

  // If text is already Hindi script, don't touch it.
  if (hasDevanagari(normalized)) {
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

function cleanTextForTts(input: string) {
  let text = input
    .replace(/\byha\b/gi, "यहाँ")
    .replace(/\bwha\b/gi, "वहाँ")
    .replace(/\bthik\b/gi, "ठीक")
    .replace(/\bthik\s+hu\b/gi, "ठीक हूं")
    .replace(/\bthik\s+hai\b/gi, "ठीक है")
    .trim();

  // Context-aware greeting replacement.
  if (/^\s*hi[!,.?\s]*$/i.test(text)) {
    text = "नमस्ते";
  } else {
    text = text.replace(/(^|\s)hi(?=[\s!,.?]|$)/gi, "$1हेलो");
  }

  // Natural breathing markers: light pause on comma, deeper pause on sentence stop.
  text = text
    .replace(/,\s*/g, ", [pause:220ms] ")
    .replace(/\.\s*/g, ". [pause:360ms] ");

  text = text
    .replace(/\?+$/g, "? [pause:360ms]")
    .replace(/!+$/g, "! [pause:360ms]")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function prepareHindiTtsText(input: string) {
  const cleaned = cleanTextForTts(input);
  return transliterateForHindiTts(cleaned);
}

async function parseError(response: Response) {
  const rawText = await response.text();
  if (!rawText) {
    return "Unknown error";
  }

  try {
    const payload = JSON.parse(rawText) as TtsApiError;
    return payload.error || payload.message || rawText;
  } catch {
    return rawText;
  }
}

export async function unlockInworldTtsAudio() {
  try {
    const AudioContextCtor =
      window.AudioContext || ((window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);

    if (!AudioContextCtor) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch (error) {
    console.error("Inworld TTS audio unlock failed", error);
  }
}

export function stopInworldVoicePlayback() {
  if (!currentAudio) {
    return;
  }

  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
}

export async function synthesizeInworldVoice(text: string, options?: SynthesizeOptions): Promise<TtsSynthesizeResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Text is required for TTS");
  }

  const ttsText = prepareHindiTtsText(trimmed);

  const requestPayload = {
    text: ttsText,
    voiceId: options?.voiceId || INWORLD_TTS_VOICE_ID,
    modelId: options?.modelId || INWORLD_TTS_MODEL_ID,
    languageCode: INWORLD_TTS_LANGUAGE_CODE,
    audioConfig: {
      speakingRate: options?.speakingRate ?? INWORLD_TTS_SPEAKING_RATE,
    },
    temperature: options?.temperature ?? INWORLD_TTS_TEMPERATURE,
  };

  const response = await fetch(INWORLD_TTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "synthesize",
      ...requestPayload,
    }),
  });

  if (!response.ok) {
    const reason = await parseError(response);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Inworld TTS auth failed (${response.status}). Key may be invalid or expired. ${reason}`);
    }
    throw new Error(`Inworld TTS request failed: ${response.status} ${reason}`);
  }

  const data = (await response.json()) as TtsSynthesizeResponse;
  if (!data.audioContent) {
    throw new Error("Missing audioContent from Inworld TTS response");
  }

  return data;
}

export async function playInworldVoice(text: string, options?: PlayInworldVoiceOptions) {
  options?.onPlayingChange?.(true);

  try {
    await streamInworldVoice(text, {
      voiceId: options?.voiceId,
      modelId: options?.modelId,
      speakingRate: options?.speakingRate,
      temperature: options?.temperature,
    });
  } finally {
    options?.onPlayingChange?.(false);
  }
}

export async function streamInworldVoice(text: string, options?: StreamOptions) {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const ttsText = prepareHindiTtsText(trimmed);

  await unlockInworldTtsAudio();

  const response = await fetch(INWORLD_TTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "stream",
      text: ttsText,
      voice_id: options?.voiceId || INWORLD_TTS_VOICE_ID,
      voiceId: options?.voiceId || INWORLD_TTS_VOICE_ID,
      model_id: options?.modelId || INWORLD_TTS_MODEL_ID,
      modelId: options?.modelId || INWORLD_TTS_MODEL_ID,
      language_code: INWORLD_TTS_LANGUAGE_CODE,
      languageCode: INWORLD_TTS_LANGUAGE_CODE,
      audio_config: {
        audio_encoding: "MP3",
        speaking_rate: options?.speakingRate ?? INWORLD_TTS_SPEAKING_RATE,
      },
      temperature: options?.temperature ?? INWORLD_TTS_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const reason = await parseError(response);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Inworld TTS stream auth failed (${response.status}). Key may be invalid or expired. ${reason}`);
    }
    throw new Error(`Inworld TTS stream failed: ${response.status} ${reason}`);
  }

  if (!response.body) {
    throw new Error("Inworld TTS stream failed: response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let chunkIndex = 0;
  let playbackQueue = Promise.resolve();

  const queuePlayback = (base64Audio: string) => {
    playbackQueue = playbackQueue.then(async () => {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      currentAudio = audio;
      try {
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
        });
      } catch (error) {
        console.warn("Inworld TTS playback failed (possibly autoplay blocked). Falling back to browser TTS.", error);
        await speakWithBrowserTts(text);
      }
      if (currentAudio === audio) {
        currentAudio = null;
      }
    });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      const parsed = JSON.parse(trimmedLine) as StreamChunk;
      const audioContent = parsed.result?.audioContent;
      if (!audioContent) {
        const message = parsed.error?.message;
        if (message) {
          throw new Error(message);
        }
        continue;
      }

      options?.onChunk?.(audioContent, chunkIndex);
      chunkIndex += 1;
      queuePlayback(audioContent);
    }
  }

  await playbackQueue;
  options?.onComplete?.();
}

export async function cloneInworldVoice(options: CloneVoiceOptions): Promise<string> {
  const response = await fetch(INWORLD_TTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "clone",
      sampleBase64: options.sampleBase64,
      sampleMimeType: options.sampleMimeType,
      sampleFileName: options.sampleFileName,
      voiceName: options.voiceName,
      languageCode: options.languageCode,
      removeBackgroundNoise: options.removeBackgroundNoise,
    }),
  });

  if (!response.ok) {
    const reason = await parseError(response);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Inworld clone auth failed (${response.status}). Key may be invalid or expired. ${reason}`);
    }
    throw new Error(`Clone voice failed: ${response.status} ${reason}`);
  }

  const payload = (await response.json()) as { result?: { voiceId?: string; id?: string; voice?: { id?: string } } };
  const voiceId = payload.result?.voiceId || payload.result?.id || payload.result?.voice?.id;

  if (!voiceId) {
    throw new Error("Clone voice response did not include voiceId");
  }

  return voiceId;
}

export function saveBase64Mp3AsDownload(base64Audio: string, fileName: string) {
  const link = document.createElement("a");
  link.href = `data:audio/mp3;base64,${base64Audio}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function batchSynthesizeInworldVoice(texts: string[], filePrefix = "swara") {
  const outputs: Array<{ text: string; audioContent: string; fileName: string; timestampInfo?: TimestampInfo | null }> = [];

  for (let i = 0; i < texts.length; i += 1) {
    const text = texts[i];
    const result = await synthesizeInworldVoice(text, { timestampType: "WORD" });
    const fileName = `${filePrefix}-${i + 1}.mp3`;
    outputs.push({
      text,
      audioContent: result.audioContent,
      fileName,
      timestampInfo: result.timestampInfo,
    });
  }

  return outputs;
}
