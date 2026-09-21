import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, MessageSquareText, ChevronLeft, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MemoryProfile } from "@/lib/memory";
import MemoryList from "@/components/memory/MemoryList";
import ImageGrid from "@/components/memory/ImageGrid";

interface MemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: MemoryProfile | null;
  status?: React.ReactNode | null;
  onToggleMemory: (enabled: boolean) => void | Promise<void>;
  onDeleteChat: (messageId: string) => void | Promise<void>;
  onDeleteImage: (imageId: string) => void | Promise<void>;
  onClearAll: (type: "chat" | "image") => void | Promise<void>;
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
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078";
    }
    return "#ff0078";
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
        const savedCustom = window.localStorage.getItem("saheli_custom_theme_color");
        if (savedCustom) setCustomColor(savedCustom);
      }
    };

    window.addEventListener("saheli-memory-tab", handleTabSwitch);
    window.addEventListener("saheli_theme_color_changed", handleThemeChange);
    return () => {
      window.removeEventListener("saheli-memory-tab", handleTabSwitch);
      window.removeEventListener("saheli_theme_color_changed", handleThemeChange);
    };
  }, []);

  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 768;
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const profile = memory ?? useMemo(() => ({
    preferences: [],
    facts: [],
    memoryEnabled: true,
    chat_history: [],
    images: [],
  }), []);

  if (isMobileViewport) {
    if (!open) return null;

    const mobileSheet = (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[130] flex flex-col justify-end p-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] bg-black/75 backdrop-blur-md saheli-app-wrapper theme-${activeTheme}`}
            style={activeTheme === "custom" ? getCustomThemeStyles(customColor) : undefined}
          >
            {/* Backdrop click to close */}
            <div
              className="absolute inset-0"
              onClick={() => onOpenChange(false)}
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative z-10 w-full max-w-[440px] mx-auto max-h-[88dvh] h-[85dvh] flex flex-col rounded-[32px] overflow-hidden bg-[rgba(16,11,26,0.85)] backdrop-blur-[36px] backdrop-saturate-[210%] border border-white/[0.18] pointer-events-auto"
              style={{
                boxShadow: `0 25px 70px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.25), 0 0 35px ${THEME_GLOWS[activeTheme] || THEME_GLOWS.pink}`
              }}
            >
              {/* Top Sheet Drag Pill with luminous glow */}
              <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-white/20 via-pink-400/50 to-white/20 shadow-[0_0_12px_rgba(255,105,180,0.35)] shrink-0" />

              {/* Dedicated Mobile Header Bar */}
              <div className="border-b border-white/[0.08] px-4 py-3 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {onBack && (
                    <button
                      type="button"
                      onClick={onBack}
                      className="flex items-center gap-1.5 rounded-full border border-pink-400/40 bg-gradient-to-r from-pink-500/25 to-purple-500/25 px-3 py-1 text-xs font-semibold text-pink-100 hover:brightness-125 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,105,180,0.25)] cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Back</span>
                    </button>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-white truncate">
                      {activeTab === "chat" ? (
                        <><MessageSquareText className="h-4 w-4 text-pink-300 shrink-0" /> Chat Memory</>
                      ) : (
                        <><ImageIcon className="h-4 w-4 text-purple-300 shrink-0" /> Image Memory</>
                      )}
                    </span>
                    <span className="text-[10px] text-white/40 truncate">
                      {activeTab === "chat" ? "Review automatically saved insights." : "Review automatically saved visual memories."}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-full text-white/60 hover:text-white bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.12] active:scale-90 transition-all cursor-pointer shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.3)] ml-2"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Segmented Tab Switcher on Mobile */}
              <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl mx-4 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "chat" ? "bg-white/15 text-white shadow-sm border border-white/10" : "text-white/40 hover:text-white/70"}`}
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  <span>Chat Memory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("image")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "image" ? "bg-white/15 text-white shadow-sm border border-white/10" : "text-white/40 hover:text-white/70"}`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Image Memory</span>
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-white/55 backdrop-blur-xl">
                    {status}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-white/10 p-3.5">
                <button
                  type="button"
                  onClick={() => void onClearAll(activeTab)}
                  className="flex w-full items-center justify-center rounded-[18px] border border-[rgba(var(--theme-primary-rgb),0.2)] bg-[rgba(var(--theme-primary-rgb),0.06)] px-4 py-3 text-sm font-semibold text-[var(--theme-light)] transition duration-300 hover:border-[rgba(var(--theme-primary-rgb),0.4)] hover:bg-[rgba(var(--theme-primary-rgb),0.12)] hover:text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  {activeTab === "chat" ? "Clear all chat memory" : "Clear all image memory"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );

    return typeof document !== "undefined" ? createPortal(mobileSheet, document.body) : mobileSheet;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        overlayClassName="bg-black/25 backdrop-blur-[6px]"
        className={`z-[100] saheli-app-wrapper theme-${activeTheme} flex flex-col h-[min(40rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-[32rem] overflow-hidden p-0 text-white !outline-none`}
        style={{
          background: "rgba(10, 10, 12, 0.45)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: `0 25px 50px rgba(0, 0, 0, 0.6), 0 0 35px ${THEME_GLOWS[activeTheme] || THEME_GLOWS.pink}, inset 0 1px 0 rgba(255,255,255,0.1)`,
          borderRadius: "32px",
          ...(activeTheme === "custom" ? getCustomThemeStyles(customColor) : {})
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
            onClick={() => void onClearAll(activeTab)}
            className="flex w-full items-center justify-center rounded-[18px] border border-[rgba(var(--theme-primary-rgb),0.2)] bg-[rgba(var(--theme-primary-rgb),0.06)] px-4 py-3 text-sm font-semibold text-[var(--theme-light)] transition duration-300 hover:border-[rgba(var(--theme-primary-rgb),0.4)] hover:bg-[rgba(var(--theme-primary-rgb),0.12)] hover:text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            {activeTab === "chat" ? "Clear all chat memory" : "Clear all image memory"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const getCustomThemeStyles = (hex: string) => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const rNormal = r / 255;
  const gNormal = g / 255;
  const bNormal = b / 255;
  const max = Math.max(rNormal, gNormal, bNormal);
  const min = Math.min(rNormal, gNormal, bNormal);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNormal: h = (gNormal - bNormal) / d + (gNormal < bNormal ? 6 : 0); break;
      case gNormal: h = (bNormal - rNormal) / d + 2; break;
      case bNormal: h = (rNormal - gNormal) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const themeLight = `hsl(${hDeg}, ${sPct}%, 88%)`;

  return {
    "--theme-primary": `#${cleanHex}`,
    "--theme-primary-rgb": `${r}, ${g}, ${b}`,
    "--theme-glow": `rgba(${r}, ${g}, ${b}, 0.35)`,
    "--theme-light": themeLight,
  } as React.CSSProperties;
};