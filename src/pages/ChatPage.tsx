import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Volume2, VolumeX, Mic, MicOff, Plus, Trash2, Menu } from "lucide-react";
import { sendChat, type ChatMsg } from "@/lib/saheli-api";
import { speak, stopSpeaking } from "@/utils/voice";
import { generatePersonalizedSystemPrompt } from "@/lib/personalization";
import { loadProfile } from "@/lib/auth";
import { UserProfile } from "@/types/auth";
import PremiumHeader from "@/components/PremiumHeader";

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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>(loadProfile());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastSpokenRef = useRef<string>("");

  const refreshProfile = () => {
    setProfile(loadProfile());
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages || [];

  console.log("Chat loaded", messages);

  // Auto-speak AI messages when they appear (SAFE)
  useEffect(() => {
    if (!messages || messages.length === 0 || !audioOn) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const messageText = lastMessage.text || "";

    if (
      lastMessage?.sender === "saheli" &&
      messageText &&
      messageText !== lastSpokenRef.current
    ) {
      try {
        speak(messageText);
        lastSpokenRef.current = messageText;
      } catch (err) {
        console.error("Voice error:", err);
      }
    }
  }, [messages, audioOn]);

  useEffect(() => {
    if (!profile.isLoggedIn) {
      navigate("/login");
    }
    
    // Initialize first conversation
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, [profile, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversations, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = profile.language === "hi" ? "hi-IN" : "en-US";

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          setInput(transcript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => stopSpeaking();
  }, [profile.language]);

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
      const remaining = conversations.find((c) => c.id !== id);
      if (remaining) {
        setActiveConvId(remaining.id);
      } else {
        createNewConversation();
      }
    }
  };

  const updateConversationTitle = (id: string, title: string) => {
    setConversations((c) =>
      c.map((conv) => (conv.id === id ? { ...conv, title } : conv))
    );
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || !activeConv || isTyping) return;

    // Update title if it's the first message
    if (messages.length === 0) {
      updateConversationTitle(activeConvId!, msg.substring(0, 30) + "...");
    }

    setInput("");
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: msg,
    };

    setConversations((c) =>
      c.map((conv) =>
        conv.id === activeConvId
          ? { ...conv, messages: [...conv.messages, userMessage] }
          : conv
      )
    );

    setIsTyping(true);
    try {
      const systemPrompt = generatePersonalizedSystemPrompt(profile);
      const updatedHistory: ChatMsg[] = [
        ...activeConv.history,
        { role: "user", content: msg },
      ];

      const response = await sendChat(
        [...updatedHistory, { role: "user", content: msg }],
        systemPrompt
      );
      
      const aiMessage: UIMessage = {
        id: (Date.now() + 1).toString(),
        sender: "saheli",
        text: response,
      };

      setConversations((c) =>
        c.map((conv) =>
          conv.id === activeConvId
            ? {
                ...conv,
                messages: [...conv.messages, aiMessage],
                history: [...updatedHistory, { role: "assistant", content: response }],
              }
            : conv
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!messages) {
    return <div className="text-white p-4">Loading chat...</div>;
  }

  return (
    <div className="h-screen flex flex-col gradient-bg overflow-hidden">
      <PremiumHeader profile={profile} onProfileUpdate={refreshProfile} />

      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-72 sidebar-glass border-r border-white/10 flex flex-col absolute lg:relative h-full z-40"
            >
              <div className="p-4 border-b border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createNewConversation}
                  className="w-full saheli-btn py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Plus size={18} />
                  New Chat
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    whileHover={{ x: 4 }}
                    className={`sidebar-item p-3 cursor-pointer group ${
                      activeConvId === conv.id ? "sidebar-item-active" : ""
                    }`}
                    onClick={() => setActiveConvId(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-purple-300/70 text-xs mt-0.5">
                          {conv.messages.length} {conv.messages.length === 1 ? "message" : "messages"}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Top Bar */}
          <div className="glass border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <Menu size={20} />
              </motion.button>
              <span className="text-sm font-medium text-white">Chat</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAudioOn(!audioOn)}
              className={`p-2 rounded-lg transition-colors ${
                audioOn ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
              }`}
            >
              {audioOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </motion.button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center"
              >
                <div className="mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💬</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Hi {profile.name}!</h2>
                  <p className="text-purple-200/70">How can I help you today?</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  {[
                    "How's your day?",
                    "Tell me a joke",
                    "Give me advice",
                    "Let's chat",
                  ].map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSend(suggestion)}
                      className="interactive-btn glass-panel px-4 py-3 text-purple-200 rounded-xl text-sm font-medium hover:border-purple-400/30"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                <AnimatePresence>
                  {messages?.map((msg, i) => (
                    <motion.div
                      key={msg?.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg?.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`chat-bubble max-w-[75%] ${
                          msg?.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg?.text || (msg as any)?.content || ""}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <motion.div
                      key="typing-indicator"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="chat-bubble chat-bubble-ai">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                              className="w-2 h-2 bg-purple-400 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="glass border-t border-white/10 p-4">
            <div className="max-w-3xl mx-auto chat-input-shell rounded-2xl p-2 flex items-end gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white mic-active"
                    : "bg-white/10 text-purple-300 hover:bg-white/15"
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </motion.button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                className="chat-input-field flex-1 bg-transparent text-white placeholder-purple-300/50 px-2 py-2 resize-none focus:outline-none text-sm max-h-32"
                rows={1}
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 w-10 h-10 saheli-btn rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
