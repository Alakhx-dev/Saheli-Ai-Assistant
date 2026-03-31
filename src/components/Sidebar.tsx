import React from "react";
import { Heart, LogOut, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export interface ChatSessionListItem {
  id: string;
  title: string;
}

interface SidebarProps {
  isOpen: boolean;
  chatSessions: ChatSessionListItem[];
  currentChatId: string | null;
  isGuest: boolean;
  newChatLabel: string;
  recentChatsLabel: string;
  noChatsGuestLabel: string;
  noChatsAccountLabel: string;
  signOutLabel: string;
  resolveChatTitle: (title: string) => string;
  onCreateChat: () => void | Promise<void>;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onDeleteChat: (chatId: string) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}

export default function Sidebar({
  isOpen,
  chatSessions,
  currentChatId,
  isGuest,
  newChatLabel,
  recentChatsLabel,
  noChatsGuestLabel,
  noChatsAccountLabel,
  signOutLabel,
  resolveChatTitle,
  onCreateChat,
  onSelectChat,
  onDeleteChat,
  onLogout,
}: SidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className="hidden h-full flex-col border-r border-white/10 bg-[#171717] shadow-[0_18px_70px_rgba(0,0,0,0.45)] md:flex"
      style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2 text-white/80">
          <Heart className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-[0.14em] uppercase">Saheli AI</span>
        </div>
        <button
          type="button"
          onClick={() => void onCreateChat()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/20 hover:bg-white/10"
        >
          {newChatLabel}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">{recentChatsLabel}</div>
        {chatSessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-white/45">{isGuest ? noChatsGuestLabel : noChatsAccountLabel}</p>
        ) : (
          <div className="space-y-1.5">
            {chatSessions.map((chat) => (
              <div
                key={chat.id}
                className={`group relative w-full rounded-2xl border transition ${
                  currentChatId === chat.id
                    ? "border-white/10 bg-white/[0.08] text-white"
                    : "border-transparent bg-transparent text-white/65 hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void onSelectChat(chat.id)}
                  className="w-full truncate px-3 py-2 pr-9 text-left text-sm"
                >
                  {resolveChatTitle(chat.title)}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteChat(chat.id);
                  }}
                  aria-label="Delete chat"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-transparent p-1 text-white/45 opacity-0 transition hover:border-white/10 hover:bg-white/10 hover:text-white group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => void onLogout()}
          className="flex w-full items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-white/75 transition hover:border-white/15 hover:bg-white/7 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {signOutLabel}
        </button>
      </div>
    </motion.aside>
  );
}
