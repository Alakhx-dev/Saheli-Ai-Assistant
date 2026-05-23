import React, { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, PanelLeft, Pencil, Plus, Settings, Trash2 } from "lucide-react";

export interface ChatSessionListItem {
  id: string;
  title: string;
}

interface SidebarProps {
  isOpen: boolean;
  chatSessions: ChatSessionListItem[];
  currentChatId: string | null;
  isGuest: boolean;
  isLightMode: boolean;
  isTtsMuted: boolean;
  newChatLabel: string;
  recentChatsLabel: string;
  noChatsGuestLabel: string;
  noChatsAccountLabel: string;
  settingsLabel: string;
  userName: string;
  userPhotoUrl?: string;
  userEmail?: string;
  resolveChatTitle: (title: string) => string;
  onCreateChat: () => void | Promise<void>;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onDeleteChat: (chatId: string) => void | Promise<void>;
  onRenameChat: (chatId: string, newTitle: string) => void | Promise<void>;
  onCloseSidebar?: () => void;
  onToggleSidebar: () => void;
  onToggleTtsMute: () => void;
  onToggleSidebarTheme: (nextValue: boolean) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void | Promise<void>;
  className?: string;
}

interface ChatItemProps {
  chat: ChatSessionListItem;
  isActive: boolean;
  title: string;
  editingId: string | null;
  editingTitle: string;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onStartEdit: (chatId: string, title: string) => void;
  onEditingTitleChange: (value: string) => void;
  onCancelEdit: () => void;
  onCommitEdit: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void | Promise<void>;
}

