import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  Plus,
  Heart,
  Sparkles,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendChat, speakText, type ChatMsg } from "@/lib/saheli-api";
import FloatingElements from "@/components/FloatingElements";
import PetalEffect from "@/components/PetalEffect";
import HeartEffect from "@/components/HeartEffect";

interface UIMessage {
  id: string;
  sender: "user" | "saheli";
  text: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: UIMessage[];
  history: ChatMsg[];
}

const Index = () => {
  const [userName, setUserName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  // Apply system theme preference
  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const htmlElement = document.documentElement;
    
    if (isDark) {
      htmlElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      htmlElement.classList.remove("dark");
      setIsDarkMode(false);
    }

    // Listen for theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        htmlElement.classList.add("dark");
        setIsDarkMode(true);
      } else {
        htmlElement.classList.remove("dark");
        setIsDarkMode(false);
      }
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) setIsLoggedIn(true);
  };

  const createNewConversation = () => {
    const conv: Conversation = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      history: [],
    };
    setConversations((c) => [conv, ...c]);
    setActiveConvId(conv.id);
  };

  const deleteConversation = (id: string) => {
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeConvId === id) {
      setActiveConvId(conversations.find((c) => c.id !== id)?.id || null);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;

    let convId = activeConvId;
    if (!convId) {
      const conv: Conversation = {
        id: Date.now().toString(),
        title: msg.slice(0, 30) + (msg.length > 30 ? "..." : ""),
        messages: [],
        history: [],
      };
      setConversations((c) => [conv, ...c]);
      setActiveConvId(conv.id);
      convId = conv.id;
    }

    const userMsg: UIMessage = { id: Date.now().toString(), sender: "user", text: msg };
    setInput("");

    setConversations((convs) =>
      convs.map((c) => {
        if (c.id !== convId) return c;
        const updated = {
          ...c,
          messages: [...c.messages, userMsg],
          history: [...c.history, { role: "user" as const, content: msg }],
          title: c.messages.length === 0 ? msg.slice(0, 30) + (msg.length > 30 ? "..." : "") : c.title,
        };
        return updated;
      })
    );

    setIsTyping(true);

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const history = [...(currentConv?.history || []), { role: "user" as const, content: msg }];
      const reply = await sendChat(history);

      const saheliMsg: UIMessage = { id: (Date.now() + 1).toString(), sender: "saheli", text: reply };

      setConversations((convs) =>
        convs.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: [...c.messages, saheliMsg],
            history: [...c.history, { role: "assistant" as const, content: reply }],
          };
        })
      );

      if (audioOn) speakText(reply);
    } catch (err: any) {
      const errMsg: UIMessage = { id: (Date.now() + 1).toString(), sender: "saheli", text: err.message || "Oops! Try again yaar 🥺" };
      setConversations((convs) =>
        convs.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, errMsg] }))
      );
    } finally {
      setIsTyping(false);
    }
  };

  // Voice input
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Speech recognition not supported in this browser.");

    const recognition = new SR();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const result = event.results[0]?.[0]?.transcript;
      setIsListening(false);
      if (result?.trim()) handleSend(result.trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch {
      alert("Camera access denied!");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowCamera(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    stopCamera();

    // Import inline to avoid circular deps
    const { analyzeImage } = await import("@/lib/saheli-api");

    if (!activeConvId) createNewConversation();

    const userMsg: UIMessage = { id: Date.now().toString(), sender: "user", text: "📸 *Sent a photo for look analysis*" };
    const convId = activeConvId || conversations[0]?.id;

    setConversations((convs) =>
      convs.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, userMsg] }))
    );
    setIsTyping(true);

    try {
      const reply = await analyzeImage(base64);
      const saheliMsg: UIMessage = { id: (Date.now() + 1).toString(), sender: "saheli", text: reply };
      setConversations((convs) =>
        convs.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, saheliMsg] }))
      );
      if (audioOn) speakText(reply);
    } catch (err: any) {
      const errMsg: UIMessage = { id: (Date.now() + 1).toString(), sender: "saheli", text: err.message };
      setConversations((convs) =>
        convs.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, errMsg] }))
      );
    } finally {
      setIsTyping(false);
    }
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <FloatingElements />
        {!isDarkMode && <PetalEffect />}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong rounded-3xl p-8 sm:p-12 w-full max-w-md relative z-10"
        >
          <motion.div className="flex flex-col items-center mb-8" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center mb-4 shadow-lg">
              <Heart className="text-primary-foreground" size={36} fill="currentColor" />
            </div>
            <h1 className="font-display text-3xl font-extrabold gradient-text leading-tight">Saheli</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">The Best Friend 💕</p>
          </motion.div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Apna naam bata do yaar ✨</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Tumhara naam..."
                className="w-full px-4 py-3 rounded-xl glass border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                autoFocus
              />
            </div>
            <motion.button
              type="submit"
              disabled={!userName.trim()}
              className="saheli-btn w-full py-3 rounded-xl font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles size={18} />
              Chalo Shuru Karein!
            </motion.button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">Teri best friend tujhe miss kar rahi hai 🥺</p>
        </motion.div>
      </div>
    );
  }

  // --- MAIN CHAT APP ---
  return (
    <div className="h-screen flex bg-background overflow-hidden romance-surface">
      <FloatingElements />
      {!isDarkMode && <PetalEffect />}
      {isDarkMode && <HeartEffect />}
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-[280px] h-full flex flex-col border-r border-border glass-strong flex-shrink-0 z-20"
          >
            {/* Sidebar header */}
            <div className="p-4 flex items-center gap-3 border-b border-border">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center flex-shrink-0">
                <Heart className="text-primary-foreground" size={16} fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-foreground text-sm truncate">Saheli AI ✨</h2>
                <p className="text-xs text-muted-foreground truncate">Hey {userName}!</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 active:scale-95 transition-transform lg:hidden">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* New chat button */}
            <div className="p-4">
              <button
                onClick={createNewConversation}
                className="saheli-btn w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Plus size={16} />
                New Chat
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`interactive-btn w-full text-left px-3 py-2.5 rounded-xl text-sm truncate flex items-center gap-2 group transition-colors active:scale-[0.98] ${
                    conv.id === activeConvId
                      ? "bg-saheli-pink-light text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <MessageSquare size={14} className="flex-shrink-0" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8 px-4">
                  Koi chat nahi hai abhi. "New Chat" pe click karo ya seedha type karo! 💬
                </p>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAudioOn(!audioOn); if (audioOn) speechSynthesis.cancel(); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    audioOn ? "bg-saheli-pink-light text-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {audioOn ? "Audio On" : "Audio Off"}
                </button>
                <button
                  onClick={startCamera}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-saheli-mint-light text-foreground transition-colors hover:bg-saheli-mint/30"
                >
                  <Camera size={14} />
                  Scan Look
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Chat header */}
        <header className="glass-strong px-4 py-4 flex items-center gap-3 border-b border-border z-10">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-muted/50 active:scale-95 transition-transform">
              <MessageSquare size={18} className="text-foreground" />
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">S</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-foreground text-sm leading-tight">Saheli 💕</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? "typing..." : isListening ? "sun rahi hoon... 🎤" : "online"}
            </p>
          </div>
          <button
            onClick={() => { setAudioOn(!audioOn); if (audioOn) speechSynthesis.cancel(); }}
            className="interactive-btn p-2 rounded-lg hover:bg-muted/50 active:scale-95 transition-transform"
          >
            {audioOn ? <Volume2 size={16} className="text-saheli-pink" /> : <VolumeX size={16} className="text-muted-foreground" />}
          </button>
        </header>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isTyping ? (
            // Empty state — like ChatGPT welcome
            <div className="h-full flex flex-col items-center justify-center px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="text-primary-foreground" size={28} />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground mb-2">
                  Hey {userName}! 👋
                </h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Main hoon teri Saheli — teri best friend AI! Kuch bhi pucho, baat karo, ya apna look scan karvao. Let's go! 💕
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {["Aaj mera mood kharab hai 😔", "Koi mast joke suna na 😂", "Mujhe motivate kar yaar 💪"].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="glass px-4 py-2 rounded-xl text-sm text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "saheli" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary-foreground font-bold text-xs">S</span>
                      </div>
                    )}
                    <div
                      className={`max-w-sm rounded-2xl text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "chat-bubble chat-bubble-user rounded-br-md"
                          : "chat-bubble chat-bubble-ai rounded-bl-md"
                      }`}
                    >
                      {msg.sender === "saheli" ? (
                        <div className="prose prose-sm max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                    {msg.sender === "user" && (
                      <div className="w-8 h-8 rounded-full bg-saheli-lavender-light flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-secondary-foreground font-bold text-xs">
                          {userName[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-xs">S</span>
                  </div>
                  <div className="chat-bubble chat-bubble-ai px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 rounded-full bg-saheli-pink"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">Saheli soch rahi hai...</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Input area — ChatGPT style */}
        <div className="border-t border-border px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="chat-input-shell rounded-full border flex items-end gap-2 p-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
              <button
                onClick={toggleListening}
                className={`interactive-btn p-2.5 rounded-xl flex-shrink-0 transition-colors active:scale-95 ${
                  isListening ? "bg-destructive text-destructive-foreground animate-pulse-soft mic-active" : "hover:bg-muted/50 text-muted-foreground"
                }`}
                title="Voice input"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Sun rahi hoon... bolo! 🎤" : "Saheli se baat karo..."}
                rows={1}
                className="chat-input-field flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-none py-2 px-2 min-h-[36px] max-h-[150px]"
              />
              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                whileTap={{ scale: 0.9 }}
                className="interactive-btn saheli-btn p-2.5 rounded-xl disabled:opacity-30 flex-shrink-0"
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Saheli can make mistakes. She's your bestie, not a doctor! 💕
            </p>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-3xl overflow-hidden w-full max-w-sm"
            >
              <div className="relative aspect-[3/4]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-primary/40 rounded-2xl pointer-events-none" />
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-primary rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-primary rounded-br-xl" />
                </div>
              </div>
              <div className="flex justify-center gap-4 p-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={stopCamera} className="w-12 h-12 rounded-full bg-destructive/80 flex items-center justify-center">
                  <X size={20} className="text-destructive-foreground" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={captureAndAnalyze} className="w-14 h-14 rounded-full saheli-btn flex items-center justify-center">
                  <Sparkles size={22} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
