import { Readable } from 'stream';

// Edge TTS API endpoint
const EDGE_TTS_API = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Limit text length to avoid timeout (max 500 chars)
    const limitedText = text.substring(0, 500);

    // Generate unique request ID
    const requestId = generateRequestId();

    // Build SSML with romantic, emotional, expressive settings
    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='hi-IN'>
        <voice name='hi-IN-SwaraNeural'>
          <prosody rate='+8%' pitch='+5Hz' volume='soft'>
            <express-as style='gentle' styledegree='2'>
              ${escapeXml(limitedText)}
            </express-as>
          </prosody>
        </voice>
      </speak>
    `.trim();

    // Build WebSocket-style message
    const message = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;

    // Make request to Edge TTS API
    const response = await fetch(EDGE_TTS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: message,
    });

    if (!response.ok) {
      throw new Error(`Edge TTS API error: ${response.status}`);
    }

    // Stream audio directly to client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    const audioBuffer = await response.arrayBuffer();
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'TTS generation failed' });
  }
}

// Helper: Generate unique request ID
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper: Escape XML special characters
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
