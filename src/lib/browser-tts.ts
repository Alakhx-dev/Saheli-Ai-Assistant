const MOBILE_TTS_PITCH = 1.2;
const MOBILE_TTS_RATE = 0.88;
const MOBILE_TTS_VOLUME = 1.0;

let currentUtterance: SpeechSynthesisUtterance | null = null;

function getVoiceRank(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  const isHindi = lang.includes("hi");
  const isGoogleHindi = name.includes("google hindi");
  const isSiriHindi = (name.includes("siri") || name.includes("ios")) && isHindi;

  if (isGoogleHindi) {
    return 0;
  }

  if (isSiriHindi) {
    return 1;
  }

  if (isHindi) {
    return 2;
  }

  if (name.includes("google") && lang.includes("en-in")) {
    return 3;
  }

  return 4;
}

function selectPreferredVoice(voices: SpeechSynthesisVoice[]) {
  if (!voices.length) {
    return null;
  }

  const ranked = [...voices].sort((a, b) => getVoiceRank(a) - getVoiceRank(b));
  return ranked[0] ?? null;
}

export function stopBrowserTtsPlayback() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function speakWithBrowserTts(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return Promise.resolve();
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return Promise.resolve();
  }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(trimmed);
  const voices = synth.getVoices();
  const preferredVoice = selectPreferredVoice(voices);

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  } else {
    utterance.lang = "hi-IN";
  }

  utterance.pitch = MOBILE_TTS_PITCH;
  utterance.rate = MOBILE_TTS_RATE;
  utterance.volume = MOBILE_TTS_VOLUME;

  return new Promise((resolve) => {
    utterance.onend = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      resolve();
    };

    utterance.onerror = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      resolve();
    };

    currentUtterance = utterance;
    synth.speak(utterance);
  });
}

export function primeBrowserTtsVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const synth = window.speechSynthesis;
  synth.getVoices();
}
