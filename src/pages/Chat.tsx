import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  Settings,
  Menu,
  Mic,
  Send,
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { auth, db, resetFirestorePersistence, storage } from "@/lib/firebase";
import { sendPasswordResetEmail, signOut, updatePassword, updateProfile } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadString, uploadBytes } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FALLBACK_MESSAGE, sendMessage, type AppLanguage, type ChatMessage, type EmotionLabel, type UserIdentityContext } from "@/lib/ai-service";
import {
  createChatSession,
  deleteChatSession,
  loadChatMessages,
  loadChatSessions,
  saveChatMessage,
  updateChatSessionTitle,
  type ChatSessionSummary,
  type StoredChatMessage,
} from "@/lib/chat-history";
import { detectEmotionFromImage } from "@/lib/emotion-service";
import { formatText, getLang, getStoredLanguage, UI_LANGUAGE_STORAGE_KEY } from "@/lib/useLanguage";
import {
  CREATOR_NAME,
  buildPromptMemoryContext,
  clearAllMemory,
  createEmptyMemoryProfile,
  deleteMemoryChat,
  deleteMemoryImage,
  deriveMemoryFields,
  fetchMemory,
  pruneLowValueMemories,
  saveImage,
  saveMemoryFields,
  setMemoryEnabled,
  type MemoryProfile,
} from "@/lib/memory";
import { saveImageMemoryDB, saveMessageToDB } from "@/lib/chatService";
import Sidebar from "@/components/Sidebar";
import Profile from "@/components/Profile";
import MemoryModal from "@/components/memory/MemoryModal";
import { useAppStore } from "@/store/app-store";

const SettingsPanel = lazy(() => import("@/components/settings/SettingsPanel"));

const VISION_TRIGGER_PATTERNS = [
  /\bdekho\b/i,
  /\bdekh\s*ke\s*batao\b/i,
  /\bkais[aei]?\s+lag\s+rah[aei]\b/i,
  /\bkapd[ae]\b/i,
  /\bfit\b/i,
  /\bfit\s*check\b/i,
  /\bcamera\b/i,
];
const GUEST_PROFILE_NAME_KEY = "swara_guest_profile_name";
const GUEST_PROFILE_PHOTO_KEY = "swara_guest_profile_photo";
const ACTIVE_CHAT_SESSION_KEY = "activeChatId";
const REPLY_LANGUAGE_MODE_STORAGE_KEY = "reply_language_mode";
const PROFILE_CROP_OUTPUT_SIZE = 512;
const TITLE_UPDATE_INTERVAL = 3;

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

type LanguageOption = AppLanguage;
type ReplyLanguageMode = LanguageOption;
type SettingsSectionId = "general" | "personalization" | "account";

interface ProfileImageMeta {
  width: number;
  height: number;
}

function getStoredReplyLanguageMode(): ReplyLanguageMode {
  if (typeof window === "undefined") {
    return "hinglish";
  }

  const storedValue = window.localStorage.getItem(REPLY_LANGUAGE_MODE_STORAGE_KEY);
  if (storedValue === "english" || storedValue === "hindi" || storedValue === "hinglish") {
    return storedValue as ReplyLanguageMode;
  }

  return "hinglish";
}

function readGuestProfileName() {
  return localStorage.getItem(GUEST_PROFILE_NAME_KEY)?.trim() || CREATOR_NAME;
}

function readGuestProfilePhoto() {
  return localStorage.getItem(GUEST_PROFILE_PHOTO_KEY) || "";
}

async function loadImageMeta(dataUrl: string): Promise<ProfileImageMeta> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unable to load profile image"));
    image.src = dataUrl;
  });
}

async function buildCroppedProfileImage(
  source: string,
  meta: ProfileImageMeta,
  zoom: number,
  offsetXPct: number,
  offsetYPct: number,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Unable to crop profile image"));
    element.src = source;
  });

  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_CROP_OUTPUT_SIZE;
  canvas.height = PROFILE_CROP_OUTPUT_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas unavailable");
  }

  const baseScale = Math.max(PROFILE_CROP_OUTPUT_SIZE / meta.width, PROFILE_CROP_OUTPUT_SIZE / meta.height);
  const drawWidth = meta.width * baseScale * zoom;
  const drawHeight = meta.height * baseScale * zoom;
  const maxOffsetX = Math.max(0, (drawWidth - PROFILE_CROP_OUTPUT_SIZE) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - PROFILE_CROP_OUTPUT_SIZE) / 2);
  const offsetX = (offsetXPct / 100) * maxOffsetX;
  const offsetY = (offsetYPct / 100) * maxOffsetY;
  const drawX = (PROFILE_CROP_OUTPUT_SIZE - drawWidth) / 2 + offsetX;
  const drawY = (PROFILE_CROP_OUTPUT_SIZE - drawHeight) / 2 + offsetY;

  context.fillStyle = "#12091f";
  context.fillRect(0, 0, PROFILE_CROP_OUTPUT_SIZE, PROFILE_CROP_OUTPUT_SIZE);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return canvas.toDataURL("image/jpeg", 0.9);
}

function normalizeTextForTts(text: string) {
  let normalized = text
    .replace(EMOJI_REGEX, "")
    .replace(/\*\*/g, " ")
    .replace(/_/g, " ")
    .replace(/([,.!?])([^\s,.!?])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  normalized = normalized
    .replace(/\bplz+\b/gi, "please")
    .replace(/\bplzz+\b/gi, "please")
    .replace(/([a-z])\1{2,}/gi, "$1");

  const replacements: Array<[RegExp, string]> = [
    [/\bnhi\b/gi, "nahi"],
    [/\bhn\b/gi, "haan"],
    [/\bkr\b/gi, "kar"],
    [/\bh\b/gi, "hai"],
    [/\bhu\b/gi, "hoon"],
    [/\bm\b/gi, "main"],
    [/\bbt\b/gi, "baat"],
    [/\bkyu\b/gi, "kyun"],
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])([^\s,.!?])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function useVoice(isMuted: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const primePreferredVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    preferredVoiceRef.current =
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("google") && voice.name.toLowerCase().includes("hindi") && voice.name.toLowerCase().includes("female")) ||
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("google") && voice.name.toLowerCase().includes("hindi")) ||
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("google")) ||
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("swara")) ||
      voices.find((voice) => voice.lang === "hi-IN") ||
      null;
  };

  useEffect(() => {
    primePreferredVoice();

    const handleVoicesChanged = () => {
      primePreferredVoice();
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  const unlock = async () => {
    if (unlockedRef.current) {
      return;
    }

    try {
      const AudioContextCtor =
        window.AudioContext || ((window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);

      if (AudioContextCtor) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextCtor();
        }

        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      }

      primePreferredVoice();

      // Silent prime to satisfy browser user-interaction requirements.
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      unlockedRef.current = true;
    } catch (error) {
      console.warn("Voice unlock failed", error);
    }
  };

  const speak = (text: string) => {
    if (isMuted || !unlockedRef.current || !window.speechSynthesis) {
      return;
    }

    // Clear any previous robotic echo
    window.speechSynthesis.cancel();

    let attempts = 0;
    const maxAttempts = 10; // Try for 2 seconds to find premium voice

    const executeSpeech = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // 1. BEST: Swara/Google Online Female
      let selectedVoice = 
        voices.find((v) => v.name.includes("Swara")) || 
        voices.find((v) => v.name.includes("Google \u0939\u093f\u0928\u094d\u0926\u0940"));

      // 2. SECOND BEST: Any Hindi Female
      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.lang.includes("hi") && v.name.toLowerCase().includes("female"));
      }

      // 3. FALLBACK (No Silence): If still nothing after 2 secs, take the first available
      if (!selectedVoice && attempts >= maxAttempts) {
        selectedVoice = voices.find((v) => v.lang.includes("hi")) || voices[0];
      }

      if (selectedVoice) {
        // CLEAN TEXT: Lowercase stops spelling reading
        const cleanText = normalizeTextForTts(text).toLowerCase().replace(/alakh/g, "alukh");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        utterance.voice = selectedVoice;
        utterance.lang = "hi-IN";
        // CRITICAL: Even if it's a male voice, high pitch makes it sound female/soft
        utterance.pitch = 1.6; 
        utterance.rate = 0.9;
        
        window.speechSynthesis.resume(); 
        window.speechSynthesis.speak(utterance);
      } else {
        // Retry loop
        attempts++;
        setTimeout(executeSpeech, 200);
      }
    };
    
    executeSpeech();
  };

  const stop = () => {
    window.speechSynthesis.cancel();
  };

  return { unlock, speak, stop };
}

