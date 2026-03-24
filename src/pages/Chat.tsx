import React, { useEffect, useRef, useState } from "react";
import { LogOut, Menu, Send, Sparkles, Heart, Volume2, VolumeX } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { sendMessage, type ChatMessage } from "@/lib/ai-service";

const VISION_TRIGGERS = ["dekho", "kaisa lag raha hoon", "outfit"];
const EXTRA_SPACE_REGEX = /\s+/g;

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

    const cleanText = text.replace(/[#*]/g, "").replace(EXTRA_SPACE_REGEX, " ").trim();
    if (!cleanText) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "hi-IN";
    utterance.pitch = 1.2;
    utterance.rate = 0.95;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const hindiVoice =
      voices.find((voice) => voice.lang === "hi-IN" && (voice.name.includes("Swara") || voice.name.includes("Google"))) ||
      voices.find((voice) => voice.lang === "hi-IN");

    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
  };

  return { unlock, speak, stop };
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);
  const lastSpokenReplyRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { unlock, speak, stop } = useVoice(isMuted);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "model") {
      return;
    }

    if (lastSpokenReplyRef.current === lastMessage.content) {
      return;
    }

    lastSpokenReplyRef.current = lastMessage.content;
    speak(lastMessage.content);
  }, [messages, speak]);

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
                <span className="font-semibold tracking-wide" style={{ fontFamily: "'Sour Gummy', cursive" }}>Saheli AI</span>
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

          <div className="md:hidden flex items-center gap-2 text-pink-400 font-semibold tracking-wide" style={{ fontFamily: "'Sour Gummy', cursive" }}>
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
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                    max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-4xl leading-relaxed relative
                    ${msg.role === "user"
                      ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.2)] rounded-tr-sm"
                      : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm"
                    }
                  `}
                    style={{ fontFamily: "'Delius', sans-serif", fontSize: "16px" }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"></div>
                    </div>
                    <p className="text-white/60 text-sm">Saheli typing...</p>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-gradient-to-t from-[#0d0d12] to-transparent z-10">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Saheli..."
                className="flex-1 bg-transparent px-6 py-4 text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send Message"
                disabled={!input.trim() || isLoading}
                className="p-4 text-white/50 hover:text-pink-400 disabled:opacity-50 disabled:hover:text-white/50 transition-colors"
              >
                <div className="bg-white/5 p-2 rounded-xl">
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
