import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PanelLeft,
  Plus,
  Settings,
  ArrowLeft,
  Palette,
  Mic,
  Brain,
  SlidersHorizontal,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  User,
  Check,
  Sparkles,
  ChevronRight,
  Languages,
  Bell,
  ShieldCheck,
  Heart,
  GraduationCap,
  Info,
  Clock3,
  MapPin,
  KeyRound,
  Ghost,
  Music,
  Smile,
  Sliders,
  LogOut,
  Pencil,
  RotateCcw,
} from "lucide-react";
import SaheliLogo from "../SaheliLogo";
import { ChatItem, type ChatSessionListItem } from "../Sidebar";

interface MobileFlipSidebarProps {
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
  onToggleTtsMute: () => void;
  onToggleSidebarTheme: (nextValue: boolean) => void;
  onOpenProfile: () => void;
  onOpenDesktopSettings: (sectionId?: string) => void;
  activeTheme?: string;
  onLogout?: () => void | Promise<void>;
}

// 5 Main Tabs + Direct Items from Desktop DEFAULT_LAYOUT
const MAIN_TABS = [
  { id: "general", label: "Bestie Essentials 🎀", desc: "Personality, Vibe Changer & Awareness", icon: SlidersHorizontal, color: "cyan" },
  { id: "personalization", label: "Swara Makeover 💄", desc: "Character avatar, Colors & Studio light", icon: Palette, color: "pink" },
  { id: "memory", label: "Sweet Memory 🥰", desc: "Chat memories, Ghost mode & Profiles", icon: Brain, color: "purple" },
  { id: "about", label: "Safe Space 🫧", desc: "Incognito Ghost mode & Custom API keys", icon: ShieldCheck, color: "emerald" },
  { id: "account", label: "User Hub 🪪", desc: "Profile edit, Password & Logout", icon: User, color: "blue" },
  { id: "reminders", label: "Swara's Alerts 📝", desc: "Global task alarms & notifications", icon: Bell, color: "indigo" },
  { id: "music", label: "Saheli Beats 🪩", desc: "Background music jukebox", icon: Music, color: "amber" },
];

const THEME_OPTIONS = [
  { id: "pink", label: "Pink Glow", color: "#ec4899" },
  { id: "yellow", label: "Gold", color: "#eab308" },
  { id: "blue", label: "Cyan", color: "#06b6d4" },
  { id: "orchid", label: "Purple", color: "#a855f7" },
  { id: "peach", label: "Peach", color: "#f97316" },
  { id: "maroon", label: "Rosewood", color: "#f43f5e" },
  { id: "gemini", label: "Gemini", color: "#3b82f6" },
];

const CHARACTER_CARDS = [
  { id: "swara", label: "Swara 🦋", image: "/butterfly.png" },
  { id: "aarohi", label: "Aarohi ✨", image: "/Aarohi ✨.png" },
  { id: "anvitha", label: "Anvitha 🤎", image: "/Anvitha 🤎.png" },
  { id: "kiyara", label: "Kiyara 🌼", image: "/Kiyara 🌼.png" },
  { id: "lavanya", label: "Lavanya 💜", image: "/Lavanya 💜.png" },
  { id: "meher", label: "Meher 🤎", image: "/Meher 🤎.png" },
  { id: "nyra", label: "Nyra 💙", image: "/Nyra 💙.png" },
  { id: "suryanshi", label: "Suryanshi 🌻", image: "/Suryanshi 🌻.png" },
  { id: "aelina", label: "Aelina 💎", image: "/Aelina 💎.png" },
  { id: "ruhi", label: "Ruhi 🌸", image: "/Ruhi 🌸.png" },
];

const NAMING_THEME_OPTIONS = [
  { id: "cute", label: "Cuteness Corner 🎀" },
  { id: "bestie", label: "Bestie Corner 💖" },
  { id: "professional", label: "Professional Mode 💼" },
  { id: "basic", label: "Basic Standard ⚙️" },
];

