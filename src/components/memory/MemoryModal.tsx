import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MemoryProfile } from "@/lib/memory";
import MemoryList from "@/components/memory/MemoryList";
import ImageGrid from "@/components/memory/ImageGrid";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, ImageIcon } from "lucide-react";

interface MemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: MemoryProfile | null;
  status?: string | null;
  onToggleMemory: (enabled: boolean) => void | Promise<void>;
  onDeleteChat: (messageId: string) => void | Promise<void>;
  onDeleteImage: (imageId: string) => void | Promise<void>;
  onClearAll: () => void | Promise<void>;
  onPreviewImage: (url: string) => void;
}

type MemoryTab = "chat" | "image";

export default function MemoryModal({
  open,
  onOpenChange,
  memory,
  status,
  onToggleMemory,
  onDeleteChat,
  onDeleteImage,
  onClearAll,
  onPreviewImage,
}: MemoryModalProps) {
  const [activeTab, setActiveTab] = useState<MemoryTab>("chat");

  useEffect(() => {
    const handleTabSwitch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail === "chat" || customEvent.detail === "image") {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener("saheli-memory-tab", handleTabSwitch);
    return () => window.removeEventListener("saheli-memory-tab", handleTabSwitch);
  }, []);

  const profile = memory ?? {
    preferences: [],
    facts: [],
    memoryEnabled: true,
    chat_history: [],
    images: [],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="memory-modal-content rounded-3xl border border-pink-500/20 bg-gradient-to-br from-[#160822]/95 to-[#0a0510]/95 backdrop-blur-2xl">
        {/* Header */}
        <div className="border-b border-pink-500/15 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
              Long-term Memory
            </DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              Your precious memories 💭 — Review insights and visual memories. All stored securely.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Bar - Premium Glass Style */}
          <div className="memory-tab-bar mt-5 flex gap-2 rounded-full bg-white/5 p-1 backdrop-blur-xl">
            <button
              type="button"
              className={`memory-tab flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                activeTab === "chat"
                  ? "bg-gradient-to-r from-pink-500/30 to-purple-500/20 text-pink-200 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquareText className="h-4 w-4" />
              <span className="text-xs font-medium">Insights</span>
              <span className="text-xs font-semibold text-pink-300/80">{profile.chat_history.length}</span>
            </button>
            <button
              type="button"
              className={`memory-tab flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                activeTab === "image"
                  ? "bg-gradient-to-r from-pink-500/30 to-purple-500/20 text-pink-200 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("image")}
            >
              <ImageIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Visual</span>
              <span className="text-xs font-semibold text-pink-300/80">{profile.images.length}</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-5 p-6">
          <AnimatePresence mode="wait">
            {activeTab === "chat" ? (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.15em] font-semibold text-white/60">Conversation Insights</p>
                    <p className="text-xs text-pink-300/70 font-medium">{profile.chat_history.length} memories</p>
                  </div>
                  <MemoryList items={profile.chat_history} onDelete={onDeleteChat} />
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="image-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.15em] font-semibold text-white/60">Visual Memories</p>
                    <p className="text-xs text-pink-300/70 font-medium">{profile.images.length} images</p>
                  </div>
                  <ImageGrid items={profile.images} onDelete={onDeleteImage} onPreview={onPreviewImage} />
                </section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Section - Premium Glass */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.15em] font-semibold text-white/60">Memory Settings</p>
            
            {/* iOS-style Toggle for Long-term Memory */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Long-term Memory</p>
                <p className="text-xs text-white/50 mt-1">Store facts, preferences & insights</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.memoryEnabled}
                  onChange={(event) => void onToggleMemory(event.target.checked)}
                  className="sr-only peer"
                />
                <div className={`
                  relative inline-block w-11 h-6 rounded-full transition-all duration-300
                  ${profile.memoryEnabled 
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_12px_rgba(236,72,153,0.4)]" 
                    : "bg-white/10 border border-white/20"
                  }
                `}>
                  <div className={`
                    absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300
                    ${profile.memoryEnabled ? "translate-x-5" : ""}
                  `} />
                </div>
              </label>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => void onClearAll()}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-all duration-300 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                Clear All Memory
              </button>
            </div>
          </section>

          {status ? <p className="text-sm text-white/55">{status}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
