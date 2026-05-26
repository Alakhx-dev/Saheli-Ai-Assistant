import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  Camera,
  ImagePlus,
  Mic,
  Send,
  Heart,
  X,
  Plus,
  Upload,
  
  PanelLeft,
  Volume2,
  VolumeX,
  Clock3,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Moon,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { auth, db, resetFirestorePersistence, storage } from "@/lib/firebase";
import { sendPasswordResetEmail, signOut, updatePassword, updateProfile } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadString, uploadBytes } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { sendMessage, detectChatMode, type AIProvider, type AppLanguage, type ChatMessage, type EmotionLabel, type RealtimeAwarenessContext, type UserIdentityContext } from "@/lib/ai-service";
import {
  createChatSession,
  deleteChatSession,
  loadChatMessages,
  loadChatSessions,
  saveChatMessage,
  updateChatSessionTitle,
  getChatEmoji,
  type ChatSessionSummary,
  type StoredChatMessage,
} from "@/lib/chat-history";

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
import { detectMemory, saveImageMemoryDB, saveMemoryToDB, saveVisionImageMemory } from "@/lib/chatService";
import { resetSaheliSpeechDedup, speakSaheli, stopSaheliSpeech } from "@/utils/speechEngine";
import { useRealtimeAwareness } from "@/hooks/useRealtimeAwareness";

import { isMobile } from "@/lib/utils";
import Sidebar from "../components/Sidebar";
import SaheliLogo from "../components/SaheliLogo";
import CinematicAtmosphere from "../components/CinematicAtmosphere";
import Profile from "../components/Profile";
import MemoryModal from "../components/memory/MemoryModal";
import { useAppStore } from "@/store/app-store";
import ThemeTransitionOverlay from "../components/ThemeTransitionOverlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SettingsPanel = lazy(() => import("../components/settings/SettingsPanel"));

// Intent-based vision trigger — matches natural Hindi/English phrases asking to be looked at.
const isVisionIntent = (text: string, lastModelMessage?: string) => {
  const input = text.toLowerCase();
  
  // 1. Direct explicit commands to open camera
  const isDirectCameraCommand = /\b(camera open|open camera|camera chalu|chalu karo camera|start camera|camera start|open default camera)\b/i.test(input);
  if (isDirectCameraCommand) return true;

  // 2. Consent check: did the model suggest camera, and did the user agree?
  if (lastModelMessage) {
    const lastModelLower = lastModelMessage.toLowerCase();
    const modelAskedForCamera = /camera|camera open|dekh lu|dekhna padega|dekh sakti|open the camera|inspect the diagram|look at the screen/i.test(lastModelLower);
    
    const userAgreed = /^(haan|ha|yes|yep|ok|okay|open|dekho|dikhata|dikhati|sure|go ahead|karlo|kar lo|ya|yeah)/i.test(input) || 
                       /\b(haan|ha|yes|ok|okay|open|dekho|sure|go ahead|karlo|kar lo|open camera)\b/i.test(input);

    if (modelAskedForCamera && userAgreed) {
      console.log("🎥 [DEBUG] User consented to camera open request.");
      return true;
    }
  }

  return false;
};
const GUEST_PROFILE_NAME_KEY = "swara_guest_profile_name";
const GUEST_PROFILE_PHOTO_KEY = "swara_guest_profile_photo";
const ACTIVE_CHAT_SESSION_KEY = "activeChatId";
const REPLY_LANGUAGE_MODE_STORAGE_KEY = "reply_language_mode";
const SELECTED_CHARACTER_STORAGE_KEY = "saheli_selected_character";
const PROFILE_CROP_OUTPUT_SIZE = 512;
const TITLE_UPDATE_INTERVAL = 3;
const TITLE_EVOLUTION_DEBOUNCE_MS = 1200;
const TITLE_EVOLUTION_MIN_NEW_MESSAGES = 6;
const TITLE_EVOLUTION_WINDOW_SIZE = 4;
const TITLE_TOPIC_SHIFT_THRESHOLD = 0.24;
const STREAM_TTS_MIN_WORDS = 4;
const STREAM_TTS_PREVIEW_WORDS = 10;

const TITLE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "bhi",
  "but",
  "by",
  "cha",
  "chalo",
  "ek",
  "for",
  "from",
  "gaya",
  "gayi",
  "gaye",
  "ha",
  "haan",
  "hai",
  "hain",
  "ho",
  "how",
  "i",
  "in",
  "is",
  "it",
  "ka",
  "ke",
  "ki",
  "ko",
  "kya",
  "kyu",
  "kyun",
  "main",
  "me",
  "mein",
  "mere",
  "meri",
  "mujhe",
  "mujhse",
  "na",
  "nahi",
  "nhi",
  "of",
  "on",
  "or",
  "pls",
  "please",
  "rha",
  "rhi",
  "raha",
  "rahi",
  "se",
  "so",
  "taaki",
  "that",
  "the",
  "to",
  "toh",
  "tum",
  "tu",
  "us",
  "waala",
  "waali",
  "we",
  "what",
  "when",
  "where",
  "why",
  "with",
  "wo",
  "woh",
  "ye",
  "yeah",
  "you",
  "aur",
  "ab",
  "bas",
  "fir",
  "phir",
  "karo",
  "kar",
  "karna",
  "kuch",
  "koi",
  "mujh",
  "hum",
  "humne",
  "humko",
  "unka",
  "unki",
  "unse",
]);

function normalizeTitleContext(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeTitleContext(text: string) {
  return normalizeTitleContext(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !TITLE_STOPWORDS.has(token));
}

function collectTitlePhaseText(messages: ChatMessage[]) {
  return messages
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join(" ");
}

function calculateTokenSimilarity(leftTokens: string[], rightTokens: string[]) {
  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let sharedTokens = 0;

  leftSet.forEach((token) => {
    if (rightSet.has(token)) {
      sharedTokens += 1;
    }
  });

  const unionSize = new Set([...leftSet, ...rightSet]).size;
  return unionSize === 0 ? 0 : sharedTokens / unionSize;
}

function getTitleEvolutionSnapshot(history: ChatMessage[]) {
  const recentWindow = history.slice(-TITLE_EVOLUTION_WINDOW_SIZE);
  const olderWindow = history.slice(
    Math.max(0, history.length - (TITLE_EVOLUTION_WINDOW_SIZE * 2)),
    Math.max(0, history.length - TITLE_EVOLUTION_WINDOW_SIZE),
  );

  const recentText = collectTitlePhaseText(recentWindow);
  const olderText = collectTitlePhaseText(olderWindow);
  const recentTokens = tokenizeTitleContext(recentText);
  const olderTokens = tokenizeTitleContext(olderText);
  const similarity = calculateTokenSimilarity(olderTokens, recentTokens);
  const semanticShift = olderTokens.length >= 3 && recentTokens.length >= 3 && similarity <= TITLE_TOPIC_SHIFT_THRESHOLD;
  const phaseSignature = Array.from(new Set(recentTokens)).sort().join("|");

  return {
    olderText,
    recentText,
    similarity,
    semanticShift,
    phaseSignature,
  };
}
function getStreamingTtsPreview(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "";
  }

  const words = clean.split(" ").filter(Boolean);
  if (words.length < STREAM_TTS_MIN_WORDS) {
    return "";
  }

  return words.slice(0, STREAM_TTS_PREVIEW_WORDS).join(" ");
}

type LanguageOption = AppLanguage;
type ReplyLanguageMode = LanguageOption;
type SettingsSectionId = "personalization" | "character" | "memory" | "account" | "appearance" | "voice" | "about" | "realtime";

// Canonical image map — single source of truth for character assets
const CHARACTER_IMAGE_MAP: Record<string, string> = {
  swara: "/butterfly.png",
  aarohi: "/Aarohi 🌸.png",
  elina: "/Elina 🖤.png",
  kiara: "/Kiara 🎀.png",
  meher: "/Meher ✨.png",
  zoya: "/Zoya ❤️.png",
};

function normalizeCharacterId(value: string | null | undefined) {
  if (!value) return "swara";
  if (value === "butterfly") return "swara";
  return CHARACTER_IMAGE_MAP[value] ? value : "swara";
}

function getStoredCharacterId() {
  if (typeof window === "undefined") {
    return "swara";
  }

  return normalizeCharacterId(window.localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY));
}

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
        console.error("Speech recognition stop failed", error);
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
      console.error("SpeechRecognition not supported");
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
          console.error("Speech recognition cleanup failed", error);
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

function logCameraFailure(error: unknown) {
  if (error instanceof DOMException) {
    console.error(`Camera capture failed: ${error.name}`, error.message);
    return;
  }

  if (error instanceof Error) {
    console.error("Camera capture failed", error.message);
    return;
  }

  console.error("Camera capture failed", error);
}

function getMessageKey(msg: ChatMessage, index: number) {
  const possibleId = (msg as ChatMessage & { id?: string }).id;
  if (possibleId) {
    return possibleId;
  }
  return `${msg.role}-${index}`;
}

const ScrollFadeMessageItem = React.forwardRef<HTMLDivElement, { msg: ChatMessage; isNew: boolean }>(
  function ScrollFadeMessageItem({ msg, isNew }, ref) {
    const isUser = msg.role === "user";
    return (
      <motion.div
        ref={ref}
        layout={false}
        initial={isNew ? { opacity: 0, y: 10, scale: 0.96 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.38, ease: [0.22, 0.8, 0.2, 1] }}
        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
      >
      <div
        data-role={isUser ? 'user' : 'assistant'}
        className={`
          max-w-[85%] md:max-w-[45%] px-5 py-4 text-sm leading-relaxed font-medium relative transition-all duration-300
          ${isNew ? "msg-sheen" : ""}
          ${isUser
            ? "saheli-premium-user-bubble text-white/95"
            : "saheli-premium-ai-bubble text-[#fdf2f8]"
          }
        `}
        style={{ 
          fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", 
          letterSpacing: "0.01em",
        }}
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
    <div
      ref={containerRef}
      className="w-full md:w-[85%] lg:w-[80%] mx-auto px-4 md:px-8 space-y-3 overflow-y-auto h-full pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{
        overflowAnchor: "none",
        scrollBehavior: "auto",
        contain: "content",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div className="h-16 md:h-20" />
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
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex justify-start h-[76px] items-start"
              style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
            >
              <div className="saheli-typing-container flex items-center justify-center">
                <div className="saheli-typing-dots flex items-center gap-1.5">
                  <div className="saheli-typing-dot" style={{ animationDelay: '0s' }} />
                  <div className="saheli-typing-dot" style={{ animationDelay: '0.15s' }} />
                  <div className="saheli-typing-dot" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="h-4" />
      <div ref={messagesEndRef} />
    </div>
  );
});