// ── Speech-to-Text Hook ──
interface SpeechToTextResult {
  isListening: boolean;
  toggle: () => void;
  stopListening: () => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

type SpeechRecognitionWindow = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

interface PendingMobileVisionRequest {
  id: number;
  chatId: string;
  history: ChatMessage[];
  memoryProfile: MemoryProfile | null;
  identity: UserIdentityContext;
}

type TitleMood = "flirty" | "sad" | "funny" | "serious" | "neutral";

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectTitleMood(text: string): TitleMood {
  if (includesAny(text, ["flirt", "sexy", "hot", "cute", "romantic", "naughty", "tease", "wink", "kaisa lag raha", "kaisi lag rahi"])) {
    return "flirty";
  }

  if (includesAny(text, ["sad", "mood off", "heartbreak", "cry", "crying", "alone", "hurt", "dukhi", "udas", "toot gaya", "dil toot"])) {
    return "sad";
  }

  if (includesAny(text, ["masti", "bakchodi", "funny", "joke", "jokes", "haha", "lol", "lmao", "pagal", "mazak"])) {
    return "funny";
  }

  if (includesAny(text, ["serious", "deep", "confused", "overthinking", "soch", "advice", "help", "future", "career"])) {
    return "serious";
  }

  return "neutral";
}

function generateChatTitle(messages: ChatMessage[], language: LanguageOption) {
  const titles = getLang(language).chatTitles;
  const recent = messages
    .slice(-5)
    .map((message) => message.content.trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (!recent) {
    return titles.newChat;
  }

  const mood = detectTitleMood(recent);

  if (includesAny(recent, ["kaisa lag raha", "kaisi lag rahi", "fit", "fit check", "look", "looks", "outfit", "dress", "kapde", "photo"])) {
    return mood === "funny" ? titles.fitCheckFun : titles.fitCheckLooks;
  }

  if (includesAny(recent, ["relationship", "love", "lover", "breakup", "crush", "pyaar", "pyar", "dil"])) {
    if (mood === "sad") {
      return titles.loveHeart;
    }

    if (mood === "serious") {
      return titles.relationshipSerious;
    }

    return titles.relationship;
  }

  if (includesAny(recent, ["mood", "mood off", "sad", "cry", "crying", "emotional", "dukhi", "udas"])) {
    return mood === "sad" ? titles.emotional : titles.mood;
  }

  if (includesAny(recent, ["masti", "bakchodi", "funny", "joke", "jokes", "haha", "lol", "pagal", "mazak"])) {
    return mood === "flirty" ? titles.lateNightMasti : titles.masti;
  }

  if (includesAny(recent, ["study", "studies", "exam", "padhai", "college", "school", "homework", "syllabus"])) {
    return titles.study;
  }

  if (mood === "flirty") {
    return titles.lateNightMasti;
  }

  if (mood === "sad") {
    return titles.emotional;
  }

  if (mood === "funny") {
    return titles.masti;
  }

  if (mood === "serious") {
    return titles.deep;
  }

  return titles.random;
}

function isDefaultChatTitle(title: string) {
  return title === "New Chat"
    || title === getLang("english").chatTitles.newChat
    || title === getLang("hindi").chatTitles.newChat
    || title === getLang("hinglish").chatTitles.newChat;
}

function shouldRefreshGeneratedTitle(messageCount: number, currentTitle: string, language: LanguageOption) {
  if (messageCount === 0) {
    return false;
  }

  return isDefaultChatTitle(currentTitle) || messageCount === 1 || messageCount % TITLE_UPDATE_INTERVAL === 0;
}

// ── Auto Chat Language Detection ──
// Detects the language of the user's message to pick the right AI reply language.
// This is completely separate from the UI language (localStorage "app_language").
// Word-boundary patterns prevent false positives (e.g. "ho" inside "house").
const HINGLISH_PATTERNS = [
  "hai", "kya", "tum", "nahi", "yaar", "kar", "raha", "rahi", "baat", "mera",
  "tera", "haan", "nhi", "kyun", "kyu", "acha", "theek", "chal", "bol", "hoon",
  "ho", "hu", "kr", "aur", "kuch", "sab", "bhi", "mat", "ye", "vo", "woh",
].map((kw) => new RegExp(`\\b${kw}\\b`, "i"));

function detectChatLanguage(text: string): AppLanguage | null {
  // Too short to detect reliably — return null so caller keeps previous language.
  if (text.length < 3) {
    return null;
  }

  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }

  const hasEnglish = /[a-zA-Z]/.test(text);
  if (hasEnglish && HINGLISH_PATTERNS.some((pattern) => pattern.test(text))) {
    return "hinglish";
  }

  if (hasEnglish) {
    return "english";
  }

  return "hinglish"; // default
}

function useSpeechToText(onResult: (text: string) => void): SpeechToTextResult {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn("Speech recognition stop failed", error);
      }
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim = transcript;
        }
      }
      // Show interim text while speaking, replace with final when done
      onResultRef.current(finalTranscript || interim);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn("Speech recognition cleanup failed", error);
        }
      }
    };
  }, []);

  return { isListening, toggle, stopListening };
}

// Mood detection from AI response text
const MOOD_KEYWORDS: Record<string, string[]> = {
  jealous: ["jealous", "jalan", "kisse baat", "usse kyun"],
  angry: ["gussa", "angry", "naraz", "chup", "mat bol"],
  sweet: ["pyaar", "love", "miss", "sweetie", "jaanu", "❤", "🥰", "😘"],
  happy: ["haha", "lol", "😂", "maza", "khush", "yay", "great"],
};

function detectMood(text: string): string {
  const lower = text.toLowerCase();
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return mood;
  }
  return "neutral";
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function logCameraFailure(error: unknown) {
  if (error instanceof DOMException) {
    console.warn(`Camera capture failed: ${error.name}`, error.message);
    return;
  }

  if (error instanceof Error) {
    console.warn("Camera capture failed", error.message);
    return;
  }

  console.warn("Camera capture failed", error);
}

function getMessageKey(msg: ChatMessage, index: number) {
  const possibleId = (msg as ChatMessage & { id?: string }).id;
  if (possibleId) {
    return possibleId;
  }
  return `${msg.role}-${index}`;
}

