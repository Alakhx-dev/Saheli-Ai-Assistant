import { useEffect, useRef } from "react";

function stripEmojis(text: string) {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, "");
}

function normalizeTextForTts(text: string) {
  let normalized = stripEmojis(text)
    .replace(/\*\*/g, " ")
    .replace(/_/g, " ")
    .replace(/([,.!?])([^\s,.!?])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  normalized = normalized
    .replace(/\bplz+\b/gi, "please")
    .replace(/\bplzz+\b/gi, "please")
    .replace(/([a-z])\1{2,}/gi, "$1");

  const replacements: Array<[RegExp, string]> = [
    [/\bnhi\b/gi, "nahi"],
    [/\bhn\b/gi, "haan"],
    [/\bkr\b/gi, "kar"],
    [/\bh\b/gi, "hai"],
    [/\bhu\b/gi, "hoon"],
    [/\bm\b/gi, "main"],
    [/\bbt\b/gi, "baat"],
    [/\bkyu\b/gi, "kyun"],
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])([^\s,.!?])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(utterance: SpeechSynthesisUtterance) {
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (voice) =>
      (voice.name.includes("Swara") && voice.name.includes("Online")) ||
      (voice.name.includes("Google") && voice.lang.includes("hi-IN")) ||
      (voice.lang === "hi-IN" && voice.name.includes("Female")),
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    return;
  }

  const hindiVoice = voices.find((voice) => voice.lang.includes("hi-IN"));
  if (hindiVoice) {
    utterance.voice = hindiVoice;
  }
}

export function useVoiceQueue() {
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const playNextRef = useRef<() => void>(() => {});

  playNextRef.current = () => {
    if (speakingRef.current) {
      return;
    }

    const nextText = queueRef.current.shift();
    if (!nextText) {
      return;
    }

    const cleanText = normalizeTextForTts(nextText);
    if (!cleanText) {
      playNextRef.current();
      return;
    }

    speakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = 1.15;
    utterance.rate = 0.85;
    utterance.volume = 1;

    pickVoice(utterance);

    utterance.onend = () => {
      speakingRef.current = false;
      playNextRef.current();
    };

    utterance.onerror = () => {
      speakingRef.current = false;
      playNextRef.current();
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };

    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === handleVoicesChanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const queueVoice = (text: string) => {
    queueRef.current.push(text);
    playNextRef.current();
  };

  return { queueVoice };
}
