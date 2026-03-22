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
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendChatStreaming, speakText, stopSpeaking, type ChatMsg } from "@/lib/saheli-api";
import { generatePersonalizedSystemPrompt } from "@/lib/personalization";
import { UserProfile } from "@/types/auth";
import FloatingElements from "@/components/FloatingElements";
import PetalEffect from "@/components/PetalEffect";
import HeartEffect from "@/components/HeartEffect";
import ChatHeader from "@/components/ChatHeader";
import Sidebar from "@/components/Sidebar";
import { getI18n } from "@/lib/i18n";

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

interface ChatAppProps {
  profile: UserProfile;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onLanguageChange: (lang: "en" | "hi") => void;
  onLogout: () => void;
}

export default function ChatApp({
  profile,
  isDarkMode,
  onThemeToggle,
  onLanguageChange,
  onLogout,
}: ChatAppProps) {
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

  const i18n = getI18n(profile.language);
  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  useEffect(() => () => stopSpeaking(), []);

  const createNewConversation = () => {
    const conv: Conversation = {
      id: Date.now().toString(),
      title: i18n.chat.newChat,
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

    console.log("[ChatApp] handleSend called with:", msg);
    console.log("[ChatApp] Current conversation ID:", activeConvId);

    let convId = activeConvId;
    if (!convId) {
      console.log("[ChatApp] No active conversation, creating new one");
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
    const saheliMsgId = (Date.now() + 1).toString();

    const emptyMsg: UIMessage = { id: saheliMsgId, sender: "saheli", text: "" };
    setConversations((convs) =>
      convs.map((c) =>
        c.id !== convId ? c : { ...c, messages: [...c.messages, emptyMsg] }
      )
    );

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const history = [...(currentConv?.history || []), { role: "user" as const, content: msg }];
      const personalizedPrompt = generatePersonalizedSystemPrompt(profile);

      console.log("[ChatApp] Calling sendChatStreaming with:");
      console.log("[ChatApp]   - messages:", history.length);
      console.log("[ChatApp]   - audioOn:", audioOn);
      console.log("[ChatApp]   - personalizedPrompt:", personalizedPrompt ? "yes" : "no");

      await sendChatStreaming(
        history,
        (chunkText: string, isFirst: boolean) => {
          console.log("[ChatApp] onChunk callback fired - isFirst:", isFirst, "length:", chunkText.length);
          console.log("[ChatApp] Chunk text preview:", chunkText.substring(0, 80));
          setConversations((convs) => {
            console.log("[ChatApp] setConversations called (onChunk)");
            const updated = convs.map((c) => {
              if (c.id !== convId) return c;
              console.log("[ChatApp] Updating conversation", convId, "with new text length:", chunkText.length);
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id === saheliMsgId) {
                    console.log("[ChatApp] Updating Saheli message with text length:", chunkText.length);
                    return { ...m, text: chunkText };
                  }
                  return m;
                }),
              };
            });
            console.log("[ChatApp] Conversations updated, new count:", updated.length);
            return updated;
          });
        },
        (finalText: string) => {
          console.log("[ChatApp] onDone callback fired - finalText length:", finalText.length);
          console.log("[ChatApp] Final text preview:", finalText.substring(0, 100));
          setConversations((convs) => {
            console.log("[ChatApp] setConversations called (onDone)");
            const updated = convs.map((c) => {
              if (c.id !== convId) return c;
              console.log("[ChatApp] Adding assistant message to history, length:", finalText.length);
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id === saheliMsgId) {
                    console.log("[ChatApp] Finalizing Saheli message with text length:", finalText.length);
                    return { ...m, text: finalText };
                  }
                  return m;
                }),
                history: [...c.history, { role: "assistant" as const, content: finalText }],
              };
            });
            console.log("[ChatApp] Conversations updated with final message, new count:", updated.length);
            return updated;
          });
        },
        audioOn,
        personalizedPrompt
      );
      console.log("[ChatApp] sendChatStreaming completed successfully");
    } catch (err: any) {
      console.error("[ChatApp] Error in handleSend:", err);
      const errMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        sender: "saheli",
        text: err.message || i18n.errors.defaultError,
      };
      setConversations((convs) =>
        convs.map((c) => (c.id !== convId ? c : { ...c, messages: [...c.messages, errMsg] }))
      );
    } finally {
      setIsTyping(false);
      console.log("[ChatApp] handleSend finished");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = profile.language === "hi" ? "hi-IN" : "en-IN";
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch {
      alert(i18n.errors.cameraError);
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

    const userMsg: UIMessage = { id: Date.now().toString(), sender: "user", text: "📸 Photo" };
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

  return (
    <div className="h-screen flex bg-background overflow-hidden romance-surface">
      <FloatingElements />
      {!isDarkMode && <PetalEffect />}
      {isDarkMode && <HeartEffect />}

      {/* Sidebar */}
      <Sidebar
        profile={profile}
        isDarkMode={isDarkMode}
        conversations={conversations}
        activeConvId={activeConvId}
        onNewChat={createNewConversation}
        onSelectConversation={setActiveConvId}
        onDeleteConversation={deleteConversation}
        onThemeToggle={onThemeToggle}
        onLanguageChange={() => onLanguageChange(profile.language === "en" ? "hi" : "en")}
        onLogout={onLogout}
      />

      {/* Main Chat Area - Shifted for Sidebar */}
      <div className="flex-1 flex flex-col min-w-0 relative ml-64">
        {/* Messages - Centered Column */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center">
          {messages.length === 0 && !isTyping ? (
            <div className="h-full flex flex-col items-center justify-center px-4 text-center py-20">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center mx-auto mb-4 shadow-lg">
                  💕
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  {profile.language === "en"
                    ? `Hi ${profile.name}! 👋`
                    : `${profile.name}, नमस्ते! 👋`}
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {i18n.auth.welcomeMessage}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {[
                    profile.language === "en"
                      ? "Tell me about your day"
                      : "अपने बारे में बताओ",
                    profile.language === "en"
                      ? "I need some advice"
                      : "मुझे सलाह चाहिए",
                    profile.language === "en"
                      ? "Make me laugh"
                      : "हँसा दो मुझे",
                  ].map((prompt) => (
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
            <div className="w-full max-w-2xl px-4 py-8 space-y-5">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "saheli" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center flex-shrink-0 mt-0.5 text-white font-bold text-xs">
                        S
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
                      <div className="w-8 h-8 rounded-full bg-saheli-lavender-light flex items-center justify-center flex-shrink-0 mt-0.5 text-secondary-foreground font-bold text-xs">
                        {profile.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                    S
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
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} className="h-1" />
            </div>
          )}
        </div>

        {/* Input Area - Centered */}
        <div className="flex justify-center px-4 pb-4 pt-2 border-t border-border">
          <div className="chat-input-shell w-full max-w-2xl py-3 px-4 rounded-2xl flex items-end gap-2">
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
              placeholder={isListening ? i18n.chat.listeningPlaceholder : i18n.chat.placeholder}
              className="chat-input-field flex-1 resize-none border-0 bg-transparent text-foreground focus:ring-0 max-h-24"
              style={{ overflow: "hidden" }}
            />
            <button
              onClick={toggleListening}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                isListening ? "bg-destructive/20 text-destructive" : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              onClick={startCamera}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
            >
              <Camera size={18} />
            </button>
            <motion.button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="saheli-btn p-2 rounded-lg disabled:opacity-40 flex-shrink-0"
              whileTap={{ scale: 0.95 }}
            >
              <Send size={18} className="text-white" />
            </motion.button>
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
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          >
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="rounded-lg w-96 h-96 object-cover" />
              <button
                onClick={stopCamera}
                className="absolute top-2 right-2 p-2 bg-destructive rounded-lg hover:bg-destructive/90"
              >
                <X size={20} className="text-white" />
              </button>
              <button
                onClick={captureAndAnalyze}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 saheli-btn px-6 py-2 rounded-lg"
              >
                Capture
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
