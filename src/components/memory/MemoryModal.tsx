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
      <DialogContent className="memory-modal-content">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold text-white">Manage Memory</DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              Review long-term memory insights, image memory, and storage controls.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Bar */}
          <div className="memory-tab-bar mt-4">
            <button
              type="button"
              className={`memory-tab ${activeTab === "chat" ? "memory-tab-active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquareText className="h-4 w-4" />
              <span>Chat Memory</span>
              <span className="memory-tab-count">{profile.chat_history.length}</span>
            </button>
            <button
              type="button"
              className={`memory-tab ${activeTab === "image" ? "memory-tab-active" : ""}`}
              onClick={() => setActiveTab("image")}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Image Memory</span>
              <span className="memory-tab-count">{profile.images.length}</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-5 p-6">
          <AnimatePresence mode="wait">
            {activeTab === "chat" ? (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <section className="space-y-2 rounded-xl border border-white/10 bg-[#242424]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Insights</p>
                    <p className="text-xs text-white/45">{profile.chat_history.length}</p>
                  </div>
                  <MemoryList items={profile.chat_history} onDelete={onDeleteChat} />
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="image-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <section className="space-y-2 rounded-xl border border-white/10 bg-[#242424]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Images</p>
                    <p className="text-xs text-white/45">{profile.images.length}</p>
                  </div>
                  <ImageGrid items={profile.images} onDelete={onDeleteImage} onPreview={onPreviewImage} />
                </section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Section */}
          <section className="rounded-xl border border-white/10 bg-[#242424] p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">Controls</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-3">
                <span className="text-sm text-white/80">Memory</span>
                <input
                  type="checkbox"
                  checked={profile.memoryEnabled}
                  onChange={(event) => void onToggleMemory(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-white"
                />
              </label>
              <button
                type="button"
                onClick={() => void onClearAll()}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
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
