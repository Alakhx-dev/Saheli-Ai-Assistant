// Edge TTS Voice Utility with Text Humanization
import { humanizeText, breakIntoChunks, casualizeHindi } from './humanize';

let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;

/**
 * Speak text using Edge TTS with natural humanization
 * NO browser fallback - Edge TTS only for premium quality
 */
export async function speak(text: string): Promise<void> {
  // Stop any currently playing audio
  stopSpeaking();

  // STEP 1: Humanize text (add fillers, casual tone)
  let humanized = humanizeText(text);
  humanized = casualizeHindi(humanized);
  
  console.log('🎯 Original:', text.substring(0, 100));
  console.log('✨ Humanized:', humanized.substring(0, 100));

  // STEP 2: Break into natural chunks (1-2 sentences)
  const chunks = breakIntoChunks(humanized);
  console.log('📦 Chunks:', chunks.length);

  // STEP 3: Sequential playback with parallel fetching
  isPlaying = true;
  for (let i = 0; i < chunks.length; i++) {
    if (!isPlaying) break; // If stopped, break out
    try {
      await playChunk(chunks[i]);
    } catch (error) {
      console.error('Edge TTS failed for chunk:', error);
    }
  }
  isPlaying = false;
}

/**
 * Fetch and play a single chunk
 */
async function playChunk(text: string): Promise<void> {
  const startTime = Date.now();
  
  // Call serverless function
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status}`);
  }

  // Get audio blob
  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);

  // Play audio and wait for it to finish
  return new Promise((resolve, reject) => {
    // If stopped while fetching
    if (!isPlaying) {
      URL.revokeObjectURL(audioUrl);
      resolve();
      return;
    }

    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    currentAudio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };

    currentAudio.play().then(() => {
      console.log(`🎤 Speaking chunk (latency: ${Date.now() - startTime}ms)`);
    }).catch(reject);
  });
}

/**
 * Stop any currently playing audio
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  isPlaying = false;
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
  return isPlaying;
}
