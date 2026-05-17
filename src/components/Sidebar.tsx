import React, { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, MessageCircle, Pencil, Plus, Settings, Trash2, Sparkles, Sun, Moon } from "lucide-react";
import SettingsBubble from "@/components/settings/SettingsBubble";
import MuteButton from "@/components/settings/MuteButton";
import ProfileBubble from "@/components/settings/ProfileBubble";
import type { AIProvider } from "@/lib/ai-service";

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
  memoryEnabled: boolean;
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
  onToggleTtsMute: () => void;
  onToggleSidebarTheme: (nextValue: boolean) => void;
  onToggleMemory: (nextValue: boolean) => void;
  onOpenMemory: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void | Promise<void>;
  activeProvider: AIProvider;
  onSelectProvider: (provider: AIProvider) => void;
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
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      className={`history-item group ${isActive ? "active" : ""}`}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
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
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => void onSelectChat(chat.id)}
          onDoubleClick={() => onStartEdit(chat.id, title)}
          className="min-w-0 flex-1 truncate text-left text-sm"
        >
            {title}
            {isActive ? <span className="chat-item-butterfly" aria-hidden /> : null}
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
            className="rounded-md p-1 text-white/45 opacity-0 transition duration-200 hover:bg-white/10 hover:text-white group-hover:opacity-100"
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
          className="rounded-md p-1 text-red-400 opacity-0 transition duration-200 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
});

