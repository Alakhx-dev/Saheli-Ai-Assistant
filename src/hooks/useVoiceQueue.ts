import { useState, useEffect, useRef, useCallback } from "react";

export function useVoiceQueue() {
  const [isPlaying, setIsPlaying] = useState(false);
  const queue = useRef<string[]>([]);
  
  // Clean emojis using the explicitly requested regex
  const stripEmojis = (text: string) => {
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, "");
  };

  const playNext = useCallback(() => {
    if (queue.current.length === 0) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let text = queue.current.shift() || "";
    text = stripEmojis(text).trim();
    
    if (!text) {
      playNext();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to match Microsoft Swara Online or Google Hindi female voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoices = voices.filter(v => 
        (v.name.includes("Swara") && v.name.includes("Online")) || 
        (v.name.includes("Google") && v.lang.includes("hi-IN")) ||
        (v.lang === "hi-IN" && v.name.includes("Female"))
      );
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
      } else {
        const hindiVoices = voices.filter(v => v.lang.includes("hi-IN"));
        if(hindiVoices.length > 0) utterance.voice = hindiVoices[0];
      }
    };

    setVoice();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    // Explicit Voice Settings
    utterance.pitch = 1.15;
    utterance.rate = 0.85;
    utterance.volume = 1;

    utterance.onend = () => {
      playNext();
    };
    
    utterance.onerror = () => {
      playNext();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const queueVoice = (text: string) => {
    queue.current.push(text);
    if (!isPlaying) {
      playNext();
    }
  };

  return { queueVoice, isPlaying };
}
