let currentSaheliAudio: HTMLAudioElement | null = null;
let currentTtsAbortController: AbortController | null = null;
let lastSpokenSignature = "";
let speakToken = 0;

const TTS_ENDPOINT = import.meta.env.VITE_TTS_API_URL?.trim() || "/api/tts";
const MAX_SPEAK_CHARS = 170;
const SAHELI_PLAYBACK_RATE = 1.0;
const PLAYBACK_SMOOTHING_DELAY_MS = 50;
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[#*0-9]\uFE0F?\u20E3)+/gu;

function buildSpeechSignature(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeForSpeech(raw: string) {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.[^\s]+/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(EMOJI_REGEX, " ")
    .replace(/['"’“”]/g, "")
    .replace(/[\u200D\uFE0E\uFE0F]/g, "")
    .replace(/&/g, " aur ")
    .replace(/@/g, " at ")
    .replace(/\//g, " ")
    .replace(/\*.*?\*/g, "")
    .replace(/[#*_~]/g, "")
    .replace(/[:;]-?[()DPp]/g, "")
    .replace(/[{}\[\]<>\\|^`+=~]+/g, " ")
    .replace(/[_-]{2,}/g, " ")
    .replace(/\b([A-Z]{2,})\b/g, (_, token: string) => token.toLowerCase())
    .replace(/\b(?:[A-Za-z]\.){2,}/g, (match) => match.replace(/\./g, ""))
    .replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (match) => match.replace(/\s+/g, ""))
    .replace(/\b[A-Z]{2,4}\b/g, " ")
    .replace(/\b([A-Za-z]+)\s*[-/]\s*([A-Za-z]+)\b/g, "$1 $2")
    .replace(/[!?.,]{3,}/g, ".")
    .replace(/[(){}\[\]<>]/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toSpeakableSnippet(text: string) {
  if (text.length <= MAX_SPEAK_CHARS) {
    return text;
  }

  const firstSentence = text.match(/^(.{1,140}?[.!?])(?:\s|$)/)?.[1]?.trim();
  if (firstSentence) {
    return firstSentence;
  }

  return `${text.slice(0, MAX_SPEAK_CHARS).trimEnd()}...`;
}

function stopCurrentPlayback() {
  speakToken += 1;

  if (currentTtsAbortController) {
    currentTtsAbortController.abort();
    currentTtsAbortController = null;
  }

  if (currentSaheliAudio) {
    currentSaheliAudio.pause();
    currentSaheliAudio.currentTime = 0;
    currentSaheliAudio.src = "";
    currentSaheliAudio.load();
    currentSaheliAudio = null;
  }
}

async function fetchPollyAudio(text: string, token: number) {
  const controller = new AbortController();
  currentTtsAbortController = controller;

  const response = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    signal: controller.signal,
  });

  if (token !== speakToken) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Polly TTS failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { audio?: string | null };
  return data.audio?.trim() || null;
}

export async function speakSaheli(text: string) {
  if (typeof window === "undefined") {
    return;
  }

  const cleanText = normalizeForSpeech(text);
  if (!cleanText) {
    return;
  }

  const speakText = toSpeakableSnippet(cleanText);

  const signature = buildSpeechSignature(speakText);
  if (signature && signature === lastSpokenSignature) {
    return;
  }

  stopCurrentPlayback();
  const token = speakToken;
  lastSpokenSignature = signature;

  try {
    const audioBase64 = await fetchPollyAudio(speakText, token);
    if (!audioBase64 || token !== speakToken) {
      return;
    }

    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.preload = "auto";
    audio.defaultPlaybackRate = SAHELI_PLAYBACK_RATE;
    audio.playbackRate = SAHELI_PLAYBACK_RATE;
    const pitchAdjustedAudio = audio as HTMLAudioElement & {
      preservesPitch?: boolean;
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    pitchAdjustedAudio.preservesPitch = false;
    pitchAdjustedAudio.mozPreservesPitch = false;
    pitchAdjustedAudio.webkitPreservesPitch = false;
    audio.onended = () => {
      if (currentSaheliAudio === audio) {
        currentSaheliAudio = null;
      }
    };
    audio.onerror = () => {
      if (currentSaheliAudio === audio) {
        currentSaheliAudio = null;
      }
    };

    currentSaheliAudio = audio;
    window.setTimeout(() => {
      if (token !== speakToken || currentSaheliAudio !== audio) {
        return;
      }

      void audio.play().catch((error) => {
        if (token === speakToken) {
          console.error("Playback blocked:", error);
        }
      });
    }, PLAYBACK_SMOOTHING_DELAY_MS);
  } catch (error) {
    if (token === speakToken) {
      console.error("Polly Frontend Error:", error);
    }
  } finally {
    if (currentTtsAbortController?.signal.aborted === false) {
      currentTtsAbortController = null;
    }
  }
}

export function stopSaheliSpeech() {
  stopCurrentPlayback();
}

export function resetSaheliSpeechDedup() {
  lastSpokenSignature = "";
}
