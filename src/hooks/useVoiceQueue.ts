import { useEffect, useRef } from "react";

const VOICE_NAME = "Swara";

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



export function useVoiceQueue() {
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const playNextRef = useRef<() => void>(() => {});

  playNextRef.current = () => {
    if (speakingRef.current || !window.speechSynthesis) {
      return;
    }

    const nextText = queueRef.current.shift();
    if (!nextText) {
      return;
    }

    // Clear any previous robotic echo
    window.speechSynthesis.cancel();

    let attempts = 0;
    const maxAttempts = 10; // Try for 2 seconds to find Swara

    const executeSpeech = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // 1. BEST: Swara/Google Online Female
      let selectedVoice = 
        voices.find((v) => v.name.includes("Swara")) || 
        voices.find((v) => v.name.includes("Google \u0939\u093f\u0928\u094d\u0926\u0940"));

      // 2. SECOND BEST: Any Hindi Female
      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.lang.includes("hi") && v.name.toLowerCase().includes("female"));
      }

      // 3. FALLBACK (No Silence): If still nothing after 2 secs, take the first available
      if (!selectedVoice && attempts >= maxAttempts) {
        selectedVoice = voices.find((v) => v.lang.includes("hi")) || voices[0];
      }

      if (selectedVoice) {
        // CLEAN TEXT: Lowercase stops spelling reading
        const cleanText = normalizeTextForTts(nextText).toLowerCase().replace(/alakh/g, "alukh");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        speakingRef.current = true;
        utterance.voice = selectedVoice;
        utterance.lang = "hi-IN";
        // CRITICAL: Even if it's a male voice, high pitch makes it sound female/soft
        utterance.pitch = 1.6; 
        utterance.rate = 0.9;
        
        utterance.onend = () => {
          speakingRef.current = false;
          playNextRef.current();
        };

        utterance.onerror = () => {
          speakingRef.current = false;
          playNextRef.current();
        };
        
        window.speechSynthesis.resume(); 
        window.speechSynthesis.speak(utterance);
      } else {
        // Retry loop
        attempts++;
        setTimeout(executeSpeech, 200);
      }
    };

    executeSpeech();
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
