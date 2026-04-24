const BROWSER_TTS_PITCH = 1.48;
const BROWSER_TTS_RATE = 0.78;
const BROWSER_TTS_VOLUME = 1.0;

let currentUtterance: SpeechSynthesisUtterance | null = null;

function prepareHindiSpeech(text: string) {
  return text
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.[^\s]+/gi, " ")
    .replace(/[,:;]+/g, " ")
    .replace(/\b[A-Z]\.(?:\s*[A-Z]\.)+\b/g, "ए आई")
    .replace(/\b(?:[A-Za-z]\s+){1,}[A-Za-z]\b/g, (match) => {
      const compact = match.replace(/\s+/g, "").toLowerCase();
      if (compact === "ai") return "ए आई";
      if (compact === "ok") return "ओके";
      return match;
    })
    .replace(/\bAI\b/gi, "ए आई")
    .replace(/\bA\s+I\b/gi, "ए आई")
    .replace(/\bokay\b/gi, "ओके")
    .replace(/\bok\b/gi, "ओके")
    .replace(/\byes\b/gi, "यस")
    .replace(/\bno\b/gi, "नो")
    .replace(/\bhello\b/gi, "हैलो")
    .replace(/\bhi\b/gi, "हाय")
    .replace(/\bbye\b/gi, "बाय")
    .replace(/\bplease\b/gi, "प्लीज़")
    .replace(/\bthanks?\b/gi, "थैंक्स")
    .replace(/\bgood\b/gi, "गुड")
    .replace(/\bcute\b/gi, "क्यूट")
    .replace(/\bsweet\b/gi, "स्वीट")
    .replace(/\blove\b/gi, "लव")
    .replace(/[()\[\]{}<>]/g, " ")
    .replace(/[|\\/_]/g, " ")
    .replace(/\.{2,}/g, "।")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function getBestHindiVoice(voices: SpeechSynthesisVoice[]) {
  if (!voices.length) {
    return null;
  }

  const normalizedVoices = [...voices];
  return (
    normalizedVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return voice.lang === "hi-IN" && (name.includes("female") || name.includes("neerja") || name.includes("aditi") || name.includes("sapna") || name.includes("kavya") || name.includes("sonia") || name.includes("shruti") || name.includes("radha") || name.includes("anika") || name.includes("isha") || name.includes("riya"));
    }) ||
    normalizedVoices.find((voice) => voice.lang === "hi-IN") ||
    normalizedVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return voice.lang.toLowerCase().includes("hi") && (name.includes("female") || name.includes("neerja") || name.includes("aditi") || name.includes("sapna") || name.includes("kavya") || name.includes("sonia") || name.includes("shruti") || name.includes("radha") || name.includes("anika") || name.includes("isha") || name.includes("riya"));
    }) ||
    normalizedVoices.find((voice) => voice.lang.toLowerCase().includes("hi")) ||
    normalizedVoices.find((voice) => voice.lang.toLowerCase().includes("en") && voice.name.toLowerCase().includes("female")) ||
    normalizedVoices[0] ||
    null
  );
}

function getVoiceRank(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  const isHindi = lang.includes("hi");
  const isFemale = name.includes("female");
  const isPreferredHindiName = ["neerja", "aditi", "sapna", "kavya", "sonia", "shruti", "radha", "anika", "isha", "riya"].some((token) => name.includes(token));
  const isGoogleHindi = name.includes("google hindi");
  const isSiriHindi = (name.includes("siri") || name.includes("ios")) && isHindi;

  if (isGoogleHindi && (isFemale || isPreferredHindiName)) {
    return 0;
  }

  if (isGoogleHindi) {
    return 1;
  }

  if (isSiriHindi && (isFemale || isPreferredHindiName)) {
    return 2;
  }

  if (isSiriHindi) {
    return 3;
  }

  if (isHindi && (isFemale || isPreferredHindiName)) {
    return 4;
  }

  if (isHindi) {
    return 5;
  }

  if (name.includes("google") && lang.includes("en-in") && isFemale) {
    return 6;
  }

  if (name.includes("google") && lang.includes("en-in")) {
    return 7;
  }

  return 8;
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

export function speakHindi(text: string): Promise<void> {
  const trimmed = prepareHindiSpeech(text);
  if (!trimmed) {
    return Promise.resolve();
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return Promise.resolve();
  }

  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  const voices = synth.getVoices();
  const preferredVoice = getBestHindiVoice(voices) ?? selectPreferredVoice(voices);

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang || "hi-IN";
  } else {
    utterance.lang = "hi-IN";
  }

  utterance.pitch = BROWSER_TTS_PITCH;
  utterance.rate = BROWSER_TTS_RATE;
  utterance.volume = BROWSER_TTS_VOLUME;

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
  synth.onvoiceschanged = () => {};
  synth.getVoices();
}
