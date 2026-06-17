import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  Camera,
  ImagePlus,
  Mic,
  Send,
  Heart,
  X,
  Plus,
  Minus,
  Upload,
  
  ChevronLeft,
  ChevronRight,
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
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlignCenter,
} from "lucide-react";
import { auth, db, resetFirestorePersistence, storage } from "@/lib/firebase";
import { sendPasswordResetEmail, signOut, updatePassword, updateProfile } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadString, uploadBytes } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { toast } from "sonner";
import { sendMessage, detectChatMode, extractMemoryAI, type AIProvider, type AppLanguage, type ChatMessage, type EmotionLabel, type RealtimeAwarenessContext, type UserIdentityContext } from "@/lib/ai-service";
import {
  createChatSession,
  deleteChatSession,
  loadChatMessages,
  loadChatSessions,
  saveChatMessage,
  updateChatSessionTitle,
  getChatEmoji,
  saveTemporaryMemories,
  loadTemporaryMemories,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import ThemeTransitionOverlay from "../components/ThemeTransitionOverlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import SettingsPanel, { CustomColorPicker } from "../components/settings/SettingsPanel";
import MusicPlayerPanel from "../components/music/MusicPlayerPanel";
import FullscreenPlayer from "../components/music/FullscreenPlayer";
import type { JioSaavnSong } from "../../lib/musicService";
import { characterDb } from "../utils/indexedDb";

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

function getMoonDetails(date: Date) {
  const newMoonRef = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
  const diffMs = date.getTime() - newMoonRef.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const cycle = 29.530588853;
  const phase = (diffDays / cycle) % 1;
  const normalizedPhase = phase < 0 ? phase + 1 : phase;

  let moonPhaseName = "New Moon";
  let litPath = "";

  if (normalizedPhase < 0.05 || normalizedPhase > 0.95) {
    moonPhaseName = "New Moon";
    litPath = "";
  } else if (normalizedPhase >= 0.05 && normalizedPhase < 0.20) {
    moonPhaseName = "Waxing Crescent";
    litPath = "M16,2 A14,14 0 0,1 16,30 A9,14 0 0,1 16,2";
  } else if (normalizedPhase >= 0.20 && normalizedPhase < 0.30) {
    moonPhaseName = "First Quarter";
    litPath = "M16,2 A14,14 0 0,1 16,30 Z";
  } else if (normalizedPhase >= 0.30 && normalizedPhase < 0.45) {
    moonPhaseName = "Waxing Gibbous";
    litPath = "M16,2 A14,14 0 0,1 16,30 A7,14 0 0,0 16,2";
  } else if (normalizedPhase >= 0.45 && normalizedPhase < 0.55) {
    moonPhaseName = "Full Moon";
    litPath = "FULL";
  } else if (normalizedPhase >= 0.55 && normalizedPhase < 0.70) {
    moonPhaseName = "Waning Gibbous";
    litPath = "M16,2 A14,14 0 0,0 16,30 A7,14 0 0,1 16,2";
  } else if (normalizedPhase >= 0.70 && normalizedPhase < 0.80) {
    moonPhaseName = "Last Quarter";
    litPath = "M16,2 A14,14 0 0,0 16,30 Z";
  } else {
    moonPhaseName = "Waning Crescent";
    litPath = "M16,2 A14,14 0 0,0 16,30 A9,14 0 0,0 16,2";
  }

  return { name: moonPhaseName, litPath };
}

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
type SettingsSectionId = 
  | "personalization" | "character" | "memory" | "account" | "appearance" | "voice" | "about" | "realtime"
  | "color" | "customization" | "chat_memory" | "image_memory" | "memory_toggle"
  | "profile" | "password" | "logout" | "bestie_mentor" | "bond_progress" | "reset_memory"
  | "incognito" | "api_keys" | "music" | "studio_light";


// Canonical image map — single source of truth for character assets
const CHARACTER_IMAGE_MAP: Record<string, string> = {
  swara: "/butterfly.png",
  aarohi: "/Aarohi ✨.png",
  anvitha: "/Anvitha 🤎.png",
  kiyara: "/Kiyara 🌼.png",
  lavanya: "/Lavanya 💜.png",
  meher: "/Meher 🤎.png",
  nyra: "/Nyra 💙.png",
  suryanshi: "/Suryanshi 🌻.png",
  aelina: "/Aelina 💎.png",
  ruhi: "/Ruhi 🌸.png",
};

const CHARACTER_KEYS = ["swara", "aarohi", "anvitha", "kiyara", "lavanya", "meher", "nyra", "suryanshi", "aelina", "ruhi"];

const CHARACTER_LABELS: Record<string, string> = {
  swara: "Swara 🦋",
  aarohi: "Aarohi ✨",
  anvitha: "Anvitha 🤎",
  kiyara: "Kiyara 🌼",
  lavanya: "Lavanya 💜",
  meher: "Meher 🤎",
  nyra: "Nyra 💙",
  suryanshi: "Suryanshi 🌻",
  aelina: "Aelina 💎",
  ruhi: "Ruhi 🌸",
};

const CHARACTER_STYLE_OVERRIDES: Record<string, { scale: number; yOffset: number }> = {
  swara: { scale: 0.9, yOffset: 12 },
  aarohi: { scale: 1.0, yOffset: 0 },
  anvitha: { scale: 1.0, yOffset: 4 },
  kiyara: { scale: 1.02, yOffset: 0 },
  lavanya: { scale: 0.96, yOffset: 10 },
  meher: { scale: 0.97, yOffset: 8 },
  nyra: { scale: 0.98, yOffset: 6 },
  suryanshi: { scale: 0.98, yOffset: 6 },
  aelina: { scale: 0.98, yOffset: 6 },
  ruhi: { scale: 1.0, yOffset: 0 },
};

const getCharacterAdjustments = (id: string, customChar?: { scale?: number; xOffset?: number; yOffset?: number; brightness?: number; saturation?: number; contrast?: number }) => {
  try {
    const savedStr = window.localStorage.getItem(`saheli_char_adjustments_${id}`);
    if (savedStr) {
      const parsed = JSON.parse(savedStr);
      return {
        scale: parsed.scale ?? 1.0,
        xOffset: parsed.xOffset ?? 0,
        yOffset: parsed.yOffset ?? 0,
        brightness: parsed.brightness ?? (id === "swara" ? 90 : 100),
        saturation: parsed.saturation ?? (id === "swara" ? 102 : 100),
        contrast: parsed.contrast ?? (id === "swara" ? 101 : 100),
      };
    }
  } catch (e) {
    console.error("Failed to load character adjustments from localStorage:", e);
  }

  if (customChar) {
    return {
      scale: customChar.scale ?? 1.0,
      xOffset: customChar.xOffset ?? 0,
      yOffset: customChar.yOffset ?? 0,
      brightness: customChar.brightness ?? 100,
      saturation: customChar.saturation ?? 100,
      contrast: customChar.contrast ?? 100,
    };
  }

  const defaultOverride = CHARACTER_STYLE_OVERRIDES[id] || { scale: 1.0, yOffset: 0 };
  return {
    scale: defaultOverride.scale,
    xOffset: 0,
    yOffset: defaultOverride.yOffset,
    brightness: id === "swara" ? 90 : 100,
    saturation: id === "swara" ? 102 : 100,
    contrast: id === "swara" ? 101 : 100,
  };
};

const THEME_SLIDER_CARD_CLASSES: Record<string, { border: string; glow: string; text: string; buttonBg: string; buttonText: string }> = {
  pink: {
    border: "border-pink-500/30",
    glow: "rgba(255, 105, 180, 0.2)",
    text: "text-pink-200",
    buttonBg: "bg-pink-600 hover:bg-pink-700 hover:shadow-[0_0_15px_rgba(255,105,180,0.4)]",
    buttonText: "text-white"
  },
  yellow: {
    border: "border-yellow-400/35",
    glow: "rgba(255, 215, 0, 0.2)",
    text: "text-yellow-200",
    buttonBg: "bg-yellow-500 hover:bg-yellow-600 hover:shadow-[0_0_15px_rgba(255,215,0,0.4)]",
    buttonText: "text-black"
  },
  blue: {
    border: "border-cyan-400/35",
    glow: "rgba(0, 229, 255, 0.2)",
    text: "text-cyan-200",
    buttonBg: "bg-cyan-500 hover:bg-cyan-600 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]",
    buttonText: "text-black"
  },
  orchid: {
    border: "border-purple-500/35",
    glow: "rgba(213, 0, 249, 0.2)",
    text: "text-purple-200",
    buttonBg: "bg-purple-600 hover:bg-purple-700 hover:shadow-[0_0_15px_rgba(213,0,249,0.4)]",
    buttonText: "text-white"
  },
  peach: {
    border: "border-orange-400/35",
    glow: "rgba(255, 158, 125, 0.2)",
    text: "text-orange-200",
    buttonBg: "bg-orange-500 hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(255,158,125,0.4)]",
    buttonText: "text-white"
  },
  beige: {
    border: "border-amber-400/30",
    glow: "rgba(212, 184, 149, 0.15)",
    text: "text-amber-200",
    buttonBg: "bg-amber-600 hover:bg-amber-700 hover:shadow-[0_0_15px_rgba(212,184,149,0.3)]",
    buttonText: "text-white"
  },
  maroon: {
    border: "border-red-500/35",
    glow: "rgba(208, 28, 63, 0.2)",
    text: "text-red-200",
    buttonBg: "bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(208,28,63,0.4)]",
    buttonText: "text-white"
  },
  gemini: {
    border: "border-blue-500/35",
    glow: "rgba(74, 137, 255, 0.2)",
    text: "text-blue-200",
    buttonBg: "bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_15px_rgba(74,137,255,0.4)]",
    buttonText: "text-white"
  },
  custom: {
    border: "border-[rgba(var(--theme-primary-rgb),0.3)]",
    glow: "rgba(var(--theme-primary-rgb),0.2)",
    text: "text-[var(--theme-light)]",
    buttonBg: "bg-[var(--theme-primary)] hover:bg-[rgba(var(--theme-primary-rgb),0.85)] hover:shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.4)]",
    buttonText: "text-white"
  }
};

const renderSlider = (
  label: string,
  icon: React.ReactNode,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  isChanged: boolean,
  onReset: () => void,
  onDecrease: () => void,
  onIncrease: () => void,
  onChange: (val: number) => void,
  themeStyles: { border: string; glow: string; text: string; buttonBg: string; buttonText: string }
) => {
  return (
    <div className="space-y-1.5 bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 shadow-inner hover:border-white/10 transition duration-300">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-white/50">
        <span className="flex items-center gap-1">{icon} {label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold ${themeStyles.text.split(" ")[0]}`}>{value}{unit}</span>
          {isChanged && (
            <button
              type="button"
              onClick={onReset}
              className="p-0.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition duration-150 cursor-pointer flex items-center justify-center"
              title={`Restore Original ${label}`}
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrease}
          className="w-5 h-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/12 text-white/70 hover:text-white hover:border-white/20 active:scale-90 flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer shadow-sm"
          title={`Decrease ${label}`}
        >
          <Minus className="h-2.5 w-2.5 flex-shrink-0" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-grow w-full min-w-0 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer hover:bg-white/15 transition-all"
          style={{ accentColor: themeStyles.glow.includes("rgba") && !themeStyles.glow.includes("var") ? themeStyles.glow.replace(/,[^,]+\)$/, ", 1)") : "var(--theme-primary)" }}
        />
        <button
          type="button"
          onClick={onIncrease}
          className="w-5 h-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/12 text-white/70 hover:text-white hover:border-white/20 active:scale-90 flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer shadow-sm"
          title={`Increase ${label}`}
        >
          <Plus className="h-2.5 w-2.5 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};

const DEMO_TRACKS: JioSaavnSong[] = [
  {
    id: "demo-1",
    title: "Chill Ambient Journey",
    artist: "SoundHelix",
    album: "Demo Collection",
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=60",
    encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: "demo-2",
    title: "Focus Study Beats",
    artist: "SoundHelix",
    album: "Demo Collection",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=60",
    encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: "demo-3",
    title: "Deep Chillout Session",
    artist: "SoundHelix",
    album: "Demo Collection",
    image: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=150&auto=format&fit=crop&q=60",
    encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

function normalizeCharacterId(value: string | null | undefined) {
  if (!value) return "swara";
  if (value === "butterfly") return "swara";
  if (value.startsWith("char_")) return value;
  return CHARACTER_IMAGE_MAP[value] ? value : "swara";
}

function getStoredCharacterId(themeColor: string) {
  if (typeof window === "undefined") {
    return "swara";
  }
  let deletedIds: string[] = [];
  try {
    const savedDeleted = window.localStorage.getItem("saheli_deleted_default_characters");
    if (savedDeleted) deletedIds = JSON.parse(savedDeleted);
  } catch (e) {
    console.error(e);
  }

  const saved = window.localStorage.getItem(`saheli_selected_character_${themeColor}`);
  if (saved && !deletedIds.includes(normalizeCharacterId(saved))) {
    return normalizeCharacterId(saved);
  }
  // Default characters per theme color
  let ideal = "swara";
  if (themeColor === "yellow") ideal = "kiyara";
  else if (themeColor === "peach") ideal = "anvitha";
  else if (themeColor === "pink") ideal = "ruhi";
  else if (themeColor === "blue") ideal = "aelina";
  else if (themeColor === "orchid") ideal = "lavanya";
  else if (themeColor === "gemini") ideal = "nyra";
  else if (themeColor === "beige") ideal = "swara";
  else if (themeColor === "maroon") ideal = "aarohi";

  if (!deletedIds.includes(ideal)) return ideal;
  const order = ["swara", "aarohi", "anvitha", "kiyara", "lavanya", "meher", "nyra", "suryanshi", "aelina", "ruhi"];
  return order.find(id => !deletedIds.includes(id)) || "swara";
}

function getStoredThemeColor() {
  if (typeof window === "undefined") return "maroon";
  return window.localStorage.getItem("saheli_theme_color") || "maroon";
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
  onerror: ((event: any) => void) | null;
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

function useSpeechToText(onResult: (text: string, isFinal: boolean) => void, appLanguage: string = "hinglish"): SpeechToTextResult {
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
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Choose appropriate language locale
    if (appLanguage === "english") {
      recognition.lang = "en-US";
    } else if (appLanguage === "hindi") {
      recognition.lang = "hi-IN";
    } else {
      // Default / Hinglish
      recognition.lang = "hi-IN";
    }

    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      let hasFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          hasFinal = true;
        } else {
          interim = transcript;
        }
      }
      // Show interim text while speaking, replace with final when done
      onResultRef.current(finalTranscript || interim, hasFinal);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      if (event && event.error) {
        if (event.error === "not-allowed") {
          toast.error("Microphone access blocked. Please allow microphone permission in your browser settings.");
        } else if (event.error === "no-speech") {
          console.warn("No speech detected.");
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      } else {
        toast.error("Speech recognition failed.");
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.error("Speech recognition start failed:", err);
      toast.error("Could not start speech recognition.");
      setIsListening(false);
    }
  }, [isListening, stopListening, appLanguage]);

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
const ScrollFadeMessageItem = React.forwardRef<HTMLDivElement, { msg: ChatMessage; isNew: boolean; onImageClick?: (url: string) => void }>(
  function ScrollFadeMessageItem({ msg, isNew, onImageClick }, ref) {
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
        {msg.image && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-white/10 shadow-lg relative group cursor-pointer max-w-[320px]">
            <img
              src={msg.image}
              alt="Attached content"
              className="w-full h-auto object-cover max-h-[220px] transition-transform duration-500 ease-out group-hover:scale-105"
              onClick={() => {
                if (typeof onImageClick === "function") {
                  onImageClick(msg.image!);
                }
              }}
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
              <span className="text-white/80 text-[11px] font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                Click to view
              </span>
            </div>
          </div>
        )}
        {msg.content && msg.content.trim() !== "Please analyze this image carefully." && msg.content}
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
  onImageClick,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  lastMsgCount: number;
  typingLabel: string;
  onImageClick?: (url: string) => void;
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
          <ScrollFadeMessageItem 
            key={getMessageKey(msg, idx)} 
            msg={msg} 
            isNew={idx >= lastMsgCount} 
            onImageClick={onImageClick}
          />
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

const resolvedUrlCache = new Map<string, string>();

const THEME_HEX_COLORS: Record<string, string> = {
  pink: "#ff0078",
  yellow: "#FFD700",
  blue: "#00E5FF",
  orchid: "#D500F9",
  peach: "#FF9E7D",
  beige: "#D4B895",
  maroon: "#D01C3F",
  gemini: "#4A89FF",
};

const getCustomThemeStyles = (hex: string) => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Compute HSL to generate a beautifully lightened theme-light value
  const rNormal = r / 255;
  const gNormal = g / 255;
  const bNormal = b / 255;
  const max = Math.max(rNormal, gNormal, bNormal);
  const min = Math.min(rNormal, gNormal, bNormal);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNormal: h = (gNormal - bNormal) / d + (gNormal < bNormal ? 6 : 0); break;
      case gNormal: h = (bNormal - rNormal) / d + 2; break;
      case bNormal: h = (rNormal - gNormal) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const themeLight = `hsl(${hDeg}, ${sPct}%, 88%)`;

  return {
    "--theme-primary": `#${cleanHex}`,
    "--theme-primary-rgb": `${r}, ${g}, ${b}`,
    "--theme-glow": `rgba(${r}, ${g}, ${b}, 0.35)`,
    "--theme-glow-rgb": `${r}, ${g}, ${b}`,
    "--theme-border": `rgba(${r}, ${g}, ${b}, 0.22)`,
    "--theme-soft": `rgba(${r}, ${g}, ${b}, 0.1)`,
    "--theme-light": themeLight,
  } as React.CSSProperties;
};

const getCustomStagePalette = (color: string) => {
  const r = parseInt(color.slice(1, 3), 16) || 255;
  const g = parseInt(color.slice(3, 5), 16) || 0;
  const b = parseInt(color.slice(5, 7), 16) || 120;
  const rgb = `${r}, ${g}, ${b}`;
  return {
    aura: `radial-gradient(circle, rgba(${rgb}, 0.15) 0%, rgba(${rgb}, 0.06) 45%, transparent 70%)`,
    spotlight: `radial-gradient(ellipse at 50% 0%, rgba(${r}, ${g}, ${b === 120 && color === "#ff0078" ? 235 : b}, 0.28) 0%, rgba(${rgb}, 0.14) 25%, rgba(${rgb}, 0.02) 55%, transparent 75%)`,
    groundLight: `radial-gradient(ellipse at center, rgba(${rgb}, 0.3) 0%, rgba(${rgb}, 0.1) 45%, transparent 70%)`,
    ambient: `radial-gradient(ellipse at center, rgba(${rgb}, 0.05) 0%, rgba(${rgb}, 0.015) 50%, transparent 80%)`,
    feetGlow: `rgba(${rgb}, 0.15)`,
  };
};

export default function Chat() {
  const user = auth.currentUser;
  const isGuest = !user;
  const [language, setLanguage] = useState<LanguageOption>(() => getStoredLanguage());

  // Music System State
  const [isMusicPanelOpen, setIsMusicPanelOpen] = useState(false);
  const [isFullscreenPlayerOpen, setIsFullscreenPlayerOpen] = useState(false);
  const [isMusicMinimized, setIsMusicMinimized] = useState(false);
  const [currentMusicSong, setCurrentMusicSong] = useState<JioSaavnSong | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicCurrentTime, setMusicCurrentTime] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [musicQueue, setMusicQueue] = useState<JioSaavnSong[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSongRef = useRef<JioSaavnSong | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const queueRef = useRef<JioSaavnSong[]>([]);
  const queueIndexRef = useRef<number>(0);

  // Sync refs to prevent stale closure inside audio event handlers
  useEffect(() => {
    currentSongRef.current = currentMusicSong;
  }, [currentMusicSong]);

  useEffect(() => {
    isPlayingRef.current = isMusicPlaying;
  }, [isMusicPlaying]);

  useEffect(() => {
    queueRef.current = musicQueue;
  }, [musicQueue]);

  useEffect(() => {
    queueIndexRef.current = currentQueueIndex;
  }, [currentQueueIndex]);

  // Audio Playback Handlers & Initializer
  const playSongAtIndex = async (index: number) => {
    const queue = queueRef.current;
    const song = queue[index];
    if (!song) return;
    setCurrentQueueIndex(index);

    let playableUrl = song.encryptedMediaUrl;
    if (!song.id.startsWith("demo-")) {
      const cached = resolvedUrlCache.get(song.id);
      if (cached) {
        playableUrl = cached;
      } else {
        try {
          const response = await fetch(`/api/music?action=getsong&encryptedMediaUrl=${encodeURIComponent(song.encryptedMediaUrl)}`);
          const data = await response.json();
          if (data.streamUrl) {
            playableUrl = data.streamUrl;
            resolvedUrlCache.set(song.id, data.streamUrl);
          }
        } catch (err) {
          console.error("Error resolving queue song url:", err);
        }
      }
    }

    if (audioRef.current) {
      audioRef.current.src = playableUrl;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch((err) => {
          console.error("Playback failed for queue track:", err);
        });
    }
    setCurrentMusicSong(song);
  };

  const handlePlaySong = async (song: JioSaavnSong, addToQueue: boolean | JioSaavnSong[] = true) => {
    if (currentSongRef.current?.id === song.id) {
      handlePlayPause();
      return;
    }

    let playableUrl = song.encryptedMediaUrl;
    if (!song.id.startsWith("demo-")) {
      const cached = resolvedUrlCache.get(song.id);
      if (cached) {
        playableUrl = cached;
      } else {
        try {
          const response = await fetch(`/api/music?action=getsong&encryptedMediaUrl=${encodeURIComponent(song.encryptedMediaUrl)}`);
          const data = await response.json();
          if (data.streamUrl) {
            playableUrl = data.streamUrl;
            resolvedUrlCache.set(song.id, data.streamUrl);
          } else {
            throw new Error("No streamUrl returned from getsong api");
          }
        } catch (err) {
          console.error("Error resolving song:", err);
          toast.error("Failed to play live stream. Playing demo fallback.");
          const fallback = DEMO_TRACKS[Math.floor(Math.random() * DEMO_TRACKS.length)];
          void handlePlaySong(fallback, addToQueue);
          return;
        }
      }
    }

    if (audioRef.current) {
      audioRef.current.src = playableUrl;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch((err) => {
          console.error("Playback failed:", err);
        });
    }
    setCurrentMusicSong(song);

    if (Array.isArray(addToQueue)) {
      setMusicQueue(addToQueue);
      const existingIdx = addToQueue.findIndex((s) => s.id === song.id);
      setCurrentQueueIndex(existingIdx !== -1 ? existingIdx : 0);
    } else if (addToQueue) {
      const existingIdx = queueRef.current.findIndex((s) => s.id === song.id);
      if (existingIdx !== -1) {
        setCurrentQueueIndex(existingIdx);
      } else {
        const newQueue = [...queueRef.current, song];
        setMusicQueue(newQueue);
        setCurrentQueueIndex(newQueue.length - 1);
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !currentMusicSong) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch((err) => {
          console.error("Playback play failed:", err);
        });
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setMusicCurrentTime(time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setMusicVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleNextTrack = () => {
    const queue = queueRef.current;
    if (queue.length <= 1) return;
    const nextIndex = (queueIndexRef.current + 1) % queue.length;
    void playSongAtIndex(nextIndex);
  };

  const handlePrevTrack = () => {
    const queue = queueRef.current;
    if (queue.length <= 1) return;
    const prevIndex = (queueIndexRef.current - 1 + queue.length) % queue.length;
    void playSongAtIndex(prevIndex);
  };

  const triggerAiMusicPlay = async (query: string) => {
    try {
      const response = await fetch(`/api/music?action=search&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      let songToPlay: JioSaavnSong | null = null;
      if (data.songs && data.songs.length > 0) {
        songToPlay = data.songs[0];
      } else {
        const demoMatch = DEMO_TRACKS.find(t => 
          t.title.toLowerCase().includes(query.toLowerCase()) || 
          t.artist.toLowerCase().includes(query.toLowerCase())
        );
        if (demoMatch) {
          songToPlay = demoMatch;
        }
      }
      
      if (songToPlay) {
        void handlePlaySong(songToPlay, true);
        setIsMusicPanelOpen(true);
        setIsMusicMinimized(true);
      } else {
        console.warn("Could not find any song for query:", query);
        let suggestionText = "";
        try {
          const autoResponse = await fetch(`/api/music?action=autocomplete&query=${encodeURIComponent(query)}`);
          const autoData = await autoResponse.json();
          if (autoData.suggestions && autoData.suggestions.length > 0) {
            const firstSuggestion = autoData.suggestions[0];
            suggestionText = `Mujhe exact song nahi mil raha hai bestie... Tum "${firstSuggestion}" to nahi bol rahe? 🎵`;
          }
        } catch (autoErr) {
          console.error("Autocomplete search failed in fallback:", autoErr);
        }

        if (!suggestionText) {
          suggestionText = `Mujhe exact song nahi mil raha hai bestie... Ek baar spelling check karo ya koi aur song try karo! 🎵`;
        }

        const fallbackMessage = { role: "model" as const, content: suggestionText };
        setMessages((prev) => [...prev, fallbackMessage]);
        messagesRef.current = [...messagesRef.current, fallbackMessage];

        setLatestSaheliMessage(suggestionText);
        toast.error(suggestionText);

        const chatId = currentChatIdRef.current;
        if (chatId) {
          void persistChatMessage(chatId, {
            role: "model",
            content: suggestionText,
            createdAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("AI music play search failed:", err);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    audio.volume = musicVolume;

    const handleTimeUpdate = () => {
      setMusicCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setMusicDuration(audio.duration || 0);
    };

    const handleEnded = async () => {
      const queue = queueRef.current;
      const index = queueIndexRef.current;

      // If there are more songs manually queued ahead of us, play the next one
      if (index < queue.length - 1) {
        const nextIndex = index + 1;
        void playSongAtIndex(nextIndex);
        return;
      }

      // Otherwise we reached the end of the queue. Trigger autoplay!
      const currentSong = queue[index];
      if (currentSong && !currentSong.id.startsWith("demo-")) {
        try {
          const artistQuery = currentSong.artist.split(",")[0].split("&")[0].trim();
          if (artistQuery) {
            const response = await fetch(`/api/music?action=search&query=${encodeURIComponent(artistQuery)}`);
            const data = await response.json();

            if (data.songs && data.songs.length > 0) {
              const existingIds = new Set(queue.map(s => s.id));
              const recommended = data.songs.filter((s: JioSaavnSong) => !existingIds.has(s.id));

              if (recommended.length > 0) {
                const nextSong = recommended[0];
                const updatedQueue = [...queue, nextSong];
                setMusicQueue(updatedQueue);
                queueRef.current = updatedQueue;
                void playSongAtIndex(updatedQueue.length - 1);
                toast.info(`Autoplay: Playing related song "${nextSong.title}" by ${nextSong.artist} 🎵`);
                return;
              }
            }
          }
        } catch (err) {
          console.error("Autoplay failed:", err);
        }
      }

      setIsMusicPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audioRef.current = null;
    };
  }, []);

  // Pre-resolve next song in queue in background to minimize network latency
  useEffect(() => {
    if (!currentMusicSong || musicQueue.length <= 1) return;
    
    const nextIndex = (currentQueueIndex + 1) % musicQueue.length;
    const nextSong = musicQueue[nextIndex];
    if (nextSong && !nextSong.id.startsWith("demo-") && !resolvedUrlCache.has(nextSong.id)) {
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/music?action=getsong&encryptedMediaUrl=${encodeURIComponent(nextSong.encryptedMediaUrl)}`);
          const data = await response.json();
          if (data.streamUrl) {
            resolvedUrlCache.set(nextSong.id, data.streamUrl);
          }
        } catch (e) {
          console.error("Background pre-resolve failed:", e);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentMusicSong, musicQueue, currentQueueIndex]);
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [memoryEnabled, setMemoryEnabledState] = useState(true);
  const [memoryHydrated, setMemoryHydrated] = useState(false);
  const [selectedMemoryImage, setSelectedMemoryImage] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<React.ReactNode | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const askConfirmation = (title: string, description: string, onConfirm: () => void | Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      description,
      onConfirm: async () => {
        await onConfirm();
        setConfirmModal(null);
      }
    });
  };

  interface PendingDelete {
    type: "chat" | "image" | "clear-chat" | "clear-image";
    id?: string;
    chatItem?: any;
    imageItem?: any;
    clearedChats?: any[];
    clearedImages?: any[];
  }

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const commitPendingDeletes = async () => {
    // Read the latest state using functional state updates or simple check
    let currentPending: PendingDelete | null = null;
    setPendingDelete(prev => {
      currentPending = prev;
      return null;
    });

    if (!currentPending) return;

    try {
      if (currentPending.type === "chat" && currentPending.id) {
        await deleteMemoryChat(user, currentPending.id);
      } else if (currentPending.type === "image" && currentPending.id) {
        await deleteMemoryImage(user, currentPending.id);
      } else if (currentPending.type === "clear-chat") {
        await clearAllMemory(user, "chat");
      } else if (currentPending.type === "clear-image") {
        await clearAllMemory(user, "image");
      }
      await refreshMemoryState();
    } catch (error) {
      console.error("Failed to commit pending deletes:", error);
    }
  };

  const queuePendingDelete = async (newPending: PendingDelete) => {
    if (pendingDelete) {
      await commitPendingDeletes();
    }
    setPendingDelete(newPending);
  };

  const handleUndoDelete = async () => {
    setPendingDelete(null);
    setMemoryStatus(null);
    await refreshMemoryState();
  };
  const [incognitoMode, setIncognitoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_incognito_mode") === "true";
    }
    return false;
  });

  const handleIncognitoModeChange = useCallback((value: boolean) => {
    setIncognitoMode(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saheli_incognito_mode", String(value));
    }
  }, []);
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
  const [temporaryMemories, setTemporaryMemories] = useState<string[]>([]);
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
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [selectedCharacter, setSelectedCharacter] = useState(() => getStoredCharacterId(getStoredThemeColor()));
  const [isLiveSelectorActive, setIsLiveSelectorActive] = useState(false);
  const [livePreviewCharacter, setLivePreviewCharacter] = useState<string>("");
  const [secondaryPanelType, setSecondaryPanelType] = useState<"memory" | "settings" | null>(null);
  const [moodTint, setMoodTint] = useState("neutral");
  const [uploadedCharacters, setUploadedCharacters] = useState<{ id: string; name: string; url: string; timestamp: number; scale?: number; xOffset?: number; yOffset?: number }[]>([]);
  const [adjustingCharacter, setAdjustingCharacter] = useState<{
    id: string;
    name: string;
    url: string;
    scale: number;
    xOffset: number;
    yOffset: number;
    brightness: number;
    saturation: number;
    contrast: number;
    originalScale: number;
    originalXOffset: number;
    originalYOffset: number;
    originalBrightness: number;
    originalSaturation: number;
    originalContrast: number;
  } | null>(null);
  const dragControls = useDragControls();
  const [adjustingStudioLightOnly, setAdjustingStudioLightOnly] = useState(false);
  const [activeSlider, setActiveSlider] = useState<"left" | "right" | null>(null);


  const wasSidebarOpenRef = useRef(false);

  // Automatically hide sidebar when fullscreen music player or character adjustments panel is open
  useEffect(() => {
    if (isFullscreenPlayerOpen || adjustingCharacter) {
      wasSidebarOpenRef.current = isSidebarOpen;
      setIsSidebarOpen(false);
    } else {
      if (wasSidebarOpenRef.current) {
        setIsSidebarOpen(true);
      }
    }
  }, [isFullscreenPlayerOpen, adjustingCharacter]);

  const [adjustmentTab, setAdjustmentTab] = useState<"companion" | "light">("companion");
  const [spotlightSavedTrigger, setSpotlightSavedTrigger] = useState(false);
  const [studioLightAdjustments, setStudioLightAdjustments] = useState<{
    color: string;
    opacity: number;
    size: number;
    width: number;
    yOffset: number;
    xOffset: number;
    leftExpansion: number;
    rightExpansion: number;
    brightness: number;
    saturation: number;
    originalColor: string;
    originalOpacity: number;
    originalSize: number;
    originalWidth: number;
    originalYOffset: number;
    originalXOffset: number;
    originalLeftExpansion: number;
    originalRightExpansion: number;
    originalBrightness: number;
    originalSaturation: number;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("saheli_studio_light_adjustments");
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            color: parsed.color ?? "#ff0078",
            opacity: parsed.opacity ?? 100,
            size: parsed.size ?? 100,
            width: parsed.width ?? 100,
            yOffset: parsed.yOffset ?? 0,
            xOffset: parsed.xOffset ?? 0,
            leftExpansion: parsed.leftExpansion ?? 44,
            rightExpansion: parsed.rightExpansion ?? 44,
            brightness: parsed.brightness ?? 100,
            saturation: parsed.saturation ?? 100,
            originalColor: parsed.originalColor ?? parsed.color ?? "#ff0078",
            originalOpacity: parsed.originalOpacity ?? parsed.opacity ?? 100,
            originalSize: parsed.originalSize ?? parsed.size ?? 100,
            originalWidth: parsed.originalWidth ?? parsed.width ?? 100,
            originalYOffset: parsed.originalYOffset ?? parsed.yOffset ?? 0,
            originalXOffset: parsed.originalXOffset ?? parsed.xOffset ?? 0,
            originalLeftExpansion: parsed.originalLeftExpansion ?? parsed.leftExpansion ?? 44,
            originalRightExpansion: parsed.originalRightExpansion ?? parsed.rightExpansion ?? 44,
            originalBrightness: parsed.originalBrightness ?? parsed.brightness ?? 100,
            originalSaturation: parsed.originalSaturation ?? parsed.saturation ?? 100,
          };
        }
      } catch (e) {
        console.error("Error parsing studio light adjustments:", e);
      }
    }
    return {
      color: "#ff0078",
      opacity: 100,
      size: 100,
      width: 100,
      yOffset: 0,
      xOffset: 0,
      leftExpansion: 44,
      rightExpansion: 44,
      brightness: 100,
      saturation: 100,
      originalColor: "#ff0078",
      originalOpacity: 100,
      originalSize: 100,
      originalWidth: 100,
      originalYOffset: 0,
      originalXOffset: 0,
      originalLeftExpansion: 44,
      originalRightExpansion: 44,
      originalBrightness: 100,
      originalSaturation: 100,
    };
  });


  const [deletedDefaultIds, setDeletedDefaultIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("saheli_deleted_default_characters");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const refreshCustomCharacters = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("saheli_deleted_default_characters");
        setDeletedDefaultIds(saved ? JSON.parse(saved) : []);
      } catch (err) {
        console.error("Error loading deleted default characters:", err);
      }
    }
    if (!user) {
      setUploadedCharacters([]);
      return;
    }
    try {
      const chars = await characterDb.getCustomCharacters(user.uid);
      setUploadedCharacters(chars);
    } catch (err) {
      console.error("Error loading custom characters from IndexedDB:", err);
    }
  }, [user]);

  // Listen to active character from Firestore user document and load custom characters from IndexedDB
  useEffect(() => {
    if (!user) {
      setUploadedCharacters([]);
      return;
    }

    refreshCustomCharacters();

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activeCharacter) {
          setSelectedCharacter(data.activeCharacter);
        }
      }
    }, (error) => {
      console.error("Error listening to user document: ", error);
    });

    return () => unsubscribe();
  }, [user, refreshCustomCharacters]);

  const selectedCharacterRef = useRef(selectedCharacter);
  useEffect(() => {
    selectedCharacterRef.current = selectedCharacter;
  }, [selectedCharacter]);

  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "maroon";
    }
    return "maroon";
  });
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078";
    }
    return "#ff0078";
  });

  useEffect(() => {
    const isCustomized = typeof window !== "undefined" && window.localStorage.getItem("saheli_studio_light_customized") === "true";
    if (!isCustomized) {
      const defaultHex = THEME_HEX_COLORS[activeTheme] || (activeTheme === "custom" ? customColor : "#ff0078");
      setStudioLightAdjustments(prev => ({
        ...prev,
        color: defaultHex,
        originalColor: defaultHex,
      }));
    }
  }, [activeTheme, customColor]);
  const [targetTheme, setTargetTheme] = useState<string | null>(null);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [isDefocusActive, setIsDefocusActive] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      const color = window.localStorage.getItem("saheli_theme_color") || "maroon";
      if (color === "custom" && typeof window !== "undefined") {
        setCustomColor(window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078");
      }
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

  useEffect(() => {
    const handleLightChange = () => {
      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem("saheli_studio_light_adjustments");
          if (saved) {
            setStudioLightAdjustments(JSON.parse(saved));
            setSpotlightSavedTrigger(true);
            setTimeout(() => {
              setSpotlightSavedTrigger(false);
            }, 1200);
          }
        } catch (e) {
          console.error("Error syncing studio light adjustments:", e);
        }
      }
    };
    window.addEventListener("saheli_studio_light_changed", handleLightChange);
    return () => {
      window.removeEventListener("saheli_studio_light_changed", handleLightChange);
    };
  }, []);

  useEffect(() => {
    const isCustomActive = uploadedCharacters.some((c) => c.id === selectedCharacterRef.current);
    if (!isCustomActive) {
      setSelectedCharacter(getStoredCharacterId(activeTheme));
    }
  }, [activeTheme, uploadedCharacters]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const migrationKey = "saheli_character_defaults_migrated_v6";
      if (!window.localStorage.getItem(migrationKey)) {
        const themes = ["pink", "yellow", "blue", "orchid", "peach", "beige", "maroon", "gemini"];
        themes.forEach((t) => {
          window.localStorage.removeItem(`saheli_selected_character_${t}`);
        });
        window.localStorage.removeItem("saheli_selected_character");
        window.localStorage.setItem(migrationKey, "true");
        // Force refresh selected character to trigger default lookup
        const defaultChar = getStoredCharacterId(activeTheme);
        setSelectedCharacter(defaultChar);
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          setDoc(userDocRef, { activeCharacter: defaultChar }, { merge: true }).catch((err) => {
            console.error("Error migrating active character in Firestore:", err);
          });
        }
      }
    }
  }, [activeTheme, user]);

  useEffect(() => {
    const handleOpenLiveSelector = () => {
      setLivePreviewCharacter(selectedCharacter);
      setIsLiveSelectorActive(true);
    };

    window.addEventListener("saheli_open_live_character_selector", handleOpenLiveSelector);
    return () => {
      window.removeEventListener("saheli_open_live_character_selector", handleOpenLiveSelector);
    };
  }, [selectedCharacter]);

  useEffect(() => {
    const handleOpenStudioLightAdjustments = () => {
      const activeMascotKey = selectedCharacter;
      const customChar = uploadedCharacters.find((c) => c.id === activeMascotKey);
      const name = customChar ? customChar.name : (CHARACTER_LABELS[activeMascotKey] || activeMascotKey);
      const url = customChar ? customChar.url : (CHARACTER_IMAGE_MAP[activeMascotKey] || "/butterfly.png");
      const adjustments = getCharacterAdjustments(activeMascotKey, customChar);
      
      setAdjustingCharacter({
        id: activeMascotKey,
        name,
        url,
        scale: adjustments.scale,
        xOffset: adjustments.xOffset,
        yOffset: adjustments.yOffset,
        brightness: adjustments.brightness,
        saturation: adjustments.saturation,
        contrast: adjustments.contrast,
        originalScale: adjustments.scale,
        originalXOffset: adjustments.xOffset,
        originalYOffset: adjustments.yOffset,
        originalBrightness: adjustments.brightness,
        originalSaturation: adjustments.saturation,
        originalContrast: adjustments.contrast,
      });
      setAdjustmentTab("light");
      setAdjustingStudioLightOnly(true);
      setSettingsPanelOpen(false);
    };

    window.addEventListener("saheli_open_studio_light_adjustments", handleOpenStudioLightAdjustments);
    return () => {
      window.removeEventListener("saheli_open_studio_light_adjustments", handleOpenStudioLightAdjustments);
    };
  }, [selectedCharacter, uploadedCharacters]);


  const handleSlideCharacter = useCallback((direction: "next" | "prev") => {
    setLivePreviewCharacter((prev) => {
      const keys = [
        ...CHARACTER_KEYS.filter((id) => !deletedDefaultIds.includes(id)),
        ...uploadedCharacters.map((c) => c.id)
      ];
      const currentIndex = keys.indexOf(prev);
      if (currentIndex === -1) return keys[0] || "swara";
      
      let nextIndex;
      if (direction === "next") {
        nextIndex = (currentIndex + 1) % keys.length;
      } else {
        nextIndex = (currentIndex - 1 + keys.length) % keys.length;
      }
      return keys[nextIndex];
    });
  }, [uploadedCharacters, deletedDefaultIds]);
  
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
  }, []);

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

  // Ref to store input value at the moment the mic button is clicked
  const initialInputRef = useRef("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioVolume, setAudioVolume] = useState(0);

  // Speech-to-text: appends recognized speech to current input
  const { isListening, toggle: toggleMic, stopListening } = useSpeechToText(
    useCallback((speechText: string, isFinal: boolean) => {
      if (!isFinal) {
        setInterimTranscript(speechText);
      } else {
        setInterimTranscript(speechText);
        setInput(() => {
          const base = initialInputRef.current;
          if (!base) return speechText;
          const separator = base.endsWith(" ") ? "" : " ";
          return base + separator + speechText;
        });
      }
    }, []),
    language
  );

  const handleMicClick = () => {
    if (!isListening) {
      initialInputRef.current = input;
    }
    toggleMic();
  };

  // Web Audio API volume analyzer
  useEffect(() => {
    if (!isListening) {
      setAudioVolume(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId = 0;

    const startAnalyser = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          setAudioVolume(Math.min(1, average / 120));
          animationFrameId = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.warn("Could not start audio analyser for volume animation:", err);
      }
    };

    void startAnalyser();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (microphone) {
        microphone.disconnect();
      }
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (!isListening) {
      setInterimTranscript("");
    }
  }, [isListening]);



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
        const storedTempMemories = await loadTemporaryMemories(nextChatId, user);
        if (cancelled) {
          return;
        }

        const normalizedMessages = storedMessages.map(({ role, content }) => ({ role, content }));
        setCurrentChatId(nextChatId);
        setMessages(normalizedMessages);
        messagesRef.current = normalizedMessages;
        setTemporaryMemories(storedTempMemories);
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
    const chatId = currentChatIdRef.current;
    const isCurrentIncognito = chatId?.startsWith("incognito-");
    
    if (incognitoMode && !isCurrentIncognito) {
      const newIncognitoId = "incognito-" + Date.now();
      setCurrentChatId(newIncognitoId);
      currentChatIdRef.current = newIncognitoId;
      setMessages([]);
      messagesRef.current = [];
    } else if (!incognitoMode && isCurrentIncognito) {
      setCurrentChatId(null);
      currentChatIdRef.current = null;
      setMessages([]);
      messagesRef.current = [];
    }
  }, [incognitoMode]);

  useEffect(() => {
    if (!currentChatId || isGuest || !user?.uid || incognitoMode || currentChatId.startsWith("incognito-")) {
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
            image: typeof data.image === "string" ? data.image : undefined,
          } as ChatMessage;
        });

        if (realtimeMessages.length === 0 && messagesRef.current.length > 0) {
          return;
        }

        const hasLocalModelMessage = messagesRef.current.length > 0 && messagesRef.current[messagesRef.current.length - 1].role === "model";
        const hasRealtimeModelMessage = realtimeMessages.length > 0 && realtimeMessages[realtimeMessages.length - 1].role === "model";
        if (hasLocalModelMessage && !hasRealtimeModelMessage) {
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

  useEffect(() => {
    const handleRefresh = () => {
      void refreshMemoryState();
    };
    window.addEventListener("saheli_refresh_memory_state", handleRefresh);
    return () => {
      window.removeEventListener("saheli_refresh_memory_state", handleRefresh);
    };
  }, [refreshMemoryState]);

  const handleDeleteMemoryChat = async (messageId: string) => {
    askConfirmation("Delete Chat Memory", "Are you sure you want to delete this chat memory?", async () => {
      const chatItem = memoryProfile?.chat_history.find(c => c.id === messageId);
      if (!chatItem) return;

      await queuePendingDelete({
        type: "chat",
        id: messageId,
        chatItem
      });

      // Filter locally immediately
      setMemoryProfile(prev => prev ? {
        ...prev,
        chat_history: prev.chat_history.filter(c => c.id !== messageId)
      } : null);

      setMemoryStatus(
        <div className="flex items-center justify-between w-full">
          <span>Chat memory deleted.</span>
          <button
            type="button"
            onClick={() => void handleUndoDelete()}
            className="text-[var(--theme-light)] hover:text-white font-bold ml-2 underline transition cursor-pointer"
          >
            Undo
          </button>
        </div>
      );
    });
  };

  const handleDeleteMemoryImage = async (imageId: string) => {
    askConfirmation("Delete Image Memory", "Are you sure you want to delete this image memory?", async () => {
      const imageItem = memoryProfile?.images.find(img => img.id === imageId);
      if (!imageItem) return;

      await queuePendingDelete({
        type: "image",
        id: imageId,
        imageItem
      });

      // Filter locally immediately
      setMemoryProfile(prev => prev ? {
        ...prev,
        images: prev.images.filter(img => img.id !== imageId)
      } : null);

      if (selectedMemoryImage && imageItem.url === selectedMemoryImage) {
        setSelectedMemoryImage(null);
      }

      setMemoryStatus(
        <div className="flex items-center justify-between w-full">
          <span>Image memory deleted.</span>
          <button
            type="button"
            onClick={() => void handleUndoDelete()}
            className="text-[var(--theme-light)] hover:text-white font-bold ml-2 underline transition cursor-pointer"
          >
            Undo
          </button>
        </div>
      );
    });
  };

  const handleClearAllMemory = async (type?: "chat" | "image") => {
    let title = "Clear Memory";
    let confirmMsg = "Clear all memory (chats + images + facts + preferences)?";
    if (type === "chat") {
      title = "Clear Chat Memory";
      confirmMsg = "Clear all chat memory (chats + facts + preferences)?";
    } else if (type === "image") {
      title = "Clear Image Memory";
      confirmMsg = "Clear all image memory?";
    }

    askConfirmation(title, confirmMsg, async () => {
      if (type === "chat") {
        await queuePendingDelete({
          type: "clear-chat",
          clearedChats: memoryProfile?.chat_history || []
        });

        // Filter locally immediately
        setMemoryProfile(prev => prev ? {
          ...prev,
          chat_history: []
        } : null);

        setMemoryStatus(
          <div className="flex items-center justify-between w-full">
            <span>Chat memory cleared.</span>
            <button
              type="button"
              onClick={() => void handleUndoDelete()}
              className="text-[var(--theme-light)] hover:text-white font-bold ml-2 underline transition cursor-pointer"
            >
              Undo
            </button>
          </div>
        );
      } else if (type === "image") {
        await queuePendingDelete({
          type: "clear-image",
          clearedImages: memoryProfile?.images || []
        });

        // Filter locally immediately
        setMemoryProfile(prev => prev ? {
          ...prev,
          images: []
        } : null);
        setSelectedMemoryImage(null);

        setMemoryStatus(
          <div className="flex items-center justify-between w-full">
            <span>Image memory cleared.</span>
            <button
              type="button"
              onClick={() => void handleUndoDelete()}
              className="text-[var(--theme-light)] hover:text-white font-bold ml-2 underline transition cursor-pointer"
            >
              Undo
            </button>
          </div>
        );
      } else {
        await queuePendingDelete({
          type: "clear-chat",
          clearedChats: memoryProfile?.chat_history || []
        });
        setMemoryProfile(prev => prev ? {
          ...prev,
          chat_history: [],
          images: []
        } : null);
        setSelectedMemoryImage(null);
        setMemoryStatus(
          <div className="flex items-center justify-between w-full">
            <span>All memory cleared.</span>
            <button
              type="button"
              onClick={() => void handleUndoDelete()}
              className="text-[var(--theme-light)] hover:text-white font-bold ml-2 underline transition cursor-pointer"
            >
              Undo
            </button>
          </div>
        );
      }
    });
  };

  const handleCloseMemoryModal = async () => {
    setMemoryModalOpen(false);
    await commitPendingDeletes();
    setMemoryStatus(null);
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

  const handleChangePassword = useCallback(() => {
    if (!user) {
      toast.error("Please log in to change password. 🔒");
      return;
    }
    setIsPasswordModalOpen(true);
    setNewPassword("");
    setPasswordChangeError(null);
  }, [user]);

  const handleSubmitPasswordChange = async () => {
    if (!newPassword || newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters. 🔒");
      return;
    }

    // Check if user is logged in with social login providers (Google/GitHub)
    const isSocialLogin = user?.providerData?.some(
      (prov) => prov.providerId === "google.com" || prov.providerId === "github.com"
    );

    if (isSocialLogin) {
      setPasswordChangeError("You can only update your password for accounts created with email credentials. Password changes are not supported for Google or GitHub authentication.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(user!, newPassword.trim());
      toast.success("Password updated successfully! Key updated. 🔑");
      setIsPasswordModalOpen(false);
    } catch (error) {
      console.error("Password update failed", error);
      toast.error("Could not change password. Please re-login and try again.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
    if (incognitoMode) {
      console.log("👻 [MEMORY] Skipping image save in Incognito Mode");
      return;
    }

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
  }, [user, isGuest, incognitoMode]);

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

    if (incognitoMode || chatId.startsWith("incognito-")) {
      return true;
    }

    try {
      await updateChatSessionTitle(chatId, trimmedTitle, user);
      return true;
    } catch (error) {
      console.error("Failed to persist chat title update", error);
      await refreshChatSessions(chatId);
      throw error;
    }
  }, [refreshChatSessions, syncChatSessionsTitle, user, incognitoMode]);

  useEffect(() => {
    if (!currentChatId || isLoading || submitLockRef.current || incognitoMode) {
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

    if (incognitoMode) {
      handleIncognitoModeChange(false);
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
    const isCurrentIncognito = chatId?.startsWith("incognito-");

    if (!chatId || (incognitoMode && !isCurrentIncognito) || (!incognitoMode && isCurrentIncognito)) {
      if (incognitoMode) {
        chatId = "incognito-" + Date.now();
        setCurrentChatId(chatId);
        currentChatIdRef.current = chatId;
      } else {
        chatId = await createChatSession(user);
        setCurrentChatId(chatId);
        currentChatIdRef.current = chatId;
        await refreshChatSessions(chatId);
      }
    }

    return { chatId };
  }, [refreshChatSessions, routeChatId, user, incognitoMode]);

  const persistChatMessage = useCallback(async (chatId: string, message: StoredChatMessage) => {
    if (incognitoMode || chatId.startsWith("incognito-")) {
      storeAddMessage(chatId, message);
      return;
    }

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
  }, [storeAddMessage, user, incognitoMode]);

  const updateStreamingMessage = useCallback((chatId: string, newText: string) => {
    setMessages((prev) => {
      let next: ChatMessage[];
      if (!prev.length || prev[prev.length - 1].role !== "model") {
        next = [...prev, { role: "model", content: newText }];
      } else {
        const lastMessage = prev[prev.length - 1];
        const updatedMessage = { ...lastMessage, content: (lastMessage.content || "") + newText };
        next = [...prev.slice(0, -1), updatedMessage];
      }
      messagesRef.current = next;
      return next;
    });
    storeUpdateStreamingMessage(chatId, newText);
  }, [storeUpdateStreamingMessage]);

  const saveFinalMessage = useCallback((chatId: string, content: string) => {
    setMessages((prev) => {
      const next = [...prev];
      if (!next.length || next[next.length - 1].role !== "model") {
        next.push({ role: "model", content });
      } else {
        next[next.length - 1] = { ...next[next.length - 1], content };
      }
      messagesRef.current = next;
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
    let lastLength = 0;

    const handleChunk = (partialText: string) => {
      // On first chunk arrival, hide the typing animation so streaming text appears instantly
      if (!firstChunkReceivedRef.current) {
        firstChunkReceivedRef.current = true;
        setIsLoading(false);
      }

      // Intercept and strip music tags from the displayed text
      let cleanPartial = partialText;
      const tagIndex = partialText.indexOf("[MUSIC_");
      if (tagIndex !== -1) {
        cleanPartial = partialText.substring(0, tagIndex).trim();
      }

      const newText = cleanPartial.slice(lastLength);
      lastLength = cleanPartial.length;

      if (newText) {
        updateStreamingMessage(chatId, newText);
      }

      if (!didTriggerEarlyTts) {
        const preview = getStreamingTtsPreview(cleanPartial);
        if (preview) {
          didTriggerEarlyTts = true;
          if (!isTtsMuted) {
            void speakSaheli(preview);
          } else {
            stopSaheliSpeech();
          }
        }
      }

      onPartialText?.(cleanPartial);
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
        undefined,
        undefined,
        currentSongRef.current,
        isPlayingRef.current,
        temporaryMemories
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

      // Extract music tags
      const playMatch = responseText.match(/\[MUSIC_PLAY:\s*(.*?)\]/);
      const stopMatch = responseText.includes("[MUSIC_STOP]");

      // Clean tags
      const cleanResponseText = responseText
        .replace(/\[MUSIC_PLAY:\s*.*?\]/g, "")
        .replace(/\[MUSIC_STOP\]/g, "")
        .trim();

      if (playMatch) {
        const query = playMatch[1].trim();
        void triggerAiMusicPlay(query);
      } else if (stopMatch) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsMusicPlaying(false);
        setIsMusicPanelOpen(false);
      }

      saveFinalMessage(request.chatId, cleanResponseText);
      // Note: Image was already saved during capture, no need to save again
      if (imageBase64) {
        console.log("📝 [DEBUG] Mobile vision response completed (image already saved during capture)");
      }
      setIsLoading(false);
      const nextMood = detectMood(cleanResponseText);
      const aiMessage = { role: "model" as const, content: cleanResponseText };
      const nextHistory = [...request.history, aiMessage];
      setMood(nextMood);

      void generateFirstChatTitle(request.chatId, nextHistory, modelUsed).catch((error) => {
        console.error("Failed to update chat title (mobile vision)", error);
      });

      void persistChatMessage(request.chatId, {
        role: "model",
        content: cleanResponseText,
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
  const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.75): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleImageFileSelection = async (file: File) => {
    try {
      const compressedFile = await compressImage(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
        reader.readAsDataURL(compressedFile);
      });
      setSelectedImageValue(dataUrl);
    } catch (error) {
      console.error("Compression failed, using original file:", error);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
        reader.readAsDataURL(file);
      });
      setSelectedImageValue(dataUrl);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingActive(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await handleImageFileSelection(file);
    }
  };

  const handleAIMemoryExtraction = useCallback(async (chatId: string, history: ChatMessage[]) => {
    try {
      const result = await extractMemoryAI(history);
      if (!result.permanent.length && !result.temporary.length) {
        return;
      }

      console.log("🧠 [MEMORY EXTRACTION AI] Extracted:", result);

      // 1. Process permanent memories
      if (result.permanent.length) {
        setMemoryProfile((prev) => {
          const currentProfile = prev ?? createEmptyMemoryProfile();
          // Filter duplicates
          const newFacts = result.permanent.filter(fact => !currentProfile.facts.includes(fact));
          if (!newFacts.length) return currentProfile;

          const updatedFacts = [...newFacts, ...currentProfile.facts];
          const nextMemoryFields = {
            preferences: currentProfile.preferences,
            facts: updatedFacts,
          };

          // Re-generate chat_history dynamically so it updates instantly in the UI!
          const nextChatHistory = [
            ...nextMemoryFields.preferences.map((value, index) => ({
              id: `preference:${index}`,
              role: "user" as const,
              content: value,
              timestamp: new Date(0).toISOString(),
            })),
            ...nextMemoryFields.facts.map((value, index) => ({
              id: `fact:${index}`,
              role: "user" as const,
              content: value,
              timestamp: new Date(0).toISOString(),
            })),
          ];

          const updatedProfile = {
            ...currentProfile,
            ...nextMemoryFields,
            chat_history: nextChatHistory,
          };

          // Update store outside of render/state setter callback
          setTimeout(() => {
            setStoreMemory(updatedProfile);
          }, 0);

          // Persist globally to Firestore
          if (user) {
            void saveMemoryFields(user, nextMemoryFields, { skipAiFilter: true }).catch((err) => {
              console.error("Failed to save permanent memories to Firestore:", err);
            });
          }

          return updatedProfile;
        });
      }

      // 2. Process temporary memories
      if (result.temporary.length) {
        setTemporaryMemories((prev) => {
          const updated = [...result.temporary, ...prev];
          
          // Persist to DB or localStorage
          void saveTemporaryMemories(chatId, updated, user).catch((err) => {
            console.error("Failed to save temporary memories:", err);
          });
          
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to extract or save AI memory:", err);
    }
  }, [user, setMemoryProfile, setTemporaryMemories, setStoreMemory]);

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

    const attachedImageBase64 = selectedImageRef.current || undefined;

    const userMessage: StoredChatMessage = {
      role: "user",
      content: userText,
      createdAt: Date.now(),
      image: attachedImageBase64,
    };
    const optimisticUserMessage: ChatMessage = { 
      role: userMessage.role, 
      content: userMessage.content,
      image: attachedImageBase64,
    };
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


    if (memoryEnabled && !incognitoMode) {
      void handleAIMemoryExtraction(chatId, nextHistory);
    }

    const lastModelMessage = [...messagesRef.current].reverse().find(msg => msg.role === "model")?.content || "";
    const shouldUseVision = isVisionIntent(userText, lastModelMessage);
    if (mobile && shouldUseVision) {
      const pendingRequest: PendingMobileVisionRequest = {
        id: ++mobileVisionRequestIdRef.current,
        chatId,
        history: nextHistory,
        memoryProfile: memoryEnabled ? memoryProfile : null,
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

      if (attachedImageBase64) {
        base64Image = attachedImageBase64;
        setSelectedImageValue(null);
      } else if (shouldUseVision) {
        console.log("🎥 [DEBUG] Vision intent detected, capturing frame...");
        base64Image = await captureVisionFrame();
        console.log("🎥 [DEBUG] Frame captured", {
          success: !!base64Image,
          imageLength: base64Image?.length || 0,
        });
        if (base64Image && !incognitoMode) {
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
        memoryProfile,
        currentMode,
      );
      responseText = responseResult.text;
      const modelUsed = responseResult.modelUsed;
      lastModelUsedRef.current = modelUsed;

      // Extract music tags
      const playMatch = responseText.match(/\[MUSIC_PLAY:\s*(.*?)\]/);
      const stopMatch = responseText.includes("[MUSIC_STOP]");

      // Clean tags
      const cleanResponseText = responseText
        .replace(/\[MUSIC_PLAY:\s*.*?\]/g, "")
        .replace(/\[MUSIC_STOP\]/g, "")
        .trim();

      if (playMatch) {
        const query = playMatch[1].trim();
        void triggerAiMusicPlay(query);
      } else if (stopMatch) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsMusicPlaying(false);
        setIsMusicPanelOpen(false);
      }

      // Note: Image was already saved immediately after capture, no need to save again
      if (base64Image) {
        console.log("📝 [DEBUG] AI response completed for vision request (image already saved during capture)");
      }
      saveFinalMessage(chatId, cleanResponseText);
      setIsLoading(false);
      const nextMood = detectMood(cleanResponseText);
      const aiMessage = { role: "model" as const, content: cleanResponseText };
      const finalHistory = [...nextHistory, aiMessage];
      setMood(nextMood);

      void generateFirstChatTitle(chatId, finalHistory, modelUsed).catch((error) => {
        console.error("Failed to update chat title", error);
      });

      void persistChatMessage(chatId, {
        role: "model",
        content: cleanResponseText,
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
  const ghostModeNoChatsText = useMemo(() => {
    if (language === "hindi") {
      return "घोस्ट मोड सक्रिय है। इतिहास छिपा हुआ है। 👻";
    } else if (language === "hinglish") {
      return "Ghost Mode active hai. History hidden hai. 👻";
    } else {
      return "Ghost Mode active. History hidden. 👻";
    }
  }, [language]);

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

  const currentTimeDate = weatherPanelClockNow || new Date();
  const sunDetailsHour = weatherThemeOverride === "auto"
    ? currentTimeDate.getHours() + currentTimeDate.getMinutes() / 60
    : weatherThemeMode === "day"
      ? 12
      : 0;

  const getSunDetails = (hour: number) => {
    const start = 5.5; // 5:30 AM
    const end = 18.5; // 6:30 PM
    if (hour < start || hour > end) return null;
    
    const p = (hour - start) / (end - start); // progress from 0 (sunrise) to 1 (sunset)
    
    const left = 232;
    const top = 20;
    
    let sunClass = "";
    let rayColor = "";
    let glowColor = "";
    let raySize = "1.2";
    
    if (p < 0.25) {
      // Morning (reddish orange)
      sunClass = "from-red-500 via-orange-400 to-amber-300 shadow-[0_0_24px_rgba(239,68,68,0.7)]";
      rayColor = "rgba(249,115,22,0.25)";
      glowColor = "rgba(239,68,68,0.12)";
      raySize = "1.15";
    } else if (p < 0.75) {
      // Noon/Afternoon (bright yellow white)
      sunClass = "from-yellow-300 via-amber-100 to-white shadow-[0_0_36px_rgba(251,191,36,0.95),0_0_60px_rgba(255,255,255,0.5)]";
      rayColor = "rgba(251,191,36,0.45)";
      glowColor = "rgba(253,224,71,0.2)";
      raySize = "1.35";
    } else {
      // Evening/Sunset (orange crimson)
      sunClass = "from-orange-500 via-rose-500 to-red-600 shadow-[0_0_28px_rgba(239,68,68,0.85)]";
      rayColor = "rgba(239,68,68,0.3)";
      glowColor = "rgba(239,68,68,0.15)";
      raySize = "1.2";
    }
    
    return { left, top, sunClass, rayColor, glowColor, raySize };
  };
  const sunDetails = getSunDetails(sunDetailsHour);

  const moonDetails = useMemo(() => {
    return getMoonDetails(currentTimeDate);
  }, [currentTimeDate]);

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
  const isThunderstorm = [95, 96, 99].includes(awareness.weather?.weatherCode ?? -1) ||
    (awareness.weather?.condition?.toLowerCase().includes("storm") ?? false) ||
    (awareness.weather?.condition?.toLowerCase().includes("thunder") ?? false);

  const windSpeed = awareness.weather?.windSpeedKph ?? 0;
  const isStorm = windSpeed >= 40 || isThunderstorm;
  const isWindy = windSpeed >= 10 ||
    (awareness.weather?.condition?.toLowerCase().includes("wind") ?? false) ||
    (awareness.weather?.condition?.toLowerCase().includes("breeze") ?? false) ||
    isStorm;
  const windDuration = Math.max(1.2, Math.min(10, 60 / (windSpeed || 1)));
  const isPinkTheme = activeTheme === "pink";
  const isOrchidTheme = activeTheme === "orchid";
  const isMaroonTheme = activeTheme === "maroon";

  const THEME_STAGE_RGBS: Record<string, string> = {
    pink: "255, 0, 120",
    maroon: "208, 28, 63",
    yellow: "255, 215, 0",
    blue: "0, 229, 255",
    orchid: "213, 0, 249",
    peach: "255, 158, 125",
    beige: "212, 184, 149",
    gemini: "74, 137, 255",
  };

  const pinkStagePalette = {
    aura: "radial-gradient(circle, rgba(255, 0, 120, 0.15) 0%, rgba(255, 105, 180, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(255, 235, 245, 0.28) 0%, rgba(255, 0, 120, 0.15) 25%, rgba(124, 58, 237, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(255, 0, 120, 0.3) 0%, rgba(168, 85, 247, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(255, 0, 120, 0.05) 0%, rgba(168, 85, 247, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(25, 0, 10, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(255, 0, 120, 0.15)",
  };

  const yellowStagePalette = {
    aura: "radial-gradient(circle, rgba(255, 200, 0, 0.15) 0%, rgba(255, 120, 0, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 230, 0.28) 0%, rgba(255, 185, 0, 0.14) 25%, rgba(255, 90, 0, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(255, 185, 0, 0.3) 0%, rgba(255, 90, 0, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(255, 185, 0, 0.05) 0%, rgba(255, 90, 0, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(25, 15, 0, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(255, 185, 0, 0.15)",
  };

  const blueStagePalette = {
    aura: "radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, rgba(0, 150, 255, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(235, 250, 255, 0.28) 0%, rgba(0, 200, 255, 0.14) 25%, rgba(0, 80, 255, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(0, 229, 255, 0.3) 0%, rgba(0, 120, 255, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(0, 229, 255, 0.05) 0%, rgba(0, 120, 255, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(0, 15, 25, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(0, 229, 255, 0.15)",
  };

  const orchidStagePalette = {
    aura: "radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(124, 58, 237, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(255, 235, 255, 0.28) 0%, rgba(213, 0, 249, 0.15) 25%, rgba(124, 58, 237, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(213, 0, 249, 0.3) 0%, rgba(124, 58, 237, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(213, 0, 249, 0.05) 0%, rgba(124, 58, 237, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(20, 0, 25, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(213, 0, 249, 0.15)",
  };

  const peachStagePalette = {
    aura: "radial-gradient(circle, rgba(255, 158, 125, 0.15) 0%, rgba(255, 100, 80, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(255, 245, 240, 0.28) 0%, rgba(255, 140, 110, 0.14) 25%, rgba(255, 70, 70, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(255, 158, 125, 0.3) 0%, rgba(255, 90, 80, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(255, 158, 125, 0.05) 0%, rgba(255, 90, 80, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(25, 10, 5, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(255, 158, 125, 0.15)",
  };

  const beigeStagePalette = {
    aura: "radial-gradient(circle, rgba(212, 184, 149, 0.15) 0%, rgba(180, 140, 100, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(255, 250, 240, 0.28) 0%, rgba(212, 184, 149, 0.14) 25%, rgba(170, 130, 90, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(212, 184, 149, 0.3) 0%, rgba(170, 130, 90, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(212, 184, 149, 0.05) 0%, rgba(170, 130, 90, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(20, 15, 10, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(212, 184, 149, 0.15)",
  };

  const maroonStagePalette = {
    aura: "radial-gradient(circle, rgba(208, 28, 63, 0.15) 0%, rgba(120, 15, 30, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(255, 230, 235, 0.28) 0%, rgba(208, 28, 63, 0.14) 25%, rgba(120, 15, 30, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(208, 28, 63, 0.3) 0%, rgba(120, 15, 30, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(208, 28, 63, 0.05) 0%, rgba(120, 15, 30, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(25, 0, 5, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(208, 28, 63, 0.15)",
  };

  const geminiStagePalette = {
    aura: "radial-gradient(circle, rgba(74, 137, 255, 0.15) 0%, rgba(124, 58, 237, 0.06) 45%, transparent 70%)",
    spotlight: "radial-gradient(ellipse at 50% 0%, rgba(235, 245, 255, 0.28) 0%, rgba(74, 137, 255, 0.14) 25%, rgba(124, 58, 237, 0.02) 55%, transparent 75%)",
    groundLight: "radial-gradient(ellipse at center, rgba(74, 137, 255, 0.3) 0%, rgba(124, 58, 237, 0.1) 45%, transparent 70%)",
    ambient: "radial-gradient(ellipse at center, rgba(74, 137, 255, 0.05) 0%, rgba(124, 58, 237, 0.015) 50%, transparent 80%)",
    feetShadow: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(5, 10, 25, 0.08) 35%, transparent 80%)",
    feetGlow: "rgba(74, 137, 255, 0.15)",
  };

  const stagePalette = activeTheme === "pink" ? pinkStagePalette
    : activeTheme === "yellow" ? yellowStagePalette
    : activeTheme === "blue" ? blueStagePalette
    : activeTheme === "orchid" ? orchidStagePalette
    : activeTheme === "peach" ? peachStagePalette
    : activeTheme === "beige" ? beigeStagePalette
    : activeTheme === "maroon" ? maroonStagePalette
    : activeTheme === "custom" ? getCustomStagePalette(customColor)
    : geminiStagePalette;

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
    const nextChar = normalizeCharacterId(character);
    setSelectedCharacter(nextChar);
    if (CHARACTER_IMAGE_MAP[nextChar]) {
      window.localStorage.setItem(`saheli_selected_character_${activeTheme}`, nextChar);
      window.localStorage.setItem(SELECTED_CHARACTER_STORAGE_KEY, nextChar);
    }
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      setDoc(userDocRef, { activeCharacter: nextChar }, { merge: true }).catch((err) => {
        console.error("Error saving active character in Firestore:", err);
      });
    }
  }, [activeTheme, user]);
  const handleEditCharacterAdjustments = useCallback((char: { id: string; name: string; url: string; timestamp: number; scale?: number; xOffset?: number; yOffset?: number; brightness?: number; saturation?: number; contrast?: number }) => {
    handleCharacterChange(char.id);
    setSettingsPanelOpen(false);
    const adjustments = getCharacterAdjustments(char.id, char);
    setAdjustingCharacter({
      id: char.id,
      name: char.name,
      url: char.url,
      scale: adjustments.scale,
      xOffset: adjustments.xOffset,
      yOffset: adjustments.yOffset,
      brightness: adjustments.brightness,
      saturation: adjustments.saturation,
      contrast: adjustments.contrast,
      originalScale: adjustments.scale,
      originalXOffset: adjustments.xOffset,
      originalYOffset: adjustments.yOffset,
      originalBrightness: adjustments.brightness,
      originalSaturation: adjustments.saturation,
      originalContrast: adjustments.contrast,
    });
  }, [handleCharacterChange]);
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
  // Studio Light calculations
  const flareScale = spotlightSavedTrigger ? 1.4 : 1.0;
  const flareBrightness = spotlightSavedTrigger ? 2.5 : 1.0;
  const opacityVal = (studioLightAdjustments.opacity / 100) * flareBrightness;
  
  const lightColor = studioLightAdjustments.color || "#ff0078";
  const lightR = parseInt(lightColor.slice(1, 3), 16) || 255;
  const lightG = parseInt(lightColor.slice(3, 5), 16) || 0;
  const lightB = parseInt(lightColor.slice(5, 7), 16) || 120;
  const lightRgb = `${lightR}, ${lightG}, ${lightB}`;

  const customFeetShadow = `radial-gradient(ellipse at center, rgba(0, 0, 0, 0.95) 0%, rgba(${Math.round(lightR * 0.1)}, ${Math.round(lightG * 0.1)}, ${Math.round(lightB * 0.1)}, 0.08) 35%, transparent 80%)`;
  const customGroundLight = `radial-gradient(ellipse at center, rgba(${lightRgb}, ${0.3 * opacityVal}) 0%, rgba(${lightRgb}, ${0.1 * opacityVal}) 45%, transparent 70%)`;
  const customSpotlight = `radial-gradient(ellipse at 50% 0%, rgba(${lightR}, ${lightG}, ${lightB}, ${0.28 * opacityVal}) 0%, rgba(${lightRgb}, ${0.14 * opacityVal}) 25%, rgba(${lightRgb}, ${0.02 * opacityVal}) 55%, transparent 75%)`;
  const customAmbient = `radial-gradient(ellipse at center, rgba(${lightRgb}, ${0.05 * opacityVal}) 0%, rgba(${lightRgb}, ${0.015 * opacityVal}) 50%, transparent 80%)`;
  const customFeetGlow = `rgba(${lightRgb}, ${0.15 * opacityVal})`;

  const profileInitial = (profileName.trim() || effectiveUserName || "S").charAt(0).toUpperCase();

  const leftExpansionVal = studioLightAdjustments.leftExpansion ?? 44;
  const rightExpansionVal = studioLightAdjustments.rightExpansion ?? 44;
  const bottomWidthVal = leftExpansionVal + rightExpansionVal;
  const bottomCenterOffsetVal = (rightExpansionVal - leftExpansionVal) / 2;
  const coneHeightVal = 98 + (studioLightAdjustments.yOffset ?? 0);

  return (
    <div 
      className={`saheli-app-wrapper theme-${activeTheme} ${isDefocusActive ? "theme-transitioning" : ""} h-full w-full`}
      style={activeTheme === "custom" ? getCustomThemeStyles(customColor) : undefined}
    >
      <div
        className="chat-page-wrapper chat-screen-bg relative h-screen w-full overflow-hidden bg-[#000000] text-white selection:bg-pink-500/30"
        data-mood={mood}
        style={{ contain: "paint", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
      >
      <div ref={cursorRef} className="cursor-glow" />
      <CinematicAtmosphere layer="ambient" />
      
      <AnimatePresence>
        {isDraggingActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-6"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative flex flex-col items-center justify-center max-w-md w-full aspect-[4/3] rounded-[32px] border-2 border-dashed border-pink-500/50 bg-[#160d2b]/85 backdrop-blur-xl p-8 text-center shadow-[0_0_50px_rgba(236,72,153,0.35),inset_0_1px_2px_rgba(255,255,255,0.15)]"
            >
              <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-tr from-pink-500/10 to-purple-500/10 blur-2xl animate-pulse" />
              
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500/10 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.25)] mb-5">
                <Upload className="h-8 w-8 animate-bounce" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'Sour Gummy', cursive" }}>
                Drop image here! ✨
              </h3>
              
              <p className="text-sm text-white/60 leading-relaxed max-w-[280px]">
                Saheli will attach this image to your chat preview
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      
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
        chatSessions={incognitoMode ? [] : chatSessions}
        currentChatId={currentChatId}
        isGuest={isGuest}
        isLightMode={isSidebarLightMode}
        isTtsMuted={isTtsMuted}
        newChatLabel={t.sidebar.newChat}
        recentChatsLabel={t.sidebar.recentChats}
        noChatsGuestLabel={incognitoMode ? ghostModeNoChatsText : t.sidebar.noChatsGuest}
        noChatsAccountLabel={incognitoMode ? ghostModeNoChatsText : t.sidebar.noChatsAccount}
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
        className={`${(isSidebarOpen && isIdle) ? 'ghost-mode' : ''} ${settingsPanelOpen ? 'sidebar-deactivated' : ''}`}
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
                <AnimatePresence>
                  {incognitoMode && (
                    <motion.button
                      type="button"
                      onClick={() => {
                        handleIncognitoModeChange(false);
                        toast.info("Ghost Mode deactivated! Chats will be saved. ✨");
                      }}
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 20 }}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Ghost Mode Active (Click to disable)"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/45 px-3.5 text-[11px] font-semibold text-purple-200 shadow-[0_14px_30px_rgba(0,0,0,0.28),0_0_18px_rgba(168,85,247,0.15)] backdrop-blur-2xl transition duration-300 hover:border-purple-400/50 hover:bg-purple-900/60"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.25)] animate-pulse">
                        👻
                      </span>
                      <span className="whitespace-nowrap">Ghost Mode</span>
                    </motion.button>
                  )}
                </AnimatePresence>
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
                      {isRainy && !isThunderstorm && (
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

                      {isThunderstorm && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
                          <div className="absolute inset-0 bg-blue-100/30 opacity-0 animate-[weatherLightningFlash_6s_ease-out_infinite]" />
                          <div className="absolute inset-0 opacity-70">
                            {Array.from({ length: 18 }).map((_, i) => (
                              <div 
                                key={`storm-rain-${i}`}
                                className="absolute bg-gradient-to-b from-sky-200/30 to-sky-200/0 w-[1.5px]"
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  top: `-30px`,
                                  height: `${30 + Math.random() * 50}px`,
                                  animation: `weatherStormRainDrop ${0.35 + Math.random() * 0.2}s linear infinite`,
                                  animationDelay: `${Math.random() * 2}s`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Real Vector Clouds (fluffy cloud shapes, no smoky blur) */}
                      {isCloudy ? (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-55">
                          <svg 
                            viewBox="0 0 24 24" 
                            className="absolute top-2 w-[85px] h-[55px] animate-[weatherCloudMove_35s_linear_infinite]"
                            style={{ left: "-100px" }}
                          >
                            <defs>
                              <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.15)" />
                              </linearGradient>
                              <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(148, 163, 184, 0.45)" />
                                <stop offset="100%" stopColor="rgba(71, 85, 105, 0.2)" />
                              </linearGradient>
                            </defs>
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill={isThunderstorm || isRainy ? "url(#stormCloudGrad)" : "url(#cloudGrad)"} />
                          </svg>
                          <svg 
                            viewBox="0 0 24 24" 
                            className="absolute top-8 w-[110px] h-[70px] animate-[weatherCloudMove_48s_linear_infinite]"
                            style={{ left: "-130px", animationDelay: "4s" }}
                          >
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill={isThunderstorm || isRainy ? "url(#stormCloudGrad)" : "url(#cloudGrad)"} />
                          </svg>
                          <svg 
                            viewBox="0 0 24 24" 
                            className="absolute top-14 w-[65px] h-[45px] animate-[weatherCloudMove_26s_linear_infinite]"
                            style={{ left: "-80px", animationDelay: "10s" }}
                          >
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill={isThunderstorm || isRainy ? "url(#stormCloudGrad)" : "url(#cloudGrad)"} />
                          </svg>
                          <svg 
                            viewBox="0 0 24 24" 
                            className="absolute top-4 w-[95px] h-[60px] animate-[weatherCloudMove_42s_linear_infinite]"
                            style={{ left: "-110px", animationDelay: "16s" }}
                          >
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill={isThunderstorm || isRainy ? "url(#stormCloudGrad)" : "url(#cloudGrad)"} />
                          </svg>
                        </div>
                      ) : (
                        // Clear / Nirmal sky - very faint drift clouds
                        <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-20">
                          <svg 
                            viewBox="0 0 24 24" 
                            className="absolute top-3 w-[70px] h-[45px] animate-[weatherCloudMove_55s_linear_infinite]"
                            style={{ left: "-100px" }}
                          >
                            <defs>
                              <linearGradient id="cloudGradClear" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
                              </linearGradient>
                            </defs>
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="url(#cloudGradClear)" />
                          </svg>
                          <svg 
                            viewBox="0 0 24 24" 
                            className="absolute top-9 w-[55px] h-[35px] animate-[weatherCloudMove_75s_linear_infinite]"
                            style={{ left: "-90px", animationDelay: "12s" }}
                          >
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="url(#cloudGradClear)" />
                          </svg>
                        </div>
                      )}

                      {/* Dynamic Wind particles (Streaks, Leaves, Dust) with speed scaling */}
                      {isWindy && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen animate-none">
                          {Array.from({ length: isStorm ? 16 : 6 }).map((_, i) => {
                            const type = i % 3;
                            const delay = i * 0.35;
                            const topPercent = 15 + (i * 17) % 70;
                            
                            let childNode = null;
                            if (type === 0) {
                              childNode = <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-white/25 to-transparent" />;
                            } else if (type === 1) {
                              childNode = (
                                <svg width="8" height="6" viewBox="0 0 8 6" className="fill-emerald-500/40 opacity-70">
                                  <path d="M0,3 C2,0 6,0 8,3 C6,6 2,6 0,3 Z" />
                                </svg>
                              );
                            } else {
                              childNode = <div className="h-[1.5px] w-[1.5px] rounded-full bg-amber-600/30" />;
                            }
                            
                            return (
                              <div
                                key={`wind-particle-${i}`}
                                className="absolute pointer-events-none"
                                style={{
                                  top: `${topPercent}%`,
                                  left: `-50px`,
                                  animation: `weatherWindDrift ${windDuration}s linear infinite`,
                                  animationDelay: `${delay}s`,
                                  willChange: 'transform',
                                }}
                              >
                                {childNode}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {isFoggy && (
                        <div className="absolute inset-0 opacity-30 mix-blend-screen overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/20 to-white/5 w-[200%] animate-[weatherFog_10s_ease-in-out_infinite_alternate]" />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent h-[150%] animate-[weatherFogVertical_14s_ease-in-out_infinite_alternate]" style={{ animationDelay: '2s' }} />
                        </div>
                      )}
                      
                      {isHotWeather && !isRainy && !isThunderstorm && (
                        <div className="absolute inset-0 mix-blend-overlay opacity-30 bg-gradient-to-t from-orange-500/20 to-transparent animate-[weatherHeatShimmer_3s_ease-in-out_infinite_alternate]" />
                      )}
                      
                      {isSunset && !isRainy && !isFoggy && !isThunderstorm && (
                        <div className="absolute inset-0 mix-blend-screen opacity-40 bg-gradient-to-tr from-purple-500/20 via-orange-500/20 to-transparent" />
                      )}
                    </div>

                    {visualTheme === "night" ? (
                      <>
                        {isClearNight && (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(224,242,254,0.18)_0%,rgba(99,102,241,0.03)_60%,transparent_100%)] mix-blend-screen pointer-events-none" />
                        )}
                        <div className="absolute right-2 top-2 h-16 w-16 rounded-full bg-indigo-400/14 blur-2xl animate-[weatherMoonGlow_4s_ease-in-out_infinite_alternate]" />
                        
                        {/* Dynamically calculated Moon Phase (clean top right, no dots nearby) */}
                        {moonDetails.name !== "New Moon" && (
                          <div className="absolute right-6 top-5 pointer-events-none z-0 animate-[weatherMoonPulse_4s_ease-in-out_infinite_alternate]">
                            <svg width="32" height="32" viewBox="0 0 32 32">
                              <defs>
                                <radialGradient id="moonGlowGrad" cx="35%" cy="35%" r="65%">
                                  <stop offset="0%" stopColor="#ffffff" />
                                  <stop offset="50%" stopColor="#f1f5f9" />
                                  <stop offset="100%" stopColor="#bae6fd" />
                                </radialGradient>
                              </defs>
                              {/* Dark side silhouette */}
                              <circle cx="16" cy="16" r="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.5" />
                              {/* Glowing lit part */}
                              {moonDetails.litPath === "FULL" ? (
                                <circle cx="16" cy="16" r="14" fill="url(#moonGlowGrad)" />
                              ) : (
                                <path d={moonDetails.litPath} fill="url(#moonGlowGrad)" />
                              )}
                            </svg>
                          </div>
                        )}

                        {/* Twinkling Starfield across entire card, avoiding top-right moon area */}
                        {Array.from({ length: 15 }).map((_, index) => {
                          const right = 10 + (index * 17) % 268;
                          const top = 10 + (index * 23) % 180;
                          if (right > 200 && top < 60) return null;
                          return (
                            <span
                              key={`weather-star-field-${index}`}
                              className="absolute h-0.5 w-0.5 rounded-full bg-white/80 animate-[weatherTwinkle_4s_ease-in-out_infinite]"
                              style={{
                                right: `${right}px`,
                                top: `${top}px`,
                                animationDelay: `${index * 0.35}s`,
                              }}
                            />
                          );
                        })}

                        {/* Shooting Stars */}
                        <div className="absolute top-2 left-1/4 w-[1px] h-[1px] bg-gradient-to-r from-white to-transparent rotate-[35deg] animate-[weatherShootingStar_12s_linear_infinite] pointer-events-none" />
                        <div className="absolute top-12 left-1/2 w-[1px] h-[1px] bg-gradient-to-r from-white to-transparent rotate-[35deg] animate-[weatherShootingStar_15s_linear_infinite] pointer-events-none" style={{ animationDelay: "5s" }} />
                      </>
                    ) : (
                      <>
                        {sunDetails && (
                          <>
                            {/* Soft atmospheric sun glow spreading across the box */}
                            <div 
                              className="absolute inset-0 transition-all duration-1000 pointer-events-none z-0"
                              style={{
                                backgroundImage: `radial-gradient(circle at ${sunDetails.left + 16}px ${sunDetails.top + 16}px, ${sunDetails.glowColor} 0%, transparent 65%)`
                              }}
                            />
                            
                            {/* Dynamic Pulsating Sun Rays (smooth, no shake) */}
                            <div 
                              className="absolute h-8 w-8 rounded-full animate-[weatherSunRayPulse_8s_linear_infinite] pointer-events-none z-0"
                              style={{
                                left: `${sunDetails.left}px`,
                                top: `${sunDetails.top}px`,
                                background: sunDetails.rayColor,
                                filter: 'blur(8px)',
                                transform: `scale(${sunDetails.raySize}) translate3d(0,0,0)`,
                                willChange: 'transform'
                              }}
                            />

                            {/* Core Sun Body (smooth, no shake, real position) */}
                            <div 
                              className={`absolute h-8 w-8 rounded-full bg-gradient-to-br ${sunDetails.sunClass} animate-[weatherSunPulse_4s_ease-in-out_infinite] z-0`}
                              style={{
                                left: `${sunDetails.left}px`,
                                top: `${sunDetails.top}px`,
                                transform: 'translate3d(0,0,0)',
                                willChange: 'transform'
                              }}
                            />
                          </>
                        )}
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
                          <span className="text-right text-white/38">
                            {awareness.weather?.aqi !== undefined ? `AQI: ${awareness.weather.aqi} (${awareness.weather.aqiStatus})` : "AQI: --"}
                          </span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <AlertTriangle className={`h-3.5 w-3.5 ${awareness.weather?.activeAlert && awareness.weather?.activeAlert !== "No Active Alerts" ? "text-amber-400 animate-pulse" : "text-white/30"}`} />
                            <span className="shrink-0 text-white/34">Alerts</span>
                            <span className={`truncate ${awareness.weather?.activeAlert && awareness.weather?.activeAlert !== "No Active Alerts" ? "text-amber-300 font-medium" : "text-white/40"}`}>
                              {awareness.weather?.activeAlert || "No Active Alerts"}
                            </span>
                          </span>
                          <span className="text-right text-white/38">
                            {awareness.weather?.activeAlert && awareness.weather?.activeAlert !== "No Active Alerts" ? "Warning" : "Normal"}
                          </span>
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
              @keyframes weatherFog { 0% { transform: translateX(-30%); } 100% { transform: translateX(10%); } }
              @keyframes weatherFogVertical { 0% { transform: translateY(-20%); } 100% { transform: translateY(10%); } }
              @keyframes weatherHeatShimmer { 0% { opacity: 0.2; transform: scale(1); } 100% { opacity: 0.4; transform: scale(1.05); } }
              @keyframes weatherMoonGlow { 0% { transform: scale(1); opacity: 0.6; filter: blur(24px); } 100% { transform: scale(1.2); opacity: 0.9; filter: blur(32px); } }
              @keyframes weatherTwinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
              @keyframes weatherCloudMove { 0% { transform: translateX(0); } 100% { transform: translateX(450px); } }
              @keyframes weatherLightningFlash { 0%, 92%, 100% { opacity: 0; } 93% { opacity: 0.8; } 94% { opacity: 0.1; } 96% { opacity: 0.9; } 98% { opacity: 0; } }
              @keyframes weatherStormRainDrop { 0% { transform: translateY(0) rotate(18deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(320px) rotate(18deg); opacity: 0; } }
              @keyframes weatherWindDrift { 0% { transform: translate(0, 0) rotate(0deg); opacity: 0; } 15% { opacity: 0.5; } 50% { transform: translate(150px, 15px) rotate(90deg); } 85% { opacity: 0.5; } 100% { transform: translate(320px, -15px) rotate(180deg); opacity: 0; } }
              @keyframes weatherSunPulse { 0%, 100% { filter: drop-shadow(0 0 12px rgba(251,191,36,0.75)); } 50% { filter: drop-shadow(0 0 24px rgba(251,191,36,0.95)); } }
              @keyframes weatherSunRayPulse { 0% { transform: scale(1.1) rotate(0deg); opacity: 0.4; } 50% { transform: scale(1.3) rotate(180deg); opacity: 0.75; } 100% { transform: scale(1.1) rotate(360deg); opacity: 0.4; } }
              @keyframes weatherMoonPulse { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255,255,255,0.7)); } 50% { transform: scale(1.08); filter: drop-shadow(0 0 18px rgba(255,255,255,0.95)); } }
              @keyframes weatherShootingStar {
                0% { transform: translate3d(0, 0, 0) scale(0); opacity: 0; width: 0px; }
                5% { opacity: 1; width: 30px; }
                15% { transform: translate3d(120px, 80px, 0) scale(1); opacity: 0; width: 0px; }
                100% { transform: translate3d(120px, 80px, 0) scale(0); opacity: 0; }
              }
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
            opacity: 1, 
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
              <div className="rounded-full w-[45vw] h-[45vw] max-w-[600px] max-h-[600px]" style={{ background: stagePalette.aura, filter: "blur(50px)", transform: "translateY(-5%)" }} />
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
                    animate={{ y: [-12, 2, -12], scale: [1, 1.006, 1], rotateZ: [-0.5, 0.5, -0.5], x: parallaxOffset.x, marginTop: parallaxOffset.y }}
                    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full"
                  >
                    <AnimatePresence mode="wait">
                      {(() => {
                        const activeMascotKey = isLiveSelectorActive ? livePreviewCharacter : selectedCharacter;
                        const customChar = uploadedCharacters.find((c) => c.id === activeMascotKey);
                        const mascotSrc = customChar ? customChar.url : (CHARACTER_IMAGE_MAP[activeMascotKey] || "/butterfly.png");
                        
                        const mascotOverride = (adjustingCharacter && adjustingCharacter.id === activeMascotKey)
                          ? { 
                              scale: adjustingCharacter.scale, 
                              xOffset: adjustingCharacter.xOffset, 
                              yOffset: adjustingCharacter.yOffset,
                              brightness: adjustingCharacter.brightness ?? (activeMascotKey === "swara" ? 90 : 100),
                              saturation: adjustingCharacter.saturation ?? (activeMascotKey === "swara" ? 102 : 100),
                              contrast: adjustingCharacter.contrast ?? (activeMascotKey === "swara" ? 101 : 100),
                            }
                          : getCharacterAdjustments(activeMascotKey, customChar);

                        return (
                          <motion.img
                            key={activeMascotKey}
                            src={mascotSrc}
                            alt={`${activeMascotKey} Mascot`}
                            initial={{ opacity: 0, scale: mascotOverride.scale * 0.95, y: 6 + mascotOverride.yOffset, x: mascotOverride.xOffset }}
                            animate={{ opacity: 1, scale: mascotOverride.scale, y: -4 + mascotOverride.yOffset, x: mascotOverride.xOffset }}
                            exit={{ opacity: 0, scale: mascotOverride.scale * 0.95, y: 6 + mascotOverride.yOffset, x: mascotOverride.xOffset }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="w-full h-full"
                            style={{
                              objectFit: "contain",
                              objectPosition: "bottom center",
                              filter: `brightness(${mascotOverride.brightness}%) saturate(${mascotOverride.saturation}%) contrast(${mascotOverride.contrast}%) drop-shadow(0 10px 20px rgba(0,0,0,0.22))`
                            }}
                          />
                        );
                      })()}
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
                  background: customFeetShadow,
                  width: "55%", height: "16px", filter: "blur(5px)", bottom: "2%",
                  opacity: 0.9,
                  transition: "all 1.0s cubic-bezier(0.19, 1, 0.22, 1)",
                }} />

                {/* 2. Ground light — cinematic pink oval patch (softened) */}
                <div className="girl-ground-light" style={{
                  background: customGroundLight,
                  width: `${70 * (bottomWidthVal / 88) * flareScale}%`,
                  height: `${48 * (coneHeightVal / 100) * flareScale}px`,
                  filter: `blur(14px) brightness(${studioLightAdjustments.brightness ?? 100}%) saturate(${studioLightAdjustments.saturation ?? 100}%)`,
                  mixBlendMode: "screen", bottom: "-4%",
                  transform: `translateX(calc(-50% + ${bottomCenterOffsetVal * 4.2}px))`,
                  transition: adjustingStudioLightOnly ? "none" : "all 1.0s cubic-bezier(0.19, 1, 0.22, 1)",
                }} />

                {/* 1. Spotlight — bright top-center cinematic cone on girl (softened) */}
                <div className="girl-spotlight" style={{
                  background: "none",
                  width: `${100 * flareScale}%`,
                  height: `${100 * flareScale}%`,
                  filter: `blur(20px) brightness(${studioLightAdjustments.brightness ?? 100}%) saturate(${studioLightAdjustments.saturation ?? 100}%)`,
                  mixBlendMode: "screen", 
                  top: `calc(-24% + 0px)`,
                  transformOrigin: "top center",
                  transform: `translateX(-50%)`,
                  borderRadius: 0,
                  transition: adjustingStudioLightOnly ? "none" : "all 1.0s cubic-bezier(0.19, 1, 0.22, 1)",
                }}>
                  <div style={{
                    width: "100%",
                    height: "100%",
                    background: customSpotlight,
                    clipPath: `polygon(calc(50% - 12%) 0%, calc(50% + 12%) 0%, calc(50% + ${rightExpansionVal}%) ${coneHeightVal}%, calc(50% - ${leftExpansionVal}%) ${coneHeightVal}%)`,
                    transition: adjustingStudioLightOnly ? "none" : "all 1.0s cubic-bezier(0.19, 1, 0.22, 1)",
                  }} />
                </div>

                {/* 4. Ambient glow — cinematic depth around character (softened) */}
                <div className="girl-ambient-glow" style={{
                  background: customAmbient,
                  filter: `blur(30px) brightness(${studioLightAdjustments.brightness ?? 100}%) saturate(${studioLightAdjustments.saturation ?? 100}%)`,
                  mixBlendMode: "screen", 
                  width: `${75 * (bottomWidthVal / 88) * flareScale}%`,
                  height: `${75 * (coneHeightVal / 100) * flareScale}%`,
                  transform: `translateX(calc(-50% + ${bottomCenterOffsetVal * 2}px))`,
                  transition: adjustingStudioLightOnly ? "none" : "all 1.0s cubic-bezier(0.19, 1, 0.22, 1)",
                }} />
              </div>

              {/* The Feet Shadow */}
              <motion.div
                className="relative z-[4] rounded-[50%] -mt-14"
                style={{
                  width: '360px',
                  height: '36px',
                  background: 'rgba(0,0,0,0.72)',
                  filter: 'blur(9px)',
                  boxShadow: `0 0 16px rgba(0,0,0,0.8), 0 0 24px ${customFeetGlow}`,
                  transition: "all 1.0s cubic-bezier(0.19, 1, 0.22, 1)",
                }}
                animate={{ 
                  scale: [1.08, 0.95, 1.08], 
                  opacity: [0.65, 0.85, 0.65] 
                }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
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
              onImageClick={(imgUrl) => setLightboxImage(imgUrl)}
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
            className={`saheli-composer-container relative mx-auto flex flex-col justify-end transition-all duration-300 ${
              input.trim() ? "scale-[1.01]" : ""
            }`}
            style={{
              width: "min(100%, 860px)",
              transform: "translateY(-28px)",
              borderRadius: "24px",
              minHeight: "68px",
              height: "auto",
              paddingTop: selectedImage ? "12px" : "10px",
              paddingBottom: "10px",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            {/* Pop-up inside the form to guarantee perfect centering above the text box */}
            <AnimatePresence>
              {modeSwitchNotification && (() => {
                const isMentor = modeSwitchNotification.toLowerCase().includes("mentor");
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%", filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: "-50%", filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -5, scale: 0.95, x: "-50%", filter: "blur(3px)" }}
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
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95, x: "-50%", filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: "-50%", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, scale: 0.95, x: "-50%", filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute -top-[52px] left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-2xl border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(var(--theme-primary-rgb),0.15)] z-50 whitespace-nowrap w-auto max-w-[90%]"
                >
                  {/* Visual Audio Waveform */}
                  <div className="flex items-center gap-1 h-5">
                    {[...Array(6)].map((_, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-gradient-to-t from-[var(--theme-primary)] to-[var(--theme-light)] shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.6)] animate-mic-wave-bar"
                        style={{
                          height: "6px",
                          animationDelay: `${i * 0.12}s`,
                          animationDuration: audioVolume > 0.05 ? `${0.45 / (audioVolume + 0.1)}s` : "1.2s",
                          transform: `scaleY(${1 + audioVolume * (4.5 + Math.sin(i * 1.5) * 2)})`,
                          transformOrigin: "center",
                          transition: "transform 0.075s ease-out",
                        }}
                      />
                    ))}
                  </div>

                  {/* Live Transcribing Text / Interim Preview */}
                  <div className="text-xs text-white/90 font-medium overflow-hidden text-ellipsis max-w-[240px] italic tracking-wide">
                    {interimTranscript || "Sun rahi hu..."}
                  </div>
                  
                  {/* Subtle red recording dot */}
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Gemini/ChatGPT-style Image Preview block inside the form */}
            {selectedImage && (
              <div className="w-full flex items-center justify-start mb-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative group p-1 bg-[#1b0a2d]/80 backdrop-blur-xl border border-pink-500/20 rounded-full flex items-center gap-3 pr-4 shadow-lg pl-1.5">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-pink-500/30">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col text-left justify-center">
                    <span className="text-[11px] font-semibold text-white/95 leading-tight">Image Attachment</span>
                    <span className="text-[9px] text-pink-300/80 font-medium leading-none">Ready to send</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedImageValue(null)}
                    className="ml-2 bg-white/5 hover:bg-red-500/25 border border-white/10 hover:border-red-500/30 text-white/75 hover:text-white p-1.5 rounded-full transition-all duration-200"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
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

            {/* Row wrapper for composer controls */}
            <div className="flex items-center w-full gap-2.5 h-[48px]">
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
                <DropdownMenuContent 
                  align="start" 
                  className="border border-white/15 bg-white/5 backdrop-blur-2xl text-white shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(var(--theme-primary-rgb),0.15)] rounded-2xl p-1.5 min-w-[150px] overflow-hidden"
                >
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] rounded-xl cursor-pointer transition-all duration-200 focus:bg-white/10 focus:text-white hover:bg-white/10 hover:text-white outline-none font-medium"
                    onSelect={() => {
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
                        })
                        .catch((error) => {
                          const message = error instanceof Error ? error.message : "Camera access nahi mila. Please allow camera and try again.";
                          toast.error(message, { duration: 5000 });
                        });
                    }}
                  >
                    <Camera className="h-4 w-4 text-[var(--theme-light)]" />
                    Camera
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] rounded-xl cursor-pointer transition-all duration-200 focus:bg-white/10 focus:text-white hover:bg-white/10 hover:text-white outline-none font-medium"
                    onSelect={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    <ImagePlus className="h-4 w-4 text-[var(--theme-light)]" />
                    Gallery
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] rounded-xl cursor-pointer transition-all duration-200 focus:bg-white/10 focus:text-white hover:bg-white/10 hover:text-white outline-none font-medium"
                    onSelect={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 text-[var(--theme-light)]" />
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
                  onClick={handleMicClick}
                  aria-label={isListening ? t.composer.stopListening : t.composer.voiceInput}
                  className="saheli-composer-btn"
                >
                  <Mic className={`w-4 h-4 ${isListening ? "text-pink-300" : ""}`} />
                </button>
                <button
                  type="submit"
                  aria-label={t.composer.sendMessage}
                  disabled={(!(input.trim() || selectedImage) || isLoading)}
                  className="saheli-composer-btn saheli-send-btn group/send"
                >
                  <svg className="w-5 h-5 transition-all duration-300 group-hover/send:scale-110 active:scale-95 group-hover/send:rotate-[6deg]" viewBox="0 0 24 24" fill="none">
                    {/* Translucent Wings */}
                    <path d="M12 12C9 7 5 7 5 10c0 4 4 6 7 2M12 12c3-5 7-5 7-2 0 4-4 6-7 2" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 12c-2 2-6 2-6-1 0-3 3-4 6 1M12 12c2 2 6 2 6-1 0-3-3-4-6 1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Solid Heart Core */}
                    <path d="M12 17.5c-4-3.5-6-5.5-6-7.5 0-2.2 1.8-4 4-4 1.3 0 2.5.8 3 2 .5-1.2 1.7-2 3-2 2.2 0 4 1.8 4 4 0 2-2 4-6 7.5z" fill="currentColor" />
                    {/* Sparkle Center */}
                    <path d="M12 9.5l0.4 1.1 1.1 0.4-1.1 0.4-0.4 1.1-0.4-1.1-1.1-0.4 1.1-0.4z" fill="#ffffff" />
                  </svg>
                </button>
              </div>
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
          uploadedCharacters={uploadedCharacters}
          onRefreshUploadedCharacters={refreshCustomCharacters}
          onEditCharacterAdjustments={handleEditCharacterAdjustments}
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
          onOpenMusicSystem={() => {
            setIsMusicPanelOpen(true);
            setIsMusicMinimized(false);
          }}
          incognitoMode={incognitoMode}
          onIncognitoModeChange={handleIncognitoModeChange}
        />

        <MemoryModal
          open={memoryModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              void handleCloseMemoryModal();
            } else {
              setMemoryModalOpen(true);
            }
          }}
          memory={memoryProfile}
          status={memoryStatus}
          onToggleMemory={(enabled) => handleMemoryToggle(enabled)}
          onDeleteChat={(messageId) => void handleDeleteMemoryChat(messageId)}
          onDeleteImage={(imageId) => void handleDeleteMemoryImage(imageId)}
          onClearAll={(type) => void handleClearAllMemory(type)}
          onPreviewImage={(url) => setSelectedMemoryImage(url)}
          onBack={() => {
            void handleCloseMemoryModal();
            setSettingsPanelOpen(true);
            setActiveSettingsSection("memory");
          }}
        />

        <Dialog open={confirmModal?.isOpen ?? false} onOpenChange={(open) => { if (!open) setConfirmModal(null); }}>
          <DialogContent 
            overlayClassName="z-[105] bg-black/40 backdrop-blur-[8px]"
            className={`z-[110] flex flex-col w-[min(26rem,calc(100vw-2rem))] overflow-hidden p-6 text-white !outline-none border ${THEME_SLIDER_CARD_CLASSES[activeTheme]?.border || THEME_SLIDER_CARD_CLASSES.pink.border}`}
            style={{
              background: "rgba(10, 10, 12, 0.45)",
              backdropFilter: "blur(30px)",
              boxShadow: `0 25px 50px rgba(0, 0, 0, 0.65), 0 0 35px ${THEME_SLIDER_CARD_CLASSES[activeTheme]?.glow || "rgba(255, 0, 120, 0.15)"}, inset 0 1px 0 rgba(255,255,255,0.1)`,
              borderRadius: "28px"
            }}
          >
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                {confirmModal?.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60 mt-2 leading-relaxed">
                {confirmModal?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmModal?.onConfirm()}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.25)] ${THEME_SLIDER_CARD_CLASSES[activeTheme]?.buttonBg || THEME_SLIDER_CARD_CLASSES.pink.buttonBg} ${THEME_SLIDER_CARD_CLASSES[activeTheme]?.buttonText || THEME_SLIDER_CARD_CLASSES.pink.buttonText}`}
              >
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <MusicPlayerPanel
          isOpen={isMusicPanelOpen}
          onClose={() => {
            setIsMusicPanelOpen(false);
            if (audioRef.current) {
              audioRef.current.pause();
            }
            setIsMusicPlaying(false);
          }}
          currentSong={currentMusicSong}
          isPlaying={isMusicPlaying}
          currentTime={musicCurrentTime}
          duration={musicDuration}
          volume={musicVolume}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onPlaySong={(song, customQueue) => void handlePlaySong(song, customQueue || true)}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          onToggleFullscreen={() => setIsFullscreenPlayerOpen(true)}
          musicQueue={musicQueue}
          currentQueueIndex={currentQueueIndex}
          isMinimized={isMusicMinimized}
          onMinimizeToggle={setIsMusicMinimized}
          onPlaySongAtIndex={(idx) => void playSongAtIndex(idx)}
        />

        <FullscreenPlayer
          isOpen={isFullscreenPlayerOpen}
          onClose={() => setIsFullscreenPlayerOpen(false)}
          currentSong={currentMusicSong}
          isPlaying={isMusicPlaying}
          currentTime={musicCurrentTime}
          duration={musicDuration}
          volume={musicVolume}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          musicQueue={musicQueue}
          currentQueueIndex={currentQueueIndex}
          onPlaySongAtIndex={(idx) => void playSongAtIndex(idx)}
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

        {isLiveSelectorActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-40 overflow-hidden">
            <div className="relative flex items-center justify-center w-full max-w-[520px] h-[520px]" style={{ transform: "translateY(-25px)" }}>
              {(() => {
                const themeStyles = THEME_SLIDER_CARD_CLASSES[activeTheme] || THEME_SLIDER_CARD_CLASSES.pink;
                const hoverBgMap: Record<string, string> = {
                  pink: "hover:bg-pink-500/20 hover:border-pink-500/30",
                  yellow: "hover:bg-yellow-500/20 hover:border-yellow-500/35",
                  blue: "hover:bg-cyan-500/20 hover:border-cyan-400/35",
                  orchid: "hover:bg-purple-500/20 hover:border-purple-500/35",
                  peach: "hover:bg-orange-500/20 hover:border-orange-400/35",
                  beige: "hover:bg-amber-500/20 hover:border-amber-400/30",
                  maroon: "hover:bg-red-500/20 hover:border-red-500/35",
                  gemini: "hover:bg-blue-500/20 hover:border-blue-500/35",
                };
                const arrowHover = hoverBgMap[activeTheme] || hoverBgMap.pink;

                return (
                  <>
                    {/* Left Slide Arrow */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlideCharacter("prev");
                      }}
                      className={`absolute left-[-20px] md:left-[-60px] z-[50] p-3.5 rounded-full border border-white/10 bg-[#0f0a15]/80 text-white hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center pointer-events-auto cursor-pointer ${arrowHover}`}
                      style={{
                        boxShadow: `0 12px 28px rgba(0,0,0,0.4), 0 0 15px ${themeStyles.glow}`
                      }}
                      aria-label="Previous character"
                    >
                      <ChevronLeft className={`h-6 w-6 ${themeStyles.text}`} />
                    </button>

                    {/* Right Slide Arrow */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlideCharacter("next");
                      }}
                      className={`absolute right-[-20px] md:right-[-60px] z-[50] p-3.5 rounded-full border border-white/10 bg-[#0f0a15]/80 text-white hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center pointer-events-auto cursor-pointer ${arrowHover}`}
                      style={{
                        boxShadow: `0 12px 28px rgba(0,0,0,0.4), 0 0 15px ${themeStyles.glow}`
                      }}
                      aria-label="Next character"
                    >
                      <ChevronRight className={`h-6 w-6 ${themeStyles.text}`} />
                    </button>

                    {/* Done/Exit control panel */}
                    <div 
                      className={`absolute bottom-[-75px] z-[50] flex items-center gap-3.5 px-5 py-3 rounded-2xl border ${themeStyles.border} bg-[#0c0616]/75 backdrop-blur-[35px] saturate-[180%] pointer-events-auto animate-fade-in`}
                      style={{
                        fontFamily: "'Outfit', 'Inter', sans-serif",
                        boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 30px ${themeStyles.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.12)`
                      }}
                    >
                      {(() => {
                        const customPreviewChar = uploadedCharacters.find((c) => c.id === livePreviewCharacter);
                        const companionDisplayName = customPreviewChar ? customPreviewChar.name : (CHARACTER_LABELS[livePreviewCharacter] || "Custom companion");
                        return (
                          <>
                            <div className="flex flex-col min-w-[125px] select-none text-left">
                              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Previewing</span>
                              <span className={`text-sm font-bold transition-colors duration-300 ${themeStyles.text}`}>
                                {companionDisplayName}
                              </span>
                            </div>
                            <div className="h-7 w-[1px] bg-white/10" />
                            <button
                              type="button"
                              onClick={() => {
                                handleCharacterChange(livePreviewCharacter);
                                setIsLiveSelectorActive(false);
                                toast.success(`Character updated to ${companionDisplayName}!`);
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.25)] ${themeStyles.buttonBg} ${themeStyles.buttonText}`}
                            >
                              Done
                            </button>
                          </>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLiveSelectorActive(false);
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer"
                      >
                        Exit
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Floating Image Adjustment Panel */}
      <AnimatePresence>
        {adjustingCharacter && (() => {
          const themeStyles = THEME_SLIDER_CARD_CLASSES[activeTheme] || THEME_SLIDER_CARD_CLASSES.pink;
          const hoverBgMap = {
            pink: "hover:bg-pink-500/10 hover:border-pink-500/30 text-pink-300",
            yellow: "hover:bg-yellow-500/10 hover:border-yellow-500/30 text-yellow-300",
            blue: "hover:bg-cyan-500/10 hover:border-cyan-500/30 text-cyan-300",
            orchid: "hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-300",
            peach: "hover:bg-orange-500/10 hover:border-orange-500/30 text-orange-300",
            beige: "hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-300",
            maroon: "hover:bg-red-500/10 hover:border-red-500/30 text-red-300",
            gemini: "hover:bg-blue-500/10 hover:border-blue-500/30 text-blue-300",
            custom: "hover:bg-[rgba(var(--theme-primary-rgb),0.1)] hover:border-[rgba(var(--theme-primary-rgb),0.3)] text-[var(--theme-light)]",
          };
          const themeHoverClasses = hoverBgMap[activeTheme as keyof typeof hoverBgMap] || hoverBgMap.pink;
          
          return (
            <motion.div
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.1}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-[100] w-full max-w-[540px] px-4 pointer-events-auto"
            >
              <div
                className={`rounded-[28px] border ${themeStyles.border} bg-[#0c0616]/92 backdrop-blur-[40px] p-6 text-white flex flex-col gap-4 relative overflow-hidden`}
                style={{
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                  boxShadow: `0 24px 60px rgba(0,0,0,0.8), 0 0 40px ${themeStyles.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.12)`
                }}
              >
                {/* Header */}
                <div 
                  onPointerDown={(e) => dragControls.start(e)}
                  className="flex items-center justify-between border-b border-white/10 pb-3 cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className={`h-4.5 w-4.5 ${themeStyles.text.split(" ")[0]} animate-pulse`} />
                    <span className="text-sm font-bold tracking-tight">
                      {adjustingStudioLightOnly ? "Studio Light Adjustments" : `Adjust companion: ${adjustingCharacter.name}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStudioLightAdjustments(prev => ({
                        ...prev,
                        color: prev.originalColor,
                        opacity: prev.originalOpacity,
                        size: prev.originalSize,
                        leftExpansion: prev.originalLeftExpansion,
                        rightExpansion: prev.originalRightExpansion,
                        yOffset: prev.originalYOffset,
                      }));
                      setAdjustingCharacter(null);
                      setAdjustingStudioLightOnly(false);
                      setActiveSlider(null);
                      toast.info("Adjustments discarded.");
                    }}
                    className="p-1 rounded-full hover:bg-white/10 transition text-white/50 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Controls Layout */}
                {adjustingStudioLightOnly ? (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                    {/* Position Suite for Studio Light */}
                    <div className="sm:col-span-5 flex flex-col border-r border-white/5 pr-4 min-h-[260px]">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Positioning Suite</span>
                        {(studioLightAdjustments.leftExpansion !== studioLightAdjustments.originalLeftExpansion ||
                          studioLightAdjustments.rightExpansion !== studioLightAdjustments.originalRightExpansion ||
                          studioLightAdjustments.yOffset !== studioLightAdjustments.originalYOffset) && (
                          <button
                            type="button"
                            onClick={() => {
                              setStudioLightAdjustments(prev => ({
                                ...prev,
                                leftExpansion: prev.originalLeftExpansion,
                                rightExpansion: prev.originalRightExpansion,
                                yOffset: prev.originalYOffset,
                              }));
                              toast.info("Position adjustments reset.");
                            }}
                            className="flex items-center gap-1 text-[9px] font-bold text-white/60 hover:text-white transition duration-200 cursor-pointer"
                          >
                            <RotateCcw className="h-2.5 w-2.5" /> Reset
                          </button>
                        )}
                      </div>

                      {/* Centered Controls Area */}
                      <div className="flex-grow flex flex-col items-center justify-center gap-3 w-full py-1.5 my-auto">
                        {/* Joystick D-pad */}
                        <div className={`relative ${activeSlider ? "w-24 h-24" : "w-36 h-36"} bg-[#150d22] rounded-full border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 transition-all duration-300`}>
                          {/* Up Arrow - Shrink Bottom (Moves Bottom Up, reduces height) */}
                          <button
                            type="button"
                            onClick={() => setStudioLightAdjustments(prev => ({ ...prev, yOffset: Math.max(-100, prev.yOffset - 5) }))}
                            className={`absolute ${activeSlider ? "top-0.5 p-1.5" : "top-1.5 p-2.5"} rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200 cursor-pointer active:scale-90`}
                            title="Shrink Height (Move Up)"
                          >
                            <ArrowUp className={activeSlider ? "h-4 w-4" : "h-5 w-5"} />
                          </button>
                          
                          {/* Left Arrow - Adjust Left Expansion */}
                          <button
                            type="button"
                            onClick={() => setActiveSlider("left")}
                            className={`absolute ${activeSlider ? "left-0.5 p-1.5" : "left-1.5 p-2.5"} rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200 cursor-pointer active:scale-90`}
                            title="Stretch Bottom Left"
                          >
                            <ArrowLeft className={activeSlider ? "h-4 w-4" : "h-5 w-5"} />
                          </button>
                          
                          {/* Center Alignment Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setStudioLightAdjustments(prev => {
                                const maxVal = Math.max(prev.leftExpansion ?? 44, prev.rightExpansion ?? 44);
                                return {
                                  ...prev,
                                  leftExpansion: maxVal,
                                  rightExpansion: maxVal
                                };
                              });
                              toast.info("Studio light aligned to matching width.");
                            }}
                            className={`${activeSlider ? "p-2" : "p-3"} rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white/80 active:scale-90 transition-all duration-200 cursor-pointer ${themeHoverClasses.split(" ")[2]}`}
                            title="Align Sides Equally"
                          >
                            <AlignCenter className={activeSlider ? "h-4 w-4" : "h-5 w-5"} />
                          </button>
                          
                          {/* Right Arrow - Adjust Right Expansion */}
                          <button
                            type="button"
                            onClick={() => setActiveSlider("right")}
                            className={`absolute ${activeSlider ? "right-0.5 p-1.5" : "right-1.5 p-2.5"} rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200 cursor-pointer active:scale-90`}
                            title="Stretch Bottom Right"
                          >
                            <ArrowRight className={activeSlider ? "h-4 w-4" : "h-5 w-5"} />
                          </button>
                          
                          {/* Down Arrow - Grow Bottom (Moves Bottom Down, increases height) */}
                          <button
                            type="button"
                            onClick={() => setStudioLightAdjustments(prev => ({ ...prev, yOffset: Math.min(100, prev.yOffset + 5) }))}
                            className={`absolute ${activeSlider ? "bottom-0.5 p-1.5" : "bottom-1.5 p-2.5"} rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200 cursor-pointer active:scale-90`}
                            title="Grow Height (Move Down)"
                          >
                            <ArrowDown className={activeSlider ? "h-4 w-4" : "h-5 w-5"} />
                          </button>
                        </div>

                        {/* Slidebar section */}
                        {activeSlider === "left" && (
                          <div className="w-full flex flex-col gap-1 transition-all duration-300 animate-in fade-in duration-200">
                            {renderSlider(
                              "Left Width",
                              <ArrowLeft className="h-3.5 w-3.5" />,
                              studioLightAdjustments.leftExpansion,
                              10,
                              150,
                              1,
                              "%",
                              studioLightAdjustments.leftExpansion !== studioLightAdjustments.originalLeftExpansion,
                              () => setStudioLightAdjustments(prev => ({ ...prev, leftExpansion: prev.originalLeftExpansion })),
                              () => setStudioLightAdjustments(prev => ({ ...prev, leftExpansion: Math.max(10, prev.leftExpansion - 2) })),
                              () => setStudioLightAdjustments(prev => ({ ...prev, leftExpansion: Math.min(150, prev.leftExpansion + 2) })),
                              (val) => setStudioLightAdjustments(prev => ({ ...prev, leftExpansion: val })),
                              themeStyles
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveSlider(null)}
                              className="w-full py-1 px-3 mt-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-white/80 hover:text-white transition duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95"
                            >
                              Show D-pad Joystick
                            </button>
                          </div>
                        )}

                        {activeSlider === "right" && (
                          <div className="w-full flex flex-col gap-1 transition-all duration-300 animate-in fade-in duration-200">
                            {renderSlider(
                              "Right Width",
                              <ArrowRight className="h-3.5 w-3.5" />,
                              studioLightAdjustments.rightExpansion,
                              10,
                              150,
                              1,
                              "%",
                              studioLightAdjustments.rightExpansion !== studioLightAdjustments.originalRightExpansion,
                              () => setStudioLightAdjustments(prev => ({ ...prev, rightExpansion: prev.originalRightExpansion })),
                              () => setStudioLightAdjustments(prev => ({ ...prev, rightExpansion: Math.max(10, prev.rightExpansion - 2) })),
                              () => setStudioLightAdjustments(prev => ({ ...prev, rightExpansion: Math.min(150, prev.rightExpansion + 2) })),
                              (val) => setStudioLightAdjustments(prev => ({ ...prev, rightExpansion: val })),
                              themeStyles
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveSlider(null)}
                              className="w-full py-1 px-3 mt-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-white/80 hover:text-white transition duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95"
                            >
                              Show D-pad Joystick
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tuning Suite for Studio Light */}
                    <div className="sm:col-span-7 flex flex-col gap-3.5 w-full">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Image Tuning Suite</span>
                        {(studioLightAdjustments.opacity !== studioLightAdjustments.originalOpacity ||
                          studioLightAdjustments.brightness !== studioLightAdjustments.originalBrightness ||
                          studioLightAdjustments.saturation !== studioLightAdjustments.originalSaturation) && (
                          <button
                            type="button"
                            onClick={() => {
                              setStudioLightAdjustments(prev => ({
                                ...prev,
                                opacity: prev.originalOpacity,
                                brightness: prev.originalBrightness,
                                saturation: prev.originalSaturation,
                              }));
                              toast.info("Tuning adjustments reset.");
                            }}
                            className="flex items-center gap-1 text-[9px] font-bold text-white/60 hover:text-white transition duration-200 cursor-pointer"
                          >
                            <RotateCcw className="h-2.5 w-2.5" /> Reset
                          </button>
                        )}
                      </div>

                      {/* Opacity */}
                      {renderSlider(
                        "Opacity",
                        <Sun className="h-3.5 w-3.5" />,
                        studioLightAdjustments.opacity,
                        0,
                        100,
                        1,
                        "%",
                        studioLightAdjustments.opacity !== studioLightAdjustments.originalOpacity,
                        () => setStudioLightAdjustments(prev => ({ ...prev, opacity: prev.originalOpacity })),
                        () => setStudioLightAdjustments(prev => ({ ...prev, opacity: Math.max(0, prev.opacity - 2) })),
                        () => setStudioLightAdjustments(prev => ({ ...prev, opacity: Math.min(100, prev.opacity + 2) })),
                        (val) => setStudioLightAdjustments(prev => ({ ...prev, opacity: val })),
                        themeStyles
                      )}

                      {/* Brightness */}
                      {renderSlider(
                        "Brightness",
                        <Sun className="h-3.5 w-3.5" />,
                        studioLightAdjustments.brightness ?? 100,
                        10,
                        200,
                        2,
                        "%",
                        studioLightAdjustments.brightness !== studioLightAdjustments.originalBrightness,
                        () => setStudioLightAdjustments(prev => ({ ...prev, brightness: prev.originalBrightness })),
                        () => setStudioLightAdjustments(prev => ({ ...prev, brightness: Math.max(10, prev.brightness - 4) })),
                        () => setStudioLightAdjustments(prev => ({ ...prev, brightness: Math.min(200, prev.brightness + 4) })),
                        (val) => setStudioLightAdjustments(prev => ({ ...prev, brightness: val })),
                        themeStyles
                      )}

                      {/* Saturation */}
                      {renderSlider(
                        "Saturation",
                        <Droplets className="h-3.5 w-3.5" />,
                        studioLightAdjustments.saturation ?? 100,
                        0,
                        200,
                        2,
                        "%",
                        studioLightAdjustments.saturation !== studioLightAdjustments.originalSaturation,
                        () => setStudioLightAdjustments(prev => ({ ...prev, saturation: prev.originalSaturation })),
                        () => setStudioLightAdjustments(prev => ({ ...prev, saturation: Math.max(0, prev.saturation - 4) })),
                        () => setStudioLightAdjustments(prev => ({ ...prev, saturation: Math.min(200, prev.saturation + 4) })),
                        (val) => setStudioLightAdjustments(prev => ({ ...prev, saturation: val })),
                        themeStyles
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                    {/* Position Suite */}
                    <div className="sm:col-span-5 flex flex-col items-center gap-4 border-r border-white/5 pr-4">
                      <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Positioning Suite</span>
                      
                      {/* Joystick D-pad */}
                      <div className="relative w-28 h-28 bg-[#150d22] rounded-full border border-white/10 flex items-center justify-center shadow-lg shadow-black/40">
                        {/* Up Arrow */}
                        <button
                          type="button"
                          onClick={() => setAdjustingCharacter(prev => prev ? { ...prev, yOffset: prev.yOffset - 5 } : null)}
                          className="absolute top-1 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition duration-200 cursor-pointer active:scale-90"
                          title="Move Up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        
                        {/* Left Arrow */}
                        <button
                          type="button"
                          onClick={() => setAdjustingCharacter(prev => prev ? { ...prev, xOffset: prev.xOffset - 5 } : null)}
                          className="absolute left-1 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition duration-200 cursor-pointer active:scale-90"
                          title="Move Left"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        
                        {/* Reset Icon */}
                        <button
                          type="button"
                          onClick={() => setAdjustingCharacter(prev => prev ? { 
                            ...prev, 
                            xOffset: 0, 
                            yOffset: 0, 
                            scale: 1.0, 
                            brightness: prev.originalBrightness, 
                            saturation: prev.originalSaturation, 
                            contrast: prev.originalContrast 
                          } : null)}
                          className={`p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white/80 active:scale-90 transition duration-200 cursor-pointer ${themeHoverClasses.split(" ")[2]}`}
                          title="Reset All"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        
                        {/* Right Arrow */}
                        <button
                          type="button"
                          onClick={() => setAdjustingCharacter(prev => prev ? { ...prev, xOffset: prev.xOffset + 5 } : null)}
                          className="absolute right-1 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition duration-200 cursor-pointer active:scale-90"
                          title="Move Right"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        
                        {/* Down Arrow */}
                        <button
                          type="button"
                          onClick={() => setAdjustingCharacter(prev => prev ? { ...prev, yOffset: prev.yOffset + 5 } : null)}
                          className="absolute bottom-1 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition duration-200 cursor-pointer active:scale-90"
                          title="Move Down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Scale range */}
                      <div className="w-full">
                        {renderSlider(
                          "Scale",
                          <ZoomIn className="h-3.5 w-3.5" />,
                          Math.round(adjustingCharacter.scale * 100),
                          50,
                          250,
                          1,
                          "%",
                          adjustingCharacter.scale !== adjustingCharacter.originalScale,
                          () => setAdjustingCharacter(prev => prev ? { ...prev, scale: prev.originalScale } : null),
                          () => setAdjustingCharacter(prev => {
                            if (!prev) return null;
                            const newScale = Math.max(0.5, Math.min(2.5, prev.scale - 0.02));
                            return { ...prev, scale: Math.round(newScale * 100) / 100 };
                          }),
                          () => setAdjustingCharacter(prev => {
                            if (!prev) return null;
                            const newScale = Math.max(0.5, Math.min(2.5, prev.scale + 0.02));
                            return { ...prev, scale: Math.round(newScale * 100) / 100 };
                          }),
                          (val) => setAdjustingCharacter(prev => prev ? { ...prev, scale: val / 100 } : null),
                          themeStyles
                        )}
                      </div>
                    </div>

                    {/* Tuning Suite */}
                    <div className="sm:col-span-7 flex flex-col gap-3.5 w-full">
                      <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider text-center sm:text-left">Image Tuning Suite</span>
                      
                      {/* Brightness */}
                      {renderSlider(
                        "Brightness",
                        <Sun className="h-3.5 w-3.5" />,
                        adjustingCharacter.brightness,
                        50,
                        150,
                        1,
                        "%",
                        adjustingCharacter.brightness !== adjustingCharacter.originalBrightness,
                        () => setAdjustingCharacter(prev => prev ? { ...prev, brightness: prev.originalBrightness } : null),
                        () => setAdjustingCharacter(prev => prev ? { ...prev, brightness: Math.max(50, prev.brightness - 2) } : null),
                        () => setAdjustingCharacter(prev => prev ? { ...prev, brightness: Math.min(150, prev.brightness + 2) } : null),
                        (val) => setAdjustingCharacter(prev => prev ? { ...prev, brightness: val } : null),
                        themeStyles
                      )}

                      {/* Saturation */}
                      {renderSlider(
                        "Saturation",
                        <Droplets className="h-3.5 w-3.5" />,
                        adjustingCharacter.saturation,
                        0,
                        200,
                        2,
                        "%",
                        adjustingCharacter.saturation !== adjustingCharacter.originalSaturation,
                        () => setAdjustingCharacter(prev => prev ? { ...prev, saturation: prev.originalSaturation } : null),
                        () => setAdjustingCharacter(prev => prev ? { ...prev, saturation: Math.max(0, prev.saturation - 2) } : null),
                        () => setAdjustingCharacter(prev => prev ? { ...prev, saturation: Math.min(200, prev.saturation + 2) } : null),
                        (val) => setAdjustingCharacter(prev => prev ? { ...prev, saturation: val } : null),
                        themeStyles
                      )}

                      {/* Contrast */}
                      {renderSlider(
                        "Contrast",
                        <Sparkles className="h-3.5 w-3.5" />,
                        adjustingCharacter.contrast,
                        50,
                        150,
                        1,
                        "%",
                        adjustingCharacter.contrast !== adjustingCharacter.originalContrast,
                        () => setAdjustingCharacter(prev => prev ? { ...prev, contrast: prev.originalContrast } : null),
                        () => setAdjustingCharacter(prev => prev ? { ...prev, contrast: Math.max(50, prev.contrast - 2) } : null),
                        () => setAdjustingCharacter(prev => prev ? { ...prev, contrast: Math.min(150, prev.contrast + 2) } : null),
                        (val) => setAdjustingCharacter(prev => prev ? { ...prev, contrast: val } : null),
                        themeStyles
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2.5 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      // Discard studio light adjustments
                      setStudioLightAdjustments(prev => ({
                        ...prev,
                        color: prev.originalColor,
                        opacity: prev.originalOpacity,
                        size: prev.originalSize,
                        width: prev.originalWidth,
                        yOffset: prev.originalYOffset,
                        xOffset: prev.originalXOffset,
                        leftExpansion: prev.originalLeftExpansion,
                        rightExpansion: prev.originalRightExpansion,
                        brightness: prev.originalBrightness,
                        saturation: prev.originalSaturation,
                      }));
                      setAdjustingCharacter(null);
                      setAdjustingStudioLightOnly(false);
                      setActiveSlider(null);
                      toast.info("Adjustments discarded.");
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white transition duration-200 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // 1. Save companion adjustments
                        localStorage.setItem(
                           `saheli_char_adjustments_${adjustingCharacter.id}`,
                          JSON.stringify({
                            scale: adjustingCharacter.scale,
                            xOffset: adjustingCharacter.xOffset,
                            yOffset: adjustingCharacter.yOffset,
                            brightness: adjustingCharacter.brightness,
                            saturation: adjustingCharacter.saturation,
                            contrast: adjustingCharacter.contrast
                          })
                        );

                        if (adjustingCharacter.id.startsWith("char_") && user) {
                          await characterDb.updateCharacterAdjustments(
                            user.uid,
                            adjustingCharacter.id,
                            adjustingCharacter.scale,
                            adjustingCharacter.xOffset,
                            adjustingCharacter.yOffset
                          );
                          await refreshCustomCharacters();
                        }

                        // 2. Save studio light adjustments
                        const updatedLight = {
                          color: studioLightAdjustments.color,
                          opacity: studioLightAdjustments.opacity,
                          size: studioLightAdjustments.size,
                          width: studioLightAdjustments.width,
                          yOffset: studioLightAdjustments.yOffset,
                          xOffset: studioLightAdjustments.xOffset,
                          leftExpansion: studioLightAdjustments.leftExpansion,
                          rightExpansion: studioLightAdjustments.rightExpansion,
                          brightness: studioLightAdjustments.brightness,
                          saturation: studioLightAdjustments.saturation,
                          originalColor: studioLightAdjustments.color,
                          originalOpacity: studioLightAdjustments.opacity,
                          originalSize: studioLightAdjustments.size,
                          originalWidth: studioLightAdjustments.width,
                          originalYOffset: studioLightAdjustments.yOffset,
                          originalXOffset: studioLightAdjustments.xOffset,
                          originalLeftExpansion: studioLightAdjustments.leftExpansion,
                          originalRightExpansion: studioLightAdjustments.rightExpansion,
                          originalBrightness: studioLightAdjustments.brightness,
                          originalSaturation: studioLightAdjustments.saturation,
                        };
                        setStudioLightAdjustments(updatedLight);
                        localStorage.setItem("saheli_studio_light_adjustments", JSON.stringify(updatedLight));
                        localStorage.setItem("saheli_studio_light_customized", "true");

                        // 3. Trigger 1.2s flaring transition animation
                        setSpotlightSavedTrigger(true);
                        setTimeout(() => {
                          setSpotlightSavedTrigger(false);
                        }, 1200);

                        setAdjustingCharacter(null);
                        setAdjustingStudioLightOnly(false);
                        setActiveSlider(null);
                        toast.success("Adjustments saved successfully! ✨");
                      } catch (err) {
                        console.error("Failed to save adjustments:", err);
                        toast.error("Failed to save adjustments.");
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer shadow-md text-center ${themeStyles.buttonBg} ${themeStyles.buttonText}`}
                  >
                    Done & Save
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

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

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent 
          overlayClassName="!bg-black/35 !backdrop-blur-md"
          className="z-[100] w-[min(30rem,calc(100vw-2rem))] max-w-[30rem] overflow-hidden rounded-[48px] sm:rounded-[48px] border border-white/10 bg-[#0d0616]/60 p-6 text-white backdrop-blur-[30px] transition-all duration-300 shadow-[0_32px_90px_rgba(0,0,0,0.8)]"
        >
          <div className="space-y-5">
            {passwordChangeError ? (
              <div className="space-y-5 text-center py-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="h-6 w-6 text-amber-400 animate-pulse" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
                    Authentication Warning
                  </h3>
                  <p className="text-xs leading-5 text-white/60 px-2" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
                    {passwordChangeError}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="w-full inline-flex items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 px-5 py-3 text-xs font-bold text-amber-200 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="group inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition duration-200 mb-1 focus:outline-none cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back</span>
                </button>

                <DialogHeader className="space-y-1.5 text-left">
                  <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-white">Change Password</DialogTitle>
                  <DialogDescription className="text-xs leading-5 text-white/50">
                    Password updates are only available for accounts using email and password credentials.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium uppercase tracking-[0.26em] text-white/35">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full border-0 border-b border-white/15 bg-transparent px-0 py-2.5 text-sm text-white outline-none placeholder:text-white/30 transition focus:ring-0 ${getFocusBorderClassForModal(activeTheme)}`}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="inline-flex flex-1 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-white/80 transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitPasswordChange}
                    disabled={isUpdatingPassword}
                    className={`inline-flex flex-1 items-center justify-center rounded-[20px] border px-4 py-3 text-xs font-bold transition duration-300 disabled:opacity-60 ${getSubmitButtonThemeClasses(activeTheme)}`}
                  >
                    {isUpdatingPassword ? "Updating..." : "Done"}
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Premium Lightbox Viewer ── */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 md:p-8"
            onClick={() => setLightboxImage(null)}
          >
            <button
              type="button"
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 shadow-lg cursor-pointer"
              onClick={() => setLightboxImage(null)}
              aria-label="Close image viewer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Enlarged content"
                className="max-w-full max-h-[85vh] object-contain rounded-3xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}

const getFocusBorderClassForModal = (color: string) => {
  switch (color) {
    case "yellow": return "focus:border-yellow-400/50 focus:shadow-[0_4px_0_rgba(250,204,21,0.05)]";
    case "blue": return "focus:border-cyan-400/50 focus:shadow-[0_4px_0_rgba(34,211,238,0.05)]";
    case "orchid": return "focus:border-purple-400/50 focus:shadow-[0_4px_0_rgba(168,85,247,0.05)]";
    case "peach": return "focus:border-orange-400/50 focus:shadow-[0_4px_0_rgba(251,146,60,0.05)]";
    case "beige": return "focus:border-amber-400/40 focus:shadow-[0_4px_0_rgba(245,158,11,0.03)]";
    case "maroon": return "focus:border-red-400/50 focus:shadow-[0_4px_0_rgba(239,68,68,0.05)]";
    case "gemini": return "focus:border-blue-400/50 focus:shadow-[0_4px_0_rgba(59,130,246,0.05)]";
    case "pink":
    default:
      return "focus:border-pink-400/50 focus:shadow-[0_4px_0_rgba(236,72,153,0.05)]";
  }
};

const getSubmitButtonThemeClasses = (color: string) => {
  switch (color) {
    case "yellow":
      return "border-yellow-400/25 bg-gradient-to-r from-yellow-500/20 to-amber-500/15 hover:from-yellow-500/25 hover:to-amber-500/20 text-yellow-100 shadow-[0_0_15px_rgba(255,215,0,0.15)] hover:border-yellow-400/40";
    case "blue":
      return "border-cyan-400/25 bg-gradient-to-r from-cyan-500/20 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/20 text-cyan-100 shadow-[0_0_15px_rgba(0,229,255,0.15)] hover:border-cyan-400/40";
    case "orchid":
      return "border-purple-400/25 bg-gradient-to-r from-purple-500/20 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/20 text-purple-100 shadow-[0_0_15px_rgba(213,0,249,0.15)] hover:border-purple-400/40";
    case "peach":
      return "border-orange-400/25 bg-gradient-to-r from-orange-500/20 to-red-500/15 hover:from-orange-500/25 hover:to-red-500/20 text-orange-100 shadow-[0_0_15px_rgba(255,158,125,0.15)] hover:border-orange-400/40";
    case "beige":
      return "border-amber-400/20 bg-gradient-to-r from-amber-500/15 to-amber-900/10 hover:from-amber-500/20 hover:to-amber-900/15 text-amber-200 shadow-[0_0_15px_rgba(212,184,149,0.1)] hover:border-amber-400/30";
    case "maroon":
      return "border-red-400/25 bg-gradient-to-r from-red-800/20 to-red-950/15 hover:from-red-800/25 hover:to-red-950/20 text-red-100 shadow-[0_0_15px_rgba(208,28,63,0.15)] hover:border-red-400/40";
    case "gemini":
      return "border-blue-400/25 bg-gradient-to-r from-blue-500/20 to-indigo-950/25 hover:from-blue-500/25 hover:to-indigo-950/30 text-blue-100 shadow-[0_0_15px_rgba(74,137,255,0.15)] hover:border-blue-400/40";
    case "pink":
    default:
      return "border-pink-400/25 bg-gradient-to-r from-pink-500/20 to-purple-500/15 hover:from-pink-500/25 hover:to-purple-500/20 text-pink-100 shadow-[0_0_15px_rgba(255,105,180,0.15)] hover:border-pink-400/40";
  }
};

const getModalThemeBorderClass = (color: string) => {
  switch (color) {
    case "yellow": return "border-yellow-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(255,215,0,0.08)]";
    case "blue": return "border-cyan-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(0,229,255,0.08)]";
    case "orchid": return "border-purple-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(213,0,249,0.08)]";
    case "peach": return "border-orange-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(255,158,125,0.08)]";
    case "beige": return "border-amber-500/20 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(212,184,149,0.05)]";
    case "maroon": return "border-red-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(208,28,63,0.08)]";
    case "gemini": return "border-blue-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(74,137,255,0.08)]";
    case "pink":
    default:
      return "border-pink-500/30 shadow-[0_32px_90px_rgba(0,0,0,0.7),0_0_30px_rgba(255,105,180,0.08)]";
  }
};

