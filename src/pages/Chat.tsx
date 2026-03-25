import React, { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Menu, Mic, Send, Sparkles, Heart, Volume2, VolumeX } from "lucide-react";
import { auth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { sendMessage, type ChatMessage, type EmotionLabel } from "@/lib/ai-service";
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

const VISION_TRIGGER_PATTERNS = [
  /\bdekho\b/i,
  /\bdekh\s*ke\s*batao\b/i,
  /\bkais[aei]?\s+lag\s+rah[aei]\b/i,
  /\bkapd[ae]\b/i,
  /\bfit\b/i,
  /\bfit\s*check\b/i,
  /\bcamera\b/i,
];

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

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
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  lastMsgCount: number;
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
              <p className="text-white/60 text-xs font-medium">Saheli typing...</p>
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mood, setMood] = useState("neutral");
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [pendingMobileVisionRequest, setPendingMobileVisionRequest] = useState<PendingMobileVisionRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    let cancelled = false;

    const bootstrapChatHistory = async () => {
      const sessions = await loadChatSessions(user);
      if (cancelled) {
        return;
      }

      setChatSessions(sessions);

      if (sessions.length === 0) {
        setCurrentChatId(null);
        setMessages([]);
        return;
      }

      const initialChatId = sessions[0].id;
      const storedMessages = await loadChatMessages(initialChatId, user);
      if (cancelled) {
        return;
      }

      setCurrentChatId(initialChatId);
      setMessages(storedMessages.map(({ role, content }) => ({ role, content })));
    };

    void bootstrapChatHistory();

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
    setChatSessions(sessions);

    if (nextChatId !== undefined) {
      setCurrentChatId(nextChatId);
    }
  }, [user]);

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

  const ensureActiveChat = useCallback(async (firstMessageText: string) => {
    let chatId = currentChatId;
    const isFirstMessageInChat = messages.length === 0;

    if (!chatId) {
      chatId = await createChatSession(user);
      setCurrentChatId(chatId);
    }

    if (isFirstMessageInChat) {
      await updateChatSessionTitle(chatId, firstMessageText, user);
    }

    return { chatId, isFirstMessageInChat };
  }, [currentChatId, messages.length, user]);

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
      if (imageBase64) {
        detectedEmotion = await detectEmotionFromImage(imageBase64);
      }

      lastMsgCountRef.current = request.history.length;
      const responseText = await sendMessage(request.history, imageBase64, detectedEmotion);
      speak(responseText);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      setMood(nextMood);
      setMessages((prev) => [...prev, aiMessage]);
      void persistChatMessage(request.chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.warn("Failed to persist model reply", error);
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

    const { chatId } = await ensureActiveChat(userText);
    const userMessage: StoredChatMessage = {
      role: "user",
      content: userText,
      createdAt: Date.now(),
    };
    await persistChatMessage(chatId, userMessage);

    const nextHistory: ChatMessage[] = [...messages, { role: userMessage.role, content: userMessage.content }];
    setMessages(nextHistory);

    if (mobile && shouldUseVision) {
      const pendingRequest = {
        id: ++mobileVisionRequestIdRef.current,
        chatId,
        history: nextHistory,
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
      const responseText = await sendMessage(nextHistory, base64Image, detectedEmotion);
      speak(responseText);
      const nextMood = detectMood(responseText);
      const aiMessage = { role: "model" as const, content: responseText };
      setMood(nextMood);
      setMessages((prev) => [...prev, aiMessage]);
      void persistChatMessage(chatId, {
        role: "model",
        content: responseText,
        createdAt: Date.now(),
      }).catch((error) => {
        console.warn("Failed to persist model reply", error);
      });
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

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
                New
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs text-white/80 font-semibold uppercase tracking-wider mb-2">Recent Chats</div>
              {chatSessions.length === 0 ? (
                <p className="p-2 text-sm text-white/40">No chats yet {isGuest ? "in guest mode" : "for this account"}.</p>
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
                    {chat.title}
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                aria-label="Sign Out"
                className="flex items-center gap-2 text-white/80 font-semibold hover:text-pink-400 w-full p-2 rounded-lg hover:bg-white/5 transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full relative z-10" style={{ isolation: 'isolate' }}>
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/15 bg-white/[0.05] backdrop-blur-3xl sticky top-0 z-20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Sidebar"
            className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors hidden md:block"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="md:hidden flex items-center gap-2 text-pink-400 font-semibold tracking-wide text-sm" style={{ fontFamily: "'Sour Gummy', cursive" }}>
            <Heart className="w-5 h-5 fill-current" />
            Saheli AI
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (nextMuted) {
                  stop();
                }
              }}
              aria-label={isMuted ? "Unmute Voice" : "Mute Voice"}
              className="p-2 text-white/60 hover:text-pink-400 rounded-lg hover:bg-white/5 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              onClick={handleLogout}
              aria-label="Sign Out"
              className="p-2 text-white/60 hover:text-pink-400 rounded-lg hover:bg-white/5 transition-colors md:hidden"
            >
              <LogOut className="w-5 h-5" />
            </button>
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
              <h2 className="text-2xl font-light mb-2">Hey Alakh!</h2>
              <p className="text-white/50 text-base font-light">I'm Saheli. Tumhari sabse acchi dost. Kuch bhi batao, ya pucho!</p>
            </div>
          ) : (
            <ScrollFadeMessageList messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} lastMsgCount={lastMsgCountRef.current} />
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
                placeholder="Message Saheli..."
                className="flex-1 bg-transparent px-6 py-3.5 text-white placeholder-white/40 focus:outline-none font-sans focus:ring-0 neon-border-input border-none"
                style={{ fontSize: "15px" }}
              />
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? "Stop Listening" : "Voice Input"}
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
                aria-label="Send Message"
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
                  📷 Open Camera
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
              Saheli har din tumse thoda aur seekh rahi hai {"<3"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
