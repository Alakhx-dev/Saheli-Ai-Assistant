import React, { memo } from "react";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemoryChatEntry } from "@/lib/memory";

interface MemoryListProps {
  items: MemoryChatEntry[];
  onDelete: (messageId: string) => void | Promise<void>;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Saved recently";
  }

  return `Saved ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function previewText(value: string, maxLength = 140) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function MemoryList({ items, onDelete }: MemoryListProps) {
  if (!items.length) {
    return <p className="px-1 py-4 text-sm text-white/45">No memory insights saved yet.</p>;
  }

  return (
    <div className="grid gap-3 p-1">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-4 transition-colors duration-300 hover:border-pink-400/20 hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(255,0,120,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-[13px] leading-6 text-white/85">{previewText(item.content)}</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">{formatTimestamp(item.timestamp)}</p>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(item.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/45 opacity-0 transition duration-300 group-hover:opacity-100 hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-100"
                aria-label="Delete memory insight"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default memo(MemoryList);