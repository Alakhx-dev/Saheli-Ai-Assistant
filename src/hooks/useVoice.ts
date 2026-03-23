import { useEffect, useRef } from 'react';

const removeEmojis = (text: string): string => {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
};

export const useVoiceQueue = () => {
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  const speak = (text: string) => {
    const cleanText = removeEmojis(text).trim();
    if (!cleanText) return;

    queueRef.current.push(cleanText);
    processQueue();
  };

  const processQueue = () => {
    if (speakingRef.current || queueRef.current.length === 0) return;

    speakingRef.current = true;
    const text = queueRef.current.shift()!;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.pitch = 1.15;
    utterance.rate = 0.85;

    const voices = speechSynthesis.getVoices();
    const targetVoice = voices.find(v => 
      v.name.includes('Swara') || 
      v.name.includes('हिन्दी') ||
      v.lang === 'hi-IN'
    );
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onend = () => {
      speakingRef.current = false;
      processQueue();
    };

    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    speechSynthesis.getVoices();
  }, []);

  return { speak };
};
