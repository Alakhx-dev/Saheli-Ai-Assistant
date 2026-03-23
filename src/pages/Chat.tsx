import React, { useState, useEffect, useRef } from "react";
import { LogOut, Menu, Send, Sparkles, Heart, Camera } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { aiService, ChatMessage } from "@/services/ai-service";
import { useVoiceQueue } from "@/hooks/useVoiceQueue";

const VISION_TRIGGERS = ["kaise lag raha hoon", "dekho", "face", "look", "ye kya hai"];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { queueVoice } = useVoiceQueue();
  
  // Hidden Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Auto-scroll
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Initialize silent camera stream
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera permission denied or unavailable", err);
      }
    };
    initCamera();

    return () => {
      // Cleanup camera on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("devMode");
    navigate("/");
  };

  const captureFrame = (): string | undefined => {
    if (!videoRef.current || !canvasRef.current) return undefined;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return undefined;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Return base64 without prefix
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    return dataUrl.split(",")[1];
  };

  const containsVisionTrigger = (text: string) => {
    const lower = text.toLowerCase();
    return VISION_TRIGGERS.some(trigger => lower.includes(trigger));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    
    // Add user message to UI
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let base64Image: string | undefined;
      
      if (containsVisionTrigger(userText)) {
        base64Image = captureFrame();
      }

      // Send to AI
      const aiResponse = await aiService.sendMessage(messages, userText, base64Image);
      
      // Add Assistant response to UI
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      
      // Trigger voice
      queueVoice(aiResponse);

    } catch (err) {
      console.error(err);
      const fallbackMsg = "Sorry bae, I ran into a little glitch! Let's try that again?";
      setMessages(prev => [...prev, { role: "assistant", content: fallbackMsg }]);
      queueVoice(fallbackMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d12] text-white overflow-hidden selection:bg-pink-500/30">
      
      {/* Hidden Vision Elements */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden w-[1px] h-[1px]" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Sidebar */}
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
                <span className="font-semibold tracking-wide">Saheli AI</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">Recent Chats</div>
              {/* Dummy chat history */}
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
                className="flex items-center gap-2 text-white/60 hover:text-pink-400 w-full p-2 rounded-lg hover:bg-white/5 transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative z-10">
        
        {/* Header (Mobile & Sidebar Toggle) */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Sidebar"
            className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors hidden md:block"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="md:hidden flex items-center gap-2 text-pink-400 font-semibold tracking-wide">
            <Heart className="w-5 h-5 fill-current" />
            Saheli AI
          </div>

          <button 
            onClick={handleLogout}
            aria-label="Sign Out"
            className="p-2 text-white/60 hover:text-pink-400 rounded-lg hover:bg-white/5 transition-colors md:hidden"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Chat Messages */}
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
              <h2 className="text-2xl font-light mb-2">Hey gorgeous!</h2>
              <p className="text-white/50 text-base font-light">I'm Saheli. Let's talk about anything — your day, your fit, or just vibe.</p>
              <div className="flex gap-2 mt-6 flex-wrap justify-center">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">"Kaise lag raha hoon?"</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">"What do you see?"</span>
              </div>
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
                  <div className={`
                    max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-[15px] leading-relaxed
                    ${msg.role === "user" 
                      ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.2)] rounded-tr-sm" 
                      : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm"
                    }
                  `}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"></div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
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
              Gemini 2.0 Flash • Saheli AI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
