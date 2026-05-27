import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageIcon, MessageSquareText, Camera, Upload, Trash2, UserCircle, LogOut, KeyRound, Pencil, CalendarDays, Clock3, CloudSun, LocateFixed, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getLang } from "@/lib/useLanguage";
import type { RealtimeAwarenessSnapshot } from "@/lib/realtime-awareness";

type SettingsSectionId = "personalization" | "character" | "memory" | "account" | "appearance" | "voice" | "about" | "realtime";
type ReplyLanguageMode = "auto" | "english" | "hindi" | "hinglish";

const getThemeClasses = (color: string, type: "active" | "inactive" | "text" | "badge" | "hoverBorder" | "textLight" | "switchActive") => {
  switch (color) {
    case "yellow":
      if (type === "active") return "border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 to-amber-500/15 text-white shadow-[0_0_20px_rgba(255,215,0,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-yellow-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-yellow-300";
      if (type === "hoverBorder") return "hover:border-yellow-500/20";
      if (type === "textLight") return "text-yellow-300";
      if (type === "switchActive") return "border-yellow-400/35 bg-yellow-500/15 text-yellow-100";
      return "border-yellow-300/30 bg-yellow-500/15 text-yellow-100";
    case "blue":
      if (type === "active") return "border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-white shadow-[0_0_20px_rgba(0,229,255,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-cyan-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-cyan-300";
      if (type === "hoverBorder") return "hover:border-cyan-500/20";
      if (type === "textLight") return "text-cyan-300";
      if (type === "switchActive") return "border-cyan-400/35 bg-cyan-500/15 text-cyan-100";
      return "border-cyan-300/30 bg-cyan-500/15 text-cyan-100";
    case "orchid":
      if (type === "active") return "border-purple-500/40 bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-white shadow-[0_0_20px_rgba(213,0,249,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-purple-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-purple-300";
      if (type === "hoverBorder") return "hover:border-purple-500/20";
      if (type === "textLight") return "text-purple-300";
      if (type === "switchActive") return "border-purple-400/35 bg-purple-500/15 text-purple-100";
      return "border-purple-300/30 bg-purple-500/15 text-purple-100";
    case "peach":
      if (type === "active") return "border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-red-500/15 text-white shadow-[0_0_20px_rgba(255,158,125,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-orange-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-orange-300";
      if (type === "hoverBorder") return "hover:border-orange-500/20";
      if (type === "textLight") return "text-orange-300";
      if (type === "switchActive") return "border-orange-400/35 bg-orange-500/15 text-orange-100";
      return "border-orange-300/30 bg-orange-500/15 text-orange-100";
    case "beige":
      if (type === "active") return "border-amber-500/30 bg-gradient-to-r from-amber-600/10 to-amber-900/10 text-white shadow-[0_0_20px_rgba(212,184,149,0.1)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-amber-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-amber-200";
      if (type === "hoverBorder") return "hover:border-amber-500/20";
      if (type === "textLight") return "text-amber-200";
      if (type === "switchActive") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
      return "border-amber-300/20 bg-amber-500/15 text-amber-200";
    case "maroon":
      if (type === "active") return "border-red-500/40 bg-gradient-to-r from-red-800/15 to-red-950/15 text-white shadow-[0_0_20px_rgba(208,28,63,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-red-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-red-300";
      if (type === "hoverBorder") return "hover:border-red-500/20";
      if (type === "textLight") return "text-red-300";
      if (type === "switchActive") return "border-red-400/35 bg-red-500/15 text-red-100";
      return "border-red-300/30 bg-red-500/15 text-red-100";
    case "gemini":
      if (type === "active") return "border-blue-500/40 bg-gradient-to-r from-blue-500/15 to-indigo-950/25 text-white shadow-[0_0_20px_rgba(74,137,255,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-blue-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-blue-300";
      if (type === "hoverBorder") return "hover:border-blue-500/20";
      if (type === "textLight") return "text-blue-300";
      if (type === "switchActive") return "border-blue-400/35 bg-blue-500/15 text-blue-100";
      return "border-blue-300/30 bg-blue-500/15 text-blue-100";
    case "pink":
    default:
      if (type === "active") return "border-pink-500/40 bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-white shadow-[0_0_20px_rgba(255,105,180,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-pink-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-pink-300";
      if (type === "hoverBorder") return "hover:border-pink-500/20";
      if (type === "textLight") return "text-pink-300";
      if (type === "switchActive") return "border-pink-400/35 bg-pink-500/15 text-pink-100";
      return "border-pink-300/30 bg-pink-500/15 text-pink-100";
  }
};

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
  memoryEnabled: boolean;
  onMemoryToggle: (enabled: boolean) => void;
  onManageMemory: () => void;
  profileName: string;
  profileSubtext: string;
  profileImageUrl?: string;
  profileInitial: string;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  isTtsMuted: boolean;
  onToggleTtsMute: () => void;
  selectedCharacter: string;
  onCharacterChange: (character: string) => void;
  activeMode: "bestie" | "mentor";
  onModeChange: (mode: "bestie" | "mentor") => void;
  // Inline account editing props
  profileDraftName: string;
  onProfileNameChange: (name: string) => void;
  onProfileImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileImageDelete: () => void;
  onSaveProfile: (nameOverride?: string) => void;
  isSavingProfile: boolean;
  /** The original email/OAuth photo URL (fallback when custom is deleted) */
  originalPhotoUrl?: string;
  realtimeAwareness: RealtimeAwarenessSnapshot;
  awarenessLocationLabel: string;
  awarenessWeatherLabel: string;
  awarenessTimeFormat: "12h" | "24h";
  awarenessShowDayDate: boolean;
  awarenessRefreshing: boolean;
  onAwarenessTimeFormatChange: (mode: "12h" | "24h") => void;
  onAwarenessToggleDayDateVisibility: () => void;
  onAwarenessRefresh: () => void;
}

