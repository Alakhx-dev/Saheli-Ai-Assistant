import React, { memo } from "react";
import { Trash2 } from "lucide-react";
import type { MemoryImageEntry } from "@/lib/memory";

interface ImageGridProps {
  items: MemoryImageEntry[];
  onDelete: (imageId: string) => void | Promise<void>;
  onPreview: (url: string) => void;
}

function ImageGrid({ items, onDelete, onPreview }: ImageGridProps) {
  if (!items.length) {
    return <p className="px-4 py-5 text-sm text-white/45">No image memory saved yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
      {items.map((image) => (
        <div key={image.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <button type="button" onClick={() => onPreview(image.url)} className="block aspect-square w-full">
            <img
              src={image.url}
              alt={image.prompt || image.caption || "Memory image"}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[10px] uppercase tracking-[0.14em] text-white/70">
            {image.type}
          </div>
          <button
            type="button"
            onClick={() => void onDelete(image.id)}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white/70 opacity-0 transition group-hover:opacity-100 hover:text-white"
            aria-label="Delete image memory"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default memo(ImageGrid);