// Message Item with Scroll-triggered Fade + Sheen + Hover Pulse
const ScrollFadeMessageItem = React.forwardRef<HTMLDivElement, { msg: ChatMessage; isNew: boolean }>(
  function ScrollFadeMessageItem({ msg, isNew }, ref) {
    return (
      <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      viewport={{ once: false, amount: 0.3, margin: "50px" }}
      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
      style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
    >
      <div
        className={`
        max-w-[86%] md:max-w-[74%] px-4 py-3.5 rounded-[22px] text-sm leading-relaxed font-medium relative
        bubble-hover transition-all duration-300
        ${isNew ? "msg-sheen" : ""}
        ${msg.role === "user"
          ? "bg-gradient-to-br from-[#f5f7ff26] via-[#e8eeff2e] to-[#fcecff33] backdrop-blur-3xl border border-white/35 text-white rounded-[22px] rounded-tr-[8px] shadow-[0_8px_32px_rgba(255,255,255,0.08),0_14px_36px_rgba(0,0,0,0.35)]"
          : "bg-white/[0.07] backdrop-blur-3xl border border-white/20 text-white/90 rounded-[22px] rounded-tl-[8px] shadow-[0_10px_34px_rgba(2,6,23,0.45)]"
        }
      `}
        style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: "15px", fontWeight: 500, letterSpacing: "0.01em" }}
      >
        {msg.content}
      </div>
    </motion.div>
    );
  },
);

