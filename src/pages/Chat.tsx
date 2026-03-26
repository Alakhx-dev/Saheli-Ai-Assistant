import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Globe,
  Brain,
  LogOut,
  Menu,
  Mic,
  Send,
  Sparkles,
  Heart,
  UserCircle2,
  Volume2,
  VolumeX,
  KeyRound,
  Camera,
  Check,
  ImageIcon,
  X,
} from "lucide-react";
import { auth, storage } from "@/lib/firebase";
import { sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { getDownloadURL, ref as storageRef, uploadString } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { sendMessage, type AppLanguage, type ChatMessage, type EmotionLabel, type UserIdentityContext } from "@/lib/ai-service";
import {
  createChatSession,
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
  deleteMemoryEntry,
  deleteMemoryMoment,
  deriveNextMemoryProfile,
  isMemoryEnabled,
  loadMemoryProfile,
  loadMemoryMoments,
  persistMemoryProfile,
  saveMemoryMoment,
  setMemoryEnabled,
  type MemoryFieldKey,
  type MemoryMoment,
  type MemoryProfile,
} from "@/lib/memory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

const VISION_TRIGGER_PATTERNS = [
  /\bdekho\b/i,
  /\bdekh\s*ke\s*batao\b/i,
  /\bkais[aei]?\s+lag\s+rah[aei]\b/i,
  /\bkapd[ae]\b/i,
  /\bfit\b/i,
  /\bfit\s*check\b/i,
  /\bcamera\b/i,
];
const VOICE_NAME = "Swara";
const LEGACY_LANGUAGE_STORAGE_KEY = "language";
const GUEST_PROFILE_NAME_KEY = "swara_guest_profile_name";
const GUEST_PROFILE_PHOTO_KEY = "swara_guest_profile_photo";
const ACTIVE_CHAT_SESSION_KEY = "activeChatId";
const PROFILE_CROP_OUTPUT_SIZE = 512;
const PROFILE_PREVIEW_SIZE = 208;
const TITLE_UPDATE_INTERVAL = 3;

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

type LanguageOption = AppLanguage;
type MemoryEntryDescriptor =
  | { id: "name"; label: "Name"; value: string; field: MemoryFieldKey }
  | { id: "tone"; label: "Tone"; value: string; field: MemoryFieldKey }
  | { id: "style"; label: "Style"; value: string; field: MemoryFieldKey }
  | { id: "moodPattern"; label: "Mood"; value: string; field: MemoryFieldKey }
  | { id: `preference-${string}`; label: "Likes"; value: string; field: MemoryFieldKey; preferenceValue: string };

interface ProfileImageMeta {
  width: number;
  height: number;
}

function buildMemoryEntries(
  profile: MemoryProfile | null,
  labels: {
    name: string;
    tone: string;
    style: string;
    mood: string;
    likes: string;
  },
): MemoryEntryDescriptor[] {
  if (!profile) {
    return [];
  }

  const entries: MemoryEntryDescriptor[] = [];

  if (profile.name) {
    entries.push({ id: "name", label: labels.name, value: profile.name, field: "name" });
  }

  if (profile.tone) {
    entries.push({ id: "tone", label: labels.tone, value: profile.tone, field: "tone" });
  }

  if (profile.style) {
    entries.push({ id: "style", label: labels.style, value: profile.style, field: "style" });
  }

  if (profile.moodPattern) {
    entries.push({ id: "moodPattern", label: labels.mood, value: profile.moodPattern, field: "moodPattern" });
  }

  for (const preference of profile.preferences ?? []) {
    entries.push({
      id: `preference-${preference}`,
      label: labels.likes,
      value: preference,
      field: "preference",
      preferenceValue: preference,
    });
  }

  return entries;
}

function readGuestProfileName() {
  return localStorage.getItem(GUEST_PROFILE_NAME_KEY)?.trim() || CREATOR_NAME;
}

function readGuestProfilePhoto() {
  return localStorage.getItem(GUEST_PROFILE_PHOTO_KEY) || "";
}

function hasExplicitMemoryInstruction(text: string) {
  return /yaad\s+rakhna|mera\s+naam|my\s+name\s+is|mujhe\s+pasand\s+hai|i\s+like|mai\s+aise\s+hu|main\s+aisa\s+hu|main\s+aisi\s+hu/i.test(text);
}

function hasVisibleMemoryChange(previousProfile: MemoryProfile | null, nextProfile: MemoryProfile | null) {
  const normalizeList = (values?: string[]) => (values ?? []).slice().sort().join("|");

  return (
    previousProfile?.name !== nextProfile?.name ||
    previousProfile?.tone !== nextProfile?.tone ||
    previousProfile?.style !== nextProfile?.style ||
    previousProfile?.moodPattern !== nextProfile?.moodPattern ||
    normalizeList(previousProfile?.preferences) !== normalizeList(nextProfile?.preferences)
  );
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
    if (isMuted || !unlockedRef.current) {
      return;
    }

    const cleanText = normalizeTextForTts(text);

    if (!cleanText) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "hi-IN";
    utterance.pitch = 1.2;
    utterance.rate = 1.1;
    utterance.volume = 1.0;

    if (!preferredVoiceRef.current) {
      primePreferredVoice();
    }

    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }

    window.speechSynthesis.speak(utterance);
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

// Message Item with Scroll-triggered Fade + Sheen + Hover Pulse
function ScrollFadeMessageItem({ msg, index, isNew }: { msg: ChatMessage; index: number; isNew: boolean }) {
  const itemRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={itemRef}
      key={index}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      viewport={{ once: false, amount: 0.3, margin: "50px" }}
      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`
        max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm leading-snug font-medium relative
        bubble-hover transition-all duration-300
        ${isNew ? "msg-sheen" : ""}
        ${msg.role === "user"
          ? "bg-gradient-to-br from-purple-600/50 to-pink-600/50 backdrop-blur-3xl border border-white/15 text-white rounded-2xl rounded-tr-none shadow-[0_4px_24px_rgba(168,85,247,0.25),0_8px_32px_rgba(0,0,0,0.37)]"
          : "bg-white/[0.05] backdrop-blur-3xl border border-pink-300/15 text-white/90 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
        }
      `}
        style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: "15px", fontWeight: 500 }}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

