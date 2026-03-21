const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export async function sendChat(messages: ChatMsg[]): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/saheli-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data.reply;
}

export async function analyzeImage(imageBase64: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/saheli-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ type: "vision", imageBase64 }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Camera se connection nahi ho paya! 📸");
  return data.reply;
}

// --- Speech utilities ---

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
    const v = voices.find((v) => v.name.includes(name));
    if (v) return v;
  }
  const female = voices.find((v) => v.name.toLowerCase().includes("female"));
  if (female) return female;
  return voices[0] || null;
}

export function speakText(text: string) {
  speechSynthesis.cancel();
  // Strip emojis for cleaner speech
  const clean = text.replace(
    /[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}]/gu,
    ""
  ).trim();
  if (!clean) return;
  const utter = new SpeechSynthesisUtterance(clean);
  const voice = getSoftFemaleVoice();
  if (voice) utter.voice = voice;
  utter.rate = 0.95;
  utter.pitch = 1.15;
  speechSynthesis.speak(utter);
}

// Preload voices
if (typeof window !== "undefined") {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
