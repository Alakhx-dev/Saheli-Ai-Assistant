// Text Humanization for Romantic, Emotional, Expressive Hindi Speech
// Soft, smooth, caring tone with natural expressions

/**
 * Transform AI text into romantic, emotional, expressive Hindi
 * Adds soft fillers, emotional expressions, and natural pauses
 */
export function humanizeText(text: string): string {
  let humanized = text.trim();

  // Remove markdown and emojis first
  humanized = humanized
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/[`*_>#]/g, '') // Remove markdown
    .replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}]/gu, ''); // Remove emojis

  // Break into sentences
  const sentences = humanized
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return '';

  // Romantic & emotional fillers (soft, expressive)
  const softFillers = ['hmm', 'achha', 'haan', 'suniye', 'dekhiye'];
  const emotionalFillers = ['sach kahun to', 'dil se', 'sachchi', 'believe me'];
  const romanticFillers = ['pyaare', 'mere dost', 'suniye na'];
  
  const humanizedSentences: string[] = [];

  sentences.forEach((sentence, index) => {
    let enhanced = sentence;

    // Add emotional filler at start (40% chance for more expression)
    if (index === 0 && Math.random() < 0.4) {
      const allFillers = [...softFillers, ...emotionalFillers, ...romanticFillers];
      const filler = allFillers[Math.floor(Math.random() * allFillers.length)];
      enhanced = `${filler}... ${enhanced}`;
    }

    // Add soft pauses with commas and ellipsis for emotional effect
    if (enhanced.length > 40) {
      const midPoint = Math.floor(enhanced.length / 2);
      const spaceIndex = enhanced.indexOf(' ', midPoint - 10);
      if (spaceIndex > 0 && spaceIndex < enhanced.length - 10) {
        // Use ellipsis for more emotional pauses
        enhanced = enhanced.slice(0, spaceIndex) + '...' + enhanced.slice(spaceIndex);
      }
    }

    // Add emotional emphasis randomly (30% chance)
    if (Math.random() < 0.3) {
      enhanced = enhanced.replace(/\b(bahut|really|very|so)\b/gi, 'bahut hi');
      enhanced = enhanced.replace(/\b(good|achha|nice)\b/gi, 'bahut achha');
    }

    humanizedSentences.push(enhanced);
  });

  // Join with soft pauses (ellipsis for romantic/emotional tone)
  return humanizedSentences.join('... ') + '.';
}

/**
 * Break text into natural speaking chunks with emotional pauses
 * Shorter chunks for more expressive delivery
 */
export function breakIntoChunks(text: string): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  sentences.forEach((sentence) => {
    if (currentChunk.length === 0) {
      currentChunk = sentence;
    } else if (currentChunk.length + sentence.length < 100) {
      // Shorter chunks (100 chars) for more expressive pauses
      currentChunk += '... ' + sentence;
    } else {
      // Push current and start new
      chunks.push(currentChunk + '.');
      currentChunk = sentence;
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }

  return chunks;
}

/**
 * Convert to romantic, emotional, expressive Hindi
 * Soft, smooth, caring tone
 */
export function casualizeHindi(text: string): string {
  return text
    // Formal → Romantic/Emotional replacements
    .replace(/\bआप\b/g, 'aap')
    .replace(/\bतुम\b/g, 'tum')
    .replace(/\bमैं ठीक हूं\b/g, 'main bilkul thik hoon')
    .replace(/\bकैसे हैं\b/g, 'kaise hain aap')
    .replace(/\bकैसे हो\b/g, 'kaise ho tum')
    .replace(/\bधन्यवाद\b/g, 'bahut bahut shukriya')
    .replace(/\bthank you\b/gi, 'shukriya')
    .replace(/\byes\b/gi, 'haan ji')
    .replace(/\bno\b/gi, 'nahi')
    .replace(/\bok\b/gi, 'thik hai')
    // Add emotional emphasis
    .replace(/\bhappy\b/gi, 'bahut khush')
    .replace(/\bsad\b/gi, 'udaas')
    .replace(/\blove\b/gi, 'pyaar')
    .replace(/\bcare\b/gi, 'parvaah')
    // Remove overly formal phrases
    .replace(/\bकृपया\b/g, 'please')
    .replace(/\bअवश्य\b/g, 'zaroor')
    .trim();
}
