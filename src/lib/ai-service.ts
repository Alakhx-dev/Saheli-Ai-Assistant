interface Message {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

const VISION_KEYWORDS = ['kaise lag raha hoon', 'dekho', 'face', 'look', 'ye kya hai', 'दिख', 'देख'];

export const hasVisionTrigger = (text: string): boolean => {
  const lower = text.toLowerCase();
  return VISION_KEYWORDS.some(kw => lower.includes(kw));
};

export const captureWebcamFrame = async (): Promise<string | null> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, 320, 240);
    
    stream.getTracks().forEach(track => track.stop());
    
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch (error) {
    console.error('Webcam capture failed:', error);
    return null;
  }
};

export const sendMessage = async (
  messages: Message[],
  onChunk: (text: string) => void
): Promise<void> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

    for (const line of lines) {
      const data = line.replace('data: ', '');
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {}
    }
  }
};