// Scroll Fade Message List Container
function ScrollFadeMessageList({
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
    <div ref={containerRef} className="max-w-3xl mx-auto space-y-6 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => (
          <ScrollFadeMessageItem key={idx} msg={msg} index={idx} isNew={idx >= lastMsgCount} />
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            viewport={{ once: false, amount: 0.3 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.05] backdrop-blur-3xl border border-pink-300/15 p-4 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
              </div>
              <p className="text-white/60 text-xs font-medium">{typingLabel}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [memoryMenuOpen, setMemoryMenuOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [memoryEnabled, setMemoryEnabledState] = useState(() => isMemoryEnabled());
  const [memoryMoments, setMemoryMoments] = useState<MemoryMoment[]>([]);
  const [selectedMemoryImage, setSelectedMemoryImage] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<string | null>(null);
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
  const [memoryProfile, setMemoryProfile] = useState<MemoryProfile | null>(null);
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
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraCancelTimeoutRef = useRef<number | null>(null);
  const pendingMobileVisionRequestRef = useRef<PendingMobileVisionRequest | null>(null);
  const mobileVisionRequestIdRef = useRef(0);
  const mobileVisionProcessingRequestIdRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { unlock, speak, stop } = useVoice(isMuted);

  // Speech-to-text: appends recognized speech to current input
  const { isListening, toggle: toggleMic, stopListening } = useSpeechToText(
    useCallback((text: string) => setInput(text), [])
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    chatSessionsRef.current = chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
    localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
  }, [language]);

  useEffect(() => {
    setMemoryEnabled(memoryEnabled);
  }, [memoryEnabled]);

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
    };

    void bootstrapChatHistory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (currentChatId) {
      sessionStorage.setItem(ACTIVE_CHAT_SESSION_KEY, currentChatId);
      return;
    }

    sessionStorage.removeItem(ACTIVE_CHAT_SESSION_KEY);
  }, [currentChatId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapMemoryMoments = async () => {
      try {
        const moments = await loadMemoryMoments(user);
        if (!cancelled) {
          setMemoryMoments(moments);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load memory moments", error);
          setMemoryMoments([]);
        }
      }
    };

    void bootstrapMemoryMoments();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapMemory = async () => {
      try {
        const profile = await loadMemoryProfile(user);
        if (!cancelled) {
          setMemoryProfile(profile);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load memory profile", error);
          setMemoryProfile(null);
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

  const handleLanguageChange = (nextLanguage: LanguageOption) => {
    if (nextLanguage === language) {
      setLanguageMenuOpen(false);
      return;
    }

    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage);
    localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
    window.location.reload();
  };

  const handleMemoryToggle = (enabled: boolean) => {
    setMemoryEnabledState(enabled);
    setMemoryStatus(enabled ? t.statuses.memoryOn : t.statuses.memoryOff);
  };

  const handleDeleteMemoryEntry = async (entry: MemoryEntryDescriptor) => {
    const nextProfile = deleteMemoryEntry(memoryProfile, entry.field, "preferenceValue" in entry ? entry.preferenceValue : undefined);
    setMemoryProfile(nextProfile);

    try {
      await persistMemoryProfile(user, nextProfile);
      setMemoryStatus(formatText(t.statuses.memoryEntryDeleted, { label: entry.label }));
    } catch (error) {
      console.warn("Failed to delete memory entry", error);
      setMemoryStatus(t.statuses.memoryEntryDeleteFailed);
    }
  };

  const handleDeleteMemoryMoment = async (momentId: string) => {
    try {
      const deletedMoment = memoryMoments.find((moment) => moment.id === momentId);
      await deleteMemoryMoment(user, momentId);
      setMemoryMoments((prev) => prev.filter((moment) => moment.id !== momentId));
      if (selectedMemoryImage && deletedMoment?.imageDataUrl === selectedMemoryImage) {
        setSelectedMemoryImage(null);
      }
      setMemoryStatus(t.statuses.savedMomentDeleted);
    } catch (error) {
      console.warn("Failed to delete memory moment", error);
      setMemoryStatus(t.statuses.savedMomentDeleteFailed);
    }
  };

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

      const nextMemoryProfile = {
        ...(memoryProfile ?? {}),
        name: trimmedName,
      };
      setMemoryProfile(nextMemoryProfile);
      if (memoryEnabled) {
        void persistMemoryProfile(user, nextMemoryProfile).catch((error) => {
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

    if (nextChatId !== undefined) {
      setCurrentChatId(nextChatId);
    }
  }, [user]);

  const getRequestIdentityContext = useCallback((): UserIdentityContext => ({
    ...identityContext,
    language: getStoredLanguage(),
  }), [identityContext]);

  const handleSelectChat = async (chatId: string) => {
    if (submitLockRef.current && currentChatId === chatId) {
      return;
    }

    const storedMessages = await loadChatMessages(chatId, user);
    setCurrentChatId(chatId);
    setMessages(storedMessages.map(({ role, content }) => ({ role, content })));
    setPendingMobileVisionRequest(null);
    pendingMobileVisionRequestRef.current = null;
  };

  const handleCreateChat = async () => {
    if (submitLockRef.current) {
      return;
    }

    const chatId = await createChatSession(user);
    setCurrentChatId(chatId);
    setMessages([]);
    setPendingMobileVisionRequest(null);
    pendingMobileVisionRequestRef.current = null;
    await refreshChatSessions(chatId);
  };

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
    let chatId = currentChatId;

    if (!chatId) {
      chatId = await createChatSession(user);
      setCurrentChatId(chatId);
    }

    return { chatId };
  }, [currentChatId, user]);

  const persistChatMessage = useCallback(async (chatId: string, message: StoredChatMessage) => {
    await saveChatMessage(chatId, message, user);
    await refreshChatSessions(chatId);
  }, [refreshChatSessions, user]);

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
      const requestIdentity = {
        ...request.identity,
        language: getStoredLanguage(),
      };

      if (imageBase64) {
        detectedEmotion = await detectEmotionFromImage(imageBase64);
        if (memoryEnabled) {
          void saveMemoryMoment(user, imageBase64)
            .then(async () => {
              const nextMoments = await loadMemoryMoments(user);
              setMemoryMoments(nextMoments);
            })
            .catch((error) => {
              console.warn("Failed to save memory moment", error);
            });
        }
      }

      lastMsgCountRef.current = request.history.length;
      const responseText = await sendMessage(
        request.history,
        imageBase64,
        detectedEmotion,
        memoryEnabled ? request.memoryProfile : null,
        requestIdentity,
      );
      speak(responseText);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      const nextHistory = [...request.history, aiMessage];
      setMood(nextMood);
      setMessages(nextHistory);
      void persistChatMessage(request.chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.warn("Failed to persist model reply", error);
      });
      void syncSmartChatTitle(request.chatId, nextHistory).catch((error) => {
        console.warn("Failed to update smart chat title", error);
      });
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
      mobileVisionProcessingRequestIdRef.current = null;

      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.value = "";
      }
    }
  };

  const handleMobileCameraOpen = () => {
    if (!pendingMobileVisionRequest || !mobileCameraInputRef.current) {
      return;
    }

    mobileCameraInputRef.current.value = "";

    const pendingRequest = pendingMobileVisionRequest;
    const handleFocus = () => {
      mobileCameraCancelTimeoutRef.current = window.setTimeout(() => {
        const hasSelectedFile = Boolean(mobileCameraInputRef.current?.files?.length);
        if (!hasSelectedFile) {
          void completePendingVisionRequest(pendingRequest);
        }
      }, 350);
    };

    window.addEventListener("focus", handleFocus, { once: true });
    mobileCameraInputRef.current.click();
  };

  const handleMobileCameraChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mobileCameraCancelTimeoutRef.current) {
      window.clearTimeout(mobileCameraCancelTimeoutRef.current);
      mobileCameraCancelTimeoutRef.current = null;
    }

    const request = pendingMobileVisionRequest;
    const file = event.target.files?.[0];

    if (!request) {
      event.target.value = "";
      return;
    }

    if (!file) {
      await completePendingVisionRequest(request);
      return;
    }

    try {
      const base64Image = await fileToBase64(file);
      await completePendingVisionRequest(request, base64Image);
    } catch (error) {
      console.warn("Mobile camera image processing failed", error);
      await completePendingVisionRequest(request);
    }
  };

  const containsVisionTrigger = (text: string) => {
    return VISION_TRIGGER_PATTERNS.some((pattern) => pattern.test(text));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userText = input.trim();
    if (!userText || submitLockRef.current) {
      return;
    }

    const mobile = isMobileDevice();
    const shouldUseVision = containsVisionTrigger(userText);

    await unlock();
    stop();
    stopListening();

    submitLockRef.current = true;
    setInput("");

    const requestIdentity = getRequestIdentityContext();
    const { chatId } = await ensureActiveChat();
    const userMessage: StoredChatMessage = {
      role: "user",
      content: userText,
      createdAt: Date.now(),
    };
    await persistChatMessage(chatId, userMessage);

    const nextHistory: ChatMessage[] = [...messages, { role: userMessage.role, content: userMessage.content }];
    setMessages(nextHistory);
    void syncSmartChatTitle(chatId, nextHistory).catch((error) => {
      console.warn("Failed to update smart chat title", error);
    });

    let nextMemoryProfile = memoryProfile;
    if (memoryEnabled) {
      nextMemoryProfile = deriveNextMemoryProfile(memoryProfile, userText);
      if (!nextMemoryProfile?.name) {
        nextMemoryProfile = {
          ...(nextMemoryProfile ?? {}),
          name: effectiveUserName,
        };
      }

      const shouldPersistMemory = hasExplicitMemoryInstruction(userText) || hasVisibleMemoryChange(memoryProfile, nextMemoryProfile);
      setMemoryProfile(nextMemoryProfile);

      if (shouldPersistMemory) {
        void persistMemoryProfile(user, nextMemoryProfile).catch((error) => {
          console.warn("Failed to persist memory profile", error);
        });
      }
    }

    if (mobile && shouldUseVision) {
      const pendingRequest = {
        id: ++mobileVisionRequestIdRef.current,
        chatId,
        history: nextHistory,
        memoryProfile: memoryEnabled ? nextMemoryProfile : null,
        identity: requestIdentity,
      };
      pendingMobileVisionRequestRef.current = pendingRequest;
      setPendingMobileVisionRequest(pendingRequest);
      submitLockRef.current = true;
      return;
    }

    try {
      setIsLoading(true);
      lastMsgCountRef.current = nextHistory.length;
      const base64Image = shouldUseVision ? await captureVisionFrame() : undefined;
      const detectedEmotion = base64Image ? await detectEmotionFromImage(base64Image) : undefined;
      if (base64Image && memoryEnabled) {
        void saveMemoryMoment(user, base64Image)
          .then(async () => {
            const nextMoments = await loadMemoryMoments(user);
            setMemoryMoments(nextMoments);
          })
          .catch((error) => {
            console.warn("Failed to save memory moment", error);
          });
      }
      const responseText = await sendMessage(
        nextHistory,
        base64Image,
        detectedEmotion,
        memoryEnabled ? nextMemoryProfile : null,
        requestIdentity,
      );
      speak(responseText);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      const finalHistory = [...nextHistory, aiMessage];
      setMood(nextMood);
      setMessages(finalHistory);
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
  const previewBaseScale = profileImageMeta
    ? Math.max(PROFILE_PREVIEW_SIZE / profileImageMeta.width, PROFILE_PREVIEW_SIZE / profileImageMeta.height)
    : 1;
  const previewWidth = profileImageMeta ? profileImageMeta.width * previewBaseScale * profileCropZoom : PROFILE_PREVIEW_SIZE;
  const previewHeight = profileImageMeta ? profileImageMeta.height * previewBaseScale * profileCropZoom : PROFILE_PREVIEW_SIZE;
  const previewMaxOffsetX = Math.max(0, (previewWidth - PROFILE_PREVIEW_SIZE) / 2);
  const previewMaxOffsetY = Math.max(0, (previewHeight - PROFILE_PREVIEW_SIZE) / 2);
  const previewOffsetX = (profileCropX / 100) * previewMaxOffsetX;
  const previewOffsetY = (profileCropY / 100) * previewMaxOffsetY;
  const headerGlassPillClass =
    "flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl shadow-[0_18px_42px_rgba(9,4,24,0.36)] overflow-visible";
  const headerControlButtonClass =
    "group relative isolate flex h-9 w-9 items-center justify-center rounded-full text-white/72 transition-all duration-300 hover:scale-110 hover:text-white hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/55";
  const activeHeaderControlButtonClass =
    "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white shadow-[0_0_24px_rgba(236,72,153,0.35),0_14px_32px_rgba(168,85,247,0.24)]";
  const headerTooltipClass =
    "pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full border border-white/12 bg-[#12091f]/92 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-white/78 opacity-0 shadow-[0_12px_28px_rgba(4,2,12,0.45)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100";
  const voiceButtonClass = `${headerControlButtonClass} ${!isMuted ? activeHeaderControlButtonClass : ""}`;
  const memoryButtonClass = `${headerControlButtonClass} ${memoryEnabled || memoryMenuOpen ? activeHeaderControlButtonClass : ""}`;
  const languageButtonClass = `${headerControlButtonClass} ${languageMenuOpen ? activeHeaderControlButtonClass : ""}`;
  const profileButtonClass = `${headerControlButtonClass} ${profileMenuOpen ? activeHeaderControlButtonClass : ""}`;
  const profileInitial = (profileName.trim() || effectiveUserName || "S").charAt(0).toUpperCase();
  const memoryEntries = buildMemoryEntries(memoryProfile, t.memoryEntryLabels);

  return (
    <div className="flex h-screen bg-purple-950 text-white overflow-hidden selection:bg-pink-500/30 relative" data-mood={mood}>
      {/* Animated Drifting Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-15%] left-[-20%] w-[75vw] h-[75vw] rounded-full mix-blend-screen filter blur-[120px] blob-drift-1"
          style={{ background: 'var(--mood-blob-1)' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[65vw] h-[65vw] rounded-full mix-blend-screen filter blur-[120px] blob-drift-2"
          style={{ background: 'var(--mood-blob-2)' }}
        />
        <div
          className="absolute top-[30%] left-[40%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[140px] blob-drift-3"
          style={{ background: 'var(--mood-blob-3)' }}
        />
      </div>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full bg-white/[0.05] border-r border-white/15 flex flex-col hidden md:flex backdrop-blur-3xl z-20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
          >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2 text-pink-400">
                <Heart className="w-5 h-5 fill-current" />
                <span className="font-semibold tracking-wide text-sm" style={{ fontFamily: "'Sour Gummy', cursive" }}>Saheli AI</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCreateChat()}
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:border-pink-400/40 hover:text-pink-200"
              >
                {t.sidebar.newChat}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs text-white/80 font-semibold uppercase tracking-wider mb-2">{t.sidebar.recentChats}</div>
              {chatSessions.length === 0 ? (
                <p className="p-2 text-sm text-white/40">{isGuest ? t.sidebar.noChatsGuest : t.sidebar.noChatsAccount}</p>
              ) : (
                chatSessions.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => void handleSelectChat(chat.id)}
                    className={`w-full text-left truncate p-2 rounded-lg transition-colors text-sm ${
                      currentChatId === chat.id
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isDefaultChatTitle(chat.title) ? t.chatTitles.newChat : chat.title}
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                aria-label={t.sidebar.signOut}
                className="flex items-center gap-2 text-white/80 font-semibold hover:text-pink-400 w-full p-2 rounded-lg hover:bg-white/5 transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                {t.sidebar.signOut}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full relative z-10" style={{ isolation: 'isolate' }}>
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/15 bg-white/[0.05] backdrop-blur-3xl sticky top-0 z-20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
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

          <div className={headerGlassPillClass}>
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
              className={voiceButtonClass}
            >
              <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                <span className="absolute h-8 w-8 rounded-full bg-white/15 blur-md" />
                <Sparkles className="h-4.5 w-4.5 text-rose-100/90 drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
              </span>
              {isMuted ? (
                <VolumeX className="h-4.5 w-4.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.24)]" />
              ) : (
                <Volume2 className="h-4.5 w-4.5 drop-shadow-[0_0_14px_rgba(255,204,229,0.55)]" />
              )}
              <span className={headerTooltipClass}>{isMuted ? t.header.voiceOff : t.header.voiceOn}</span>
            </button>

            <DropdownMenu open={memoryMenuOpen} onOpenChange={setMemoryMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t.header.memory}
                  className={memoryButtonClass}
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span className="absolute h-8 w-8 rounded-full bg-fuchsia-400/20 blur-md" />
                    <Sparkles className="h-4.5 w-4.5 text-fuchsia-200/90 drop-shadow-[0_0_16px_rgba(216,180,254,0.75)]" />
                  </span>
                  <Brain className="h-4.5 w-4.5 drop-shadow-[0_0_14px_rgba(216,180,254,0.65)]" />
                  <span className={headerTooltipClass}>{t.header.memory}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[min(26rem,calc(100vw-1rem))] rounded-[28px] border border-white/12 bg-[#140c27]/90 p-3 text-white shadow-[0_24px_60px_rgba(5,5,15,0.5)] backdrop-blur-3xl"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-white/35">{t.memoryMenu.title}</p>
                      <h3 className="mt-1 text-sm font-semibold text-white">{t.memoryMenu.heading}</h3>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-white/45">
                      {memoryEnabled ? t.common.on : t.common.off}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{t.memoryMenu.summaryTitle}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {memoryEnabled ? t.memoryMenu.summaryOn : t.memoryMenu.summaryOff}
                        </p>
                      </div>
                      <Switch checked={memoryEnabled} onCheckedChange={handleMemoryToggle} />
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{t.memoryMenu.visibleTitle}</p>
                        <p className="mt-1 text-xs text-white/45">{t.memoryMenu.visibleHint}</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                        {memoryEntries.length}
                      </div>
                    </div>

                    {memoryEntries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-white/40">
                        {t.memoryMenu.emptyVisible}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {memoryEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/85"
                          >
                            <span className="truncate">
                              <span className="text-white/45">{entry.label}:</span> {entry.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMemoryEntry(entry)}
                              className="rounded-full p-0.5 text-white/45 transition hover:bg-white/10 hover:text-pink-200"
                              aria-label={formatText(t.aria.deleteLabel, { label: entry.label })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{t.memoryMenu.savedMomentsTitle}</p>
                        <p className="mt-1 text-xs text-white/45">{t.memoryMenu.savedMomentsHint}</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                        {memoryMoments.length}
                      </div>
                    </div>

                    {memoryMoments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/40">
                        <ImageIcon className="mb-2 h-5 w-5" />
                        {t.memoryMenu.emptySavedMoments}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {memoryMoments.map((moment) => (
                          <div key={moment.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                            <button
                              type="button"
                              onClick={() => setSelectedMemoryImage(moment.imageDataUrl)}
                              className="block aspect-square w-full"
                            >
                              <img
                                src={moment.imageDataUrl}
                                alt={t.memoryMenu.savedMomentsTitle}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMemoryMoment(moment.id)}
                              className="absolute right-2 top-2 rounded-full bg-black/45 p-1 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-pink-500/70"
                              aria-label={t.aria.deleteSavedMoment}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {memoryStatus ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65">
                      {memoryStatus}
                    </div>
                  ) : null}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={languageMenuOpen} onOpenChange={setLanguageMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t.header.language}
                  className={languageButtonClass}
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span className="absolute h-8 w-8 rounded-full bg-cyan-300/20 blur-md" />
                    <Sparkles className="h-4.5 w-4.5 text-pink-100/90 drop-shadow-[0_0_16px_rgba(125,211,252,0.65)]" />
                  </span>
                  <Globe className="h-4.5 w-4.5 drop-shadow-[0_0_14px_rgba(125,211,252,0.55)]" />
                  <span className={headerTooltipClass}>{t.languageNames[language]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[min(18rem,calc(100vw-1.5rem))] rounded-3xl border border-white/12 bg-[#1b1131]/85 p-3 text-white shadow-[0_24px_60px_rgba(5,5,15,0.45)] backdrop-blur-3xl"
              >
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/35">{t.languageMenu.title}</p>
                  <p className="mt-1 text-sm text-white/75">{t.languageMenu.description}</p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("hinglish")}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      language === "hinglish"
                        ? "border-pink-400/40 bg-gradient-to-r from-purple-600/25 via-pink-600/20 to-purple-600/25 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{t.languageMenu.hinglishTitle}</div>
                      <div className="text-xs text-white/45">{t.languageMenu.hinglishDescription}</div>
                    </div>
                    {language === "hinglish" ? <Check className="h-4 w-4 text-pink-200" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("hindi")}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      language === "hindi"
                        ? "border-fuchsia-400/40 bg-fuchsia-500/14 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{t.languageMenu.hindiTitle}</div>
                      <div className="text-xs text-white/45">{t.languageMenu.hindiDescription}</div>
                    </div>
                    {language === "hindi" ? <Check className="h-4 w-4 text-fuchsia-200" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange("english")}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      language === "english"
                        ? "border-cyan-400/40 bg-cyan-500/14 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{t.languageMenu.englishTitle}</div>
                      <div className="text-xs text-white/45">{t.languageMenu.englishDescription}</div>
                    </div>
                    {language === "english" ? <Check className="h-4 w-4 text-cyan-200" /> : null}
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t.header.profile}
                  className={profileButtonClass}
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <span className="absolute h-8 w-8 rounded-full bg-amber-200/20 blur-md" />
                    <Sparkles className="h-4.5 w-4.5 text-amber-100/90 drop-shadow-[0_0_15px_rgba(253,230,138,0.75)]" />
                  </span>
                  <Avatar className="relative z-10 h-7 w-7 border border-white/15 shadow-[0_0_14px_rgba(255,244,214,0.35)]">
                    <AvatarImage src={profileDraftPhotoUrl || undefined} alt={effectiveUserName} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-amber-200/40 via-white/30 to-pink-300/35 text-[11px] font-semibold text-white">
                      {profileInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className={headerTooltipClass}>{t.header.profile}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[min(24rem,calc(100vw-1rem))] rounded-[28px] border border-white/12 bg-[#140c27]/90 p-3 text-white shadow-[0_24px_60px_rgba(5,5,15,0.5)] backdrop-blur-3xl"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border border-white/10 shadow-[0_10px_28px_rgba(236,72,153,0.18)]">
                      <AvatarImage src={profileDraftPhotoUrl || undefined} alt={effectiveUserName} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-base font-semibold text-white">
                        {profileInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{effectiveUserName}</p>
                      <p className="truncate text-xs text-white/45">{user?.email || t.profileMenu.guestMode}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-pink-200/75">
                        {isGuest ? t.profileMenu.localProfile : t.profileMenu.cloudProfile}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] uppercase tracking-[0.22em] text-white/40">{t.profileMenu.changeName}</label>
                      <input
                        type="text"
                        value={profileDraftName}
                        onChange={(event) => setProfileDraftName(event.target.value)}
                        placeholder={t.profileMenu.enterYourName}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/35 focus:bg-white/[0.08]"
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-[11px] uppercase tracking-[0.22em] text-white/40">{t.profileMenu.profilePic}</label>
                        <button
                          type="button"
                          onClick={() => profileImageInputRef.current?.click()}
                          className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition hover:border-pink-400/35 hover:text-white"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {t.common.upload}
                        </button>
                      </div>
                      <input
                        ref={profileImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileImageSelect}
                      />

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                        <div className="mx-auto h-[208px] w-[208px] overflow-hidden rounded-[28px] border border-white/10 bg-[#12091f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          {profilePreviewSource && profileImageMeta ? (
                            <div className="relative h-full w-full overflow-hidden">
                              <img
                                src={profilePreviewSource}
                                alt={t.profileMenu.profileCropPreviewAlt}
                                className="absolute max-w-none select-none"
                                style={{
                                  width: `${previewWidth}px`,
                                  height: `${previewHeight}px`,
                                  left: `${(PROFILE_PREVIEW_SIZE - previewWidth) / 2 + previewOffsetX}px`,
                                  top: `${(PROFILE_PREVIEW_SIZE - previewHeight) / 2 + previewOffsetY}px`,
                                }}
                              />
                            </div>
                          ) : profilePreviewSource ? (
                            <img
                              src={profilePreviewSource}
                              alt={t.profileMenu.profilePreviewAlt}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/12 to-pink-500/12 text-white/40">
                              <UserCircle2 className="h-16 w-16" />
                            </div>
                          )}
                        </div>

                        {profileImageSource ? (
                          <div className="mt-3 space-y-3">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/35">
                                <span>{t.profileMenu.zoom}</span>
                                <span>{profileCropZoom.toFixed(1)}x</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.1"
                                value={profileCropZoom}
                                onChange={(event) => setProfileCropZoom(Number(event.target.value))}
                                className="w-full accent-pink-400"
                              />
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/35">
                                <span>{t.profileMenu.horizontal}</span>
                                <span>{profileCropX}</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                step="1"
                                value={profileCropX}
                                onChange={(event) => setProfileCropX(Number(event.target.value))}
                                className="w-full accent-pink-400"
                              />
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/35">
                                <span>{t.profileMenu.vertical}</span>
                                <span>{profileCropY}</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                step="1"
                                value={profileCropY}
                                onChange={(event) => setProfileCropY(Number(event.target.value))}
                                className="w-full accent-pink-400"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {profileStatus ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65">
                        {profileStatus}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleSaveProfile()}
                      disabled={isSavingProfile}
                      className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(192,38,211,0.25)] transition hover:scale-[1.01] hover:from-purple-500 hover:to-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingProfile ? t.common.saving : t.profileMenu.saveProfile}
                    </button>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handlePasswordReset()}
                        disabled={!user?.email}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 transition hover:border-purple-400/30 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <KeyRound className="h-4 w-4" />
                        {t.profileMenu.changePassword}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80 transition hover:border-pink-400/30 hover:bg-white/[0.08] hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        {t.profileMenu.logout}
                      </button>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
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

        <div className="p-4 md:p-6 bg-gradient-to-t from-purple-950/90 to-transparent z-10">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white/[0.05] border border-purple-500/40 backdrop-blur-3xl rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
                className="flex-1 bg-transparent px-6 py-3.5 text-white placeholder-white/40 focus:outline-none font-sans focus:ring-0 neon-border-input border-none"
                style={{ fontSize: "15px" }}
              />
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? t.composer.stopListening : t.composer.voiceInput}
                className={`p-2 ml-1 rounded-full transition-all ${
                  isListening
                    ? "bg-pink-500/20 text-pink-400 animate-pulse"
                    : "bg-white/10 text-white/70 hover:text-white/90 hover:bg-white/15"
                }`}
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
              <button
                type="submit"
                aria-label={t.composer.sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-3 mr-2 transition-all"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 p-2.5 rounded-xl text-white neon-pulse-btn hover:scale-110 transition-transform disabled:opacity-50">
                  <Send className="w-5 h-5" />
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
                  onChange={handleMobileCameraChange}
                />
              </div>
            )}
            <div className="text-center mt-2 text-[10px] tracking-widest uppercase text-white/30">
              {t.composer.footer}
            </div>
          </div>
        </div>

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
