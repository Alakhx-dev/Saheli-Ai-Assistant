import React from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MemoryFieldKey, MemoryMoment, MemoryProfile } from "@/lib/memory";

type MemoryEntry = {
  id: string;
  category: MemoryFieldKey;
  label: string;
  value: string;
};

interface MemoryManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: MemoryProfile | null;
  moments: MemoryMoment[];
  status: string | null;
  onDeleteEntry: (entry: MemoryEntry) => void | Promise<void>;
  onDeleteMoment: (momentId: string) => void | Promise<void>;
  onClearAll: () => void | Promise<void>;
  onPreviewMoment: (imageDataUrl: string) => void;
}

const MEMORY_BUCKETS: Array<{ key: MemoryFieldKey; label: string }> = [
  { key: "preferences", label: "Preferences" },
  { key: "facts", label: "Facts" },
  { key: "recent_context", label: "Recent Context" },
];

function buildEntries(memory: MemoryProfile | null): MemoryEntry[] {
  if (!memory) {
    return [];
  }

  return MEMORY_BUCKETS.flatMap(({ key, label }) =>
    memory[key].map((value) => ({
      id: `${key}-${value}`,
      category: key,
      label,
      value,
    })),
  );
}

export default function MemoryManagerModal({
  open,
  onOpenChange,
  memory,
  moments,
  status,
  onDeleteEntry,
  onDeleteMoment,
  onClearAll,
  onPreviewMoment,
}: MemoryManagerModalProps) {
  const entries = buildEntries(memory);
  const hasMemory = entries.length > 0 || moments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(56rem,calc(100vw-2rem))] max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1e1e1e] p-0 text-white shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold text-white">Manage Memory</DialogTitle>
            <DialogDescription className="text-sm text-white/55">
              Review durable memory, remove individual items, or clear everything at once.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">Structured Memory</p>
            <div className="rounded-2xl border border-white/10 bg-[#232323]">
              {entries.length === 0 ? (
                <div className="px-5 py-6 text-sm text-white/45">No saved memories yet.</div>
              ) : (
                entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-4 px-5 py-4 ${index < entries.length - 1 ? "border-b border-white/10" : ""}`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">{entry.label}</p>
                      <p className="text-sm text-white/85">{entry.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onDeleteEntry(entry)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/45 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                      aria-label={`Delete ${entry.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-white/45" />
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">Saved Captures</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#232323] p-4">
              {moments.length === 0 ? (
                <p className="text-sm text-white/45">No saved captures yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {moments.map((moment) => (
                    <div key={moment.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      <button type="button" onClick={() => onPreviewMoment(moment.imageDataUrl)} className="block aspect-square w-full">
                        <img src={moment.imageDataUrl} alt="Saved memory" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteMoment(moment.id)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/55 text-white/70 opacity-0 transition group-hover:opacity-100 hover:text-white"
                        aria-label="Delete saved capture"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {status ? <p className="text-sm text-white/55">{status}</p> : null}

          {hasMemory ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void onClearAll()}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Clear All Memory
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
