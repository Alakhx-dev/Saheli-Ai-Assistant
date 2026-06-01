import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, MessageSquareText, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MemoryProfile } from "@/lib/memory";
import MemoryList from "@/components/memory/MemoryList";
import ImageGrid from "@/components/memory/ImageGrid";

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
  onBack?: () => void;
}

type MemoryTab = "chat" | "image";

const THEME_GLOWS: Record<string, string> = {
  pink: "rgba(255, 0, 120, 0.15)",
  yellow: "rgba(255, 215, 0, 0.15)",
  blue: "rgba(0, 229, 255, 0.15)",
  orchid: "rgba(213, 0, 249, 0.15)",
  peach: "rgba(255, 158, 125, 0.15)",
  beige: "rgba(212, 184, 149, 0.08)",
  maroon: "rgba(208, 28, 63, 0.15)",
  gemini: "rgba(74, 137, 255, 0.15)",
};

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
  onBack,
}: MemoryModalProps) {
  const [activeTab, setActiveTab] = useState<MemoryTab>("chat");
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("saheli_theme_color");
      if (saved) return saved;
    }
    return "maroon";
  });

  useEffect(() => {
    const handleTabSwitch = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail === "chat" || customEvent.detail === "image") {
        setActiveTab(customEvent.detail);
      }
    };

    const handleThemeChange = () => {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem("saheli_theme_color");
        if (saved) setActiveTheme(saved);
      }
    };

    window.addEventListener("saheli-memory-tab", handleTabSwitch);
    window.addEventListener("saheli_theme_color_changed", handleThemeChange);
    return () => {
      window.removeEventListener("saheli-memory-tab", handleTabSwitch);
      window.removeEventListener("saheli_theme_color_changed", handleThemeChange);
    };
  }, []);

  const profile = memory ?? useMemo(() => ({
    preferences: [],
    facts: [],
    memoryEnabled: true,
    chat_history: [],
    images: [],
  }), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        overlayClassName="bg-black/25 backdrop-blur-[6px]"
        className="z-[100] flex flex-col h-[min(40rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-[32rem] overflow-hidden p-0 text-white !outline-none"
        style={{
          background: "rgba(10, 10, 12, 0.45)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: `0 25px 50px rgba(0, 0, 0, 0.6), 0 0 35px ${THEME_GLOWS[activeTheme] || THEME_GLOWS.pink}, inset 0 1px 0 rgba(255,255,255,0.1)`,
          borderRadius: "32px"
        }}
      >
        <div className="flex shrink-0 items-center gap-4 border-b border-white/5 px-6 py-5 bg-white/[0.01]">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <DialogHeader className="text-left flex-1">
            <DialogTitle className="flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              {activeTab === "chat" ? (
                <><MessageSquareText className="h-4.5 w-4.5 text-pink-300" /> Chat Memory</>
              ) : (
                <><ImageIcon className="h-4.5 w-4.5 text-purple-300" /> Image Memory</>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/40 mt-1">
              {activeTab === "chat" ? "Review automatically saved insights." : "Review automatically saved visual memories."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="wait">
            {activeTab === "chat" ? (
              <motion.section
                key="chat-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <MemoryList items={profile.chat_history} onDelete={onDeleteChat} />
              </motion.section>
            ) : (
              <motion.section
                key="image-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <ImageGrid items={profile.images} onDelete={onDeleteImage} onPreview={onPreviewImage} />
              </motion.section>
            )}
          </AnimatePresence>

          {status ? (
            <div className="mt-4 rounded-[26px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/55 backdrop-blur-xl">
              {status}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => void onClearAll()}
            className="flex w-full items-center justify-center rounded-[18px] border border-red-400/10 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-100 transition duration-300 hover:border-red-400/20 hover:bg-red-500/10"
          >
            Clear all memory
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}