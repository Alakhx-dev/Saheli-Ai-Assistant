import { useState, useEffect, useRef, useCallback } from "react";

export function useVoiceQueue() {
  const [isPlaying, setIsPlaying] = useState(false);
  const queue = useRef<string[]>([]);
  
  // Clean emojis from text
  const stripEmojis = (str: string) => {
    return str.replace(/[\u1000-\uFFFF]+/g, '').replace(/[^\x00-\x7F\u0900-\u097F\s.,!?']/g, '');
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
    
    // Fallback if voices are loaded async
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    // Settings for Female, Soft, Romantic
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
