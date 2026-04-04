export function useVoiceQueue() {
  const queueVoice = (_text: string) => {
    // Browser Web Speech API has been intentionally removed.
    // Inworld audio streaming is the only voice path.
  };

  return { queueVoice };
}