const BackgroundComponent = memo(function BackgroundComponent() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <video
        className="anime-bg-video video-blend"
        src="/anime-girl.mp4"
        autoPlay
        loop
        muted
        playsInline
        onEnded={(event) => {
          const target = event.currentTarget;
          target.currentTime = 0;
          void target.play();
        }}
      />
      <div className="chat-overlay" />
      <div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{
          contain: 'paint',
        }}
      >
        <div className="absolute inset-0 overflow-hidden" style={{ contain: 'strict' }}>
          <div
            className="saheli-glow-drift-1 absolute rounded-full"
            style={{
              width: '50vw', height: '50vw', maxWidth: '700px', maxHeight: '700px',
              top: '-12%', left: '-8%',
              background: 'radial-gradient(circle, var(--mood-blob-1), transparent 70%)',
              opacity: 0.05,
              filter: 'blur(80px)',
              willChange: 'transform',
            }}
          />
          <div
            className="saheli-glow-drift-2 absolute rounded-full"
            style={{
              width: '45vw', height: '45vw', maxWidth: '650px', maxHeight: '650px',
              bottom: '-15%', right: '-5%',
              background: 'radial-gradient(circle, var(--mood-blob-2), transparent 70%)',
              opacity: 0.04,
              filter: 'blur(90px)',
              willChange: 'transform',
            }}
          />
          <div
            className="saheli-glow-drift-3 absolute rounded-full"
            style={{
              width: '35vw', height: '35vw', maxWidth: '500px', maxHeight: '500px',
              top: '35%', left: '55%',
              background: 'radial-gradient(circle, var(--mood-blob-3), transparent 70%)',
              opacity: 0.03,
              filter: 'blur(70px)',
              willChange: 'transform',
            }}
          />
        </div>

        <div
          className="absolute pointer-events-none"
          style={{
            top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '60vw', height: '50vh', maxWidth: '800px',
            background: 'radial-gradient(ellipse at center, rgba(255, 220, 240, 0.02) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 0.5px, transparent 0.5px)',
            backgroundSize: '3px 3px',
            opacity: 0.03,
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  );
});



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
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>("character");
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [weatherThemeOverride, setWeatherThemeOverride] = useState<"auto" | "day" | "night">("auto");
  const [weatherPanelClockNow, setWeatherPanelClockNow] = useState(() => new Date());
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
  const {
    awareness,
    settings: awarenessSettings,
    setTimeFormat,
    toggleDayDateVisibility,
    refreshLocationAndWeather,
    isRefreshing: isRefreshingRealtime,
    locationLabel,
    weatherLabel,
    markActiveNow,
  } = useRealtimeAwareness();
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
  const realtimeAwarenessContext = useMemo<RealtimeAwarenessContext>(() => ({
    isoNow: awareness.datetime.isoNow,
    localTime: awareness.datetime.currentTime,
    currentDate: awareness.datetime.currentDate,
    weekday: awareness.datetime.weekday,
    hour24: awareness.datetime.hour24,
    meridiem: awareness.datetime.meridiem,
    dayState: awareness.datetime.dayState,
    location: awareness.location
      ? {
          latitude: awareness.location.latitude,
          longitude: awareness.location.longitude,
          city: awareness.location.city,
          region: awareness.location.region,
          country: awareness.location.country,
        }
      : undefined,
    weather: awareness.weather
      ? {
          temperatureC: awareness.weather.temperatureC,
          feelsLikeC: awareness.weather.feelsLikeC,
          hotColdState: awareness.weather.hotColdState,
          condition: awareness.weather.condition,
          isRainy: awareness.weather.isRainy,
          isCloudy: awareness.weather.isCloudy,
          dayState: awareness.weather.dayState,
        }
      : undefined,
    timing: awareness.timing,
  }), [awareness]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latestSaheliMessage, setLatestSaheliMessage] = useState("");
  const [memoryProfile, setMemoryProfile] = useState<MemoryProfile | null>(createEmptyMemoryProfile());
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !isMobile());
  const [isSidebarLightMode, setIsSidebarLightMode] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("hmm... 🤔");
  const [currentMode, setCurrentMode] = useState<"bestie" | "mentor">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("saheli_personality");
      if (saved === "mentor" || saved === "bestie") {
        return saved as "bestie" | "mentor";
      }
    }
    return "bestie";
  });
  const [modeSwitchNotification, setModeSwitchNotification] = useState<string | null>(null);
  const modeNotificationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const thinkingTexts = [
        "hmm... 🤔",
        "sochne do... 💭",
        "ek sec 😭",
        "wait na ✨",
        "soch rhi hu...",
        "brain loading 🧠✨"
      ];
      const randomText = thinkingTexts[Math.floor(Math.random() * thinkingTexts.length)];
      setThinkingLabel(randomText);
    }
  }, [isLoading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saheli_personality", currentMode);
    }
  }, [currentMode]);

  const [mood, setMood] = useState("neutral");
  const [isScrolling, setIsScrolling] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [pendingMobileVisionRequest, setPendingMobileVisionRequest] = useState<PendingMobileVisionRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstChunkReceivedRef = useRef(false);
  const chatSessionsRef = useRef<ChatSessionSummary[]>([]);
  const submitLockRef = useRef(false);
  const lastMsgCountRef = useRef(0);
  const lastModelUsedRef = useRef("groq/meta-llama/llama-3.3-70b-versatile");
  const titleEvolutionTimerRef = useRef<number | null>(null);
  const titleEvolutionFlightRef = useRef(false);
  const titleEvolutionCheckpointRef = useRef({
    chatId: null as string | null,
    messageCount: 0,
    phaseSignature: "",
  });
  // chatLanguageRef: auto-detected language for AI replies - SEPARATE from UI language.
  // UI language (localStorage app_language) is never modified by this system.
  const chatLanguageRef = useRef(getStoredLanguage());
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraCancelTimeoutRef = useRef<number | null>(null);
  const pendingMobileVisionRequestRef = useRef<PendingMobileVisionRequest | null>(null);
  const mobileVisionRequestIdRef = useRef(0);
  const mobileVisionProcessingRequestIdRef = useRef<number | null>(null);
  const memoryCleanupDoneRef = useRef(false);
  const lastSpokenMessageRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const selectedImageRef = useRef<string | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(() => getStoredCharacterId());
  const [secondaryPanelType, setSecondaryPanelType] = useState<"memory" | "settings" | null>(null);
  const [moodTint, setMoodTint] = useState("neutral");

  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "pink";
    }
    return "pink";
  });
  const [targetTheme, setTargetTheme] = useState<string | null>(null);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [isDefocusActive, setIsDefocusActive] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      const color = window.localStorage.getItem("saheli_theme_color") || "pink";
      if (color !== activeTheme && !isThemeTransitioning) {
        setTargetTheme(color);
        setIsThemeTransitioning(true);
        setIsDefocusActive(true);
      }
    };
    window.addEventListener("saheli_theme_color_changed", handleThemeChange);
    return () => {
      window.removeEventListener("saheli_theme_color_changed", handleThemeChange);
    };
  }, [activeTheme, isThemeTransitioning]);
  
  // Real-time presence: Teasing logic for typing
  const [presenceStatus, setPresenceStatus] = useState<string | null>(null);
  const [lastInputLength, setLastInputLength] = useState(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const teasingTimeoutRef = useRef<number | null>(null);
  
  // Track recently saved images to prevent duplicates
  const recentlySavedImageHashesRef = useRef<Map<string, number>>(new Map());
  const imageSaveLockRef = useRef(false);
  const IMAGE_DUPLICATE_WINDOW_MS = 2000; // 2 second window to detect duplicates
  const idleTimerRef = useRef<number | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { chatId: routeChatId } = useParams<{ chatId?: string }>();
  const messagesRef = useRef<ChatMessage[]>([]);

  const setSelectedImageValue = useCallback((value: string | null) => {
    selectedImageRef.current = value;
    setSelectedImage(value);
    // Immediately persist any newly selected/captured image to image memory (falls back to 'guest')
    if (value) {
      try {
        void saveVisionImageMemory(value, user?.uid || "guest");
      } catch (err) {
        console.error("Failed to auto-save selected image to memory:", err);
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    const moveCursor = (event: MouseEvent) => {
      if (!cursorRef.current) {
        return;
      }

      cursorRef.current.style.left = `${event.clientX}px`;
      cursorRef.current.style.top = `${event.clientY}px`;
    };

    window.addEventListener("mousemove", moveCursor);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  // ─── Idle Ghost Mode: Fade sidebar/logo after 10 seconds inactivity ───
  useEffect(() => {
    const handleActivity = () => {
      // Wake up from idle state immediately
      setIsIdle(false);
      
      // Clear existing timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      
      // Set new idle timer (10 seconds)
      idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true);
      }, 10000);
    };

    // Attach to multiple events for robust detection
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    
    // Initialize idle timer on mount
    handleActivity();

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    let timeoutId: number | null = null;
    
    const syncSidebarState = () => {
      setIsSidebarOpen(!mediaQuery.matches);
    };
    
    const handleMediaQueryChange = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(syncSidebarState, 150);
    };

    syncSidebarState();
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  // ── Parallax Effect for Character ──
  useEffect(() => {
    let animationFrameId: number;
    let throttleTimeout: NodeJS.Timeout | null = null;
    
    const handleMouseMove = (event: MouseEvent) => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        const { clientX, clientY } = event;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const moveX = (clientX - centerX) * 0.02;
        const moveY = (clientY - centerY) * 0.02;
        
        setParallaxOffset({ x: moveX, y: moveY });
        throttleTimeout = null;
      }, 16); // ~60fps throttle
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList && target.classList.contains('overflow-y-auto')) {
        setIsScrolling(true);
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => setIsScrolling(false), 400);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);
  const currentChatIdRef = useRef<string | null>(null);
  const titleUpdateTimeoutRef = useRef<number | null>(null);
  const pendingTitleUpdateRef = useRef<{ chatId: string; title: string } | null>(null);
  const setStoreUser = useAppStore((state) => state.setUser);
  const setStoreChats = useAppStore((state) => state.setChats);
  const setStoreMemory = useAppStore((state) => state.setMemory);
  const setStoreSettings = useAppStore((state) => state.setSettings);
  const activeProvider = useAppStore((state) => state.settings.activeProvider);
  const storeAddMessage = useAppStore((state) => state.addMessage);
  const storeUpdateStreamingMessage = useAppStore((state) => state.updateStreamingMessage);
  const storeSaveFinalMessage = useAppStore((state) => state.saveFinalMessage);

  useEffect(() => {
    if (isMobile()) {
      return;
    }

    const handleFirstInteraction = () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  // Speech-to-text: appends recognized speech to current input
  const { isListening, toggle: toggleMic, stopListening } = useSpeechToText(
    useCallback((text: string) => setInput(text), [])
  );

  useEffect(() => {
    void import("../components/settings/SettingsPanel");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length, isLoading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (titleEvolutionTimerRef.current) {
      window.clearTimeout(titleEvolutionTimerRef.current);
      titleEvolutionTimerRef.current = null;
    }

    titleEvolutionCheckpointRef.current = {
      chatId: currentChatId,
      messageCount: messages.length,
      phaseSignature: getTitleEvolutionSnapshot(messages).phaseSignature,
    };
  }, [currentChatId]);

  useEffect(() => {
    if (!latestSaheliMessage) {
      return;
    }

    const signature = latestSaheliMessage.toLowerCase().replace(/\s+/g, " ").trim();
    if (!signature || signature === lastSpokenMessageRef.current) {
      return;
    }

    lastSpokenMessageRef.current = signature;

    if (isTtsMuted) {
      stopSaheliSpeech();
      return;
    }

    speakSaheli(latestSaheliMessage);
  }, [isTtsMuted, latestSaheliMessage]);

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
    localStorage.setItem(SELECTED_CHARACTER_STORAGE_KEY, normalizeCharacterId(selectedCharacter));
  }, [selectedCharacter]);

  useEffect(() => {
    chatLanguageRef.current = replyLanguageMode;
  }, [replyLanguageMode]);

  useEffect(() => {
    if (!memoryHydrated) {
      return;
    }

    setStoreSettings({ memoryEnabled });
    void setMemoryEnabled(user, memoryEnabled).catch((error) => {
      console.error("Failed to persist memory toggle", error);
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
            console.error("Failed to prune low-value memories", error);
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
          console.error("Failed to load memory", error);
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
      if (titleUpdateTimeoutRef.current) {
        window.clearTimeout(titleUpdateTimeoutRef.current);
      }

      if (mobileCameraCancelTimeoutRef.current) {
        window.clearTimeout(mobileCameraCancelTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("devMode");
    navigate("/login");
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
      console.error("Failed to refresh memory", error);
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
      console.error("Failed to delete chat memory", error);
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
      console.error("Failed to delete image memory", error);
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
      console.error("Failed to clear memory", error);
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

    const base64Data = base64OrDataUrl.startsWith("data:image")
      ? base64OrDataUrl.split(",")[1]
      : base64OrDataUrl;
    const path = `memory/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const imageRef = storageRef(storage, path);

    await uploadString(imageRef, base64Data, "base64", { contentType: "image/jpeg" });
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

      // Account panel does not expose crop controls; persist immediately there.
      if (settingsPanelOpen && activeSettingsSection === "account") {
        void handleSaveProfile(undefined, { source, meta });
      }
    } catch (error) {
      console.error("Profile image selection failed", error);
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
      console.error("Password reset failed", error);
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
      toast.success("Password updated.");
    } catch (error) {
      console.error("Password update failed", error);
      setMemoryStatus("Could not change password. Please re-login and try again.");
      toast.error("Could not change password. Please re-login and try again.");
    }
  }, [user]);

  const handleSaveProfile = async (
    nameOverride?: string,
    imageOverride?: { source: string; meta: ProfileImageMeta },
  ) => {
    const trimmedName = (nameOverride ?? profileDraftName).trim() || (isGuest ? CREATOR_NAME : "User");

    setIsSavingProfile(true);
    setProfileStatus(t.statuses.savingProfile);

    try {
      let nextPhotoUrl = profilePhotoUrl;

      const sourceToPersist = imageOverride?.source ?? profileImageSource;
      const metaToPersist = imageOverride?.meta ?? profileImageMeta;

      if (sourceToPersist && metaToPersist) {
        const croppedDataUrl = await buildCroppedProfileImage(
          sourceToPersist,
          metaToPersist,
          profileCropZoom,
          profileCropX,
          profileCropY,
        );

        if (user) {
          const base64Data = croppedDataUrl.split(",")[1];
          const avatarRef = storageRef(storage, `profile-pictures/${user.uid}.jpg`);
          await uploadString(avatarRef, base64Data, "base64", { contentType: "image/jpeg" });
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
            console.error("Failed to sync memory name with profile", error);
          });
      }

      setProfileStatus(t.statuses.profileSaved);
    } catch (error) {
      console.error("Profile save failed", error);
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
        throw new Error("Camera access nahi mila. Please allow camera and try again.");
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

        video.onloadedmetadata = () => {
          video?.play().catch(() => undefined);
        };
        video.onerror = () => reject(new Error("Camera failed to load"));

        let attempts = 0;
        const checkReady = setInterval(() => {
          attempts++;
          if (video && video.readyState === 4 && video.videoWidth > 0) {
            clearInterval(checkReady);
            // Give an extra 200ms for auto-exposure to settle
            setTimeout(resolve, 200);
          } else if (attempts > 50) {
            clearInterval(checkReady);
            console.error("❌ Camera not ready or video feed inactive after 5 seconds");
            reject(new Error("Camera timed out waiting for readyState"));
          }
        }, 100);
      });

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
      throw new Error("Camera access nahi mila. Please allow camera and try again.");
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

  // Helper: Compute simple hash of base64 image for duplicate detection
  const getImageHash = (base64Image: string): string => {
    // Use first 100 + last 100 chars of base64 as fingerprint
    const head = base64Image.slice(0, 100);
    const tail = base64Image.slice(-100);
    return `${head}_${tail}`;
  };

  // Helper: Check if image was recently saved to prevent duplicates
  const isDuplicateImage = (base64Image: string): boolean => {
    const hash = getImageHash(base64Image);
    const recentMap = recentlySavedImageHashesRef.current;
    const lastSavedTime = recentMap.get(hash);

    if (!lastSavedTime) {
      return false; // Not found, not a duplicate
    }

    const timeSinceLastSave = Date.now() - lastSavedTime;
    if (timeSinceLastSave < IMAGE_DUPLICATE_WINDOW_MS) {
      console.warn("⚠️ [DUPLICATE] Image already saved recently (within 2 seconds), skipping...", {
        hash: hash.slice(0, 20) + "...",
        timeSinceLastSave,
      });
      return true; // Duplicate within window
    }

    return false; // Not a recent duplicate
  };

  // Helper: Mark image as saved
  const markImageAsSaved = (base64Image: string) => {
    const hash = getImageHash(base64Image);
    recentlySavedImageHashesRef.current.set(hash, Date.now());

    // Clean up old entries (older than 5 seconds)
    const now = Date.now();
    for (const [key, timestamp] of recentlySavedImageHashesRef.current.entries()) {
      if (now - timestamp > 5000) {
        recentlySavedImageHashesRef.current.delete(key);
      }
    }
  };

  // Helper function to save image and immediately refresh memory UI
  const saveImageAndRefreshMemory = useCallback(async (base64Image: string, userId?: string) => {
    if (!base64Image) {
      console.warn("⚠️ [MEMORY] No base64 image provided for save and refresh");
      return;
    }

    // Check for duplicates within short time window
    if (isDuplicateImage(base64Image)) {
      console.log("🚫 [MEMORY] Skipping duplicate image save");
      return;
    }

    // Acquire save lock to prevent concurrent saves of same image
    if (imageSaveLockRef.current) {
      console.warn("⚠️ [MEMORY] Save already in progress, skipping duplicate save attempt");
      return;
    }

    imageSaveLockRef.current = true;
    console.log("💾 [MEMORY] Starting image save with real-time UI refresh...");

    try {
      // Save the image to storage
      await saveVisionImageMemory(base64Image, userId || user?.uid);
      console.log("✅ [MEMORY] Image saved to storage, fetching fresh memory profile...");

      // Mark this image as saved to prevent future duplicates
      markImageAsSaved(base64Image);

      // Refresh memory profile from storage to get the new image immediately
      if (user) {
        const freshMemory = await fetchMemory(user);
        console.log("🔄 [MEMORY] Memory refreshed from Firestore", {
          imageCount: freshMemory.images.length,
          latestImage: freshMemory.images[0]?.id,
        });
        setMemoryProfile(freshMemory);
        console.log("✨ [MEMORY] UI state updated, new image should appear instantly");
      } else if (!isGuest) {
        console.warn("⚠️ [MEMORY] No user context for memory refresh");
      }
    } catch (err) {
      console.error("❌ [MEMORY] Failed to save and refresh memory:", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      // Release save lock to allow future saves
      imageSaveLockRef.current = false;
    }
  }, [user, isGuest]);

  const refreshChatSessions = useCallback(async (nextChatId?: string | null) => {
    const sessions = await loadChatSessions(user);
    chatSessionsRef.current = sessions;
    setChatSessions(sessions);
    setStoreChats(sessions.map((chat: any) => ({ ...chat, messages: [] })));

    if (nextChatId !== undefined) {
      setCurrentChatId(nextChatId);
    }
  }, [setStoreChats, user]);

  const syncChatSessionsTitle = useCallback((chatId: string, nextTitle: string) => {
    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) {
      return false;
    }

    const nextSessions = chatSessionsRef.current.map((chat) => (
      chat.id === chatId
        ? { ...chat, title: trimmedTitle, emoji: getChatEmoji(trimmedTitle), titleGenerated: true }
        : chat
    ));

    chatSessionsRef.current = nextSessions;
    setChatSessions(nextSessions);

    const storeChats = useAppStore.getState().chats ?? [];
    const storeChatsById = new Map(storeChats.map((chat: any) => [chat.id, chat]));
    setStoreChats(nextSessions.map((chat) => {
      const existing = storeChatsById.get(chat.id);
      return existing ? { ...existing, ...chat } : { ...chat, messages: [] };
    }));

    return true;
  }, [setStoreChats]);

  const persistChatTitleUpdate = useCallback(async (chatId: string, nextTitle: string) => {
    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) {
      return false;
    }

    syncChatSessionsTitle(chatId, trimmedTitle);

    try {
      await updateChatSessionTitle(chatId, trimmedTitle, user);
      return true;
    } catch (error) {
      console.error("Failed to persist chat title update", error);
      await refreshChatSessions(chatId);
      throw error;
    }
  }, [refreshChatSessions, syncChatSessionsTitle, user]);

  useEffect(() => {
    if (!currentChatId || isLoading || submitLockRef.current) {
      return;
    }

    if (titleEvolutionTimerRef.current) {
      window.clearTimeout(titleEvolutionTimerRef.current);
    }

    titleEvolutionTimerRef.current = window.setTimeout(async () => {
      if (titleEvolutionFlightRef.current || !currentChatIdRef.current || currentChatIdRef.current !== currentChatId) {
        return;
      }

      const currentChat = chatSessionsRef.current.find((chat) => chat.id === currentChatId);
      const currentTitle = currentChat?.title || "";
      const snapshot = getTitleEvolutionSnapshot(messagesRef.current);
      const messageDelta = messagesRef.current.length - titleEvolutionCheckpointRef.current.messageCount;
      const shouldEvolve = messageDelta >= TITLE_EVOLUTION_MIN_NEW_MESSAGES || snapshot.semanticShift;

      if (!shouldEvolve) {
        titleEvolutionCheckpointRef.current = {
          chatId: currentChatId,
          messageCount: messagesRef.current.length,
          phaseSignature: snapshot.phaseSignature,
        };
        return;
      }

      titleEvolutionFlightRef.current = true;
      try {
        const { generateGenZChatTitle } = await import("@/lib/ai-service");
        const nextTitle = await generateGenZChatTitle(messagesRef.current, lastModelUsedRef.current, currentTitle);
        const trimmedNextTitle = nextTitle.trim();

        if (trimmedNextTitle && trimmedNextTitle !== currentTitle.trim()) {
          await persistChatTitleUpdate(currentChatId, trimmedNextTitle);
        }

        titleEvolutionCheckpointRef.current = {
          chatId: currentChatId,
          messageCount: messagesRef.current.length,
          phaseSignature: snapshot.phaseSignature,
        };
      } catch (error) {
        console.error("Failed to evolve chat title", error);
      } finally {
        titleEvolutionFlightRef.current = false;
      }
    }, TITLE_EVOLUTION_DEBOUNCE_MS);

    return () => {
      if (titleEvolutionTimerRef.current) {
        window.clearTimeout(titleEvolutionTimerRef.current);
        titleEvolutionTimerRef.current = null;
      }
    };
  }, [currentChatId, isLoading, messages.length, persistChatTitleUpdate]);

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
    currentChatIdRef.current = chatId;
    setMessages(normalizedMessages);
    titleEvolutionCheckpointRef.current = {
      chatId,
      messageCount: normalizedMessages.length,
      phaseSignature: getTitleEvolutionSnapshot(normalizedMessages).phaseSignature,
    };
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

    sessionStorage.removeItem(ACTIVE_CHAT_SESSION_KEY);
    setCurrentChatId(null);
    setMessages([]);
    currentChatIdRef.current = null;
    messagesRef.current = [];
    lastMsgCountRef.current = 0;
    titleEvolutionCheckpointRef.current = {
      chatId: null,
      messageCount: 0,
      phaseSignature: "",
    };
    setInput("");
    setIsLoading(false);
    setPendingMobileVisionRequest(null);
    pendingMobileVisionRequestRef.current = null;
    navigate("/chat", { replace: true });
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

    await persistChatTitleUpdate(chatId, trimmed);
  }, [persistChatTitleUpdate]);

  const generateFirstChatTitle = useCallback(async (chatId: string, history: ChatMessage[], modelUsed: string) => {
    const currentChat = chatSessionsRef.current.find((chat) => chat.id === chatId);
    const currentTitle = currentChat?.title || "";

    const isFirstTime = !currentChat?.titleGenerated || currentTitle === "New Chat";
    const isPeriodicCheck = history.length > 2 && history.length % 6 === 0;

    if (!isFirstTime && !isPeriodicCheck) {
      return;
    }

    try {
      const { generateGenZChatTitle } = await import("@/lib/ai-service");
      const title = await generateGenZChatTitle(history, modelUsed, currentTitle);
      if (title && title.trim() !== currentTitle.trim()) {
        await persistChatTitleUpdate(chatId, title);
      }
    } catch (error) {
      console.error("Failed to generate Gen-Z chat title:", error);
      if (isFirstTime) {
        // Fallback: use first message slice
        const firstMsgText = history[0]?.content || "Chat";
        const fallbackTitle = firstMsgText.slice(0, 30);
        await persistChatTitleUpdate(chatId, fallbackTitle);
      }
    }
  }, [persistChatTitleUpdate]);

  const ensureActiveChat = useCallback(async () => {
    let chatId = currentChatIdRef.current ?? routeChatId ?? null;

    if (!chatId) {
      chatId = await createChatSession(user);
      setCurrentChatId(chatId);
      currentChatIdRef.current = chatId;
      await refreshChatSessions(chatId);
    }

    return { chatId };
  }, [refreshChatSessions, routeChatId, user]);

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
    setLatestSaheliMessage(content);
    storeSaveFinalMessage(chatId, { role: "model", content });
  }, [storeSaveFinalMessage]);

  const streamResponse = useCallback(async (
    _prompt: string,
    chatId: string,
    history: ChatMessage[],
    imageBase64?: string,
    detectedEmotion?: EmotionLabel,
    requestIdentity?: UserIdentityContext,
    nextMemoryProfile?: MemoryProfile | null,
    activeMode: "bestie" | "mentor" = "bestie",
    onPartialText?: (partialText: string) => void,
  ) => {
    let didTriggerEarlyTts = false;

    const handleChunk = (partialText: string) => {
      // On first chunk arrival, hide the typing animation so streaming text appears instantly
      if (!firstChunkReceivedRef.current) {
        firstChunkReceivedRef.current = true;
        setIsLoading(false);
      }

      updateStreamingMessage(chatId, partialText);

      if (!didTriggerEarlyTts) {
        const preview = getStreamingTtsPreview(partialText);
        if (preview) {
          didTriggerEarlyTts = true;
          if (!isTtsMuted) {
            void speakSaheli(preview);
          } else {
            stopSaheliSpeech();
          }
        }
      }

      onPartialText?.(partialText);
    };

    try {
      const response = await sendMessage(
        history,
        imageBase64,
        detectedEmotion,
        memoryEnabled && nextMemoryProfile ? buildPromptMemoryContext(nextMemoryProfile) : null,
        requestIdentity,
        realtimeAwarenessContext,
        memoryEnabled ? "enabled" : "disabled",
        activeMode,
        handleChunk,
      );
      
      if (response.warning) {
        toast.warning(response.warning);
      }
      
      return { text: response.text, modelUsed: response.modelUsed };
    } catch (error: any) {
      console.error("Stream response error:", error);
      throw error;
    }
  }, [isTtsMuted, memoryEnabled, realtimeAwarenessContext, updateStreamingMessage]);

  const completePendingVisionRequest = async (request: PendingMobileVisionRequest, imageBase64?: string) => {
    if (mobileVisionProcessingRequestIdRef.current === request.id) {
      return;
    }

    if (pendingMobileVisionRequestRef.current?.id !== request.id) {
      return;
    }

    mobileVisionProcessingRequestIdRef.current = request.id;
    pendingMobileVisionRequestRef.current = null;
    setPendingMobileVisionRequest(null);
    setIsLoading(true);
    firstChunkReceivedRef.current = false;

    try {
      const requestIdentity = getRequestIdentityContext();

      lastMsgCountRef.current = request.history.length;
      const responseResult = await streamResponse(
        request.history[request.history.length - 1]?.content ?? "",
        request.chatId,
        request.history,
        imageBase64,
        undefined, // emotion no longer used from Rekognition
        requestIdentity as any,
        request.memoryProfile,
        currentMode,
      );
      const responseText = responseResult.text;
      const modelUsed = responseResult.modelUsed;
      lastModelUsedRef.current = modelUsed;
      saveFinalMessage(request.chatId, responseText);
      // Note: Image was already saved during capture, no need to save again
      if (imageBase64) {
        console.log("📝 [DEBUG] Mobile vision response completed (image already saved during capture)");
      }
      setIsLoading(false);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      const nextHistory = [...request.history, aiMessage];
      setMood(nextMood);

      void generateFirstChatTitle(request.chatId, nextHistory, modelUsed).catch((error) => {
        console.error("Failed to update chat title (mobile vision)", error);
      });

      void persistChatMessage(request.chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.error("Failed to persist model reply (mobile vision)", error);
      });

    } catch (error) {
      console.error("Failed to complete pending vision request", error);
      const errorMessage = error instanceof Error ? error.message : "AI model currently unavailable hai. Thodi der baad try karo.";
      toast.error(errorMessage, { duration: 5000 });
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
    if (!file) {
      return;
    }

    if (!pendingMobileVisionRequest) {
      try {
        await handleImageFileSelection(file);
      } catch (error) {
        console.error("Mobile camera auto-send failed", error);
        const message = error instanceof Error ? error.message : "Camera access nahi mila. Please allow camera and try again.";
        toast.error(message, { duration: 5000 });
      } finally {
        event.target.value = "";
      }
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log("📱 [DEBUG] Mobile camera capture successful", {
        fileSize: file.size,
        base64Length: base64.length,
        userId: user?.uid,
      });

      // Save immediately to image memory with real-time UI update
      if (base64 && user?.uid) {
        try {
          console.log("🖼️ [DEBUG] Saving mobile-captured image to Image Memory");
          await saveImageAndRefreshMemory(base64, user.uid);
        } catch (err) {
          console.error("❌ [DEBUG] Failed to auto-save mobile-captured image to memory:", err);
        }
      }

      await completePendingVisionRequest(pendingMobileVisionRequest, base64);
    } catch (error) {
      console.error("Mobile camera capture failed", error);
      const message = error instanceof Error ? error.message : "Camera access nahi mila. Please allow camera and try again.";
      toast.error(message, { duration: 5000 });
      setIsLoading(false);
      submitLockRef.current = false;
    } finally {
      event.target.value = "";
    }
  };

  const handleImageFileSelection = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
      reader.readAsDataURL(file);
    });

    setSelectedImageValue(dataUrl);
    void handleSubmit();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!(input.trim() || selectedImageRef.current)) || isLoading || submitLockRef.current) {
      return;
    }

    markActiveNow();

    stopSaheliSpeech();
    resetSaheliSpeechDedup();
    lastSpokenMessageRef.current = "";
    firstChunkReceivedRef.current = false;

    const userText = input.trim() || (selectedImageRef.current ? "Please analyze this image carefully." : "");
    setInput("");
    const mobile = isMobile();
    if (!isGuest && user?.uid) {
      const memoryResult = detectMemory(userText);
      if (memoryResult.save && memoryResult.type && memoryResult.content) {
        void saveMemoryToDB(
          {
            type: memoryResult.type,
            content: memoryResult.content,
          },
          user.uid,
        ).catch((error) => {
          console.error("Failed to save detected memory", error);
        });
      }
    }

    const { chatId } = await ensureActiveChat();

    // Auto-detect chat language
    const detectedLang = detectChatLanguage(userText);
    if (detectedLang) {
      chatLanguageRef.current = detectedLang;
    }

    const nextMode = detectChatMode(userText);
    if (nextMode !== currentMode) {
      setCurrentMode(nextMode);
      setModeSwitchNotification(nextMode === "mentor" ? "Mentor mode active" : "Bestie mode active");
      if (modeNotificationTimeoutRef.current) {
        clearTimeout(modeNotificationTimeoutRef.current);
      }
      modeNotificationTimeoutRef.current = window.setTimeout(() => {
        setModeSwitchNotification(null);
      }, 1800);
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

      // skipAiFilter: deriveMemoryFields already applies strict validation,
      // so the secondary AI-based filter was silently dropping valid memories.
      void saveMemoryFields(user, nextMemoryFields, { skipAiFilter: true }).catch((error) => {
        console.error("Failed to persist memory fields", error);
      });
    }

    const lastModelMessage = [...messagesRef.current].reverse().find(msg => msg.role === "model")?.content || "";
    const shouldUseVision = isVisionIntent(userText, lastModelMessage);
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
      let base64Image: string | undefined;

      if (selectedImageRef.current) {
        base64Image = selectedImageRef.current;
        setSelectedImageValue(null);
        // Immediately save camera-selected image to Image Memory with real-time UI update
        if (base64Image && !isGuest && user?.uid) {
          console.log("🖼️ [DEBUG] Selected image detected, saving to Image Memory", {
            userId: user.uid,
            imageLength: base64Image.length,
            isGuest,
          });
          try {
            await saveImageAndRefreshMemory(base64Image, user.uid);
          } catch (err) {
            console.error("❌ [DEBUG] Failed to auto-save selected image to memory:", err);
          }
        }
      } else if (shouldUseVision) {
        console.log("🎥 [DEBUG] Vision intent detected, capturing frame...");
        base64Image = await captureVisionFrame();
        console.log("🎥 [DEBUG] Frame captured", {
          success: !!base64Image,
          imageLength: base64Image?.length || 0,
        });
        if (base64Image) {
          try {
            console.log("🖼️ [DEBUG] Saving captured image to Image Memory", {
              userId: user?.uid || "guest",
              imageLength: base64Image.length,
            });
            // Save under user id if available, otherwise use 'guest'
            await saveImageAndRefreshMemory(base64Image, user?.uid || "guest");
          } catch (err) {
            console.error("❌ [DEBUG] Failed to auto-save captured image to memory:", err);
          }
        }
      }

      let responseText: string;

      if (shouldUseVision && !base64Image) {
        throw new Error("Image clear nahi hai. Please dubara try karo.");
      }

      // Send image directly to Groq as multimodal payload
      const finalContent = nextHistory[nextHistory.length - 1]?.content ?? userText;

      const responseResult = await streamResponse(
        finalContent,
        chatId,
        nextHistory,
        base64Image,
        undefined,
        requestIdentity as any,
        nextMemoryProfile,
        currentMode,
      );
      responseText = responseResult.text;
      const modelUsed = responseResult.modelUsed;
      lastModelUsedRef.current = modelUsed;

      // Note: Image was already saved immediately after capture, no need to save again
      if (base64Image) {
        console.log("📝 [DEBUG] AI response completed for vision request (image already saved during capture)");
      }
      saveFinalMessage(chatId, responseText);
      setIsLoading(false);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      const finalHistory = [...nextHistory, aiMessage];
      setMood(nextMood);

      void generateFirstChatTitle(chatId, finalHistory, modelUsed).catch((error) => {
        console.error("Failed to update chat title", error);
      });

      void persistChatMessage(chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.error("Failed to persist model reply", error);
      });

    } catch (error) {
      console.error("Failed to complete chat response", error);
      const errorMessage = error instanceof Error ? error.message : "AI model currently unavailable hai. Thodi der baad try karo.";
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  const profilePreviewSource = profileImageSource ?? profileDraftPhotoUrl;
  const profileSubtext = user?.email || t.profileMenu.guestMode || "";
  const floatingTimeWeatherLabel = useMemo(() => {
    const temperature = typeof awareness.weather?.temperatureC === "number"
      ? `${Math.round(awareness.weather.temperatureC)}°C`
      : "--°C";
    return `${awareness.datetime.currentTime} · ${temperature}`;
  }, [awareness.datetime.currentTime, awareness.weather?.temperatureC]);
  const weatherThemeMode = weatherThemeOverride === "auto" ? awareness.datetime.dayState : weatherThemeOverride;

  const deriveVisualTheme = (hour24: number) => {
    if (hour24 >= 5 && hour24 < 11) return "morning";
    if (hour24 >= 11 && hour24 < 16) return "afternoon";
    if (hour24 >= 16 && hour24 < 20) return "evening";
    return "night";
  };

  const visualTheme = weatherThemeOverride === "auto"
    ? deriveVisualTheme(awareness.datetime.hour24)
    : weatherThemeMode === "day"
      ? "afternoon"
      : "night";

  const weatherAtmosphere = visualTheme === "morning"
    ? "shadow-[0_20px_48px_rgba(252,165,89,0.08),0_0_36px_rgba(255,99,132,0.04)]"
    : visualTheme === "afternoon"
      ? "shadow-[0_22px_50px_rgba(250,204,21,0.10),0_0_36px_rgba(255,238,170,0.03)]"
      : visualTheme === "evening"
        ? "shadow-[0_22px_52px_rgba(249,115,22,0.10),0_0_38px_rgba(249,115,22,0.04)]"
        : "shadow-[0_24px_60px_rgba(59,130,246,0.12),0_0_40px_rgba(124,58,237,0.10)]";

  const isRainy = awareness.weather?.isRainy;
  const isCloudy = awareness.weather?.isCloudy;
  const isFoggy = awareness.weather?.condition?.toLowerCase().includes("fog") || awareness.weather?.condition?.toLowerCase().includes("mist");
  const isClearNight = visualTheme === "night" && !isCloudy && !isRainy;
  const isHotWeather = awareness.weather?.hotColdState === "hot";
  const isSunset = awareness.datetime.hour24 >= 17 && awareness.datetime.hour24 < 19;

  const weatherHourlyForecast = awareness.weather?.hourlyForecast ?? [];
  const hourlyScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onWheelHourly = useCallback((e: React.WheelEvent) => {
    const el = hourlyScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const deltaScale = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? el.clientWidth : 1;
    el.scrollTo({
      left: el.scrollLeft + delta * deltaScale * 0.42,
      behavior: "smooth",
    });
  }, []);

  const onPointerDownHourly = useCallback((e: React.PointerEvent) => {
    const el = hourlyScrollRef.current;
    if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    dragStateRef.current.active = true;
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.scrollLeft = el.scrollLeft;
  }, []);

  const onPointerMoveHourly = useCallback((e: React.PointerEvent) => {
    const el = hourlyScrollRef.current;
    if (!el || !dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    el.scrollLeft = dragStateRef.current.scrollLeft - dx;
  }, []);

  const onPointerUpHourly = useCallback((e: React.PointerEvent) => {
    const el = hourlyScrollRef.current;
    if (!el) return;
    dragStateRef.current.active = false;
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
  }, []);
  const weatherLocationLabel = awareness.location
    ? [awareness.location.city, awareness.location.region, awareness.location.country].filter(Boolean).join(", ") || "Detected location"
    : "Location unavailable";
  const weatherLocationStatus = awareness.permission === "granted"
    ? "Live location active"
    : awareness.permission === "prompt"
      ? "Location permission pending"
      : awareness.permission === "denied"
        ? "Location access denied"
        : awareness.permission === "unsupported"
          ? "Location unsupported"
          : "Location status unknown";
  const weatherRainProbability = typeof awareness.weather?.rainProbabilityPercent === "number"
    ? `${Math.round(awareness.weather.rainProbabilityPercent)}%`
    : "--";
  const weatherHumidity = typeof awareness.weather?.humidityPercent === "number"
    ? `${Math.round(awareness.weather.humidityPercent)}%`
    : "--";
  const weatherWind = typeof awareness.weather?.windSpeedKph === "number"
    ? `${Math.round(awareness.weather.windSpeedKph)} km/h`
    : "--";
  const weatherTemperature = typeof awareness.weather?.temperatureC === "number"
    ? `${Math.round(awareness.weather.temperatureC)}°C`
    : "--°C";
  const weatherFeelsLike = typeof awareness.weather?.feelsLikeC === "number"
    ? `${Math.round(awareness.weather.feelsLikeC)}°C`
    : "--°C";
  const weatherCondition = awareness.weather?.condition ?? "Weather unavailable";
  const weatherCurrentBadge = awareness.datetime.dayState === "day"
    ? { icon: Sun, label: "Day mode" }
    : { icon: Moon, label: "Night mode" };
    const getHourlyForecastIcon = useCallback((slot: NonNullable<typeof weatherHourlyForecast>[number]) => {
      if (slot.weatherCode === 0) {
        return slot.dayState === "day" ? Sun : Moon;
      }

      if ([1, 2].includes(slot.weatherCode)) return CloudSun;
      if (slot.weatherCode === 3) return Cloud;
      if ([45, 48].includes(slot.weatherCode)) return CloudFog;
      if ([51, 53, 55, 56, 57].includes(slot.weatherCode)) return CloudDrizzle;
      if ([61, 63, 65, 66, 67, 80, 81, 82].includes(slot.weatherCode)) return CloudRain;
      if ([71, 73, 75, 77, 85, 86].includes(slot.weatherCode)) return CloudSnow;
      if ([95, 96, 99].includes(slot.weatherCode)) return CloudLightning;

      return slot.isCloudy ? Cloud : CloudSun;
    }, [weatherHourlyForecast]);
  const weatherPanelTimeParts = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: awarenessSettings.timeFormat === "12h",
    });
    const parts = formatter.formatToParts(weatherPanelClockNow);
    return {
      hour: parts.find((part) => part.type === "hour")?.value ?? "--",
      minute: parts.find((part) => part.type === "minute")?.value ?? "--",
      second: parts.find((part) => part.type === "second")?.value ?? "--",
      meridiem: parts.find((part) => part.type === "dayPeriod")?.value ?? "",
    };
  }, [awarenessSettings.timeFormat, weatherPanelClockNow]);
  const handleOpenMemoryFromSettings = useCallback(() => {
    setActiveSettingsSection("character");
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
  const handleProfileImageDelete = useCallback(async () => {
    try {
      if (user) {
        // 1st delete from custom photo -> provider photo, 2nd delete from provider photo -> empty avatar
        const providerPhoto = user.providerData?.[0]?.photoURL || "";
        const currentPhoto = profileDraftPhotoUrl || user.photoURL || "";
        const isCurrentlyProviderPhoto = Boolean(providerPhoto) && currentPhoto === providerPhoto;
        const nextPhoto = isCurrentlyProviderPhoto ? "" : providerPhoto;

        await updateProfile(user, { photoURL: nextPhoto || null });
        setProfilePhotoUrl(nextPhoto);
        setProfileDraftPhotoUrl(nextPhoto);
      } else {
        // For guests: remove from localStorage
        localStorage.removeItem(GUEST_PROFILE_PHOTO_KEY);
        setProfilePhotoUrl("");
        setProfileDraftPhotoUrl("");
      }
      setProfileImageSource(null);
      setProfileImageMeta(null);
      toast.success("Profile photo removed.");
    } catch (error) {
      console.error("Failed to delete profile image", error);
      toast.error("Could not remove profile photo.");
    }
  }, [profileDraftPhotoUrl, user]);
  const handleToggleTtsMute = useCallback(() => {
    setIsTtsMuted((previous) => {
      const nextValue = !previous;
      if (nextValue) {
        stopSaheliSpeech();
      }

      return nextValue;
    });
  }, []);
  const handleToggleSidebarTheme = useCallback((nextValue: boolean) => {
    setIsSidebarLightMode(nextValue);
  }, []);
  const handleCharacterChange = useCallback((character: string) => {
    setSelectedCharacter(character);
  }, []);
  const handleToggleWeatherPanel = useCallback(() => {
    setWeatherPanelOpen((previous) => !previous);
  }, []);
  const handleOpenMemoryPanel = useCallback(() => {
    setSecondaryPanelType("memory");
  }, []);
  const handleOpenSettingsPanel = useCallback(() => {
    setSecondaryPanelType("settings");
  }, []);
  const handleCloseSecondaryPanel = useCallback(() => {
    setSecondaryPanelType(null);
  }, []);
  useEffect(() => {
    if (!awarenessSettings.showDayDate) {
      setWeatherPanelOpen(false);
    }
  }, [awarenessSettings.showDayDate]);
  useEffect(() => {
    if (!weatherPanelOpen) {
      return;
    }

    setWeatherPanelClockNow(new Date());
    void refreshLocationAndWeather();
    const intervalId = window.setInterval(() => {
      setWeatherPanelClockNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [weatherPanelOpen]);
  const profileInitial = (profileName.trim() || effectiveUserName || "S").charAt(0).toUpperCase();

  return (
    <div className={`saheli-app-wrapper theme-${activeTheme} ${isDefocusActive ? "theme-transitioning" : ""} h-full w-full`}>
      <div
        className="chat-page-wrapper chat-screen-bg relative h-screen w-full overflow-hidden bg-[#000000] text-white selection:bg-pink-500/30"
        data-mood={mood}
        style={{ contain: "paint", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
      >
      <div ref={cursorRef} className="cursor-glow" />
      <CinematicAtmosphere layer="ambient" />
      
      {/* ── Garden Floor with Rising Dust ── */}
      <div className="garden-floor-container">
        <div className="garden-petals-blur" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`dust-${i}`} className="dust-particle" />
        ))}
      </div>
      
      {/* ── Floating Logo Button (Visible only when closed) ── */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[9999] saheli-floating-logo-btn cursor-pointer"
            style={{
              top: "32px",
              left: "48px",
            }}
          >
            <SaheliLogo size={24} showText={true} />
          </motion.button>
        )}
      </AnimatePresence>
      
      <Sidebar
        isOpen={isSidebarOpen}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        isGuest={isGuest}
        isLightMode={isSidebarLightMode}
        isTtsMuted={isTtsMuted}
        newChatLabel={t.sidebar.newChat}
        recentChatsLabel={t.sidebar.recentChats}
        noChatsGuestLabel={t.sidebar.noChatsGuest}
        noChatsAccountLabel={t.sidebar.noChatsAccount}
        settingsLabel={t.settings.title}
        userName={effectiveUserName}
        userPhotoUrl={profileDraftPhotoUrl || profilePhotoUrl}
        userEmail={user?.email || undefined}
        resolveChatTitle={(title) => (isDefaultChatTitle(title) ? t.chatTitles.newChat : title)}
        onCreateChat={() => void handleCreateChat()}
        onSelectChat={(chatId) => void handleSelectChat(chatId)}
        onDeleteChat={(chatId) => void handleDeleteChat(chatId)}
        onRenameChat={(chatId, title) => void handleRenameChat(chatId, title)}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onToggleSidebar={() => setIsSidebarOpen((previous) => !previous)}
        onToggleTtsMute={handleToggleTtsMute}
        onToggleSidebarTheme={handleToggleSidebarTheme}
        onOpenProfile={handleOpenProfileFromSettings}
        onOpenSettings={() => setSettingsPanelOpen(true)}
        onLogout={() => void handleLogout()}
        className={`${isIdle ? 'ghost-mode' : ''} ${settingsPanelOpen ? 'sidebar-deactivated' : ''}`}
      />

      <div 
        className="chat-content relative z-10 flex h-full flex-col transition-all duration-500" 
        style={{ 
          isolation: 'isolate', 
          background: '#000000',
          marginLeft: isSidebarOpen ? '300px' : '0px',
          width: isSidebarOpen ? 'calc(100% - 300px)' : '100%',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <header className="absolute top-4 w-full flex items-center justify-start px-6 z-30 pointer-events-none">
          <div className="md:hidden flex items-center gap-2 text-pink-400 font-semibold tracking-wide text-sm pointer-events-auto" style={{ fontFamily: "'Sour Gummy', cursive" }}>
            <Heart className="w-5 h-5 fill-current" />
            Saheli Ai
          </div>
        </header>

        {awarenessSettings.showDayDate ? (
          <div className="fixed right-4 top-4 z-[9998] md:right-6 md:top-5">
            <AnimatePresence>
              {weatherPanelOpen ? (
                <motion.button
                  type="button"
                  aria-label="Close weather details"
                  onClick={() => setWeatherPanelOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-[9998] cursor-default bg-transparent"
                />
              ) : null}
            </AnimatePresence>

            <div className="relative z-[9999] flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={handleToggleWeatherPanel}
                  aria-label={weatherPanelOpen ? "Close weather details" : "Open weather details"}
                  aria-expanded={weatherPanelOpen}
                  title={floatingTimeWeatherLabel}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 text-[11px] font-medium text-white/85 shadow-[0_14px_30px_rgba(0,0,0,0.28),0_0_18px_rgba(255,105,180,0.08)] backdrop-blur-2xl transition duration-300 hover:border-pink-400/25 hover:bg-white/[0.08] hover:text-white"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/10 text-pink-200 shadow-[0_0_14px_rgba(255,105,180,0.16)]">
                    <Clock3 className="h-3.5 w-3.5" />
                  </span>
                  <span className="whitespace-nowrap">{floatingTimeWeatherLabel}</span>
                  <span className="inline-flex h-6 w-6 relative items-center justify-center rounded-full bg-cyan-500/10 text-cyan-200">
                    {isRefreshingRealtime ? (
                      <span className="absolute inset-0 rounded-full border border-cyan-400/40 border-t-transparent animate-spin" />
                    ) : null}
                    <CloudSun className="h-3.5 w-3.5" />
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleToggleTtsMute}
                  aria-label={isTtsMuted ? "Unmute TTS" : "Mute TTS"}
                  title={isTtsMuted ? "Unmute TTS" : "Mute TTS"}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_14px_30px_rgba(0,0,0,0.28),0_0_18px_rgba(255,105,180,0.08)] backdrop-blur-2xl transition duration-300 hover:border-pink-400/25 hover:bg-white/[0.08] hover:text-white"
                >
                  {isTtsMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </motion.button>
              </div>

              <AnimatePresence>
                {weatherPanelOpen ? (
                  <motion.div
                    key="weather-panel"
                    initial={{ opacity: 0, y: -12, scale: 0.965 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.965 }}
                    transition={{ type: "spring", damping: 22, stiffness: 420, mass: 0.55 }}
                    className={`pointer-events-auto relative w-[288px] overflow-hidden rounded-[26px] border border-white/10 text-white backdrop-blur-2xl ${weatherAtmosphere}`}
                      style={{
                      backgroundImage: visualTheme === "night"
                        ? `linear-gradient(180deg, rgba(7,7,12,0.98), rgba(10,10,18,0.92)), radial-gradient(circle at top right, rgba(99,102,241,0.18), transparent 42%), radial-gradient(circle at 14% 0%, rgba(168,85,247,0.16), transparent 28%)`
                        : visualTheme === "morning"
                          ? `linear-gradient(180deg, rgba(255,247,237,0.06), rgba(255,245,240,0.03)), radial-gradient(circle at top right, rgba(255,183,77,0.12), transparent 42%), radial-gradient(circle at 12% 0%, rgba(255,206,102,0.10), transparent 26%)`
                          : visualTheme === "afternoon"
                            ? `linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)), radial-gradient(circle at top right, rgba(250,204,21,0.16), transparent 42%), radial-gradient(circle at 12% 0%, rgba(251,191,36,0.14), transparent 26%)`
                            : `linear-gradient(180deg, rgba(255,244,230,0.05), rgba(255,240,230,0.02)), radial-gradient(circle at top right, rgba(249,115,22,0.12), transparent 42%), radial-gradient(circle at 12% 0%, rgba(250,204,21,0.10), transparent 26%)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_40%)]" />

                    {/* CINEMATIC WEATHER THEMES */}
                    <div className="absolute inset-0 pointer-events-none transition-opacity duration-1500 ease-in-out">
                      {isRainy && (
                        <div className="absolute inset-0 opacity-80 mix-blend-screen">
                          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent" />
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div 
                              key={`rain-${i}`}
                              className="absolute bg-gradient-to-b from-white/20 to-white/0 w-[1px]"
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `-20px`,
                                height: `${20 + Math.random() * 40}px`,
                                animation: `weatherRainDrop ${0.4 + Math.random() * 0.3}s linear infinite`,
                                animationDelay: `${Math.random() * 2}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                      
                      {isFoggy && (
                        <div className="absolute inset-0 opacity-40 mix-blend-screen overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%] animate-[weatherFog_8s_ease-in-out_infinite_alternate]" />
                        </div>
                      )}
                      
                      {isHotWeather && !isRainy && (
                        <div className="absolute inset-0 mix-blend-overlay opacity-30 bg-gradient-to-t from-orange-500/20 to-transparent animate-[weatherHeatShimmer_3s_ease-in-out_infinite_alternate]" />
                      )}
                      
                      {isSunset && !isRainy && !isFoggy && (
                        <div className="absolute inset-0 mix-blend-screen opacity-40 bg-gradient-to-tr from-purple-500/20 via-orange-500/20 to-transparent" />
                      )}
                    </div>

                    {visualTheme === "night" ? (
                      <>
                        <div className="absolute right-2 top-2 h-16 w-16 rounded-full bg-indigo-400/14 blur-2xl" />
                        <div className="absolute right-4 top-3 h-10 w-10 rounded-full border border-sky-100/12 bg-white/[0.04] shadow-[0_0_30px_rgba(99,102,241,0.12)]" />
                        {Array.from({ length: 8 }).map((_, index) => (
                          <span
                            key={`weather-star-${index}`}
                            className="absolute h-1 w-1 rounded-full bg-white/70"
                            style={{
                              right: `${14 + index * 8}px`,
                              top: `${10 + (index % 4) * 11}px`,
                              opacity: 0.35 + index * 0.06,
                              animation: `weatherStarDrift ${5 + index * 0.35}s linear infinite`,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="absolute right-2 top-2 h-14 w-14 rounded-full bg-amber-200/18 blur-2xl" />
                        <div className="absolute right-3 top-1 h-20 w-20 opacity-70">
                          <div className="absolute right-0 top-0 h-9 w-9 rounded-full border border-amber-100/20 bg-amber-100/10 shadow-[0_0_28px_rgba(251,191,36,0.18)]" />
                          <div className="absolute -right-2 top-2 h-12 w-[1px] rotate-12 bg-gradient-to-b from-amber-100/0 via-amber-100/40 to-amber-100/0" />
                          <div className="absolute right-2 -top-1 h-14 w-[1px] -rotate-18 bg-gradient-to-b from-amber-100/0 via-amber-100/35 to-amber-100/0" />
                          <div className="absolute right-5 top-0 h-12 w-[1px] rotate-30 bg-gradient-to-b from-amber-100/0 via-amber-100/28 to-amber-100/0" />
                        </div>
                      </>
                    )}

                    <div className="relative px-4 py-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-pink-200" />
                            <h3
                              className="font-serif text-[10px] uppercase tracking-[0.2em] text-[#e5e7eb] opacity-90 drop-shadow-md"
                              style={{
                                letterSpacing: '0.2em',
                                fontFamily: '"Cormorant Garamond", "Cinzel", "Playfair Display", Georgia, serif',
                                textShadow: '0 0 14px rgba(255,255,255,0.06), 0 0 22px rgba(255,255,255,0.04)'
                              }}
                            >
                              WEATHER & TIME
                            </h3>
                          </div>
                          <p className="max-w-[170px] text-[11px] leading-5 text-white/40">Cinematic live context</p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 pt-0.5">
                          <div className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-end gap-1 text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                        <span className="text-[2.15rem] font-semibold leading-none tracking-[0.06em]">{weatherPanelTimeParts.hour}</span>
                        <span className="pb-[0.08rem] text-[1.45rem] leading-none text-white/40">:</span>
                        <span className="text-[2.15rem] font-semibold leading-none tracking-[0.06em]">{weatherPanelTimeParts.minute}</span>
                        <span className="pb-[0.08rem] text-[1.45rem] leading-none text-white/40">:</span>
                        <span className="pb-[0.12rem] text-[1.05rem] font-medium leading-none tracking-[0.12em] text-white/68">{weatherPanelTimeParts.second}</span>
                        {weatherPanelTimeParts.meridiem ? (
                          <span className="pb-[0.12rem] pl-1 text-[0.72rem] font-medium tracking-[0.34em] text-white/50">
                            {weatherPanelTimeParts.meridiem}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-white/50">
                        <span className="tracking-[0.02em]">{awareness.datetime.weekday}</span>
                        <span className="text-white/18">•</span>
                        <span className="tracking-[0.01em]">{awareness.datetime.currentDate}</span>
                        <span className="text-white/18">•</span>
                        <span className="inline-flex items-center gap-1.5 text-white/60">
                          {weatherCurrentBadge.icon === Sun ? <Sun className="h-3 w-3 text-amber-200" /> : <Moon className="h-3 w-3 text-sky-200" />}
                          {awareness.datetime.dayState === "day" ? "Daytime" : "Nighttime"}
                        </span>
                      </div>

                      <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

                      <div className="space-y-2 text-[10.5px] leading-5 text-white/60">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-pink-200/80" />
                            <span className="shrink-0 text-white/34">Location</span>
                            <span className="truncate text-white/78">{weatherLocationLabel}</span>
                          </span>
                          <span className="text-right text-white/38">{weatherLocationStatus}</span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <CloudSun className="h-3.5 w-3.5 text-cyan-200/80" />
                            <span className="shrink-0 text-white/34">Weather</span>
                            <span className="truncate text-white/78">{weatherCondition}</span>
                          </span>
                          <span className="text-right text-white/38">{weatherTemperature} / feels {weatherFeelsLike}</span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <Thermometer className="h-3.5 w-3.5 text-amber-200/80" />
                            <span className="shrink-0 text-white/34">Humidity</span>
                            <span className="text-white/78">{weatherHumidity}</span>
                          </span>
                          <span className="inline-flex items-center justify-end gap-2 text-white/60">
                            <Wind className="h-3.5 w-3.5 text-sky-200/80" />
                            <span>{weatherWind}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <Droplets className="h-3.5 w-3.5 text-sky-200/80" />
                            <span className="shrink-0 text-white/34">Rain chance</span>
                            <span className="text-white/78">{weatherRainProbability}</span>
                          </span>
                          <span className="text-right text-white/38">{awareness.weather?.hotColdState || "mild"}</span>
                        </div>
                      </div>

                      <div className="my-3.5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

                      <div className="space-y-2 text-[10px] leading-5 text-white/55">
                        <p className="uppercase tracking-[0.28em] text-white/32">Hourly forecast</p>
                        <div className="relative">
                          <div
                            ref={hourlyScrollRef}
                            onPointerDown={onPointerDownHourly}
                            onPointerMove={onPointerMoveHourly}
                            onPointerUp={onPointerUpHourly}
                            onPointerCancel={onPointerUpHourly}
                            onWheel={onWheelHourly}
                            className="-mx-2 overflow-x-auto pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ WebkitOverflowScrolling: "touch" }}
                          >
                            <div className="flex min-w-max items-center gap-3 px-2">
                              {weatherHourlyForecast.slice(0, 12).map((slot) => {
                                const HourlyIcon = getHourlyForecastIcon(slot);

                                return (
                                  <div
                                    key={slot.timeIso}
                                    className="flex min-w-[64px] flex-col items-center justify-center px-2 py-2 text-center"
                                  >
                                    <span className="text-[10px] leading-none text-white/50 font-medium drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]">{slot.hourLabel}</span>
                                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center text-white/85 drop-shadow-[0_6px_20px_rgba(255,255,255,0.02)]">
                                      <HourlyIcon className="h-5 w-5" />
                                    </span>
                                    <span className="mt-1 text-[12px] font-semibold tracking-[0.03em] text-white drop-shadow-[0_6px_18px_rgba(255,255,255,0.03)]">{Math.round(slot.temperatureC)}°</span>
                                  </div>
                                );
                              })}

                              {weatherHourlyForecast.length === 0 ? (
                                <div className="flex min-w-[150px] items-center justify-center px-3 py-3 text-center text-[11px] text-white/35">
                                  Hourly forecast loading
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <style>{`
              @keyframes weatherStarDrift { 0% { transform: translateY(0px); opacity: 0; } 12% { opacity: 0.9; } 85% { opacity: 0.6; } 100% { transform: translateY(16px); opacity: 0; } }
              @keyframes weatherRainDrop { 0% { transform: translateY(0) rotate(10deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(300px) rotate(10deg); opacity: 0; } }
              @keyframes weatherFog { 0% { transform: translateX(-20%); } 100% { transform: translateX(0%); } }
              @keyframes weatherHeatShimmer { 0% { opacity: 0.2; transform: scale(1); } 100% { opacity: 0.4; transform: scale(1.05); } }
            `}</style>
          </div>
        ) : (
          <div className="absolute right-4 top-4 z-40 flex items-center gap-2 pointer-events-none md:right-6 md:top-5">
            <motion.button
              type="button"
              onClick={handleToggleTtsMute}
              aria-label={isTtsMuted ? "Unmute TTS" : "Mute TTS"}
              title={isTtsMuted ? "Unmute TTS" : "Mute TTS"}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_14px_30px_rgba(0,0,0,0.28),0_0_18px_rgba(255,105,180,0.08)] backdrop-blur-2xl transition duration-300 hover:border-pink-400/25 hover:bg-white/[0.08] hover:text-white"
            >
              {isTtsMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </motion.button>
          </div>
        )}

        {/* --- LAYER 1 & 2: MASCOT CONTAINER & BACKGROUND --- */}
        <div 
          className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-0 overflow-hidden"
          style={{ 
            opacity: 0.3, 
            transition: 'opacity 0.5s ease-in-out',
            transform: `translateY(calc(var(--scroll-y, 0px) * -0.03))`
          }}
        >
          {/* Layer 1 (z-0): Pure black backdrop for Swara */}
          <div className="absolute inset-0" style={{ background: "#000000" }} />
          
          {/* Layer 2 (z-5): Mascot Container */}
          <div className="relative z-[5] flex flex-col items-center justify-center w-full h-full">
            <CinematicAtmosphere layer="characterBack" />
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-[-1]">
              <div className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,105,180,0.18) 0%, rgba(200,80,250,0.08) 40%, transparent 70%)", filter: "blur(60px)", transform: "translateY(-5%)" }} />
            </div>
            
            {/* Added wrapper to bump character & lights up slightly */}
            <div className="flex flex-col items-center justify-center w-full" style={{ transform: "translateY(-25px)" }}>
              <div className="relative flex items-center justify-center w-full max-w-[520px]">
                {/* Standardized Character Container — identical bounding box for all characters */}
                <div
                  className="relative z-[5] pointer-events-none"
                  style={{
                    width: "380px",
                    height: "520px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-end",
                  }}
                >
                  <motion.div
                    animate={{ y: [-8, 6, -8], scale: [1, 1.006, 1], rotateZ: [-0.5, 0.5, -0.5], x: parallaxOffset.x, marginTop: parallaxOffset.y }}
                    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full"
                  >
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={selectedCharacter}
                        src={CHARACTER_IMAGE_MAP[selectedCharacter] || "/butterfly.png"}
                        alt={`${selectedCharacter} Mascot`}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="w-full h-full brightness-110 contrast-105 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                        style={{
                          objectFit: "contain",
                          objectPosition: "bottom center",
                        }}
                      />
                    </AnimatePresence>

                    {/* Perched Butterflies on Hair and Dress */}
                    <div className="cinematic-hero-butterfly cinematic-hero-butterfly--perched-hair">
                      <div className="cinematic-hero-butterfly__form cinematic-hero-butterfly__form--perched cinematic-hero-butterfly__form--cyan">
                        <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
                        <span className="cinematic-hero-butterfly__body" />
                        <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
                      </div>
                    </div>
                    <div className="cinematic-hero-butterfly cinematic-hero-butterfly--perched-dress">
                      <div className="cinematic-hero-butterfly__form cinematic-hero-butterfly__form--perched cinematic-hero-butterfly__form--gold">
                        <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
                        <span className="cinematic-hero-butterfly__body" />
                        <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* 3. Soft realistic shadow under feet (Darker, more grounded) */}
                <div className="girl-ground-shadow" style={{ 
                  background: "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(5,0,15,0.8) 35%, rgba(15,5,25,0.4) 65%, transparent 85%)",
                  width: "60%", height: "24px", filter: "blur(6px)", bottom: "0%"
                }} />

                {/* 2. Ground light — cinematic pink oval patch (softened) */}
                <div className="girl-ground-light" style={{
                  background: "radial-gradient(ellipse at center, rgba(255,20,147,0.55) 0%, rgba(168,85,247,0.35) 40%, rgba(20,5,25,0.15) 65%, transparent 85%)",
                  width: "85%", height: "60px", filter: "blur(25px)", mixBlendMode: "screen", bottom: "-4%"
                }} />

                {/* 1. Spotlight — bright top-center cinematic cone on girl (softened) */}
                <div className="girl-spotlight" style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(255,50,150,0.45) 0%, rgba(255,20,147,0.25) 25%, rgba(138,43,226,0.1) 50%, transparent 75%)",
                  width: "120%", height: "90%", filter: "blur(30px)", mixBlendMode: "screen", top: "-20%"
                }} />

                {/* 4. Ambient glow — cinematic depth around character (softened) */}
                <div className="girl-ambient-glow" style={{
                  background: "radial-gradient(ellipse at center, rgba(255,0,128,0.15) 0%, rgba(148,0,211,0.08) 35%, rgba(75,0,130,0.04) 55%, transparent 70%)",
                  filter: "blur(40px)", mixBlendMode: "screen", width: "80%", height: "80%"
                }} />
              </div>

              {/* The Feet Shadow */}
              <motion.div
                className="relative z-[4] rounded-[50%] -mt-14"
                style={{
                  width: '350px',
                  height: '35px',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  boxShadow: '0 0 50px rgba(0,0,0,0.7), 0 0 30px rgba(236,72,153,0.4)',
                }}
                animate={{ 
                  scale: [1, 1.2, 1], 
                  opacity: [0.6, 0.4, 0.6] 
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>

        <CinematicAtmosphere layer="foreground" />

        <div className="flex-1 min-h-0 p-4 md:p-8 space-y-6 relative z-20">
          {messages.length === 0 && !isLoading && !submitLockRef.current ? (
            <div className="h-full" />
          ) : (
            <ScrollFadeMessageList
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              lastMsgCount={lastMsgCountRef.current}
              typingLabel={thinkingLabel}
            />
          )}
        </div>

        <div className="flex-none px-4 pb-10 pt-6 w-full md:w-[72%] lg:w-[62%] mx-auto group relative mt-auto z-30">
          {dbStatus ? (
            <div className="mb-2 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
              {dbStatus}
            </div>
          ) : null}
          <form
            onSubmit={handleSubmit}
            className={`saheli-composer-container relative mx-auto flex h-[68px] items-center gap-2.5 px-4 transition-all duration-300 ${
              input.trim() ? "scale-[1.01]" : ""
            }`}
            style={{
              width: "min(100%, 860px)",
              transform: "translateY(-28px)",
              borderRadius: "24px",
            }}
          >
            {/* Pop-up inside the form to guarantee perfect centering above the text box */}
            <AnimatePresence>
              {modeSwitchNotification && (() => {
                const isMentor = modeSwitchNotification.toLowerCase().includes("mentor");
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -5, scale: 0.95, filter: "blur(3px)" }}
                    transition={{ 
                      type: "spring",
                      stiffness: 350,
                      damping: 26,
                      mass: 0.7
                    }}
                    className="absolute -top-[52px] left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#160d2b]/65 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.15)] pointer-events-none z-50 whitespace-nowrap"
                  >
                    {/* Left glow overlay */}
                    <div 
                      className={`absolute inset-0 -z-10 rounded-full opacity-15 blur-sm transition-all duration-300 ${
                        isMentor 
                          ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/25 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)]" 
                          : "bg-gradient-to-r from-pink-500/25 to-purple-500/25 shadow-[inset_0_0_12px_rgba(244,63,94,0.15)]"
                      }`} 
                    />

                    {/* Outer glowing border */}
                    <div 
                      className={`absolute inset-0 rounded-full border transition-all duration-500 ${
                        isMentor ? "border-cyan-500/25 shadow-[0_0_10px_rgba(34,211,238,0.1)]" : "border-pink-500/25 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                      }`}
                    />

                    {/* Icon container */}
                    <div className={`p-1.5 rounded-full flex items-center justify-center ${
                      isMentor ? "bg-cyan-500/15" : "bg-pink-500/15"
                    }`}>
                      {isMentor ? (
                        <svg className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-pink-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] fill-pink-400 animate-pulse" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      )}
                    </div>

                    {/* Text contents */}
                    <div className="flex flex-col text-left pr-1">
                      <span className={`text-[8.5px] font-bold tracking-[0.15em] uppercase ${
                        isMentor ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" : "text-pink-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                      }`}>
                        {isMentor ? "Mentor Mode" : "Bestie Mode"}
                      </span>
                      <span className="text-[10px] text-white/85 font-medium mt-0.5">
                        {isMentor ? "Swara switched to Study Coach 🧠" : "Swara is now your Bestie 💖"}
                      </span>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
            {/* Perched Composer Butterfly */}
            <div className="cinematic-hero-butterfly cinematic-hero-butterfly--perched-composer">
              <div className="cinematic-hero-butterfly__form cinematic-hero-butterfly__form--perched cinematic-hero-butterfly__form--pink">
                <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
                <span className="cinematic-hero-butterfly__body" />
                <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
              </div>
            </div>
            {selectedImage && (
              <div className="absolute -top-24 left-4 p-2 bg-[#1a0b2e]/80 backdrop-blur-xl border border-pink-500/30 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative group">
                  <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-pink-500/20" />
                  <button 
                    type="button"
                    onClick={() => setSelectedImageValue(null)}
                    className="absolute -top-2 -right-2 bg-pink-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleImageFileSelection(file);
                }
                e.target.value = "";
              }}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="saheli-composer-btn ml-1"
                  aria-label="Add image"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="border border-white/10 bg-[#120b1f]/95 text-white shadow-2xl backdrop-blur-xl">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    if (isMobile()) {
                      mobileCameraInputRef.current?.click();
                      return;
                    }

                    void captureVisionFrame()
                      .then((base64) => {
                        if (!base64) {
                          throw new Error("Camera access nahi mila. Please allow camera and try again.");
                        }
                        setSelectedImageValue(`data:image/jpeg;base64,${base64}`);
                        void handleSubmit();
                      })
                      .catch((error) => {
                        const message = error instanceof Error ? error.message : "Camera access nahi mila. Please allow camera and try again.";
                        toast.error(message, { duration: 5000 });
                      });
                  }}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Gallery
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  File Upload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <input
              type="text"
              value={input}
              onChange={(e) => {
                const newInput = e.target.value;
                setInput(newInput);
                setPresenceStatus(newInput.length > 0 ? "Swara sun rahi hai..." : null);
                
                // Clear existing timeouts
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (teasingTimeoutRef.current) clearTimeout(teasingTimeoutRef.current);
                
                // Check for backspace teasing (>10 chars deleted)
                if (lastInputLength > newInput.length && lastInputLength - newInput.length > 10) {
                  setPresenceStatus("Arey! Itna sab likh ke mita diya? 🧐");
                  teasingTimeoutRef.current = window.setTimeout(() => {
                    setPresenceStatus(newInput.length > 0 ? "Swara sun rahi hai..." : null);
                  }, 3000);
                }
                
                setLastInputLength(newInput.length);
                
                // Stop typing teasing after 7 seconds of no input
                if (newInput.length > 0) {
                  typingTimeoutRef.current = window.setTimeout(() => {
                    setPresenceStatus("Ruk kyun gaye? Likh bhi do ab! 😉");
                  }, 7000);
                }
              }}
              placeholder={inputPlaceholder}
              className="saheli-composer-input flex-1 bg-transparent px-2 text-[15px] text-white placeholder-white/35 focus:outline-none focus:ring-0"
            />
            <div className="flex items-center gap-2 pr-1">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? t.composer.stopListening : t.composer.voiceInput}
                className="saheli-composer-btn"
              >
                <Mic className={`w-4 h-4 ${isListening ? "text-pink-300" : ""}`} />
              </button>
              <button
                type="submit"
                aria-label={t.composer.sendMessage}
                disabled={(!(input.trim() || selectedImage) || isLoading)}
                className="saheli-composer-btn saheli-send-btn"
              >
                <Send className="h-4 w-4 translate-x-[1px]" />
              </button>
            </div>
          </form>
          
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            aria-label="Capture photo"
            onChange={handleMobileCameraChange}
          />
          {pendingMobileVisionRequest && isMobile() && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleMobileCameraOpen}
                className="rounded-full border border-pink-400/30 bg-white/10 px-4 py-2 text-sm text-pink-100 backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
              >
                {t.composer.openCamera}
              </button>
            </div>
          )}
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
              isTtsMuted={isTtsMuted}
              onToggleTtsMute={handleToggleTtsMute}
              selectedCharacter={selectedCharacter}
              onCharacterChange={handleCharacterChange}
              activeMode={currentMode}
              onModeChange={setCurrentMode}
              profileDraftName={profileDraftName}
              onProfileNameChange={setProfileDraftName}
              onProfileImageSelect={handleProfileImageSelect}
              onProfileImageDelete={() => void handleProfileImageDelete()}
              onSaveProfile={(nameOverride?: string) => void handleSaveProfile(nameOverride)}
              isSavingProfile={isSavingProfile}
              originalPhotoUrl={user?.providerData?.[0]?.photoURL || ""}
              realtimeAwareness={awareness}
              awarenessLocationLabel={locationLabel}
              awarenessWeatherLabel={weatherLabel}
              awarenessTimeFormat={awarenessSettings.timeFormat}
              awarenessShowDayDate={awarenessSettings.showDayDate}
              awarenessRefreshing={isRefreshingRealtime}
              onAwarenessTimeFormatChange={setTimeFormat}
              onAwarenessToggleDayDateVisibility={toggleDayDateVisibility}
              onAwarenessRefresh={() => void refreshLocationAndWeather()}
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
          onBack={() => {
            setMemoryModalOpen(false);
            setSettingsPanelOpen(true);
            setActiveSettingsSection("memory");
          }}
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
      <ThemeTransitionOverlay
        targetTheme={targetTheme}
        onThemeUpdate={(theme) => {
          setActiveTheme(theme);
          setIsDefocusActive(false);
        }}
        onTransitionComplete={() => {
          setTargetTheme(null);
          setIsThemeTransitioning(false);
        }}
      />
    </div>
  </div>
  );
}

