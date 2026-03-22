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
  Sparkles,
  MessageSquare,
  Trash2,
  X,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendChat, speakText, stopSpeaking, type ChatMsg } from "@/lib/saheli-api";
import FloatingElements from "@/components/FloatingElements";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => () => stopSpeaking(), []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setIsLoggedIn(true);
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

      if (audioOn) void speakText(reply);
    } catch (err: any) {
      const errMsg: UIMessage = { id: (Date.now() + 1).toString(), sender: "saheli", text: err.message || "Hmm, ek baar phir try karo na. Main yahin hoon 🥺" };
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
      if (audioOn) void speakText(reply);
    } catch (err: any) {
      const errMsg: UIMessage = { id: (Date.now() + 1).toString(), sender: "saheli", text: err.message };
      setConversations((convs) =>
        convs.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, errMsg] }))
      );
    } finally {
      setIsTyping(false);
    }
  };

  const toggleAudio = () => {
    setAudioOn((prev) => {
      if (prev) stopSpeaking();
      return !prev;
    });
  };

  // =============================================
  // LOGIN SCREEN
  // =============================================
  if (!isLoggedIn) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="login-orb w-[400px] h-[400px] bg-purple-600/30 top-[-10%] left-[-5%] animate-orb-drift-1" />
        <div className="login-orb w-[350px] h-[350px] bg-violet-500/20 bottom-[-8%] right-[-5%] animate-orb-drift-2" />
        <div className="login-orb w-[250px] h-[250px] bg-pink-500/15 top-[40%] right-[20%] animate-orb-drift-1" style={{ animationDelay: "-7s" }} />

        <FloatingElements />
        <HeartEffect />

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10"
        >
          {/* Logo & branding */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
              <Sparkles className="text-white" size={28} />
            </div>
            <h1 className="font-display text-3xl font-extrabold gradient-text leading-tight">Saheli AI</h1>
            <p className="text-muted-foreground text-sm mt-1.5 font-medium">Your Personal AI Assistant 💜</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/30 transition-all"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/30 transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={!email.trim()}
              className="saheli-btn w-full py-3.5 rounded-xl font-display font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              whileTap={{ scale: 0.97 }}
            >
              <Sparkles size={16} />
              Sign In
            </motion.button>
          </form>

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Premium AI assistant experience ✨
          </p>
        </motion.div>
      </div>
    );
  }

  // =============================================
  // MAIN CHAT APP
  // =============================================
  return (
    <div className="h-screen flex bg-background overflow-hidden romance-surface">
      <FloatingElements />
      <HeartEffect />

      {/* ===== SIDEBAR ===== */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-[280px] h-full flex flex-col sidebar-glass flex-shrink-0 z-20"
          >
            {/* Sidebar header — Logo */}
            <div className="p-5 flex items-center gap-3 border-b border-white/5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/20">
                <Sparkles className="text-white" size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-foreground text-sm truncate">Saheli AI 💜</h2>
                <p className="text-[11px] text-muted-foreground truncate">Personal Assistant</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all lg:hidden"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* New chat button */}
            <div className="px-4 pt-4 pb-2">
              <button
                onClick={createNewConversation}
                className="saheli-btn w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Plus size={16} />
                New Chat
              </button>
            </div>

            {/* Chat history list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 mt-2">
              {conversations.length === 0 && (
                <div className="text-center mt-12 px-4">
                  <MessageSquare size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground/50">
                    No conversations yet. Start a new chat!
                  </p>
                </div>
              )}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`sidebar-item w-full text-left px-3 py-2.5 text-sm truncate flex items-center gap-2.5 group transition-all ${
                    conv.id === activeConvId
                      ? "sidebar-item-active text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground/80"
                  }`}
                >
                  <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all rounded-md hover:bg-red-500/10"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              ))}
            </div>

            {/* Sidebar footer */}
            <div className="p-4 border-t border-white/5 space-y-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAudio}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    audioOn
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                      : "bg-white/5 text-muted-foreground border border-white/5"
                  }`}
                >
                  {audioOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  {audioOn ? "Audio On" : "Audio Off"}
                </button>
                <button
                  onClick={startCamera}
                  className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-white/5 text-muted-foreground border border-white/5 hover:bg-white/8 hover:text-foreground/80 transition-all"
                >
                  <Camera size={13} />
                  Scan Look
                </button>
              </div>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Chat header */}
        <header className="glass-strong px-5 py-3.5 flex items-center gap-3 border-b border-white/5 z-10">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all mr-1"
            >
              <PanelLeftOpen size={18} className="text-muted-foreground" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm shadow-purple-500/20">
            <Sparkles className="text-white" size={14} />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-foreground text-sm leading-tight">Saheli AI</h2>
            <p className="text-[11px] text-muted-foreground">
              {isTyping ? (
                <span className="text-purple-400">thinking...</span>
              ) : isListening ? (
                <span className="text-pink-400">listening... 🎤</span>
              ) : (
                <span className="text-emerald-400/70">● online</span>
              )}
            </p>
          </div>
          <button
            onClick={toggleAudio}
            className="interactive-btn p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all"
          >
            {audioOn ? (
              <Volume2 size={16} className="text-purple-400" />
            ) : (
              <VolumeX size={16} className="text-muted-foreground" />
            )}
          </button>
        </header>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isTyping ? (
            /* ===== EMPTY STATE ===== */
            <div className="h-full flex flex-col items-center justify-center px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-lg"
              >
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 via-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/25">
                  <Sparkles className="text-white" size={32} />
                </div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                  Hey Alakh 👋
                </h2>
                <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
                  I'm your personal AI assistant. Ask me anything, chat about your day, or just say hi! ✨
                </p>
                <div className="flex flex-wrap justify-center gap-2.5 mt-8">
                  {[
                    { text: "Tell me a joke 😂", icon: "😂" },
                    { text: "Motivate me 💪", icon: "💪" },
                    { text: "What can you do? 🤔", icon: "🤔" },
                  ].map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => handleSend(prompt.text)}
                      className="glass-panel px-5 py-2.5 rounded-2xl text-sm text-foreground/80 hover:text-foreground hover:bg-white/8 active:scale-[0.97] transition-all group"
                    >
                      <span className="group-hover:mr-1 transition-all">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            /* ===== MESSAGE LIST ===== */
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index > messages.length - 3 ? 0.05 : 0 }}
                    className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "saheli" && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm shadow-purple-500/20">
                        <Sparkles className="text-white" size={12} />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-md text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "chat-bubble chat-bubble-user"
                          : "chat-bubble chat-bubble-ai"
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
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                        <span className="text-white font-bold text-[10px]">A</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-purple-500/20">
                    <Sparkles className="text-white" size={12} />
                  </div>
                  <div className="chat-bubble chat-bubble-ai px-5 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-purple-400 animate-typing-dot"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">thinking...</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* ===== INPUT BAR ===== */}
        <div className="border-t border-white/5 px-4 py-4 bg-background/50 backdrop-blur-md">
          <div className="max-w-2xl mx-auto">
            <div className="chat-input-shell rounded-2xl flex items-end gap-2 p-2">
              {/* Mic button */}
              <button
                onClick={toggleListening}
                className={`interactive-btn p-2.5 rounded-xl flex-shrink-0 transition-all active:scale-95 ${
                  isListening
                    ? "bg-red-500/20 text-red-400 mic-active"
                    : "hover:bg-white/5 text-muted-foreground hover:text-foreground/70"
                }`}
                title="Voice input"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Text input */}
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
                placeholder={isListening ? "Listening... speak now 🎤" : "Message Saheli AI..."}
                rows={1}
                className="chat-input-field flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none py-2.5 px-2 min-h-[36px] max-h-[150px]"
              />

              {/* Send button */}
              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                whileTap={{ scale: 0.9 }}
                className={`interactive-btn p-2.5 rounded-xl flex-shrink-0 transition-all ${
                  input.trim() && !isTyping
                    ? "saheli-btn"
                    : "text-muted-foreground/30 cursor-not-allowed"
                }`}
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2.5">
              Saheli AI can make mistakes. Always verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* ===== CAMERA MODAL ===== */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-3xl overflow-hidden w-full max-w-sm"
            >
              <div className="relative aspect-[3/4]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-purple-500/30 rounded-2xl pointer-events-none" />
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400 rounded-br-xl" />
                </div>
              </div>
              <div className="flex justify-center gap-4 p-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={stopCamera} className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-all">
                  <X size={20} className="text-red-400" />
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
