import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, MessageSquareText, Sparkles } from "lucide-react";
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
    const handleTabSwitch = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail === "chat" || customEvent.detail === "image") {
        setActiveTab(customEvent.detail);
      }
    };

    window.addEventListener("saheli-memory-tab", handleTabSwitch);
    return () => window.removeEventListener("saheli-memory-tab", handleTabSwitch);
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
      <DialogContent className="z-[100] h-[min(46rem,calc(100vh-2rem))] w-[min(78rem,calc(100vw-2rem))] max-w-[78rem] overflow-hidden rounded-[32px] border border-white/12 bg-[#0f0819]/94 p-0 text-white shadow-[0_32px_90px_rgba(0,0,0,0.7)] backdrop-blur-[32px]">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              Swara’s Memory Vault
              <Sparkles className="h-5 w-5 text-pink-200" />
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-white/50">
              Review insights and visual memories in a softer, cinematic format. The memory engine itself is unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
            {([
              { key: "chat" as const, label: "Insights", icon: MessageSquareText },
              { key: "image" as const, label: "Visual Memories", icon: ImageIcon },
            ]).map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition duration-300 ${active ? "bg-white/12 text-white shadow-[0_0_20px_rgba(255,0,120,0.12)]" : "text-white/55 hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-0 gap-5 overflow-y-auto px-6 py-6 md:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-5">
            <AnimatePresence mode="wait">
              {activeTab === "chat" ? (
                <motion.section
                  key="chat-tab"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {(profile.chat_history.length ? profile.chat_history : [{ id: "empty", content: "No memory insights saved yet.", timestamp: new Date().toISOString(), role: "assistant" as const }]).map((item) => (
                      <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-pink-400/20 hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(255,0,120,0.12)]">
                        <p className="text-sm leading-6 text-white/85">
                          {item.content.length > 140 ? `${item.content.slice(0, 140)}...` : item.content}
                        </p>
                        <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/35">
                          Saved {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                    <MemoryList items={profile.chat_history} onDelete={onDeleteChat} />
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="image-tab"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
                    <ImageGrid items={profile.images} onDelete={onDeleteImage} onPreview={onPreviewImage} />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/35">Memory Settings</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Long-term Memory</p>
                  <p className="text-sm leading-6 text-white/50">Keep insights and visuals active.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.memoryEnabled}
                  onClick={() => void onToggleMemory(!profile.memoryEnabled)}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full border transition duration-300 ${profile.memoryEnabled ? "border-pink-400/20 bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_20px_rgba(255,0,120,0.25)]" : "border-white/10 bg-white/10"}`}
                >
                  <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white transition duration-300 ${profile.memoryEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => void onClearAll()}
                className="mt-4 inline-flex w-full items-center justify-center rounded-[18px] border border-red-400/20 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-100 transition duration-300 hover:border-red-300/30 hover:bg-red-500/10"
              >
                Clear all memory
              </button>
            </div>

            {status ? (
              <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/55 backdrop-blur-xl">
                {status}
              </div>
            ) : null}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}