const ChatItem = memo(function ChatItem({
  chat,
  isActive,
  title,
  editingId,
  editingTitle,
  onSelectChat,
  onStartEdit,
  onEditingTitleChange,
  onCancelEdit,
  onCommitEdit,
  onDeleteChat,
}: ChatItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingId === chat.id;

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  return (
    <motion.div
      layout
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition duration-300 ${isActive ? "bg-white/[0.07] text-white" : "bg-transparent hover:bg-white/[0.04]"}`}
    >
      <MessageCircle className="h-4 w-4 shrink-0 text-white/40 transition group-hover:text-pink-200" />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editingTitle}
          onChange={(event) => onEditingTitleChange(event.target.value)}
          onBlur={onCancelEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitEdit(chat.id);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancelEdit();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => void onSelectChat(chat.id)}
          onDoubleClick={() => onStartEdit(chat.id, title)}
          style={{ color: "rgba(255,255,255,0.85)" }}
          className="min-w-0 flex-1 overflow-hidden text-left text-[13px] hover:text-white transition-colors duration-200"
        >
          <span className="block truncate">{title}</span>
        </button>
      )}

      <div className="ml-2 flex items-center gap-1">
        {!isEditing ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStartEdit(chat.id, title);
            }}
            aria-label="Rename chat"
            className="rounded-full p-1.5 text-white/35 opacity-0 transition duration-200 hover:bg-white/10 hover:text-white group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void onDeleteChat(chat.id);
          }}
          aria-label="Delete chat"
          className="rounded-full p-1.5 text-red-300/70 opacity-0 transition duration-200 hover:bg-red-500/10 hover:text-red-200 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
});

function playPopSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(540, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);

    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // ignore audio pop failures
  }
}

export default function Sidebar(props: SidebarProps) {
  const {
    isOpen,
    chatSessions,
    currentChatId,
    isGuest,
    newChatLabel,
    recentChatsLabel,
    noChatsGuestLabel,
    noChatsAccountLabel,
    settingsLabel,
    userName,
    userPhotoUrl,
    userEmail,
    resolveChatTitle,
    onCreateChat,
    onSelectChat,
    onDeleteChat,
    onRenameChat,
    onCloseSidebar,
    onToggleSidebar,
    onOpenSettings,
    className = "",
  } = props;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartEdit = (chatId: string, title: string) => {
    setEditingId(chatId);
    setEditingTitle(title);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleCommitEdit = async (chatId: string) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      handleCancelEdit();
      return;
    }

    await onRenameChat(chatId, nextTitle);
    handleCancelEdit();
  };

  const profileInitial = (userName.trim() || "User").charAt(0).toUpperCase();

  return (
    <>
      <div
        onClick={onCloseSidebar}
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`sidebar fixed flex flex-col justify-between overflow-hidden rounded-[28px] text-white ${isOpen ? "sidebar-open" : "sidebar-closed"} ${className}`}
        style={{
          top: "24px !important",
          left: "20px",
          bottom: "24px !important",
          height: "calc(100vh - 48px)",
          width: "280px",
          zIndex: "9999 !important",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingTop: "20px",
          background: "rgba(15, 15, 15, 0.4)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          border: "0.5px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)",
          transform: isOpen ? "translateX(0)" : "translateX(-110%)",
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="pointer-events-none absolute -bottom-10 left-6 right-6 h-24 bg-[radial-gradient(ellipse_at_center,rgba(255,105,180,0.28)_0%,rgba(255,105,180,0.14)_34%,transparent_74%)] blur-3xl" />

        <div className="border-b border-white/[0.03] px-3 pb-2.5 pt-4 relative flex items-center justify-between">
          <div className="absolute top-1/2 left-4 w-24 h-12 -translate-y-1/2 bg-pink-500/20 blur-[20px] rounded-full pointer-events-none" />
          <span
            className="block px-1 text-[1.2rem] font-medium tracking-[0.18em] text-pink-100"
            style={{ 
              fontFamily: "'Playfair Display', serif",
              textShadow: "0 0 10px rgba(255, 105, 180, 0.5), 0 0 20px rgba(255, 105, 180, 0.3)"
            }}
          >
            Saheli AI
          </span>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="text-white/50 hover:text-white transition duration-300 p-1 mr-1"
            aria-label="Hide sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          {/* Perched Sidebar Butterfly */}
          <div className="cinematic-hero-butterfly cinematic-hero-butterfly--perched-sidebar">
            <div className="cinematic-hero-butterfly__form cinematic-hero-butterfly__form--perched cinematic-hero-butterfly__form--lavender">
              <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
              <span className="cinematic-hero-butterfly__body" />
              <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
            </div>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => void onCreateChat()}
          whileHover={{ y: -1, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="group mx-3 mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-pink-400/20 bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-3 py-2.5 text-xs font-medium tracking-[0.08em] text-pink-100/90 shadow-[0_12px_28px_rgba(0,0,0,0.3),0_0_20px_rgba(255,105,180,0.15)] backdrop-blur-xl transition duration-300 hover:border-pink-400/40 hover:from-pink-500/20 hover:to-purple-500/20 hover:text-white"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 text-pink-300" />
          {newChatLabel}
        </motion.button>

        <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/28">
            {recentChatsLabel}
          </div>
          {chatSessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-white/42">{isGuest ? noChatsGuestLabel : noChatsAccountLabel}</p>
          ) : (
            <div className="space-y-1.5">
              {chatSessions.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  title={resolveChatTitle(chat.title)}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  onSelectChat={onSelectChat}
                  onStartEdit={handleStartEdit}
                  onEditingTitleChange={setEditingTitle}
                  onCancelEdit={handleCancelEdit}
                  onCommitEdit={handleCommitEdit}
                  onDeleteChat={onDeleteChat}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-white/[0.05] px-2.5 pb-2.5 pt-3 bg-gradient-to-t from-black/40 to-transparent">
          <div className="flex items-center gap-2.5 rounded-[20px] border border-pink-400/20 bg-black/40 px-3 py-2.5 backdrop-blur-2xl transition duration-300 hover:border-pink-400/40 hover:bg-black/50 hover:shadow-[0_0_30px_rgba(255,105,180,0.15)]" style={{ boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 105, 180, 0.15)" }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-400/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-[0_0_15px_rgba(255,105,180,0.2)]">
              {userPhotoUrl ? (
                <img src={userPhotoUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-pink-200/90">{profileInitial}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white/95">{userName || "User"}</p>
              <p className="truncate text-[10px] text-pink-200/60 font-medium tracking-wide">{userEmail || (isGuest ? "Guest mode" : "Connected")}</p>
            </div>

            <button
              type="button"
              onClick={() => { playPopSound(); onOpenSettings(); }}
              aria-label={settingsLabel}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition duration-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/20 hover:border-pink-400/30 hover:text-pink-100 hover:shadow-[0_0_20px_rgba(255,105,180,0.3)]"
              style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
