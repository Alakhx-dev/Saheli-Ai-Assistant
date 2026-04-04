const INWORLD_TTS_VOICE_ID = "default-exsg-odgaqb9kgydhmbw-w__design-voice-14078e0a";
const INWORLD_TTS_MODEL_ID = "inworld-tts-1.5-max";
const INWORLD_TTS_LANGUAGE_CODE = "hi-IN";
const INWORLD_TTS_SPEAKING_RATE = 0.96;
const INWORLD_TTS_TEMPERATURE = 1.29;
const INWORLD_TTS_AUTH = (
  import.meta.env.VITE_INWORLD_TTS_AUTH
  || import.meta.env.NEXT_PUBLIC_INWORLD_KEY
  || ""
).trim();
const INWORLD_TTS_URL = "https://api.inworld.ai/tts/v1/voice";
const INWORLD_TTS_STREAM_URL = "https://api.inworld.ai/tts/v1/voice:stream";
const INWORLD_TTS_CLONE_URL = (import.meta.env.VITE_INWORLD_VOICE_CLONE_URL || "https://api.inworld.ai/tts/v1/voices:clone").trim();

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

function getAuthHeader() {
  if (!INWORLD_TTS_AUTH) {
    throw new Error("Missing VITE_INWORLD_TTS_AUTH or NEXT_PUBLIC_INWORLD_KEY");
  }

  return `Basic ${INWORLD_TTS_AUTH}`;
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as TtsApiError;
    return payload.error || payload.message || "Unknown error";
  } catch {
    return await response.text();
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

  if (import.meta.env.DEV) {
    console.info("Inworld TTS payload", requestPayload);
  }

  const response = await fetch(INWORLD_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(requestPayload),
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
  const { audioContent } = await synthesizeInworldVoice(text, {
    timestampType: "WORD",
  });

  stopInworldVoicePlayback();
  await unlockInworldTtsAudio();

  const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
  currentAudio = audio;
  options?.onPlayingChange?.(true);

  const cleanup = () => {
    if (currentAudio === audio) {
      currentAudio = null;
    }
    options?.onPlayingChange?.(false);
  };

  audio.onended = cleanup;
  audio.onerror = cleanup;

  await audio.play();
}

export async function streamInworldVoice(text: string, options?: StreamOptions) {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const ttsText = prepareHindiTtsText(trimmed);

  await unlockInworldTtsAudio();

  const response = await fetch(INWORLD_TTS_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
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

  if (!response.ok || !response.body) {
    const reason = await parseError(response);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Inworld TTS stream auth failed (${response.status}). Key may be invalid or expired. ${reason}`);
    }
    throw new Error(`Inworld TTS stream failed: ${response.status} ${reason}`);
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
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
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
  const bytes = Uint8Array.from(atob(options.sampleBase64), (char) => char.charCodeAt(0));
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([bytes], { type: options.sampleMimeType || "audio/mpeg" }),
    options.sampleFileName || "sample.mp3",
  );
  formData.append("name", options.voiceName);
  formData.append("languageCode", options.languageCode || "hi-IN");
  formData.append("removeBackgroundNoise", String(options.removeBackgroundNoise ?? true));

  const response = await fetch(INWORLD_TTS_CLONE_URL, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
    },
    body: formData,
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
