import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, PanelLeft, Pencil, Plus, Settings, Trash2, MoreHorizontal, Pin, Share2 } from "lucide-react";
import SaheliLogo from "./SaheliLogo";

export interface ChatSessionListItem {
  id: string;
  title: string;
  emoji?: string;
  isPinned?: boolean;
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
  onRenameChat?: (chatId: string, title: string) => void;
  onPinChat?: (chatId: string) => void | Promise<void>;
  onShareChat?: (chatId: string) => void | Promise<void>;
  onCloseSidebar?: () => void;
  onToggleSidebar: () => void;
  onToggleTtsMute: () => void;
  onToggleSidebarTheme: (nextValue: boolean) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void | Promise<void>;
  activeTheme?: string;
  customColor?: string;
  className?: string;
}

interface ChatItemProps {
  chat: ChatSessionListItem;
  isActive: boolean;
  title: string;
  activeTheme?: string;
  customColor?: string;
  onSelectChat: (chatId: string) => void | Promise<void>;
  onRenameChat?: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void | Promise<void>;
  onPinChat?: (chatId: string) => void | Promise<void>;
  onShareChat?: (chatId: string) => void | Promise<void>;
}

const ChatItem = memo(function ChatItem({
  chat,
  isActive,
  title,
  activeTheme,
  customColor,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onPinChat,
  onShareChat,
}: ChatItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const handleToggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const isDesktop = window.innerWidth > 768;

    if (isDesktop) {
      setMenuPosition({
        top: rect.top + window.scrollY,
        left: 308, // Fits perfectly outside the 300px sidebar area (left: 20px + width: 280px)
      });
    } else {
      setMenuPosition({
        top: rect.top + rect.height + window.scrollY + 4,
        left: Math.max(10, rect.right - 135),
      });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ${
        isActive 
          ? "bg-white/[0.03] backdrop-blur-[1px]" 
          : "bg-transparent hover:bg-white/[0.015] hover:backdrop-blur-[0.5px]"
      }`}
    >
      {/* Thin soft gradient accent line for active chat */}
      {isActive && (
        <div className="sidebar-active-chat-accent-line absolute left-0 top-2 bottom-2 w-[2px] bg-gradient-to-b from-pink-400/45 to-purple-400/15 rounded-full pointer-events-none" />
      )}

      <span className="text-[14px] shrink-0 w-4 h-4 flex items-center justify-center select-none transition duration-300 group-hover:scale-105">
        {chat.emoji || "💬"}
      </span>
      <button
        type="button"
        onClick={() => void onSelectChat(chat.id)}
        onDoubleClick={() => onRenameChat?.(chat.id, title)}
        className={`min-w-0 flex-1 overflow-hidden text-left text-[13px] tracking-wide transition-all duration-300 ease-out select-none ${
          isActive 
            ? "text-pink-100/85 font-medium drop-shadow-[0_0_4px_rgba(244,63,94,0.2)]" 
            : "text-slate-400/65 hover:text-slate-300/85 group-hover:text-slate-200/85"
        }`}
      >
        <span className="block truncate">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={title}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="block"
            >
              {title}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>

      <div className="ml-2 flex items-center gap-1.5 relative shrink-0">
        {chat.isPinned && (
          <Pin className="h-3 w-3 text-pink-400/80 rotate-45 shrink-0" />
        )}
        <>
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleMenu}
            aria-label="Chat options"
            className={`rounded-full p-1.5 transition-all duration-200 ${
              isMenuOpen 
                ? "bg-white/15 text-pink-300 opacity-100" 
                : "text-white/35 opacity-0 hover:bg-white/10 hover:text-white group-hover:opacity-100"
            }`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </motion.button>

          {isMenuOpen && createPortal(
            <>
              <div
                className="fixed inset-0 z-[10000] bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />
              <AnimatePresence>
                <div 
                  className={`saheli-app-wrapper theme-${activeTheme || "pink"}`}
                  style={activeTheme === "custom" && customColor ? getCustomThemeStyles(customColor) : undefined}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: -8 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="fixed z-[10001] min-w-[130px] rounded-xl border border-[rgba(var(--theme-primary-rgb),0.32)] bg-black/55 p-1 backdrop-blur-2xl"
                    style={{
                      top: menuPosition.top,
                      left: menuPosition.left,
                      boxShadow: `0 10px 25px rgba(0, 0, 0, 0.5), 0 0 22px ${
                        activeTheme === "custom"
                          ? "rgba(var(--theme-primary-rgb), 0.25)"
                          : THEME_GLOWS[activeTheme || "pink"] || "rgba(255, 105, 180, 0.25)"
                      }`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPinChat?.(chat.id);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium text-white/80 transition hover:bg-[rgba(var(--theme-primary-rgb),0.08)] hover:text-[var(--theme-light)]"
                    >
                      <Pin className="h-3 w-3 text-[var(--theme-primary)] shrink-0" />
                      <span>{chat.isPinned ? "Unpin" : "Pin"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameChat?.(chat.id, title);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium text-white/80 transition hover:bg-[rgba(var(--theme-primary-rgb),0.08)] hover:text-[var(--theme-light)]"
                    >
                      <Pencil className="h-3 w-3 text-[var(--theme-primary)] shrink-0" />
                      <span>Rename</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareChat?.(chat.id);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium text-white/80 transition hover:bg-[rgba(var(--theme-primary-rgb),0.08)] hover:text-[var(--theme-light)]"
                    >
                      <Share2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>Share</span>
                    </button>

                    <div className="my-0.5 border-t border-[rgba(var(--theme-primary-rgb),0.1)]" />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDeleteChat(chat.id);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3 text-red-400 shrink-0" />
                      <span>Delete</span>
                    </button>
                  </motion.div>
                </div>
              </AnimatePresence>
            </>
            , document.body
          )}
        </>
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
    onPinChat,
    onShareChat,
    onCloseSidebar,
    onToggleSidebar,
    onOpenSettings,
    activeTheme,
    customColor,
    className = "",
  } = props;


  const sortedSessions = [...chatSessions].sort((a, b) => {
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

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
        <div className="sidebar-bottom-glow pointer-events-none absolute -bottom-10 left-6 right-6 h-24 bg-[radial-gradient(ellipse_at_center,rgba(255,105,180,0.28)_0%,rgba(255,105,180,0.14)_34%,transparent_74%)] blur-3xl" />

        <div className="border-b border-white/[0.03] px-3 pb-2.5 pt-4 relative flex items-center justify-between">
          <div className="sidebar-logo-glow absolute top-1/2 left-4 w-24 h-12 -translate-y-1/2 bg-pink-500/20 blur-[20px] rounded-full pointer-events-none" />
          <div className="saheli-logo-section ml-1.5">
            <SaheliLogo size={25} showText={true} />
          </div>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="text-white/50 hover:text-white transition duration-300 p-1 mr-1 relative z-10"
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
          className="sidebar-new-chat-btn group mx-3 mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-pink-400/20 bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-3 py-2.5 text-xs font-medium tracking-[0.08em] text-pink-100/90 shadow-[0_12px_28px_rgba(0,0,0,0.3),0_0_20px_rgba(255,105,180,0.15)] backdrop-blur-xl transition duration-300 hover:border-pink-400/40 hover:from-pink-500/20 hover:to-purple-500/20 hover:text-white"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 text-pink-300" />
          {newChatLabel}
        </motion.button>

        <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/28">
            {recentChatsLabel}
          </div>
          {sortedSessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-white/42">{isGuest ? noChatsGuestLabel : noChatsAccountLabel}</p>
          ) : (
            <div className="space-y-1.5">
              {sortedSessions.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  title={resolveChatTitle(chat.title)}
                  activeTheme={activeTheme}
                  customColor={customColor}
                  onSelectChat={onSelectChat}
                  onRenameChat={onRenameChat}
                  onDeleteChat={onDeleteChat}
                  onPinChat={onPinChat}
                  onShareChat={onShareChat}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-white/[0.05] px-2.5 pb-2.5 pt-3 bg-gradient-to-t from-black/40 to-transparent">
          <div className="sidebar-profile-box flex items-center gap-2.5 rounded-[20px] border border-pink-400/20 bg-black/40 px-3 py-2.5 backdrop-blur-2xl transition duration-300 hover:border-pink-400/40 hover:bg-black/50 hover:shadow-[0_0_30px_rgba(255,105,180,0.15)]">
            <div className="sidebar-profile-avatar-box flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-400/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-[0_0_15px_rgba(255,105,180,0.2)]">
              {userPhotoUrl ? (
                <img src={userPhotoUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-pink-200/90">{profileInitial}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white/95">{userName || "User"}</p>
              <p className="sidebar-user-email truncate text-[10px] text-pink-200/60 font-medium tracking-wide">{userEmail || (isGuest ? "Guest mode" : "Connected")}</p>
            </div>

            <button
              type="button"
              onClick={() => { playPopSound(); onOpenSettings(); }}
              aria-label={settingsLabel}
              className="sidebar-profile-settings-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition duration-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/20 hover:border-pink-400/30 hover:text-pink-100 hover:shadow-[0_0_20px_rgba(255,105,180,0.3)]"
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

const THEME_GLOWS: Record<string, string> = {
  pink: "rgba(255, 105, 180, 0.25)",
  yellow: "rgba(255, 215, 0, 0.25)",
  blue: "rgba(0, 229, 255, 0.25)",
  orchid: "rgba(213, 0, 249, 0.25)",
  peach: "rgba(255, 158, 125, 0.25)",
  beige: "rgba(212, 184, 149, 0.2)",
  maroon: "rgba(208, 28, 63, 0.25)",
  gemini: "rgba(74, 137, 255, 0.25)",
};

const getCustomThemeStyles = (hex: string) => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  const rNormal = r / 255;
  const gNormal = g / 255;
  const bNormal = b / 255;
  const max = Math.max(rNormal, gNormal, bNormal);
  const min = Math.min(rNormal, gNormal, bNormal);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNormal: h = (gNormal - bNormal) / d + (gNormal < bNormal ? 6 : 0); break;
      case gNormal: h = (bNormal - rNormal) / d + 2; break;
      case bNormal: h = (rNormal - gNormal) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const themeLight = `hsl(${hDeg}, ${sPct}%, 88%)`;

  return {
    "--theme-primary": `#${cleanHex}`,
    "--theme-primary-rgb": `${r}, ${g}, ${b}`,
    "--theme-glow": `rgba(${r}, ${g}, ${b}, 0.35)`,
    "--theme-glow-rgb": `${r}, ${g}, ${b}`,
    "--theme-border": `rgba(${r}, ${g}, ${b}, 0.22)`,
    "--theme-soft": `rgba(${r}, ${g}, ${b}, 0.1)`,
    "--theme-light": themeLight,
  } as React.CSSProperties;
};
