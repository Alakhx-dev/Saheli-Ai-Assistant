let currentAudio: HTMLAudioElement | null = null;

function cleanTextForTTS(text: string): string {
  return text
    .replace(/[*_`#>\[\]]/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function playVachanaTTS(text: string) {
  console.log('🎤 [TTS] Starting playback for text:', text.substring(0, 50));
  
  try {
    if (currentAudio) {
      console.log('🛑 [TTS] Stopping previous audio');
      currentAudio.pause();
      currentAudio = null;
    }

    const cleanText = cleanTextForTTS(text);
    if (!cleanText) {
      console.warn('⚠️ [TTS] No valid text for TTS');
      return;
    }

    console.log('🔑 [TTS] API Key:', import.meta.env.VITE_VACHANA_API_KEY ? 'Present' : 'MISSING');
    console.log('📤 [TTS] Sending request to Vachana API...');

    const response = await fetch("https://api.vachana.ai/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${import.meta.env.VITE_VACHANA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: cleanText,
        voice: "female-hindi",
        speed: 1.0
      })
    });

    console.log('📥 [TTS] Response status:', response.status);
    console.log('📥 [TTS] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TTS] API Error:', response.status, errorText);
      throw new Error(`TTS API failed: ${response.status} ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('📋 [TTS] Content-Type:', contentType);

    // Check if response is JSON (with audio_url) or binary audio
    if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      console.log('📄 [TTS] JSON Response:', jsonData);
      
      if (jsonData.audio_url) {
        console.log('🔗 [TTS] Using audio_url from JSON');
        const audio = new Audio(jsonData.audio_url);
        currentAudio = audio;
        
        audio.volume = 1.0;
        audio.muted = false;
        
        audio.onplay = () => console.log('▶️ [TTS] Audio playing');
        audio.onerror = (e) => console.error('❌ [TTS] Audio error:', e);
        audio.onended = () => {
          console.log('✅ [TTS] Audio ended');
          currentAudio = null;
        };

        await audio.play();
        console.log('🎵 [TTS] Audio.play() called successfully');
      } else {
        console.error('❌ [TTS] No audio_url in JSON response');
      }
    } else {
      // Binary audio blob
      console.log('🎵 [TTS] Processing audio blob');
      const audioBlob = await response.blob();
      console.log('📦 [TTS] Blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        console.error('❌ [TTS] Empty audio blob received');
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🔗 [TTS] Created object URL:', audioUrl);
      
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      
      audio.volume = 1.0;
      audio.muted = false;
      
      audio.onplay = () => console.log('▶️ [TTS] Audio playing');
      audio.onerror = (e) => console.error('❌ [TTS] Audio error:', e);
      audio.onended = () => {
        console.log('✅ [TTS] Audio ended');
        currentAudio = null;
        URL.revokeObjectURL(audioUrl);
      };
      audio.onpause = () => {
        console.log('⏸️ [TTS] Audio paused');
        currentAudio = null;
        URL.revokeObjectURL(audioUrl);
      };

      try {
        await audio.play();
        console.log('🎵 [TTS] Audio.play() called successfully');
      } catch (playError) {
        console.error('❌ [TTS] Autoplay blocked or play error:', playError);
        console.log('💡 [TTS] User interaction may be required for audio playback');
      }
    }

  } catch (error) {
    console.error('❌ [TTS] Error:', error);
  }
}