// Scroll Fade Message List Container
const ScrollFadeMessageList = memo(function ScrollFadeMessageList({
  messages,
  isLoading,
  messagesEndRef,
  lastMsgCount,
  typingLabel,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  lastMsgCount: number;
  typingLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto space-y-6 overflow-y-auto w-full h-full pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ overflowAnchor: "none", scrollBehavior: "smooth" }}>
      <AnimatePresence initial={false} mode="sync">
        {messages.map((msg, idx) => (
          <ScrollFadeMessageItem key={getMessageKey(msg, idx)} msg={msg} isNew={idx >= lastMsgCount} />
        ))}

      </AnimatePresence>

      <div className="min-h-[76px]">
        <AnimatePresence initial={false} mode="wait">
          {isLoading ? (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex justify-start h-[76px] items-start"
              style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
            >
              <div className="bg-white/[0.05] backdrop-blur-3xl border border-pink-400/40 p-4 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-pulse-slow">
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-premium-wave" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-premium-wave" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-premium-wave" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <p className="text-white/60 text-xs font-medium">{typingLabel}</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
});

const BackgroundComponent = memo(function BackgroundComponent({ mood }: { mood: string }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {/* White Radial Glow for Airy Premium Feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.05)_0%,_transparent_70%)] mix-blend-screen" style={{ transform: 'translateZ(0)' }} />
      
      <div
        className="absolute top-[-15%] left-[-20%] w-[75vw] h-[75vw] rounded-full mix-blend-screen filter blur-[120px] blob-drift-1"
        style={{ background: 'var(--mood-blob-1)', transform: 'translateZ(0)' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-15%] w-[65vw] h-[65vw] rounded-full mix-blend-screen filter blur-[120px] blob-drift-2"
        style={{ background: 'var(--mood-blob-2)', transform: 'translateZ(0)' }}
      />
      <div
        className="absolute top-[30%] left-[40%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[140px] blob-drift-3"
        style={{ background: 'var(--mood-blob-3)', transform: 'translateZ(0)' }}
      />
    </div>
  );
});

function saveLocal(message: { content: string, role: string }) {
  try {
    const chats = JSON.parse(localStorage.getItem("chats") || "[]");
    chats.push(message);
    localStorage.setItem("chats", JSON.stringify(chats));
  } catch (err) {
    console.warn("Failed to save local chat", err);
  }
}

function isFirestoreConnectivityError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code ?? "") : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    code.includes("unavailable") ||
    code.includes("offline") ||
    code.includes("network") ||
    message.includes("client is offline")
  );
}

export default function Chat() {
  const user = auth.currentUser;
  const isGuest = !user;
  const [language, setLanguage] = useState<LanguageOption>(() => getStoredLanguage());
  const t = getLang(language);
  const [profileName, setProfileName] = useState(() => user?.displayName?.trim() || (isGuest ? readGuestProfileName() : "User"));
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(() => user?.photoURL || (isGuest ? readGuestProfilePhoto() : ""));
  const [profileDraftName, setProfileDraftName] = useState(() => user?.displayName?.trim() || (isGuest ? readGuestProfileName() : "User"));
  const [profileDraftPhotoUrl, setProfileDraftPhotoUrl] = useState(() => user?.photoURL || (isGuest ? readGuestProfilePhoto() : ""));
  const [profileImageSource, setProfileImageSource] = useState<string | null>(null);
  const [profileImageMeta, setProfileImageMeta] = useState<ProfileImageMeta | null>(null);
  const [profileCropZoom, setProfileCropZoom] = useState(1);
  const [profileCropX, setProfileCropX] = useState(0);
  const [profileCropY, setProfileCropY] = useState(0);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>("general");
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [replyLanguageMode, setReplyLanguageMode] = useState<ReplyLanguageMode>(() => getStoredReplyLanguageMode());
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [memoryEnabled, setMemoryEnabledState] = useState(true);
  const [memoryHydrated, setMemoryHydrated] = useState(false);
  const [selectedMemoryImage, setSelectedMemoryImage] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const effectiveUserName = profileName.trim() || (isGuest ? CREATOR_NAME : "User");
  const identityContext: UserIdentityContext = {
    userId: user?.uid ?? "guest",
    userName: effectiveUserName,
    isGuest,
    isCreatorSession: isGuest || effectiveUserName.toLowerCase() === CREATOR_NAME.toLowerCase(),
    language,
  };
  const inputPlaceholder = t.composer.messagePlaceholder;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memoryProfile, setMemoryProfile] = useState<MemoryProfile | null>(createEmptyMemoryProfile());
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [pendingMobileVisionRequest, setPendingMobileVisionRequest] = useState<PendingMobileVisionRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionsRef = useRef<ChatSessionSummary[]>([]);
  const submitLockRef = useRef(false);
  const lastMsgCountRef = useRef(0);
  // chatLanguageRef: auto-detected language for AI replies - SEPARATE from UI language.
  // UI language (localStorage app_language) is never modified by this system.
  const chatLanguageRef = useRef(getStoredLanguage());
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraCancelTimeoutRef = useRef<number | null>(null);
  const pendingMobileVisionRequestRef = useRef<PendingMobileVisionRequest | null>(null);
  const mobileVisionRequestIdRef = useRef(0);
  const mobileVisionProcessingRequestIdRef = useRef<number | null>(null);
  const memoryCleanupDoneRef = useRef(false);
  const navigate = useNavigate();
  const { chatId: routeChatId } = useParams<{ chatId?: string }>();
  const messagesRef = useRef<ChatMessage[]>([]);
  const currentChatIdRef = useRef<string | null>(null);
  const setStoreUser = useAppStore((state) => state.setUser);
  const setStoreChats = useAppStore((state) => state.setChats);
  const setStoreMemory = useAppStore((state) => state.setMemory);
  const setStoreSettings = useAppStore((state) => state.setSettings);
  const storeAddMessage = useAppStore((state) => state.addMessage);
  const storeUpdateStreamingMessage = useAppStore((state) => state.updateStreamingMessage);
  const storeSaveFinalMessage = useAppStore((state) => state.saveFinalMessage);
  const { unlock, speak, stop } = useVoice(isMuted);

  // Speech-to-text: appends recognized speech to current input
  const { isListening, toggle: toggleMic, stopListening } = useSpeechToText(
    useCallback((text: string) => setInput(text), [])
  );

  useEffect(() => {
    void import("@/components/settings/SettingsPanel");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isLoading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  useEffect(() => {
    chatSessionsRef.current = chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
    setStoreSettings({ language });
  }, [language, setStoreSettings]);

  useEffect(() => {
    localStorage.setItem(REPLY_LANGUAGE_MODE_STORAGE_KEY, replyLanguageMode);
  }, [replyLanguageMode]);

  useEffect(() => {
    chatLanguageRef.current = replyLanguageMode;
  }, [replyLanguageMode]);

  useEffect(() => {
    if (!memoryHydrated) {
      return;
    }

    setStoreSettings({ memoryEnabled });
    void setMemoryEnabled(user, memoryEnabled).catch((error) => {
      console.warn("Failed to persist memory toggle", error);
    });
  }, [memoryEnabled, memoryHydrated, setStoreSettings, user]);

  useEffect(() => {
    setStoreUser(user ?? null);
  }, [setStoreUser, user]);

  useEffect(() => {
    const nextName = user?.displayName?.trim() || (isGuest ? readGuestProfileName() : "User");
    const nextPhotoUrl = user?.photoURL || (isGuest ? readGuestProfilePhoto() : "");

    setProfileName(nextName);
    setProfilePhotoUrl(nextPhotoUrl);
    setProfileDraftName(nextName);
    setProfileDraftPhotoUrl(nextPhotoUrl);
    setProfileImageSource(null);
    setProfileImageMeta(null);
    setProfileCropZoom(1);
    setProfileCropX(0);
    setProfileCropY(0);
    setProfileStatus(null);
    setMemoryStatus(null);
  }, [isGuest, user]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapChatHistory = async () => {
      sessionStorage.removeItem(ACTIVE_CHAT_SESSION_KEY);
      setCurrentChatId(null);
      setMessages([]);
      setPendingMobileVisionRequest(null);
      pendingMobileVisionRequestRef.current = null;

      const sessions = await loadChatSessions(user);
      if (cancelled) {
        return;
      }

      chatSessionsRef.current = sessions;
      setChatSessions(sessions);
      setStoreChats(sessions.map((chat) => ({ ...chat, messages: [] })));
    };

    void bootstrapChatHistory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const nextChatId = routeChatId ?? sessionStorage.getItem(ACTIVE_CHAT_SESSION_KEY);
    if (!nextChatId) {
      return;
    }

    if (currentChatIdRef.current === nextChatId) {
      return;
    }

    let cancelled = false;

    const hydrateActiveChat = async () => {
      try {
        const storedMessages = await loadChatMessages(nextChatId, user);
        if (cancelled) {
          return;
        }

        const normalizedMessages = storedMessages.map(({ role, content }) => ({ role, content }));
        setCurrentChatId(nextChatId);
        setMessages(normalizedMessages);
        messagesRef.current = normalizedMessages;
        setPendingMobileVisionRequest(null);
        pendingMobileVisionRequestRef.current = null;
        setStoreChats(
          chatSessionsRef.current.map((chat: any) =>
            chat.id === nextChatId ? { ...chat, messages: normalizedMessages } : { ...chat, messages: chat.messages ?? [] },
          ),
        );
        setDbStatus(null);
      } catch (error) {
        console.error("Failed to hydrate active chat", error);
        if (!cancelled && isFirestoreConnectivityError(error)) {
          setDbStatus("Connecting to database...");
        }
      }
    };

    void hydrateActiveChat();

    return () => {
      cancelled = true;
    };
  }, [routeChatId, setStoreChats, user]);

  useEffect(() => {
    if (!currentChatId || isGuest || !user?.uid) {
      return;
    }

    const messagesQuery = query(collection(db, "chats", currentChatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        if (currentChatIdRef.current !== currentChatId) {
          return;
        }

        const realtimeMessages = snapshot.docs.map((messageDoc) => {
          const data = messageDoc.data();
          return {
            role: data.role === "user" ? "user" : "model",
            content: typeof data.content === "string" ? data.content : "",
          } as ChatMessage;
        });

        if (realtimeMessages.length === 0 && messagesRef.current.length > 0) {
          return;
        }

        setMessages(realtimeMessages);
        messagesRef.current = realtimeMessages;
        setStoreChats(
          chatSessionsRef.current.map((chat: any) =>
            chat.id === currentChatId ? { ...chat, messages: realtimeMessages } : { ...chat, messages: chat.messages ?? [] },
          ),
        );
        setDbStatus(null);
      },
      (error) => {
        console.error("Chat onSnapshot error:", error);
        if (String((error as { code?: string }).code ?? "").includes("permission-denied")) {
          console.error("Firestore permission denied for chat listener");
        }
        if (isFirestoreConnectivityError(error)) {
          setDbStatus("Connecting to database...");
        }
        const code = String((error as { code?: string }).code ?? "");
        if (code.includes("failed-precondition")) {
          void resetFirestorePersistence().catch((resetError) => {
            console.error("Failed to reset Firestore persistence", resetError);
          });
        }
      },
    );

    return () => unsubscribe();
  }, [currentChatId, isGuest, setStoreChats, user?.uid]);

  useEffect(() => {
    if (currentChatId) {
      sessionStorage.setItem(ACTIVE_CHAT_SESSION_KEY, currentChatId);
      return;
    }

    sessionStorage.removeItem(ACTIVE_CHAT_SESSION_KEY);
  }, [currentChatId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapMemory = async () => {
      try {
        if (user && !memoryCleanupDoneRef.current) {
          memoryCleanupDoneRef.current = true;
          void pruneLowValueMemories(user).catch((error) => {
            console.warn("Failed to prune low-value memories", error);
          });
        }
        const profile = await fetchMemory(user);
        if (!cancelled) {
          setMemoryProfile(profile);
          setMemoryEnabledState(profile.memoryEnabled);
          setMemoryHydrated(true);
          setStoreMemory(profile);
          setStoreSettings({ memoryEnabled: profile.memoryEnabled });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load memory", error);
          setMemoryProfile(createEmptyMemoryProfile());
          setMemoryHydrated(true);
          setStoreMemory(createEmptyMemoryProfile());
        }
      }
    };

    void bootstrapMemory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (mobileCameraCancelTimeoutRef.current) {
        window.clearTimeout(mobileCameraCancelTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    stop();
    await signOut(auth);
    sessionStorage.removeItem("devMode");
    navigate("/");
  };

  const handleLanguageModeChange = (nextMode: ReplyLanguageMode) => {
    setReplyLanguageMode(nextMode);
    setLanguage(nextMode);
    chatLanguageRef.current = nextMode;
  };

  const handleMemoryToggle = (enabled: boolean) => {
    setMemoryEnabledState(enabled);
    setMemoryProfile((prev) => ({
      ...(prev ?? createEmptyMemoryProfile()),
      memoryEnabled: enabled,
    }));
    setMemoryStatus(enabled ? t.statuses.memoryOn : t.statuses.memoryOff);
  };

  const refreshMemoryState = useCallback(async () => {
    try {
      const nextMemory = await fetchMemory(user);
      setMemoryProfile(nextMemory);
      setMemoryEnabledState(nextMemory.memoryEnabled);
      setStoreMemory(nextMemory);
      setStoreSettings({ memoryEnabled: nextMemory.memoryEnabled });
    } catch (error) {
      console.warn("Failed to refresh memory", error);
    }
  }, [setStoreMemory, setStoreSettings, user]);

  const handleDeleteMemoryChat = async (messageId: string) => {
    if (!window.confirm("Delete this chat memory?")) {
      return;
    }

    try {
      await deleteMemoryChat(user, messageId);
      await refreshMemoryState();
      setMemoryStatus("Chat memory deleted.");
    } catch (error) {
      console.warn("Failed to delete chat memory", error);
      setMemoryStatus("Could not delete chat memory.");
    }
  };

  const handleDeleteMemoryImage = async (imageId: string) => {
    if (!window.confirm("Delete this image memory?")) {
      return;
    }

    try {
      const deletedImage = memoryProfile?.images.find((image) => image.id === imageId);
      await deleteMemoryImage(user, imageId);
      if (selectedMemoryImage && deletedImage?.url === selectedMemoryImage) {
        setSelectedMemoryImage(null);
      }
      await refreshMemoryState();
      setMemoryStatus("Image memory deleted.");
    } catch (error) {
      console.warn("Failed to delete image memory", error);
      setMemoryStatus("Could not delete image memory.");
    }
  };

  const handleClearAllMemory = async () => {
    if (!window.confirm("Clear all memory (chats + images + facts + preferences)?")) {
      return;
    }

    try {
      await clearAllMemory(user);
      await refreshMemoryState();
      setSelectedMemoryImage(null);
      setMemoryStatus("All memory cleared.");
    } catch (error) {
      console.warn("Failed to clear memory", error);
      setMemoryStatus("Couldn't clear memory right now.");
    }
  };

  const persistMemoryImage = useCallback(async (payload: {
    type: "upload" | "generated";
    url: string;
    prompt?: string;
    storagePath?: string;
  }) => {
    if (!memoryEnabled) {
      return;
    }

    if (!user) {
      return;
    }

    try {
      await saveImage(user, payload);
      await saveImageMemoryDB(payload.url, user.uid);
    } catch (error) {
      console.error("Memory image save failed:", error);
    }
  }, [memoryEnabled, user]);

  const uploadMemoryImage = useCallback(async (
    base64OrDataUrl: string,
    type: "upload" | "generated",
    prompt?: string,
  ) => {
    if (!memoryEnabled) {
      return;
    }

    if (!user) {
      return;
    }

    const imageDataUrl = base64OrDataUrl.startsWith("data:image")
      ? base64OrDataUrl
      : `data:image/jpeg;base64,${base64OrDataUrl}`;
    const path = `memory/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const imageRef = storageRef(storage, path);

    await uploadString(imageRef, imageDataUrl, "data_url");
    const url = await getDownloadURL(imageRef);
    await persistMemoryImage({
      type,
      url,
      prompt,
      storagePath: path,
    });
  }, [memoryEnabled, persistMemoryImage, user]);

  const handleProfileImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
            return;
          }

          reject(new Error("Unable to load image"));
        };
        reader.onerror = () => reject(reader.error ?? new Error("Unable to load image"));
        reader.readAsDataURL(file);
      });

      const meta = await loadImageMeta(source);
      setProfileImageSource(source);
      setProfileImageMeta(meta);
      setProfileDraftPhotoUrl(source);
      setProfileCropZoom(1);
      setProfileCropX(0);
      setProfileCropY(0);
      setProfileStatus(t.statuses.imageReady);
    } catch (error) {
      console.warn("Profile image selection failed", error);
      setProfileStatus(t.statuses.imageLoadFailed);
    } finally {
      event.target.value = "";
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setProfileStatus(t.statuses.passwordResetNeedsEmail);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      setProfileStatus(formatText(t.statuses.resetLinkSent, { email: user.email }));
    } catch (error) {
      console.warn("Password reset failed", error);
      setProfileStatus(t.statuses.resetEmailFailed);
    }
  };

  const handleChangePassword = useCallback(async () => {
    if (!user) {
      setMemoryStatus("Please log in to change password.");
      return;
    }

    const nextPassword = window.prompt("Enter new password (minimum 6 characters):", "");
    if (!nextPassword) {
      return;
    }

    if (nextPassword.trim().length < 6) {
      setMemoryStatus("Password must be at least 6 characters.");
      return;
    }

    try {
      await updatePassword(user, nextPassword.trim());
      setMemoryStatus("Password updated.");
    } catch (error) {
      console.warn("Password update failed", error);
      setMemoryStatus("Could not change password. Please re-login and try again.");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    const trimmedName = profileDraftName.trim() || (isGuest ? CREATOR_NAME : "User");

    setIsSavingProfile(true);
    setProfileStatus(t.statuses.savingProfile);

    try {
      let nextPhotoUrl = profilePhotoUrl;

      if (profileImageSource && profileImageMeta) {
        const croppedDataUrl = await buildCroppedProfileImage(
          profileImageSource,
          profileImageMeta,
          profileCropZoom,
          profileCropX,
          profileCropY,
        );

        if (user) {
          const avatarRef = storageRef(storage, `profile-pictures/${user.uid}.jpg`);
          await uploadString(avatarRef, croppedDataUrl, "data_url");
          nextPhotoUrl = await getDownloadURL(avatarRef);
        } else {
          nextPhotoUrl = croppedDataUrl;
          localStorage.setItem(GUEST_PROFILE_PHOTO_KEY, nextPhotoUrl);
        }
      }

      if (user) {
        await updateProfile(user, {
          displayName: trimmedName,
          photoURL: nextPhotoUrl || null,
        });
      } else {
        localStorage.setItem(GUEST_PROFILE_NAME_KEY, trimmedName);
      }

      setProfileName(trimmedName);
      setProfilePhotoUrl(nextPhotoUrl);
      setProfileDraftName(trimmedName);
      setProfileDraftPhotoUrl(nextPhotoUrl);
      setProfileImageSource(null);
      setProfileImageMeta(null);
      setProfileCropZoom(1);
      setProfileCropX(0);
      setProfileCropY(0);

      if (memoryEnabled) {
        const nextMemoryFields = deriveMemoryFields(
          {
            preferences: memoryProfile?.preferences ?? [],
            facts: memoryProfile?.facts ?? [],
          },
          `my name is ${trimmedName}`,
        );
        void saveMemoryFields(user, nextMemoryFields)
          .then(() => refreshMemoryState())
          .catch((error) => {
            console.warn("Failed to sync memory name with profile", error);
          });
      }

      setProfileStatus(t.statuses.profileSaved);
    } catch (error) {
      console.warn("Profile save failed", error);
      setProfileStatus(t.statuses.profileSaveFailed);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const captureVisionFrame = async (): Promise<string | undefined> => {
    let stream: MediaStream | undefined;
    let video: HTMLVideoElement | undefined;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn("Camera capture unavailable: mediaDevices.getUserMedia is not supported on this browser");
        return undefined;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "true");

      await new Promise<void>((resolve, reject) => {
        if (!video) {
          reject(new Error("Video element unavailable"));
          return;
        }

        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Camera metadata failed to load"));
      });

      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 250));

      const frameWidth = video.videoWidth || 320;
      const frameHeight = video.videoHeight || 240;

      const canvas = document.createElement("canvas");
      canvas.width = frameWidth;
      canvas.height = frameHeight;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      return dataUrl.split(",")[1];
    } catch (error) {
      logCameraFailure(error);
      return undefined;
    } finally {
      if (video) {
        video.pause();
        video.srcObject = null;
      }

      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result.split(",")[1] : "";
        if (!result) {
          reject(new Error("Unable to read image"));
          return;
        }

        resolve(result);
      };

      reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
      reader.readAsDataURL(file);
    });
  };

  const refreshChatSessions = useCallback(async (nextChatId?: string | null) => {
    const sessions = await loadChatSessions(user);
    chatSessionsRef.current = sessions;
    setChatSessions(sessions);
    setStoreChats(sessions.map((chat: any) => ({ ...chat, messages: [] })));

    if (nextChatId !== undefined) {
      setCurrentChatId(nextChatId);
    }
  }, [setStoreChats, user]);

  const getRequestIdentityContext = useCallback((
    detectedLanguage?: AppLanguage,
  ): UserIdentityContext => ({
    ...identityContext,
    // Use the auto-detected chat language when provided; otherwise fall back
    // to the last known chat language (chatLanguageRef). The UI language in
    // localStorage ("app_language") is NEVER touched here.
    language: detectedLanguage ?? chatLanguageRef.current,
  }), [identityContext]);

  const handleSelectChat = async (chatId: string) => {
    if (submitLockRef.current && currentChatId === chatId) {
      return;
    }

    const storedMessages = await loadChatMessages(chatId, user);
    const normalizedMessages = storedMessages.map(({ role, content }) => ({ role, content }));
    setCurrentChatId(chatId);
    setMessages(normalizedMessages);
    setStoreChats(chatSessionsRef.current.map((chat: any) => (
      chat.id === chatId ? { ...chat, messages: normalizedMessages } : { ...chat, messages: chat.messages ?? [] }
    )));
    messagesRef.current = normalizedMessages;
    setPendingMobileVisionRequest(null);
    pendingMobileVisionRequestRef.current = null;
    navigate(`/chat/${chatId}`);
  };

  const handleCreateChat = async () => {
    if (submitLockRef.current) {
      return;
    }

    setCurrentChatId(null);
    setMessages([]);
    messagesRef.current = [];
    setPendingMobileVisionRequest(null);
    pendingMobileVisionRequestRef.current = null;
    navigate("/chat");
    await refreshChatSessions(null);
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm("Delete this chat permanently?")) {
      return;
    }

    await deleteChatSession(chatId, user);

    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      messagesRef.current = [];
      navigate("/chat", { replace: true });
    }

    await refreshChatSessions(currentChatId === chatId ? null : currentChatId);
  };

  const handleRenameChat = useCallback(async (chatId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }

    await updateChatSessionTitle(chatId, trimmed, user);
    await refreshChatSessions(currentChatId === chatId ? chatId : currentChatId);
  }, [currentChatId, refreshChatSessions, user]);

  const generateTitle = useCallback(async (message: string) => {
    const response = await fetch("/api/title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Title API failed: ${response.status}`);
    }

    const data = (await response.json()) as { title?: string };
    const title = (data.title ?? "").trim();
    return title
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");
  }, []);

  const syncSmartChatTitle = useCallback(async (chatId: string, history: ChatMessage[]) => {
    const currentTitle = chatSessionsRef.current.find((chat) => chat.id === chatId)?.title ?? "New Chat";
    if (!shouldRefreshGeneratedTitle(history.length, currentTitle, language)) {
      return;
    }

    const nextTitle = generateChatTitle(history, language);
    if (nextTitle === currentTitle) {
      return;
    }

    await updateChatSessionTitle(chatId, nextTitle, user);
    await refreshChatSessions(chatId);
  }, [language, refreshChatSessions, user]);

  const ensureActiveChat = useCallback(async () => {
    let chatId = currentChatIdRef.current ?? routeChatId ?? null;

    if (!chatId) {
      chatId = await createChatSession(user);
      setCurrentChatId(chatId);
      currentChatIdRef.current = chatId;
    }

    return { chatId };
  }, [routeChatId, user]);

  const persistChatMessage = useCallback(async (chatId: string, message: StoredChatMessage) => {
    try {
      await saveChatMessage(chatId, message, user);
      storeAddMessage(chatId, message);
      setDbStatus(null);
    } catch (error) {
      if (isFirestoreConnectivityError(error)) {
        setDbStatus("Connecting to database...");
      }
      throw error;
    }
  }, [storeAddMessage, user]);

  const updateStreamingMessage = useCallback((chatId: string, content: string) => {
    setMessages((prev) => {
      const next = [...prev];
      if (!next.length || next[next.length - 1].role !== "model") {
        next.push({ role: "model", content });
      } else {
        next[next.length - 1] = { ...next[next.length - 1], content };
      }
      return next;
    });
    storeUpdateStreamingMessage(chatId, content);
  }, [storeUpdateStreamingMessage]);

  const saveFinalMessage = useCallback((chatId: string, content: string) => {
    setMessages((prev) => {
      const next = [...prev];
      if (!next.length || next[next.length - 1].role !== "model") {
        next.push({ role: "model", content });
      } else {
        next[next.length - 1] = { ...next[next.length - 1], content };
      }
      return next;
    });
    storeSaveFinalMessage(chatId, { role: "model", content });
  }, [storeSaveFinalMessage]);

  const streamResponse = useCallback(async (
    prompt: string,
    chatId: string,
    history: ChatMessage[],
    imageBase64?: string,
    detectedEmotion?: EmotionLabel,
    requestIdentity?: UserIdentityContext,
    nextMemoryProfile?: MemoryProfile | null,
  ) => {
    if (imageBase64) {
      return sendMessage(
        history,
        imageBase64,
        detectedEmotion,
        memoryEnabled && nextMemoryProfile ? buildPromptMemoryContext(nextMemoryProfile) : null,
        requestIdentity,
        memoryEnabled ? "enabled" : "disabled",
      );
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          messages: history,
          identity: requestIdentity,
          memory: memoryEnabled && nextMemoryProfile ? buildPromptMemoryContext(nextMemoryProfile) : null,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Streaming failed: ${response.status}`);
      }

      let fullText = "";
      let firstTokenReceived = false;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      updateStreamingMessage(chatId, "");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        if (!firstTokenReceived && fullText.trim().length > 0) {
          firstTokenReceived = true;
          setIsLoading(false);
        }
        updateStreamingMessage(chatId, fullText);
      }

      fullText += decoder.decode();
      return fullText.trim() || FALLBACK_MESSAGE;
    } catch {
      return sendMessage(
        history,
        imageBase64,
        detectedEmotion,
        memoryEnabled && nextMemoryProfile ? buildPromptMemoryContext(nextMemoryProfile) : null,
        requestIdentity,
        memoryEnabled ? "enabled" : "disabled",
      );
    }
  }, [memoryEnabled, updateStreamingMessage]);

  const completePendingVisionRequest = async (request: PendingMobileVisionRequest, imageBase64?: string) => {
    if (mobileVisionProcessingRequestIdRef.current === request.id) {
      return;
    }

    if (pendingMobileVisionRequestRef.current?.id !== request.id) {
      return;
    }

    mobileVisionProcessingRequestIdRef.current = request.id;
    let detectedEmotion: EmotionLabel | undefined;

    pendingMobileVisionRequestRef.current = null;
    setPendingMobileVisionRequest(null);
    setIsLoading(true);

    try {
      const requestIdentity = getRequestIdentityContext();

      if (imageBase64) {
        detectedEmotion = await detectEmotionFromImage(imageBase64);
        if (memoryEnabled) {
          try {
            await uploadMemoryImage(imageBase64, "upload");
          } catch (error) {
            console.warn("Failed to save memory image", error);
          }
        }
      }

      lastMsgCountRef.current = request.history.length;
      const responseText = await streamResponse(
        request.history[request.history.length - 1]?.content ?? "",
        request.chatId,
        request.history,
        imageBase64,
        detectedEmotion,
        requestIdentity as any,
        request.memoryProfile,
      );
      saveFinalMessage(request.chatId, responseText);
      setIsLoading(false);
      speak(responseText);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      const nextHistory = [...request.history, aiMessage];
      setMood(nextMood);
      if (isGuest) {
        saveLocal({ role: "assistant", content: responseText });
      } else {
        void saveMessageToDB(responseText, "assistant", user?.uid);
      }

      void persistChatMessage(request.chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.warn("Failed to persist model reply (mobile vision)", error);
      });

      void syncSmartChatTitle(request.chatId, nextHistory).catch((error) => {
        console.warn("Failed to update smart chat title (mobile vision)", error);
      });
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  const handleMobileCameraOpen = () => {
    mobileCameraInputRef.current?.click();
  };

  const handleMobileCameraChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pendingMobileVisionRequest) {
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await completePendingVisionRequest(pendingMobileVisionRequest, base64);
    } catch (error) {
      console.warn("Mobile camera capture failed", error);
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || submitLockRef.current) {
      return;
    }

    const userText = input.trim();
    setInput("");

    const { chatId } = await ensureActiveChat();

    // Auto-detect chat language
    const detectedLang = detectChatLanguage(userText);
    if (detectedLang) {
      chatLanguageRef.current = detectedLang;
    }

    const requestIdentity = getRequestIdentityContext(detectedLang);

    const userMessage: StoredChatMessage = {
      role: "user",
      content: userText,
      createdAt: Date.now(),
    };
    const optimisticUserMessage: ChatMessage = { role: userMessage.role, content: userMessage.content };
    const nextHistory: ChatMessage[] = [...messagesRef.current, optimisticUserMessage];
    setMessages((prev) => [...prev, optimisticUserMessage]);
    messagesRef.current = nextHistory;
    setIsLoading(true);
    void persistChatMessage(chatId, userMessage).catch((error) => {
      console.error("Failed to persist user message", error);
      if (isFirestoreConnectivityError(error)) {
        setDbStatus("Connecting to database...");
      }
    });
    if (routeChatId !== chatId) {
      navigate(`/chat/${chatId}`);
    }

    if (nextHistory.length === 1) {
      // First message — generate title
      void generateTitle(userText)
        .then(async (title) => {
          if (!title) {
            return;
          }
          await updateChatSessionTitle(chatId, title, user);
          await refreshChatSessions(chatId);
        })
        .catch(() => {
          void syncSmartChatTitle(chatId, nextHistory).catch((error) => {
            console.warn("Failed to update fallback smart chat title", error);
          });
        });
    }

    void syncSmartChatTitle(chatId, nextHistory).catch((error) => {
      console.warn("Failed to update smart chat title", error);
    });

    let nextMemoryProfile = memoryProfile ?? createEmptyMemoryProfile();
    if (memoryEnabled) {
      const nextMemoryFields = deriveMemoryFields(
        {
          preferences: nextMemoryProfile.preferences,
          facts: nextMemoryProfile.facts,
        },
        userText,
      );
      nextMemoryProfile = {
        ...nextMemoryProfile,
        ...nextMemoryFields,
        memoryEnabled: true,
      };
      setMemoryProfile(nextMemoryProfile);

      void saveMemoryFields(user, nextMemoryFields).catch((error) => {
        console.warn("Failed to persist memory fields", error);
      });
    }

    const mobile = isMobileDevice();
    const shouldUseVision = VISION_TRIGGER_PATTERNS.some((pattern) => pattern.test(userText));

    if (mobile && shouldUseVision) {
      const pendingRequest: PendingMobileVisionRequest = {
        id: ++mobileVisionRequestIdRef.current,
        chatId,
        history: nextHistory,
        memoryProfile: memoryEnabled ? nextMemoryProfile : null,
        identity: requestIdentity as any,
      };
      pendingMobileVisionRequestRef.current = pendingRequest;
      setPendingMobileVisionRequest(pendingRequest);
      submitLockRef.current = true;
      setIsLoading(false);
      return;
    }

    try {
      lastMsgCountRef.current = nextHistory.length;
      const base64Image = shouldUseVision ? await captureVisionFrame() : undefined;
      const detectedEmotion = base64Image ? await detectEmotionFromImage(base64Image) : undefined;

      if (base64Image && memoryEnabled) {
        try {
          await uploadMemoryImage(base64Image, "upload", userText);
        } catch (error) {
          console.warn("Failed to save memory image", error);
        }
      }

      const responseText = await streamResponse(
        userText,
        chatId,
        nextHistory,
        base64Image,
        detectedEmotion,
        requestIdentity as any,
        nextMemoryProfile,
      );

      saveFinalMessage(chatId, responseText);
      setIsLoading(false);
      speak(responseText);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      const finalHistory = [...nextHistory, aiMessage];
      setMood(nextMood);

      if (isGuest) {
        saveLocal({ role: "assistant", content: responseText });
      } else {
        void saveMessageToDB(responseText, "assistant", user?.uid);
      }

      void persistChatMessage(chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.warn("Failed to persist model reply", error);
      });

      void syncSmartChatTitle(chatId, finalHistory).catch((error) => {
        console.warn("Failed to update smart chat title", error);
      });
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  const profilePreviewSource = profileImageSource ?? profileDraftPhotoUrl;
  const profileSubtext = useMemo(() => user?.email || t.profileMenu.guestMode, [t.profileMenu.guestMode, user?.email]);
  const handleOpenMemoryFromSettings = useCallback(() => {
    setActiveSettingsSection("personalization");
    setSettingsPanelOpen(false);
    setMemoryModalOpen(true);
  }, []);
  const handleOpenProfileFromSettings = useCallback(() => {
    setActiveSettingsSection("account");
    setSettingsPanelOpen(false);
    setProfileModalOpen(true);
  }, []);
  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setSettingsPanelOpen(open);
  }, []);
  const headerTooltipClass =
    "pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full border border-white/12 bg-[#12091f]/92 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-white/78 opacity-0 shadow-[0_12px_28px_rgba(4,2,12,0.45)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100";
  const profileInitial = (profileName.trim() || effectiveUserName || "S").charAt(0).toUpperCase();

  return (
    <div
      className="ultra-white-nebula flex h-screen text-white overflow-hidden selection:bg-pink-500/30 relative"
      data-mood={mood}
      style={{ contain: "paint", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
    >
      {/* Animated Drifting Mesh Gradient Background + White Premium Glow */}
      <BackgroundComponent mood={mood} />
      <Sidebar
        isOpen={isSidebarOpen}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        isGuest={isGuest}
        newChatLabel={t.sidebar.newChat}
        recentChatsLabel={t.sidebar.recentChats}
        noChatsGuestLabel={t.sidebar.noChatsGuest}
        noChatsAccountLabel={t.sidebar.noChatsAccount}
        userName={effectiveUserName}
        userPhotoUrl={profileDraftPhotoUrl || profilePhotoUrl}
        userEmail={user?.email || undefined}
        resolveChatTitle={(title) => (isDefaultChatTitle(title) ? t.chatTitles.newChat : title)}
        onCreateChat={() => void handleCreateChat()}
        onSelectChat={(chatId) => void handleSelectChat(chatId)}
        onDeleteChat={(chatId) => void handleDeleteChat(chatId)}
        onRenameChat={(chatId, title) => void handleRenameChat(chatId, title)}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onLogout={() => void handleLogout()}
      />

      <div className={`flex h-full flex-1 flex-col relative z-10 transition-[margin] duration-300 ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}`} style={{ isolation: 'isolate' }}>
        <header className="absolute top-4 w-full flex items-center justify-between px-6 z-30 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={t.header.toggleSidebar}
              className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors hidden md:block"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="md:hidden flex items-center gap-2 text-pink-400 font-semibold tracking-wide text-sm" style={{ fontFamily: "'Sour Gummy', cursive" }}>
              <Heart className="w-5 h-5 fill-current" />
              Saheli AI
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (nextMuted) {
                  stop();
                }
              }}
              aria-label={isMuted ? t.header.unmuteVoice : t.header.muteVoice}
              className="group relative flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-all hover:text-white"
            >
              <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="absolute h-6 w-6 rounded-full bg-white/5 blur-sm" />
              </span>
              {isMuted ? (
                <VolumeX className="h-[18px] w-[18px] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
              ) : (
                <Volume2 className="h-[18px] w-[18px] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              )}
              <span className={headerTooltipClass}>{isMuted ? t.header.voiceOff : t.header.voiceOn}</span>
            </button>

            <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettingsPanelOpen(true)}
              className="group relative flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-all hover:text-white"
            >
              <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="absolute h-6 w-6 rounded-full bg-white/5 blur-sm" />
              </span>
              <Settings className="h-[18px] w-[18px] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
              <span className={headerTooltipClass}>Settings</span>
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 p-4 md:p-8 space-y-6">
          {messages.length === 0 && !isLoading && !submitLockRef.current ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="w-20 h-20 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-6 border border-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.15)]"
              >
                <Sparkles className="w-10 h-10 text-pink-400" />
              </motion.div>
              <h2 className="text-2xl font-light mb-2">{formatText(t.emptyState.greeting, { name: effectiveUserName })}</h2>
              <p className="text-white/50 text-base font-light">{t.emptyState.description}</p>
            </div>
          ) : (
            <ScrollFadeMessageList
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              lastMsgCount={lastMsgCountRef.current}
              typingLabel={t.composer.typing}
            />
          )}
        </div>

        <div className="flex-none p-4 max-w-4xl mx-auto w-full group relative mt-auto z-10 backdrop-blur-sm pt-8">
            {dbStatus ? (
              <div className="mb-2 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                {dbStatus}
              </div>
            ) : null}
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white/[0.09] border border-white/35 backdrop-blur-[28px] rounded-[30px] overflow-visible shadow-[0_18px_50px_rgba(2,6,23,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-300"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
                className="flex-1 bg-transparent px-6 py-4 text-white placeholder-white/55 focus:outline-none font-sans focus:ring-0 border-none"
                style={{ fontSize: "15px" }}
              />
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? t.composer.stopListening : t.composer.voiceInput}
                className={`p-2 ml-1 rounded-full transition-all ${
                  isListening
                    ? "bg-pink-500/20 text-pink-400 animate-pulse"
                    : "bg-white/5 text-white/50 hover:text-white hover:bg-white/15"
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="submit"
                aria-label={t.composer.sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 mr-2 transition-all"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 p-2.5 rounded-full text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none">
                  <Send className="w-4 h-4" />
                </div>
              </button>
            </form>
            {pendingMobileVisionRequest && isMobileDevice() && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleMobileCameraOpen}
                  className="rounded-full border border-pink-400/30 bg-white/10 px-4 py-2 text-sm text-pink-100 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
                >
                  {t.composer.openCamera}
                </button>
                <input
                  ref={mobileCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  aria-label="Capture photo"
                  onChange={handleMobileCameraChange}
                />
              </div>
            )}
            <div className="text-center mt-3 text-[10px] tracking-widest uppercase text-white/40 font-medium pb-2">
              {t.composer.footer}
            </div>
          </div>

        <Suspense fallback={null}>
          {settingsPanelOpen ? (
            <SettingsPanel
              open={settingsPanelOpen}
              onOpenChange={handleSettingsOpenChange}
              activeSection={activeSettingsSection}
              onSectionChange={setActiveSettingsSection}
              languageMode={replyLanguageMode}
              onLanguageModeChange={handleLanguageModeChange}
              memoryEnabled={memoryEnabled}
              onMemoryToggle={handleMemoryToggle}
              onManageMemory={handleOpenMemoryFromSettings}
              profileName={effectiveUserName}
              profileSubtext={profileSubtext}
              profileImageUrl={profileDraftPhotoUrl}
              profileInitial={profileInitial}
              onEditProfile={handleOpenProfileFromSettings}
              onChangePassword={() => void handleChangePassword()}
              onLogout={() => void handleLogout()}
            />
          ) : null}
        </Suspense>

        <MemoryModal
          open={memoryModalOpen}
          onOpenChange={setMemoryModalOpen}
          memory={memoryProfile}
          status={memoryStatus}
          onToggleMemory={(enabled) => handleMemoryToggle(enabled)}
          onDeleteChat={(messageId) => void handleDeleteMemoryChat(messageId)}
          onDeleteImage={(imageId) => void handleDeleteMemoryImage(imageId)}
          onClearAll={() => void handleClearAllMemory()}
          onPreviewImage={(url) => setSelectedMemoryImage(url)}
        />

        <Profile
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          title="Profile"
          description="Keep your name and photo updated for a personalized Saheli experience."
          uploadLabel={t.common.upload}
          nameLabel="Name"
          enterNameLabel={t.profileMenu.enterYourName}
          saveProfileLabel={t.profileMenu.saveProfile}
          savingLabel={t.common.saving}
          guestModeLabel={t.profileMenu.guestMode}
          profileStatus={profileStatus}
          isSavingProfile={isSavingProfile}
          profileInitial={profileInitial}
          effectiveUserName={effectiveUserName}
          userEmail={user?.email}
          profileDraftName={profileDraftName}
          profileDraftPhotoUrl={profileDraftPhotoUrl}
          profilePreviewSource={profilePreviewSource}
          profileImageSource={profileImageSource}
          profileCropZoom={profileCropZoom}
          profileCropX={profileCropX}
          profileCropY={profileCropY}
          profileImageInputRef={profileImageInputRef}
          onProfileImageSelect={handleProfileImageSelect}
          onProfileNameChange={setProfileDraftName}
          onProfileCropZoomChange={setProfileCropZoom}
          onProfileCropXChange={setProfileCropX}
          onProfileCropYChange={setProfileCropY}
          onSaveProfile={handleSaveProfile}
          onPasswordReset={handlePasswordReset}
          canResetPassword={Boolean(user?.email)}
        />

        <AnimatePresence>
          {selectedMemoryImage ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
              onClick={() => setSelectedMemoryImage(null)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/12 bg-[#130b23]/90 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMemoryImage(null)}
                  className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/35 p-2 text-white/80 transition hover:border-pink-400/30 hover:text-white"
                  aria-label={t.aria.closePreview}
                >
                  <X className="h-4 w-4" />
                </button>
                <img
                  src={selectedMemoryImage}
                  alt={t.memoryMenu.savedMomentsTitle}
                  className="max-h-[80vh] w-full rounded-[22px] object-contain"
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
