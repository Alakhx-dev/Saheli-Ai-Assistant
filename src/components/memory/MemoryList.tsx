import React, { memo } from "react";
import { Trash2 } from "lucide-react";
import type { MemoryChatEntry } from "@/lib/memory";

interface MemoryListProps {
  items: MemoryChatEntry[];
  onDelete: (messageId: string) => void | Promise<void>;
}

function previewText(value: string, maxLength = 140) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function MemoryList({ items, onDelete }: MemoryListProps) {
  if (!items.length) {
    return <p className="px-4 py-5 text-sm text-white/45">No memory insights saved yet.</p>;
  }

  return (
    <div className="divide-y divide-white/10">
      {items.map((item) => (
        <div key={item.id} className="group flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm leading-6 text-white/80">{previewText(item.content)}</p>
          </div>
          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-white/40 opacity-0 transition group-hover:opacity-100 hover:border-white/10 hover:bg-white/5 hover:text-white"
            aria-label="Delete memory insight"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default memo(MemoryList);