export const MobileFlipSidebar: React.FC<MobileFlipSidebarProps> = ({
  isOpen,
  chatSessions,
  currentChatId,
  isGuest,
  isLightMode,
  isTtsMuted,
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
  onToggleTtsMute,
  onToggleSidebarTheme,
  onOpenProfile,
  onOpenDesktopSettings,
  activeTheme = "pink",
  onLogout,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [selectedChar, setSelectedChar] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("saheli_selected_character") || "swara";
    }
    return "swara";
  });

  const [replyLang, setReplyLang] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reply_language_mode") || "auto";
    }
    return "auto";
  });

  const [personalityMode, setPersonalityMode] = useState<"bestie" | "mentor">(
    () => {
      if (typeof window !== "undefined") {
        return (
          (localStorage.getItem("saheli_personality") as "bestie" | "mentor") ||
          "bestie"
        );
      }
      return "bestie";
    }
  );

  const [namingTheme, setNamingTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("saheli_naming_theme") || "cute";
    }
    return "cute";
  });

  const [memoryEnabled, setMemoryEnabledState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("saheli_memory_enabled") !== "false";
    }
    return true;
  });

  const [incognitoMode, setIncognitoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("saheli_incognito_mode") === "true";
    }
    return false;
  });

  if (!isOpen) return null;

  const sortedSessions = [...chatSessions].sort((a, b) => {
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  const profileInitial = (userName.trim() || "User").charAt(0).toUpperCase();

  const handleFlipToSettings = () => {
    setIsFlipped(true);
    setActiveTab(null);
  };

  const handleFlipBackToSidebar = () => {
    if (activeTab) {
      setActiveTab(null);
    } else {
      setIsFlipped(false);
    }
  };

  const handleThemeChange = (themeId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saheli_active_theme", themeId);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(
        new CustomEvent("saheli_theme_change", { detail: themeId })
      );
    }
  };

  const handleCharacterSelect = (charId: string) => {
    setSelectedChar(charId);
    if (typeof window !== "undefined") {
      localStorage.setItem("saheli_selected_character", charId);
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleLanguageChange = (langMode: string) => {
    setReplyLang(langMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("reply_language_mode", langMode);
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handlePersonalityChange = (mode: "bestie" | "mentor") => {
    setPersonalityMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("saheli_personality", mode);
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleNamingThemeChange = (theme: string) => {
    setNamingTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("saheli_naming_theme", theme);
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleToggleMemory = (enabled: boolean) => {
    setMemoryEnabledState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("saheli_memory_enabled", String(enabled));
      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleToggleIncognito = (enabled: boolean) => {
    setIncognitoMode(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("saheli_incognito_mode", String(enabled));
      window.dispatchEvent(new Event("storage"));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCloseSidebar}
        className={`fixed inset-0 z-[9998] bg-black/75 backdrop-blur-md transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile Sidebar 3D Drawer Wrapper */}
      <div
        className="fixed inset-y-0 left-0 z-[9999] w-[88vw] max-w-[300px] p-3 md:hidden"
        style={{
          top: "16px",
          bottom: "16px",
          height: "calc(100dvh - 32px)",
        }}
      >
        <div className="relative h-full w-full" style={{ perspective: "1200px" }}>
          <motion.div
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative h-full w-full rounded-[28px]"
          >
            {/* FRONT FACE: Main Mobile Sidebar UI */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
              }}
              className={`flex flex-col justify-between text-white rounded-[28px] overflow-hidden bg-[#101017]/95 border border-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,105,180,0.15)] ${
                isFlipped ? "pointer-events-none" : ""
              }`}
            >
              {/* Bottom Glow */}
              <div className="sidebar-bottom-glow pointer-events-none absolute -bottom-10 left-6 right-6 h-24 bg-[radial-gradient(ellipse_at_center,rgba(255,105,180,0.28)_0%,rgba(255,105,180,0.14)_34%,transparent_74%)] blur-3xl" />

              {/* Header */}
              <div className="border-b border-white/[0.06] px-3 pb-2.5 pt-4 relative flex items-center justify-between">
                <div className="sidebar-logo-glow absolute top-1/2 left-4 w-24 h-12 -translate-y-1/2 bg-pink-500/20 blur-[20px] rounded-full pointer-events-none" />
                <div className="saheli-logo-section ml-1.5">
                  <SaheliLogo size={25} showText={true} />
                </div>
                <button
                  type="button"
                  onClick={onCloseSidebar}
                  className="text-white/50 hover:text-white transition duration-300 p-1 mr-1 relative z-10 cursor-pointer"
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

              {/* New Chat Button */}
              <motion.button
                type="button"
                onClick={() => void onCreateChat()}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="sidebar-new-chat-btn group mx-3 mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-pink-400/20 bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-3 py-2.5 text-xs font-medium tracking-[0.08em] text-pink-100 shadow-[0_12px_28px_rgba(0,0,0,0.3),0_0_20px_rgba(255,105,180,0.15)] transition duration-300 hover:border-pink-400/40 hover:from-pink-500/30 hover:to-purple-500/30 hover:text-white cursor-pointer"
              >
                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 text-pink-300" />
                {newChatLabel}
              </motion.button>

              {/* Scrollable Recent Chats */}
              <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/40">
                  {recentChatsLabel}
                </div>
                {sortedSessions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-white/50">
                    {isGuest ? noChatsGuestLabel : noChatsAccountLabel}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedSessions.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={currentChatId === chat.id}
                        title={resolveChatTitle(chat.title)}
                        activeTheme={activeTheme}
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

              {/* Footer Profile Box & Settings 3D Flip Trigger */}
              <div className="mt-auto border-t border-white/[0.08] px-2.5 pb-2.5 pt-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="sidebar-profile-box flex items-center gap-2.5 rounded-[20px] border border-pink-400/25 bg-black/60 px-3 py-2.5 transition duration-300 hover:border-pink-400/40 hover:shadow-[0_0_30px_rgba(255,105,180,0.15)]">
                  <div
                    onClick={onOpenProfile}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="sidebar-profile-avatar-box flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-400/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-[0_0_15px_rgba(255,105,180,0.2)]">
                      {userPhotoUrl ? (
                        <img
                          src={userPhotoUrl}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-pink-200/90">
                          {profileInitial}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white/95">
                        {userName || "User"}
                      </p>
                      <p className="sidebar-user-email truncate text-[10px] text-pink-200/70 font-medium tracking-wide">
                        {userEmail || (isGuest ? "Guest mode" : "Connected")}
                      </p>
                    </div>
                  </div>

                  {/* SETTINGS FLIP BUTTON */}
                  <button
                    type="button"
                    onClick={handleFlipToSettings}
                    aria-label={settingsLabel}
                    className="sidebar-profile-settings-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pink-400/40 bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-100 shadow-[0_0_20px_rgba(255,105,180,0.3)] transition duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* BACK FACE: Mirroring Exact Desktop DEFAULT_LAYOUT Settings */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
              className={`flex flex-col justify-between text-white rounded-[28px] overflow-hidden bg-[#0e0e14] border border-pink-500/30 shadow-[0_25px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(255,105,180,0.25)] ${
                !isFlipped ? "pointer-events-none" : ""
              }`}
            >
              {/* Header with Back Button */}
              <div className="border-b border-white/[0.1] px-3.5 py-3 flex items-center justify-between bg-black/70">
                <button
                  type="button"
                  onClick={handleFlipBackToSidebar}
                  className="flex items-center gap-1.5 rounded-full border border-pink-400/40 bg-gradient-to-r from-pink-500/30 to-purple-500/30 px-3.5 py-1.5 text-xs font-semibold text-pink-100 hover:brightness-125 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,105,180,0.3)] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{activeTab ? "Back" : "← Flip Back"}</span>
                </button>

                <span className="text-xs font-extrabold tracking-wider text-pink-200 uppercase truncate max-w-[140px]">
                  {activeTab ? activeTab : "Settings"}
                </span>
              </div>

              {/* Main Settings Body inside 3D Card */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {!activeTab ? (
                  /* LEVEL 1: Exact 5 Main Desktop Tabs + Direct Items */
                  <div className="space-y-2">
                    {MAIN_TABS.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <div
                          key={tab.id}
                          onClick={() => {
                            if (tab.id === "reminders") {
                              onOpenDesktopSettings("reminders");
                            } else if (tab.id === "music") {
                              onOpenDesktopSettings("music");
                            } else {
                              setActiveTab(tab.label);
                            }
                          }}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:border-pink-400/30 transition-all cursor-pointer group active:scale-98"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 group-hover:scale-105 transition-transform shrink-0">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-pink-100 transition-colors truncate">
                                {tab.label}
                              </div>
                              <div className="text-[10px] text-white/50 truncate">
                                {tab.desc}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-pink-300 transition-colors shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : activeTab === "Bestie Essentials 🎀" ? (
                  /* TAB 1: BESTIE ESSENTIALS (Personality, Vibe Changer, Language, Awareness) */
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    {/* Personality Mode */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-pink-200 flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-pink-400" />
                        <span>Personality Mode</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePersonalityChange("bestie")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            personalityMode === "bestie"
                              ? "bg-pink-500/20 border-pink-400/50 text-pink-100 shadow-[0_0_12px_rgba(255,105,180,0.3)]"
                              : "bg-white/[0.04] border-white/10 text-white/80"
                          }`}
                        >
                          <span>Bestie 💖</span>
                          {personalityMode === "bestie" && <Check className="h-3 w-3 text-pink-300" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePersonalityChange("mentor")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            personalityMode === "mentor"
                              ? "bg-purple-500/20 border-purple-400/50 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                              : "bg-white/[0.04] border-white/10 text-white/80"
                          }`}
                        >
                          <span>Mentor 🎓</span>
                          {personalityMode === "mentor" && <Check className="h-3 w-3 text-purple-300" />}
                        </button>
                      </div>
                    </div>

                    {/* Vibe Changer */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <Smile className="h-3.5 w-3.5 text-purple-400" />
                        <span>Vibe Changer (Naming Theme)</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {NAMING_THEME_OPTIONS.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleNamingThemeChange(theme.id)}
                            className={`p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer text-left truncate ${
                              namingTheme === theme.id
                                ? "bg-purple-500/20 border-purple-400/50 text-purple-100"
                                : "bg-white/[0.04] border-white/10 text-white/70"
                            }`}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reply Language */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                        <Languages className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Reply Language</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "auto", label: "Auto" },
                          { id: "hinglish", label: "Hinglish" },
                          { id: "hindi", label: "Hindi" },
                          { id: "english", label: "English" },
                        ].map((lang) => (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => handleLanguageChange(lang.id)}
                            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                              replyLang === lang.id
                                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-100"
                                : "bg-white/[0.04] border-white/10 text-white/70"
                            }`}
                          >
                            <span>{lang.label}</span>
                            {replyLang === lang.id && <Check className="h-3 w-3 text-emerald-300" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Light/Dark Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleSidebarTheme(!isLightMode)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <span>Theme: {isLightMode ? "Light Mode" : "Dark Mode"}</span>
                      {isLightMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-300" />}
                    </button>
                  </div>
                ) : activeTab === "Swara Makeover 💄" ? (
                  /* TAB 2: SWARA MAKEOVER (Character Selection & Theme Colors) */
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    {/* Theme Glow Palette */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-pink-200 flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5 text-pink-400" />
                        <span>Theme Glow Color</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {THEME_OPTIONS.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleThemeChange(theme.id)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                              activeTheme === theme.id
                                ? "bg-white/15 border-pink-400 shadow-[0_0_12px_rgba(255,105,180,0.4)]"
                                : "bg-white/[0.04] border-white/10 hover:bg-white/10"
                            }`}
                          >
                            <div
                              className="h-3.5 w-3.5 rounded-full border border-white/30 flex items-center justify-center"
                              style={{ backgroundColor: theme.color }}
                            >
                              {activeTheme === theme.id && <Check className="h-2 w-2 text-white" />}
                            </div>
                            <span className="text-[10px] text-white/80 font-medium truncate w-full text-center">
                              {theme.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3D Character Avatar Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>Select Companion Avatar</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {CHARACTER_CARDS.map((char) => (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => handleCharacterSelect(char.id)}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer ${
                              selectedChar === char.id
                                ? "bg-pink-500/20 border-pink-400/60 shadow-[0_0_12px_rgba(255,105,180,0.3)]"
                                : "bg-white/[0.04] border-white/10 hover:bg-white/10"
                            }`}
                          >
                            <div className="h-12 w-12 rounded-full overflow-hidden border border-white/20 bg-black/40">
                              <img
                                src={char.image}
                                alt={char.label}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-white/90 truncate w-full text-center">
                              {char.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeTab === "Sweet Memory 🥰" ? (
                  /* TAB 3: SWEET MEMORY (Auto-Save Memory Toggle & Profiles) */
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.04]">
                      <div>
                        <div className="text-xs font-bold text-white">Memory Auto-Save</div>
                        <div className="text-[10px] text-white/50">Save insights & preferences from chats</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleMemory(!memoryEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-300 ${
                          memoryEnabled ? "border-pink-400/40 bg-pink-500/30" : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full transition duration-300 ${
                            memoryEnabled ? "bg-pink-300 translate-x-[22px]" : "bg-white/40 translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenDesktopSettings("memory")}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-xs font-bold text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer"
                    >
                      <Brain className="h-4 w-4" />
                      <span>Inspect Chat & Image Memories</span>
                    </button>
                  </div>
                ) : activeTab === "Safe Space 🫧" ? (
                  /* TAB 4: SAFE SPACE (Incognito Ghost Mode & API Keys) */
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.04]">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Ghost className="h-4 w-4 text-emerald-400" />
                          <span>Incognito Ghost Mode</span>
                        </div>
                        <div className="text-[10px] text-white/50 mt-0.5">
                          No chat history or memories are saved while active.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleIncognito(!incognitoMode)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-300 ${
                          incognitoMode ? "border-emerald-400/40 bg-emerald-500/30" : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full transition duration-300 ${
                            incognitoMode ? "bg-emerald-300 translate-x-[22px]" : "bg-white/40 translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenDesktopSettings("api_keys")}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white/90 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4 text-amber-400" />
                      <span>Configure Custom API Keys</span>
                    </button>
                  </div>
                ) : activeTab === "User Hub 🪪" ? (
                  /* TAB 5: USER HUB (Account Profile, Password & Logout) */
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                      <div className="text-xs font-bold text-white">{userName || "User"}</div>
                      <div className="text-[10px] text-white/60">{userEmail || (isGuest ? "Guest account" : "Connected")}</div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-xs font-semibold text-pink-100 hover:bg-pink-500/30 transition-all cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit User Profile & Photo</span>
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => void onLogout()}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-all cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 text-red-400" />
                        <span>Sign Out / Logout</span>
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default MobileFlipSidebar;
