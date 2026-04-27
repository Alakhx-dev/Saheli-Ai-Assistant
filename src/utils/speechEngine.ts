let currentSaheliAudio: HTMLAudioElement | null = null;
let currentSaheliAudioUrl: string | null = null;
let prefetchedContinuationAudio: HTMLAudioElement | null = null;
let prefetchedContinuationUrl: string | null = null;
let currentTtsAbortController: AbortController | null = null;
let lastSpokenSignature = "";
let speakToken = 0;

const TTS_ENDPOINT = import.meta.env.VITE_TTS_API_URL?.trim() || "/api/tts";
const SAHELI_PLAYBACK_RATE = 1.0;
const PLAYBACK_SMOOTHING_DELAY_MS = 30;
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[#*0-9]\uFE0F?\u20E3)+/gu;
const FIRST_SENTENCE_REGEX = /[^.!?]+[.!?]+/;

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

export function splitFastText(text: string) {
  const clean = text.trim();
  if (!clean) {
    return { firstSentence: "", remainingText: "" };
  }

  const firstMatch = clean.match(FIRST_SENTENCE_REGEX);
  if (!firstMatch || !firstMatch[0]) {
    return { firstSentence: clean, remainingText: "" };
  }

  const firstSentence = firstMatch[0].trim();
  const remainingText = clean.slice(firstSentence.length).trim();
  return { firstSentence, remainingText };
}

function revokeUrl(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function createConfiguredAudioFromBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
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

  return { audio, url };
}

function clearCurrentAudio() {
  if (currentSaheliAudio) {
    currentSaheliAudio.pause();
    currentSaheliAudio.currentTime = 0;
    currentSaheliAudio.src = "";
    currentSaheliAudio.load();
    currentSaheliAudio = null;
  }
  revokeUrl(currentSaheliAudioUrl);
  currentSaheliAudioUrl = null;
}

function clearPrefetchedAudio() {
  if (prefetchedContinuationAudio) {
    prefetchedContinuationAudio.pause();
    prefetchedContinuationAudio.currentTime = 0;
    prefetchedContinuationAudio.src = "";
    prefetchedContinuationAudio.load();
    prefetchedContinuationAudio = null;
  }
  revokeUrl(prefetchedContinuationUrl);
  prefetchedContinuationUrl = null;
}

function stopCurrentPlayback() {
  speakToken += 1;

  if (currentTtsAbortController) {
    currentTtsAbortController.abort();
    currentTtsAbortController = null;
  }

  clearCurrentAudio();
  clearPrefetchedAudio();
}

async function fetchPollyBlob(text: string, token: number) {
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

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    return null;
  }

  return blob;
}

async function buildAudioFromPolly(text: string, token: number) {
  const blob = await fetchPollyBlob(text, token);
  if (!blob || token !== speakToken) {
    return null;
  }

  return createConfiguredAudioFromBlob(blob);
}

function playAudioNow(audio: HTMLAudioElement, token: number) {
  void audio.play().catch((error) => {
    if (token === speakToken) {
      console.error("Playback blocked:", error);
    }
  });
}

export async function speakSaheli(text: string) {
  if (typeof window === "undefined") {
    return;
  }

  const cleanText = normalizeForSpeech(text);
  if (!cleanText) {
    return;
  }

  const signature = buildSpeechSignature(cleanText);
  if (signature && signature === lastSpokenSignature) {
    return;
  }

  stopCurrentPlayback();
  const token = speakToken;
  lastSpokenSignature = signature;

  const { firstSentence, remainingText } = splitFastText(cleanText);
  if (!firstSentence) {
    return;
  }

  const continuationPromise = remainingText
    ? buildAudioFromPolly(remainingText, token).then((result) => {
      if (!result || token !== speakToken) {
        return null;
      }

      clearPrefetchedAudio();
      prefetchedContinuationAudio = result.audio;
      prefetchedContinuationUrl = result.url;
      return result;
    })
    : Promise.resolve(null);

  try {
    const firstAudioResult = await buildAudioFromPolly(firstSentence, token);
    if (!firstAudioResult || token !== speakToken) {
      return;
    }

    clearCurrentAudio();
    currentSaheliAudio = firstAudioResult.audio;
    currentSaheliAudioUrl = firstAudioResult.url;

    firstAudioResult.audio.onended = () => {
      if (token !== speakToken) {
        return;
      }

      clearCurrentAudio();

      void continuationPromise.then((continuationResult) => {
        if (!continuationResult || token !== speakToken) {
          return;
        }

        currentSaheliAudio = continuationResult.audio;
        currentSaheliAudioUrl = continuationResult.url;
        prefetchedContinuationAudio = null;
        prefetchedContinuationUrl = null;
        playAudioNow(continuationResult.audio, token);
      });
    };

    firstAudioResult.audio.onerror = () => {
      if (currentSaheliAudio === firstAudioResult.audio) {
        clearCurrentAudio();
      }
    };

    window.setTimeout(() => {
      if (token === speakToken && currentSaheliAudio === firstAudioResult.audio) {
        playAudioNow(firstAudioResult.audio, token);
      }
    }, PLAYBACK_SMOOTHING_DELAY_MS);

    void continuationPromise.catch((error) => {
      if (token === speakToken) {
        console.error("Polly continuation preload failed:", error);
      }
    });
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