export default function Sidebar({
  isOpen,
  chatSessions,
  currentChatId,
  isGuest,
  isLightMode,
  isTtsMuted,
  memoryEnabled,
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
  onToggleTtsMute,
  onToggleSidebarTheme,
  onToggleMemory,
  onOpenMemory,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  activeProvider,
  onSelectProvider,
  className = "",
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSettingsBubbleOpen, setIsSettingsBubbleOpen] = useState(false);
  const [isProfileBubbleOpen, setIsProfileBubbleOpen] = useState(false);
  const settingsBubbleRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const profileBubbleRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

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
  const sidebarTone = isLightMode ? "text-neutral-900" : "text-white";
  const surfaceTone = isLightMode ? "border-white/35 bg-white/90" : "border-white/10 bg-[#120814]/72";
  const subtleTextTone = isLightMode ? "text-neutral-500" : "text-white/45";
  const defaultTextTone = isLightMode ? "text-neutral-900" : "text-white";
  const dividerTone = isLightMode ? "border-neutral-300/80" : "border-white/10";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      
      if (isSettingsBubbleOpen && !settingsBubbleRef.current?.contains(target) && !settingsButtonRef.current?.contains(target)) {
        setIsSettingsBubbleOpen(false);
      }
      
      if (isProfileBubbleOpen && !profileBubbleRef.current?.contains(target) && !profileButtonRef.current?.contains(target)) {
        setIsProfileBubbleOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsBubbleOpen(false);
        setIsProfileBubbleOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsBubbleOpen, isProfileBubbleOpen]);

  const playPopSound = () => {
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
  };

  const handleToggleSettingsBubble = () => {
    playPopSound();
    setIsSettingsBubbleOpen((prev) => !prev);
    setIsProfileBubbleOpen(false);
  };

  const handleToggleProfileBubble = () => {
    playPopSound();
    setIsProfileBubbleOpen((prev) => !prev);
    setIsSettingsBubbleOpen(false);
  };

  return (
    <>
      <div
        onClick={onCloseSidebar}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`sidebar sidebar-glass z-40 flex flex-col rounded-3xl border border-white/10 ${sidebarTone} ${isOpen ? "sidebar-open" : "sidebar-closed"} ${className}`}
        style={{
          margin: "1rem",
          background: "linear-gradient(135deg, rgba(15, 8, 20, 0.25) 0%, rgba(20, 10, 25, 0.3) 50%, rgba(15, 8, 20, 0.25) 100%)",
          backdropFilter: "blur(40px) saturate(160%)",
          WebkitBackdropFilter: "blur(40px) saturate(160%)",
          boxShadow: "0 28px 64px rgba(0, 0, 0, 0.55), 0 6px 30px rgba(168, 85, 247, 0.06), 0 2px 8px rgba(0, 0, 0, 0.25) inset",
        }}
      >
        {/* ── Premium Logo Section ── */}
        <div className="saheli-logo-section">
          <motion.div 
            className="saheli-logo-text-wrap"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="saheli-logo-name">Saheli</span>
            <span className="saheli-sparkle-icon">✨</span>
            <span className="saheli-logo-butterfly" aria-hidden />
            <span className="saheli-logo-badge ml-1">AI</span>
          </motion.div>
        </div>

        {/* ── New Chat Button ── */}
        <motion.button
          type="button"
          onClick={() => void onCreateChat()}
          whileHover={{ y: -1, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="new-chat-pill group"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          {newChatLabel}
        </motion.button>

        {/* ── Chat History ── */}
        <div className="custom-scrollbar flex-1 overflow-y-auto scroll-smooth">
          <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
            {recentChatsLabel}
          </div>
          {chatSessions.length === 0 ? (
            <p className={`px-2 py-3 text-sm ${subtleTextTone}`}>{isGuest ? noChatsGuestLabel : noChatsAccountLabel}</p>
          ) : (
            <div className="history-container">
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

        {/* ── Bottom Controls ── */}
        <div className={`mt-auto border-t pt-4 pb-2 flex flex-col gap-4 ${dividerTone}`}>
          
          {/* Top Row: Setting, Mute, Theme */}
          <div className="flex items-center justify-between px-2 gap-4">
            
            {/* 1. Settings Toggle */}
            <div className="relative flex">
              <motion.button
                ref={settingsButtonRef}
                type="button"
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleSettingsBubble}
                aria-label={settingsLabel}
                className={`sidebar-footer-btn ${isSettingsBubbleOpen ? "settings-active" : ""}`}
              >
                <motion.div
                  animate={{ rotate: isSettingsBubbleOpen ? 90 : 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Settings className="h-5 w-5 text-white/90" />
                </motion.div>
              </motion.button>

              {/* Settings Bubble - positioned to the right */}
              <div
                ref={settingsBubbleRef}
                className="absolute left-[calc(100%+1.25rem)] bottom-0 z-50"
              >
                <SettingsBubble
                  open={isSettingsBubbleOpen}
                  isLightMode={isLightMode}
                  memoryEnabled={memoryEnabled}
                  profileName={userName || "User"}
                  profileEmail={userEmail}
                  profileInitial={profileInitial}
                  onClose={() => setIsSettingsBubbleOpen(false)}
                  onThemeToggle={onToggleSidebarTheme}
                  onMemoryToggle={onToggleMemory}
                  onOpenMemory={onOpenMemory}
                  onOpenProfile={onOpenProfile}
                  onOpenSettings={onOpenSettings}
                  activeProvider={activeProvider}
                  onSelectProvider={onSelectProvider}
                />
              </div>
            </div>

            {/* 2. Mute Toggle */}
            <MuteButton muted={isTtsMuted} onToggle={onToggleTtsMute} />

            {/* 3. Theme Toggle */}
            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scaleX: 1.2, scaleY: 0.8 }}
              onClick={() => onToggleSidebarTheme(!isLightMode)}
              className="sidebar-footer-btn"
              aria-label="Toggle theme"
            >
              {isLightMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </motion.button>
          </div>

          {/* Bottom Row: Profile */}
          <div className="flex justify-center relative">
            <motion.button
              ref={profileButtonRef}
              type="button"
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleProfileBubble}
              className="sidebar-footer-btn profile-btn relative w-12 h-12"
              aria-label="Open profile"
            >
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt="avatar"
                  className="h-full w-full rounded-full object-cover border border-white/20"
                />
              ) : (
                <span className="text-lg font-bold text-white">{profileInitial}</span>
              )}
            </motion.button>
            <div ref={profileBubbleRef}>
              <ProfileBubble
                open={isProfileBubbleOpen}
                profileName={userName || "User"}
                profileEmail={userEmail}
                profileInitial={profileInitial}
                userPhotoUrl={userPhotoUrl}
                isGuest={isGuest}
                onClose={() => setIsProfileBubbleOpen(false)}
              />
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void onLogout()}
            className="mx-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/15 bg-gradient-to-r from-red-500/10 via-red-500/8 to-orange-500/10 px-4 py-3 text-sm font-semibold text-red-100 shadow-[0_12px_30px_rgba(239,68,68,0.12)] transition-all duration-300 hover:border-red-300/30 hover:text-white"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </motion.button>
        </div>
      </aside>
    </>
  );
}
