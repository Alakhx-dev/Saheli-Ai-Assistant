import React, { useEffect, useRef, useState } from "react";
import { LogOut, Menu, Send, Sparkles, Heart, Volume2, VolumeX } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { sendMessage, type ChatMessage } from "@/lib/ai-service";

const VISION_TRIGGERS = ["dekho", "kaisa lag raha hoon", "outfit"];

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

    const voices = window.speechSynthesis.getVoices();
    const preferredHindiVoice =
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("google") && voice.name.toLowerCase().includes("hindi") && voice.name.toLowerCase().includes("female")) ||
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("google") && voice.name.toLowerCase().includes("hindi")) ||
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("google")) ||
      voices.find((voice) => voice.lang === "hi-IN" && voice.name.toLowerCase().includes("swara")) ||
      voices.find((voice) => voice.lang === "hi-IN");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "hi-IN";
    utterance.pitch = 1.2;
    utterance.rate = 1.1;
    utterance.volume = 1.0;

    if (preferredHindiVoice) {
      utterance.voice = preferredHindiVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
  };

  return { unlock, speak, stop };
}

// Message Item with Scroll-triggered Fade
function ScrollFadeMessageItem({ msg, index }: { msg: any; index: number }) {
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
        ${msg.role === "user"
          ? "bg-gradient-to-br from-pink-700/60 to-purple-800/60 backdrop-blur-sm text-white rounded-2xl rounded-tr-none shadow-lg"
          : "backdrop-blur-lg bg-gray-900/30 border border-white/5 text-white/90 rounded-2xl shadow-2xl"
        }
      `}
        style={{ fontFamily: "'Delius', sans-serif", fontSize: "15px" }}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

// Scroll Fade Message List Container
function ScrollFadeMessageList({ messages, isLoading, messagesEndRef }: { messages: any[]; isLoading: boolean; messagesEndRef: React.RefObject<HTMLDivElement> }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto space-y-6 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => (
          <ScrollFadeMessageItem key={idx} msg={msg} index={idx} />
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            viewport={{ once: false, amount: 0.3 }}
            className="flex justify-start"
          >
            <div className="backdrop-blur-lg bg-gray-900/30 border border-white/5 p-4 rounded-2xl shadow-2xl">
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);
  const navigate = useNavigate();
  const { unlock, speak, stop } = useVoice(isMuted);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = async () => {
    stop();
    await signOut(auth);
    sessionStorage.removeItem("devMode");
    navigate("/");
  };

  const captureVisionFrame = async (): Promise<string | undefined> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      stream.getTracks().forEach((track) => track.stop());

      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      return dataUrl.split(",")[1];
    } catch (error) {
      console.warn("Camera permission denied or capture failed", error);
      return undefined;
    }
  };

  const containsVisionTrigger = (text: string) => {
    const lower = text.toLowerCase();
    return VISION_TRIGGERS.some((trigger) => lower.includes(trigger));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userText = input.trim();
    if (!userText || submitLockRef.current) {
      return;
    }

    await unlock();
    stop();

    submitLockRef.current = true;
    setInput("");

    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextHistory);
    setIsLoading(true);

    let base64Image: string | undefined;
    if (containsVisionTrigger(userText)) {
      base64Image = await captureVisionFrame();
    }

    try {
      const responseText = await sendMessage(nextHistory, base64Image);
      speak(responseText);
      setMessages((prev) => [...prev, { role: "model", content: responseText }]);
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d12] text-white overflow-hidden selection:bg-pink-500/30">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full bg-black/50 border-r border-white/5 flex flex-col hidden md:flex backdrop-blur-md z-20"
          >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2 text-pink-400">
                <Heart className="w-5 h-5 fill-current" />
                <span className="font-semibold tracking-wide text-sm" style={{ fontFamily: "'Sour Gummy', cursive" }}>Saheli AI</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">Recent Chats</div>
              <button className="w-full text-left truncate text-white/70 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors text-sm">
                New Relationship Advice
              </button>
              <button className="w-full text-left truncate text-white/70 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors text-sm">
                Outfit Check
              </button>
            </div>

            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                aria-label="Sign Out"
                className="flex items-center gap-2 text-white/60 hover:text-pink-400 w-full p-2 rounded-lg hover:bg-white/5 transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full relative z-10">
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
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
            <ScrollFadeMessageList messages={messages} isLoading={isLoading} messagesEndRef={messagesEndRef} />
          )}
        </div>

        <div className="p-4 md:p-6 bg-gradient-to-t from-[#0d0d12] to-transparent z-10">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] focus-within:ring-1 focus-within:ring-pink-500/30 transition-all duration-300"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Saheli..."
                className="flex-1 bg-transparent px-6 py-3 text-white placeholder-gray-400 focus:outline-none font-sans focus:ring-0"
                style={{ fontSize: "15px" }}
              />
              <button
                type="submit"
                aria-label="Send Message"
                disabled={!input.trim() || isLoading}
                className="p-4 text-white/50 hover:text-pink-400 disabled:opacity-50 disabled:hover:text-white/50 transition-colors"
              >
                <div className="bg-gradient-to-br from-purple-500/40 to-pink-500/40 p-2 rounded-xl shadow-[0_0_12px_rgba(236,72,153,0.4)] hover:shadow-[0_0_16px_rgba(236,72,153,0.6)] transition-shadow">
                  <Send className="w-5 h-5" />
                </div>
              </button>
            </form>
            <div className="text-center mt-2 text-[10px] tracking-widest uppercase text-white/30">
              Saheli har din tumse thoda aur seekh rahi hai {"<3"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
