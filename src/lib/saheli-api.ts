const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY,
  };
}

function sanitizeTextForSpeech(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getSoftFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const preferred = [
    "Google Hindi Female",
    "Google हिन्दी",
    "Microsoft Swara",
    "Lekha",
    "Google UK English Female",
    "Google US English Female",
    "Samantha",
    "Karen",
    "Victoria",
  ];

  for (const name of preferred) {
    const voice = voices.find((item) => item.name.includes(name));
    if (voice) return voice;
  }

  const femaleVoice = voices.find((item) => item.name.toLowerCase().includes("female"));
  if (femaleVoice) return femaleVoice;
  return voices[0] || null;
}

function extractDeltaContent(payload: any) {
  const choice = payload?.choices?.[0];
  if (!choice) return "";

  if (typeof choice.delta?.content === "string") return choice.delta.content;

  if (Array.isArray(choice.delta?.content)) {
    return choice.delta.content
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
  }

  if (typeof choice.message?.content === "string") return choice.message.content;
  return "";
}

export async function sendChat(messages: ChatMsg[], systemPrompt?: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/saheli-chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ messages, systemPrompt }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Hmm, kuch gadbad ho gayi. Ek baar phir try karo na 🥺");
  return data.reply;
}

export async function sendChatStreaming(
  messages: ChatMsg[],
  onChunk: (text: string, isFirst: boolean) => void,
  onDone: (finalText: string) => void,
  audioOn = false,
  systemPrompt?: string,
) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/saheli-chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ messages, stream: true, systemPrompt }),
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || "Hmm, kuch gadbad ho gayi. Ek baar phir try karo na 🥺");
    }

    const fallbackText = await sendChat(messages, systemPrompt);
    onChunk(fallbackText, true);
    onDone(fallbackText);
    if (audioOn) void speakText(fallbackText);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let isFirstChunk = true;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex !== -1) {
      const eventChunk = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const lines = eventChunk.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const payload = JSON.parse(data);
          const delta = extractDeltaContent(payload);
          if (!delta) continue;

          fullText += delta;
          onChunk(fullText, isFirstChunk);
          isFirstChunk = false;
        } catch {
          // Ignore malformed SSE chunks.
        }
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }

    if (done) break;
  }

  if (!fullText) {
    const fallbackText = await sendChat(messages, systemPrompt);
    onChunk(fallbackText, true);
    onDone(fallbackText);
    if (audioOn) void speakText(fallbackText);
    return;
  }

  onDone(fullText);
  if (audioOn) void speakText(fullText);
}

export async function analyzeImage(imageBase64: string, systemPrompt?: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/saheli-chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ type: "vision", imageBase64, systemPrompt }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Arre, camera se connection nahi ho paaya. Ek baar phir try karo na 🥺");
  return data.reply;
}

export function stopSpeaking() {
  speechSynthesis.cancel();
  activeUtterance = null;
}

export async function speakText(text: string) {
  const cleanText = sanitizeTextForSpeech(text);
  if (!cleanText) return;

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const voice = getSoftFemaleVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1.15;
  activeUtterance = utterance;

  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };

  speechSynthesis.speak(utterance);
}

if (typeof window !== "undefined") {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
