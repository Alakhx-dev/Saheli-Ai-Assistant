import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CuteLoader from "@/components/CuteLoader";
import { Heart, ExternalLink, Calendar, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { renderMessageContent } from "@/components/chat/CodeBlock";

interface SharedMessage {
  role: "user" | "model";
  content: string;
  image?: string | null;
}

interface SharedChatData {
  title: string;
  emoji?: string;
  createdAt: number;
  messages: SharedMessage[];
}


export default function SharedChat() {
  const { sharedId } = useParams<{ sharedId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState<SharedChatData | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedChat() {
      if (!sharedId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "shared_chats", sharedId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setChatData(docSnap.data() as SharedChatData);
        }
      } catch (err) {
        console.error("Error fetching shared chat:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchSharedChat();
  }, [sharedId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <CuteLoader />
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="fixed inset-0 bg-[#000000] text-white flex flex-col items-center justify-center p-6 select-none selection:bg-pink-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.08)_0%,transparent_70%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full text-center relative z-10 border border-white/[0.08] bg-[#0c0c0e]/80 p-8 rounded-[32px] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
        >
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 rounded-full mb-6">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Sour Gummy', cursive" }}>
            Shared Chat Not Found
          </h2>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            This conversation link might have expired, been deleted by the owner, or is invalid.
          </p>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-pink-400/30 bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-4 py-3 text-xs font-semibold tracking-wider text-pink-100 shadow-[0_12px_24px_rgba(236,72,153,0.15)] hover:from-pink-500/30 hover:to-purple-500/30 hover:text-white transition-all duration-300"
          >
            Go to Saheli AI Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const formattedDate = new Date(chatData.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="saheli-app-wrapper theme-pink min-h-screen bg-[#000000] text-white flex flex-col selection:bg-pink-500/30 relative overflow-x-hidden">
      {/* Cinematic Glowing Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] -translate-x-1/2 bg-pink-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] translate-x-1/2 bg-purple-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-30 w-full border-b border-white/[0.04] bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div 
          onClick={() => navigate("/")} 
          className="flex items-center gap-2 text-pink-400 font-semibold tracking-wide text-sm cursor-pointer hover:scale-102 transition duration-300" 
          style={{ fontFamily: "'Sour Gummy', cursive" }}
        >
          <Heart className="w-5 h-5 fill-current animate-pulse" />
          <span>Saheli Ai</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-full border border-pink-400/25 bg-pink-500/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-pink-200 transition hover:bg-pink-500/20 hover:text-white"
        >
          <span>Chat with Saheli</span>
          <ExternalLink className="h-3 w-3" />
        </motion.button>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 py-8 relative z-20 flex flex-col">
        {/* Title Glassmorphic Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="border border-white/[0.08] bg-[#0c0c0e]/60 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6)] mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl shrink-0 w-12 h-12 flex items-center justify-center bg-white/[0.03] border border-white/[0.08] rounded-2xl shadow-lg">
                {chatData.emoji || "💬"}
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-white/95 leading-tight tracking-wide">
                  {chatData.title}
                </h1>
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-400/60" />
                  <span>Shared on {formattedDate}</span>
                </p>
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-pink-300 bg-pink-500/10 px-3.5 py-1.5 rounded-full border border-pink-500/15 w-max">
              Shared Conversation
            </div>
          </div>
        </motion.div>

        {/* Message Log */}
        <div className="space-y-6 flex-1">
          {chatData.messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-[85%] md:max-w-[70%] px-5 py-4 text-sm leading-relaxed font-medium relative transition-all duration-300
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
                        className="w-full h-auto object-cover max-h-[220px] transition-transform duration-500 ease-out group-hover:scale-102"
                        onClick={() => setActiveImage(msg.image!)}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                        <span className="text-white/80 text-[11px] font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                          Click to enlarge
                        </span>
                      </div>
                    </div>
                  )}
                  {msg.content && msg.content.trim() !== "Please analyze this image carefully." && (
                    <div className="select-text">{renderMessageContent(msg.content)}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="w-16 h-[1px] bg-white/[0.08] mx-auto mb-6" />
          <p className="text-sm text-white/40 mb-4 font-medium">
            Want to start your own customized chat with Saheli AI?
          </p>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full border border-pink-400/35 bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-6 py-3.5 text-xs font-semibold tracking-wider text-pink-100 shadow-[0_15px_30px_rgba(236,72,153,0.15)] hover:from-pink-500/20 hover:to-purple-500/20 hover:text-white transition duration-300"
          >
            <span>Start Chatting Now</span>
            <Heart className="w-3.5 h-3.5 fill-current" />
          </motion.button>
        </motion.div>
      </main>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-6 right-6 p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition duration-300"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              src={activeImage}
              alt="Enlarged shared snapshot"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