const characterCards = [
  { id: "swara", label: "Swara 🦋", image: "/butterfly.png", accent: "from-pink-400/20 to-purple-400/10" },
  { id: "aarohi", label: "Aarohi ✨", image: "/Aarohi ✨.png", accent: "from-red-500/20 to-rose-400/10" },
  { id: "vaidehi", label: "Vaidehi 🌻", image: "/Vaidehi 🌻.png", accent: "from-amber-400/20 to-yellow-400/10" },
  { id: "anvika", label: "Anvika 🌸", image: "/Anvika 🌸.png", accent: "from-pink-400/20 to-rose-300/10" },
];

function NavButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type="button"
      onClick={onClick}
      className={`settings-nav-button flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition duration-300 backdrop-blur-md ${active ? "border-pink-400/20 bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-white shadow-[0_0_20px_rgba(255,105,180,0.1)]" : "border-pink-500/5 bg-gradient-to-r from-pink-500/5 to-purple-500/5 text-white/65 hover:border-pink-500/15 hover:from-pink-500/10 hover:to-purple-500/10 hover:text-white"}`}
    >
      <span>{label}</span>
      {active ? <Check className="h-4 w-4 text-pink-200" /> : null}
    </motion.button>
  );
}

function SectionShell({
  label,
  title,
  description,
  children,
  compact = false,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-2">
        <p className={compact ? "text-[10px] font-medium uppercase tracking-[0.26em] text-white/35" : "text-[11px] font-medium uppercase tracking-[0.28em] text-white/35"}>{label}</p>
        <h3 className={compact ? "text-[1.35rem] font-semibold tracking-[-0.02em] text-white" : "text-2xl font-semibold tracking-[-0.02em] text-white"}>{title}</h3>
        <p className={compact ? "max-w-2xl text-[13px] leading-6 text-white/55" : "max-w-2xl text-sm leading-6 text-white/55"}>{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPanel({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
  languageMode,
  onLanguageModeChange,
  memoryEnabled,
  onMemoryToggle,
  onManageMemory,
  profileName,
  profileSubtext,
  profileImageUrl,
  profileInitial,
  onEditProfile,
  onChangePassword,
  onLogout,
  isTtsMuted,
  onToggleTtsMute,
  selectedCharacter,
  onCharacterChange,
  activeMode,
  onModeChange,
  profileDraftName,
  onProfileNameChange,
  onProfileImageSelect,
  onProfileImageDelete,
  onSaveProfile,
  isSavingProfile,
  originalPhotoUrl,
  realtimeAwareness,
  awarenessLocationLabel,
  awarenessWeatherLabel,
  awarenessTimeFormat,
  awarenessShowDayDate,
  awarenessRefreshing,
  onAwarenessTimeFormatChange,
  onAwarenessToggleDayDateVisibility,
  onAwarenessRefresh,
}: SettingsPanelProps) {
  const t = getLang();
  const accountFileRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(profileDraftName);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [activeInnerTab, setActiveInnerTab] = useState<"personality" | "bond" | "privacy">(() => {
    if (activeSection === "voice") {
      return "bond";
    }

    if (activeSection === "about") {
      return "privacy";
    }

    return "personality";
  });
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [groqKey, setGroqKey] = useState("");
  const [personalizationChild, setPersonalizationChild] = useState<"character" | "realtime" | "color" | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("saheli_theme_color");
      if (saved) return saved;
    }
    return "pink";
  });

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saheli_theme_color", color);
      window.dispatchEvent(new Event("saheli_theme_color_changed"));
    }
  };
  const [showContentPanel, setShowContentPanel] = useState(false);
  const sections = useMemo(() => ([
    { id: "personalization" as const, label: "Personalization" },
    { id: "memory" as const, label: "Memory" },
    { id: "account" as const, label: "Account" },
    { id: "appearance" as const, label: "Personality" },
    { id: "voice" as const, label: "Bond Level" },
    { id: "about" as const, label: "Privacy" },
  ]), []);
  const personalizationSections = useMemo(() => ([
    { id: "character" as const, label: "Character" },
    { id: "realtime" as const, label: "Date, Time & Weather" },
    { id: "color" as const, label: "Theme Color" },
  ]), []);

  const selectedCharacterCard = characterCards.find((card) => card.id === selectedCharacter) ?? characterCards[0];
  const activeSettingsView = activeSection === "appearance"
    ? "personality"
    : activeSection === "voice"
      ? "bond"
      : activeSection === "about"
        ? "privacy"
        : null;

  useEffect(() => {
    if (activeSettingsView) {
      setActiveInnerTab(activeSettingsView);
    }
  }, [activeSettingsView]);

  useEffect(() => {
    if (activeSection !== "personalization") {
      setPersonalizationChild(null);
    }
  }, [activeSection]);

  useEffect(() => {
    if (open) {
      setShowContentPanel(false);
      setPersonalizationChild(null);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-end pb-[24px] pl-[320px]">
          {/* Overlay to close */}
          <div className="absolute inset-0 pointer-events-auto" onClick={() => onOpenChange(false)} />

          <div className="flex items-end animate-soft-float pointer-events-none">
            {/* Level 1: Menu */}
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 500, mass: 0.3 }}
              style={{
                background: "rgba(15, 15, 15, 0.4)",
                backdropFilter: "blur(25px)",
                border: "0.5px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
              }}
              className="settings-menu-container relative pointer-events-auto w-[260px] rounded-[28px] p-4 flex flex-col gap-2"
            >
            <div className="mb-2 px-2">
              <h2 className="text-xl font-semibold tracking-tight text-white">{t.settings.title}</h2>
              <p className="text-[11px] text-white/50">{t.settings.description}</p>
            </div>
            
            <div className="flex flex-col gap-1">
              {sections.map((section) => (
                <NavButton
                  key={section.id}
                  active={activeSection === section.id}
                  label={section.label}
                  onClick={() => {
                    setShowContentPanel(true);
                    onSectionChange(section.id);
                    if (section.id === "personalization") {
                      setPersonalizationChild(null);
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Level 2: Content Panel */}
          <AnimatePresence>
          {showContentPanel ? (
          <motion.div
            key="content-panel"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 500, mass: 0.3 }}
            style={{
              background: "rgba(15, 15, 15, 0.4)",
              backdropFilter: "blur(25px)",
              border: "0.5px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
            }}
            className={`settings-content-panel relative pointer-events-auto ml-4 ${activeSection === "personalization" ? "mb-6" : "mb-2"} flex max-h-[calc(100vh-100px)] flex-col rounded-[32px] overflow-hidden transition-[width] duration-300 ${activeSection === "character" ? "w-[280px]" : activeSection === "memory" ? "w-[300px]" : activeSection === "personalization" ? "w-[320px]" : activeSection === "realtime" ? "w-[380px]" : "w-[360px]"}`}
          >
            <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence mode="wait">
              {activeSection === "personalization" ? (
                <motion.div key="personalization" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  <SectionShell
                    label="Personalization"
                    title="Customize your experience"
                    description="Choose what to personalize for Saheli."
                    compact
                  >
                    <div className="flex flex-col gap-2">
                      {personalizationSections.map((section) => (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          key={section.id}
                          type="button"
                          onClick={() => setPersonalizationChild(section.id)}
                          className={`flex w-full items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.02] px-4 py-3 text-left text-sm text-white/70 transition-all duration-300 hover:bg-white/[0.05] hover:text-white ${getThemeClasses(selectedColor, "hoverBorder")}`}
                        >
                          <span className="font-medium">{section.label}</span>
                          {personalizationChild === section.id ? <Check className={`h-4 w-4 ${getThemeClasses(selectedColor, "textLight")}`} /> : null}
                        </motion.button>
                      ))}
                    </div>
                  </SectionShell>
                </motion.div>
              ) : null}

              {activeSection === "character" ? (
                <motion.div key="character" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                    <div className="flex flex-col gap-2">
                      {characterCards.map((card) => {
                        const active = selectedCharacter === card.id;
                        return (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            key={card.id}
                            type="button"
                            onClick={() => onCharacterChange(card.id)}
                            className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition-all duration-300 ${active ? getThemeClasses(selectedColor, "active") : getThemeClasses(selectedColor, "inactive")}`}
                          >
                            <span className="font-medium">{card.label}</span>
                            {active ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getThemeClasses(selectedColor, "badge")}`}>
                                <Check className={`h-3 w-3 ${getThemeClasses(selectedColor, "textLight")}`} />
                                Active
                              </span>
                            ) : null}
                          </motion.button>
                        );
                      })}
                    </div>
                </motion.div>
              ) : null}

              {activeSection === "memory" ? (
                <motion.div key="memory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">Memory</p>
                          <p className="text-[11px] leading-5 text-white/50">Auto-save insights</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={memoryEnabled}
                          onClick={() => onMemoryToggle(!memoryEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-300 backdrop-blur-md ${memoryEnabled ? "border-pink-400/40 bg-white/10 shadow-[0_0_15px_rgba(255,105,180,0.3)]" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full transition duration-300 ${memoryEnabled ? "bg-white shadow-[0_0_15px_rgba(255,105,180,0.8)] translate-x-[22px]" : "bg-white/40 translate-x-[3px]"}`} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("saheli-memory-tab", { detail: "chat" }));
                            onManageMemory();
                          }}
                          className="flex w-full items-center gap-3 rounded-[16px] border border-pink-500/10 bg-gradient-to-r from-pink-500/5 to-purple-500/5 px-4 py-3.5 text-left text-sm font-medium text-white transition duration-300 hover:border-pink-500/30 hover:from-pink-500/10 hover:to-purple-500/10 hover:shadow-[0_0_20px_rgba(255,105,180,0.15)]"
                        >
                          <MessageSquareText className="h-4 w-4 text-pink-300" />
                          Chat Memory
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("saheli-memory-tab", { detail: "image" }));
                            onManageMemory();
                          }}
                          className="flex w-full items-center gap-3 rounded-[16px] border border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5 px-4 py-3.5 text-left text-sm font-medium text-white transition duration-300 hover:border-purple-500/30 hover:from-purple-500/10 hover:to-pink-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                        >
                          <ImageIcon className="h-4 w-4 text-purple-300" />
                          Image Memory
                        </button>
                      </div>
                    </div>
                </motion.div>
              ) : null}

              {activeSection === "account" ? (
                <motion.div key="account" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                    {/* Hidden file input for image upload */}
                    <input
                      ref={accountFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onProfileImageSelect}
                    />

                    <div className="space-y-3.5">
                      {/* ── Profile Picture ── */}
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setIsPhotoMenuOpen((prev) => !prev)}
                            className="h-20 w-20 rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_0_22px_rgba(255,0,120,0.14)] transition hover:border-pink-400/25"
                          >
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-400/20 to-purple-400/20">
                              {profileImageUrl ? (
                                <img src={profileImageUrl} alt={profileName} className="h-full w-full object-cover" />
                              ) : (
                                <UserCircle className="h-10 w-10 text-white/30" />
                              )}
                            </div>
                          </button>

                          {isPhotoMenuOpen ? (
                            <div className="absolute left-1/2 top-[88px] z-20 w-44 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#120b1b]/95 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  accountFileRef.current?.removeAttribute("capture");
                                  accountFileRef.current?.click();
                                  setIsPhotoMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Upload from Gallery
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (accountFileRef.current) {
                                    accountFileRef.current.setAttribute("capture", "user");
                                    accountFileRef.current.click();
                                    setTimeout(() => accountFileRef.current?.removeAttribute("capture"), 500);
                                  }
                                  setIsPhotoMenuOpen(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                Capture with Camera
                              </button>
                              {profileImageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onProfileImageDelete();
                                    setIsPhotoMenuOpen(false);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-red-200/80 transition hover:bg-red-500/10 hover:text-red-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Photo
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* ── Username ── */}
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">Username</p>
                            {isEditingName ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={localName}
                                  onChange={(e) => setLocalName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const trimmed = localName.trim();
                                      if (trimmed) {
                                        onProfileNameChange(trimmed);
                                        onSaveProfile(trimmed);
                                      }
                                      setIsEditingName(false);
                                    }
                                  }}
                                  autoFocus
                                  className="w-full rounded-xl border border-pink-400/25 bg-white/[0.02] px-3 py-1.5 text-sm font-medium text-white outline-none transition focus:border-pink-300/45"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const trimmed = localName.trim();
                                    if (trimmed) {
                                      onProfileNameChange(trimmed);
                                      onSaveProfile(trimmed);
                                    }
                                    setIsEditingName(false);
                                  }}
                                  className="rounded-full border border-pink-400/25 bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-100 transition hover:bg-pink-500/20"
                                >
                                  OK
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalName(profileDraftName);
                                  setIsEditingName(true);
                                }}
                                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-pink-400/25 hover:bg-white/[0.04]"
                              >
                                <span className="truncate text-sm font-medium text-white">{profileName}</span>
                                <Pencil className="h-3.5 w-3.5 text-white/45" />
                              </button>
                            )}
                            <p className="mt-1 text-[11px] text-white/40">{profileSubtext}</p>
                          </div>
                        </div>
                      </div>

                      {/* ── Password Change ── */}
                      <button
                        type="button"
                        onClick={onChangePassword}
                        className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/75 transition duration-300 hover:border-purple-400/20 hover:bg-white/[0.05] hover:text-white"
                      >
                        <KeyRound className="h-4 w-4 text-purple-300" />
                        Change Password
                      </button>

                      {/* ── Logout ── */}
                      <div className="flex justify-start pt-1">
                        <button
                          type="button"
                          onClick={onLogout}
                          className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-100 transition duration-300 hover:border-red-300/40 hover:bg-red-500/15"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Logout
                        </button>
                      </div>
                    </div>
                </motion.div>
              ) : null}

              {activeSection === "realtime" ? (
                <motion.div key="realtime" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  <section className="space-y-2">
                    <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Date, Time & Weather</h3>
                    <div className="space-y-2">
                      <div className="settings-glass-card space-y-2 !p-2.5">
                        <div className="flex items-center gap-2 text-white/85">
                          <Clock3 className="h-4 w-4 text-pink-300" />
                          <p className="text-[12px] font-semibold">Current time</p>
                        </div>
                        <p className="text-[14px] font-semibold text-white">{realtimeAwareness.datetime.currentTime}</p>
                        {awarenessShowDayDate ? (
                          <div className="space-y-0.5 text-[11px] text-white/62">
                            <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-purple-300" /> {realtimeAwareness.datetime.currentDate}</p>
                            <p>{realtimeAwareness.datetime.weekday} • {realtimeAwareness.datetime.dayState === "night" ? "Night" : "Day"}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="settings-glass-card space-y-1 !p-2.5">
                        <p className="text-[12px] font-semibold text-white/90">Time format</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAwarenessTimeFormatChange("12h")}
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-5 transition ${awarenessTimeFormat === "12h" ? getThemeClasses(selectedColor, "switchActive") : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"}`}
                          >
                            12-hour
                          </button>
                          <button
                            type="button"
                            onClick={() => onAwarenessTimeFormatChange("24h")}
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-5 transition ${awarenessTimeFormat === "24h" ? getThemeClasses(selectedColor, "switchActive") : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"}`}
                          >
                            24-hour
                          </button>
                        </div>
                      </div>

                      <div className="settings-glass-card flex items-start justify-between gap-2.5 !p-2.5">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-white">Show on chat page</p>
                          <p className="mt-0.5 text-[9px] leading-none text-white/35">Show on chat page</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={awarenessShowDayDate}
                          onClick={onAwarenessToggleDayDateVisibility}
                          className={`settings-toggle-track scale-90 origin-right ${awarenessShowDayDate ? "settings-toggle-track-on" : ""}`}
                        >
                          <span className={`settings-toggle-thumb ${awarenessShowDayDate ? "settings-toggle-thumb-on" : ""}`} />
                        </button>
                      </div>

                      <div className="settings-glass-card space-y-1.5 !p-2.5">
                        <p className="flex items-center gap-2 text-[12px] font-semibold text-white">
                          <CloudSun className="h-4 w-4 text-amber-300" />
                          Weather
                        </p>
                        <p className="text-[12px] text-white/75">{awarenessWeatherLabel}</p>
                        {realtimeAwareness.weather ? (
                          <div className="space-y-0.5 text-[11px] text-white/60">
                            <p>
                              Temp: {Math.round(realtimeAwareness.weather.temperatureC)}°C • {realtimeAwareness.weather.condition}
                            </p>
                            {typeof realtimeAwareness.weather.feelsLikeC === "number" ? (
                              <p>Feels like: {Math.round(realtimeAwareness.weather.feelsLikeC)}°C</p>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="flex items-center gap-2 text-[11px] text-white/55">
                          <LocateFixed className="h-3.5 w-3.5 text-cyan-300" />
                          {awarenessLocationLabel}
                        </p>
                        <button
                          type="button"
                          onClick={onAwarenessRefresh}
                          disabled={awarenessRefreshing}
                          className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/20 bg-pink-500/10 px-2.5 py-1 text-[11px] font-medium text-pink-100 transition hover:border-pink-300/35 hover:bg-pink-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw className={`h-3 w-3 ${awarenessRefreshing ? "animate-spin" : ""}`} />
                          {awarenessRefreshing ? "Refreshing..." : "Refresh weather/location"}
                        </button>
                      </div>
                    </div>
                  </section>
                </motion.div>
              ) : null}

              {activeSection === "appearance" ? (
                <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  {activeInnerTab === "personality" ? (
                    <SectionShell
                      label="Personality"
                      title="Choose the interaction style"
                      description="Pick how Saheli should sound in your conversations."
                      compact
                    >
                      <div className="flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            onModeChange("bestie");
                          }}
                          className={`settings-glass-card settings-personality-card text-left !p-3 ${activeMode === "bestie" ? "settings-personality-card-active" : ""}`}
                        >
                          <p className={`text-[13px] font-semibold tracking-[-0.02em] ${activeMode === "bestie" ? "text-pink-100" : "text-white"}`}>
                            Bestie Mode
                          </p>
                          <p className="mt-1 text-[12px] leading-5 text-white/58">
                            Casual, friendly, and matches your energy. Perfect for daily chats.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onModeChange("mentor");
                          }}
                          className={`settings-glass-card settings-personality-card text-left !p-3 ${activeMode === "mentor" ? "settings-personality-card-active" : ""}`}
                        >
                          <p className={`text-[13px] font-semibold tracking-[-0.02em] ${activeMode === "mentor" ? "text-pink-100" : "text-white"}`}>
                            Study Coach / Mentor
                          </p>
                          <p className="mt-1 text-[12px] leading-5 text-white/58">
                            Serious, academic, and professional. Best for solving doubts and code.
                          </p>
                        </button>
                      </div>
                    </SectionShell>
                  ) : null}

                </motion.div>
              ) : null}

              {activeSection === "voice" ? (
                <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  {activeInnerTab === "bond" ? (
                    <SectionShell
                      label="Bond Level"
                      title="Relationship progress"
                      description="A soft, playful progress view for the companion bond."
                      compact
                    >
                      <div className="space-y-2.5">
                        <div>
                          <p className="text-[13px] font-semibold tracking-[-0.02em] text-white">Level 4: Best Friends Forever</p>
                          <div className="settings-progress-track mt-2">
                            <div className="settings-progress-fill settings-progress-fill-animated" style={{ width: "84%" }} />
                          </div>
                          <p className="mt-2 text-[12px] text-white/50">840 / 1000 XP to next level</p>
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            className="settings-glass-button settings-danger-button py-2.5 text-[13px]"
                          >
                            Reset Core Memory
                          </button>
                        </div>
                      </div>
                    </SectionShell>
                  ) : null}
                </motion.div>
              ) : null}

              {activeSection === "about" ? (
                <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  {activeInnerTab === "privacy" ? (
                    <div className="space-y-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/35">Privacy control</p>
                      <div className="flex flex-col gap-4">
                        <div className="settings-glass-card flex items-start justify-between gap-3 !p-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold tracking-[-0.02em] text-white">Incognito Mode</p>
                            <p className="mt-1 text-[12px] leading-5 text-white/55">
                              Keeps these settings local while it is on. Nothing from this panel is stored.
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={incognitoMode}
                            onClick={() => setIncognitoMode((value) => !value)}
                            className={`settings-toggle-track ${incognitoMode ? "settings-toggle-track-on" : ""}`}
                          >
                            <span className={`settings-toggle-thumb ${incognitoMode ? "settings-toggle-thumb-on" : ""}`} />
                          </button>
                        </div>

                        <div className="settings-glass-card flex items-start justify-between gap-3 !p-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold tracking-[-0.02em] text-white">Custom API Keys (Optional)</p>
                            <p className="mt-1 text-[12px] leading-5 text-white/45">
                              Use your own keys to bypass system limits. Models and backend logic will remain 100% identical.
                            </p>

                            <div className="mt-3 flex flex-col gap-2.5">
                              <input
                                value={groqKey}
                                onChange={(event) => setGroqKey(event.target.value)}
                                type="password"
                                placeholder="Enter Groq API Key (gsk_...)"
                                className="settings-api-input py-2.5 text-[13px]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
            </div>
          </motion.div>
          ) : null}
          </AnimatePresence>

          <AnimatePresence>
          {showContentPanel && activeSection === "personalization" && personalizationChild ? (
            <motion.div
              key="personalization-child-panel"
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 500, mass: 0.3 }}
              style={{
                background: "rgba(15, 15, 15, 0.4)",
                backdropFilter: "blur(25px)",
                border: "0.5px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
              }}
              className={`settings-child-panel relative pointer-events-auto ml-4 mb-6 flex max-h-[calc(100vh-100px)] flex-col rounded-[28px] overflow-hidden transition-[width] duration-300 ${personalizationChild === "color" ? "w-[245px]" : personalizationChild === "character" ? "w-[280px]" : "w-[340px]"}`}
            >
              <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <AnimatePresence mode="wait">
                  {personalizationChild === "character" ? (
                    <motion.div key="personalization-character" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                      <div className="flex flex-col gap-2">
                        {characterCards.map((card) => {
                          const active = selectedCharacter === card.id;
                          return (
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              key={card.id}
                              type="button"
                              onClick={() => onCharacterChange(card.id)}
                              className={`settings-character-btn flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition-all duration-300 ${active ? getThemeClasses(selectedColor, "active") : getThemeClasses(selectedColor, "inactive")}`}
                            >
                              <span className="font-medium">{card.label}</span>
                              {active ? (
                                <span className={`settings-character-badge inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getThemeClasses(selectedColor, "badge")}`}>
                                  <Check className={`h-3 w-3 ${getThemeClasses(selectedColor, "textLight")}`} />
                                  Active
                                </span>
                              ) : null}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}

                  {personalizationChild === "color" ? (
                    <motion.div key="personalization-color" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Theme Color</h3>
                          <p className="text-[11.5px] text-white/50 leading-relaxed">Customize Saheli AI's visual accents.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "pink", label: "Pink", gradientBg: "linear-gradient(135deg, #ff0078 0%, #ff69b4 100%)", flower: "🌸", glowColor: "rgba(255, 0, 120, 0.35)" },
                            { id: "yellow", label: "Light Yellow", gradientBg: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", flower: "🌼", glowColor: "rgba(255, 215, 0, 0.35)" },
                            { id: "blue", label: "Sky Blue", gradientBg: "linear-gradient(135deg, #87CEEB 0%, #00E5FF 100%)", flower: "🪻", glowColor: "rgba(0, 229, 255, 0.35)" },
                            { id: "orchid", label: "Orchid", gradientBg: "linear-gradient(135deg, #D500F9 0%, #FF66CC 100%)", flower: "🪷", glowColor: "rgba(213, 0, 249, 0.35)" },
                            { id: "peach", label: "Sweet Peach", gradientBg: "linear-gradient(135deg, #FF9E7D 0%, #FF6B6B 100%)", flower: "🏵️", glowColor: "rgba(255, 158, 125, 0.35)" },
                            { id: "beige", label: "Dark Cream", gradientBg: "linear-gradient(135deg, #EADBC8 0%, #8D7B68 100%)", flower: "🌾", glowColor: "rgba(212, 184, 149, 0.35)" },
                            { id: "maroon", label: "Maroon", gradientBg: "linear-gradient(135deg, #D01C3F 0%, #6E0016 100%)", flower: "🌹", glowColor: "rgba(208, 28, 63, 0.35)" },
                            { id: "gemini", label: "Gemini Blue", gradientBg: "linear-gradient(135deg, #4A89FF 0%, #1A365D 100%)", flower: "💙", glowColor: "rgba(74, 137, 255, 0.35)" },
                          ].map((item) => {
                            const active = selectedColor === item.id;
                            return (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                key={item.id}
                                type="button"
                                onClick={() => handleColorChange(item.id)}
                                className={`relative flex flex-col items-center justify-center gap-2 rounded-[14px] border px-2 py-3 text-center text-sm transition-all duration-300 ${
                                  active 
                                    ? "bg-white/[0.04] text-white shadow-[0_12px_24px_rgba(0,0,0,0.4)]" 
                                    : "border-white/5 bg-white/[0.02] text-white/70 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                                }`}
                                style={
                                  active 
                                    ? { 
                                        borderColor: item.glowColor.replace("0.35", "0.5"), 
                                        boxShadow: `0 8px 20px rgba(0, 0, 0, 0.4), 0 0 12px ${item.glowColor}` 
                                      } 
                                    : {}
                                }
                              >
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-md relative overflow-hidden transition-transform duration-300"
                                  style={{ 
                                    background: item.gradientBg, 
                                    border: active ? "1.5px solid rgba(255,255,255,0.45)" : "1.5px solid rgba(255,255,255,0.15)"
                                  }}
                                >
                                  <span className={`select-none text-[1.1rem] leading-none z-10 transition-transform duration-300 ${active ? "scale-110" : "hover:scale-105"}`}>
                                    {item.flower}
                                  </span>
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none" />
                                </div>
                                <span className={`font-semibold text-[10px] tracking-wide ${active ? "text-white" : "text-white/60"}`}>{item.label}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

                  {personalizationChild === "realtime" ? (
                    <motion.div key="personalization-realtime" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                      <section className="space-y-2">
                        <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Date, Time & Weather</h3>
                        <div className="space-y-2">
                          <div className="settings-glass-card space-y-2 !p-2.5">
                            <div className="flex items-center gap-2 text-white/85">
                              <Clock3 className="h-4 w-4 text-pink-300" />
                              <p className="text-[12px] font-semibold">Current time</p>
                            </div>
                            <p className="text-[14px] font-semibold text-white">{realtimeAwareness.datetime.currentTime}</p>
                            {awarenessShowDayDate ? (
                              <div className="space-y-0.5 text-[11px] text-white/62">
                                <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-purple-300" /> {realtimeAwareness.datetime.currentDate}</p>
                                <p>{realtimeAwareness.datetime.weekday} • {realtimeAwareness.datetime.dayState === "night" ? "Night" : "Day"}</p>
                              </div>
                            ) : null}
                          </div>

                          <div className="settings-glass-card space-y-1 !p-2.5">
                            <p className="text-[12px] font-semibold text-white/90">Time format</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onAwarenessTimeFormatChange("12h")}
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-5 transition ${awarenessTimeFormat === "12h" ? getThemeClasses(selectedColor, "switchActive") : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"}`}
                              >
                                12-hour
                              </button>
                              <button
                                type="button"
                                onClick={() => onAwarenessTimeFormatChange("24h")}
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-5 transition ${awarenessTimeFormat === "24h" ? getThemeClasses(selectedColor, "switchActive") : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"}`}
                              >
                                24-hour
                              </button>
                            </div>
                          </div>

                          <div className="settings-glass-card flex items-start justify-between gap-2.5 !p-2.5">
                            <div>
                              <p className="text-[12px] font-semibold text-white">Show on chat page</p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={awarenessShowDayDate}
                              onClick={onAwarenessToggleDayDateVisibility}
                              className={`settings-toggle-track scale-90 origin-right ${awarenessShowDayDate ? "settings-toggle-track-on" : ""}`}
                            >
                              <span className={`settings-toggle-thumb ${awarenessShowDayDate ? "settings-toggle-thumb-on" : ""}`} />
                            </button>
                          </div>

                          <div className="settings-glass-card space-y-1.5 !p-2.5">
                            <p className="flex items-center gap-2 text-[12px] font-semibold text-white">
                              <CloudSun className="h-4 w-4 text-amber-300" />
                              Weather
                            </p>
                            <p className="text-[12px] text-white/75">{awarenessWeatherLabel}</p>
                            {realtimeAwareness.weather ? (
                              <div className="space-y-0.5 text-[11px] text-white/60">
                                <p>
                                  Temp: {Math.round(realtimeAwareness.weather.temperatureC)}°C • {realtimeAwareness.weather.condition}
                                </p>
                                {typeof realtimeAwareness.weather.feelsLikeC === "number" ? (
                                  <p>Feels like: {Math.round(realtimeAwareness.weather.feelsLikeC)}°C</p>
                                ) : null}
                              </div>
                            ) : null}
                            <p className="flex items-center gap-2 text-[11px] text-white/55">
                              <LocateFixed className="h-3.5 w-3.5 text-cyan-300" />
                              {awarenessLocationLabel}
                            </p>
                            <button
                              type="button"
                              onClick={onAwarenessRefresh}
                              disabled={awarenessRefreshing}
                              className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/20 bg-pink-500/10 px-2.5 py-1 text-[11px] font-medium text-pink-100 transition hover:border-pink-300/35 hover:bg-pink-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <RefreshCw className={`h-3 w-3 ${awarenessRefreshing ? "animate-spin" : ""}`} />
                              {awarenessRefreshing ? "Refreshing..." : "Refresh weather/location"}
                            </button>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
          </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}