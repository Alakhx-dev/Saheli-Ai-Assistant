import React, { memo } from "react";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemoryImageEntry } from "@/lib/memory";

interface ImageGridProps {
  items: MemoryImageEntry[];
  onDelete: (imageId: string) => void | Promise<void>;
  onPreview: (url: string) => void;
}

function ImageGrid({ items, onDelete, onPreview }: ImageGridProps) {
  if (!items.length) {
    return <p className="px-1 py-4 text-sm text-white/45">No image memory saved yet.</p>;
  }

  return (
    <div className="columns-1 gap-4 space-y-4 sm:columns-2 xl:columns-3 p-1">
      <AnimatePresence initial={false}>
        {items.map((image) => (
          <motion.div
            key={image.id}
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="group mb-4 break-inside-avoid overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] transition-colors duration-300 hover:border-pink-400/20 hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(255,0,120,0.14)]"
          >
            <button type="button" onClick={() => onPreview(image.url)} className="block w-full">
              <img src={image.url} alt={image.prompt || image.caption || "Memory image"} loading="lazy" className="h-auto w-full object-cover" />
            </button>
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.18em] text-white/45">{image.type}</p>
                <p className="mt-1 text-[11px] text-white/35">{new Date(image.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(image.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/45 opacity-0 transition duration-300 group-hover:opacity-100 hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-100"
                aria-label="Delete image memory"
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

export default memo(ImageGrid);