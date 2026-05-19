import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageIcon, Sparkles, Volume2, VolumeX, MessageSquareText, Camera, Upload, Trash2, UserCircle, LogOut, KeyRound, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getLang } from "@/lib/useLanguage";

type SettingsSectionId = "character" | "memory" | "account" | "appearance" | "voice" | "about";
type ReplyLanguageMode = "auto" | "english" | "hindi" | "hinglish";

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
  // Inline account editing props
  profileDraftName: string;
  onProfileNameChange: (name: string) => void;
  onProfileImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileImageDelete: () => void;
  onSaveProfile: (nameOverride?: string) => void;
  isSavingProfile: boolean;
  /** The original email/OAuth photo URL (fallback when custom is deleted) */
  originalPhotoUrl?: string;
}

const characterCards = [
  { id: "swara", label: "Swara 🦋", image: "/butterfly.png", accent: "from-pink-400/20 to-purple-400/10" },
  { id: "aarohi", label: "Aarohi 🌸", image: "/Aarohi 🌸.png", accent: "from-pink-500/20 to-rose-400/10" },
  { id: "elina", label: "Elina 🖤", image: "/Elina 🖤.png", accent: "from-gray-400/20 to-zinc-400/10" },
  { id: "kiara", label: "Kiara 🎀", image: "/Kiara 🎀.png", accent: "from-rose-400/20 to-pink-400/10" },
  { id: "meher", label: "Meher ✨", image: "/Meher ✨.png", accent: "from-amber-400/20 to-yellow-400/10" },
  { id: "zoya", label: "Zoya ❤️", image: "/Zoya ❤️.png", accent: "from-red-400/20 to-rose-400/10" },
];

function NavButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition duration-300 backdrop-blur-md ${active ? "border-pink-400/20 bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-white shadow-[0_0_20px_rgba(255,105,180,0.1)]" : "border-pink-500/5 bg-gradient-to-r from-pink-500/5 to-purple-500/5 text-white/65 hover:border-pink-500/15 hover:from-pink-500/10 hover:to-purple-500/10 hover:text-white"}`}
    >
      <span>{label}</span>
      {active ? <Check className="h-4 w-4 text-pink-200" /> : null}
    </button>
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
  profileDraftName,
  onProfileNameChange,
  onProfileImageSelect,
  onProfileImageDelete,
  onSaveProfile,
  isSavingProfile,
  originalPhotoUrl,
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
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [selectedPersonality, setSelectedPersonality] = useState<"bestie" | "coach">("bestie");
  const sections = useMemo(() => ([
    { id: "character" as const, label: "Character" },
    { id: "memory" as const, label: "Memory" },
    { id: "account" as const, label: "Account" },
    { id: "appearance" as const, label: "Personality" },
    { id: "voice" as const, label: "Bond Level" },
    { id: "about" as const, label: "Privacy" },
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-end pb-[24px] pl-[320px]">
          {/* Overlay to close */}
          <div className="absolute inset-0 pointer-events-auto" onClick={() => onOpenChange(false)} />

          {/* Level 1: Menu */}
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 420, mass: 0.55 }}
            style={{
              background: "rgba(15, 15, 15, 0.4)",
              backdropFilter: "blur(25px)",
              border: "0.5px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
            }}
            className="relative pointer-events-auto w-[260px] rounded-[28px] p-4 flex flex-col gap-2"
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
                  onClick={() => onSectionChange(section.id)}
                />
              ))}
            </div>
          </motion.div>

          {/* Level 2: Content Panel */}
          <motion.div
            key={activeSection || "empty"}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 420, mass: 0.55 }}
            style={{
              background: "rgba(15, 15, 15, 0.4)",
              backdropFilter: "blur(25px)",
              border: "0.5px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
            }}
            className={`relative pointer-events-auto ml-4 flex max-h-[calc(100vh-100px)] flex-col rounded-[32px] overflow-hidden transition-[width] duration-300 ${activeSection === "character" ? "w-[280px]" : activeSection === "memory" ? "w-[300px]" : "w-[360px]"}`}
          >
            <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence mode="wait">
              {activeSection === "character" ? (
                <motion.div key="character" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="flex flex-col gap-2">
                      {characterCards.map((card) => {
                        const active = selectedCharacter === card.id;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => onCharacterChange(card.id)}
                            className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition-all duration-300 ${active ? "border-pink-500/40 bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-white shadow-[0_0_20px_rgba(255,105,180,0.15)]" : "border-white/5 bg-white/[0.02] text-white/70 hover:border-pink-500/20 hover:bg-white/[0.05] hover:text-white"}`}
                          >
                            <span className="font-medium">{card.label}</span>
                            {active && <Check className="h-4 w-4 text-pink-400" />}
                          </button>
                        );
                      })}
                    </div>
                </motion.div>
              ) : null}

              {activeSection === "memory" ? (
                <motion.div key="memory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
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
                <motion.div key="account" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
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

              {activeSection === "appearance" ? (
                <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
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
                          onClick={() => setSelectedPersonality("bestie")}
                          className={`settings-glass-card settings-personality-card text-left !p-3 ${selectedPersonality === "bestie" ? "settings-personality-card-active" : ""}`}
                        >
                          <p className={`text-[13px] font-semibold tracking-[-0.02em] ${selectedPersonality === "bestie" ? "text-pink-100" : "text-white"}`}>
                            Bestie Mode
                          </p>
                          <p className="mt-1 text-[12px] leading-5 text-white/58">
                            Casual, friendly, and matches your energy. Perfect for daily chats.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPersonality("coach")}
                          className={`settings-glass-card settings-personality-card text-left !p-3 ${selectedPersonality === "coach" ? "settings-personality-card-active" : ""}`}
                        >
                          <p className={`text-[13px] font-semibold tracking-[-0.02em] ${selectedPersonality === "coach" ? "text-pink-100" : "text-white"}`}>
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
                <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
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
                <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
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
                              <input
                                value={openRouterKey}
                                onChange={(event) => setOpenRouterKey(event.target.value)}
                                type="password"
                                placeholder="Enter OpenRouter API Key (sk-or-v1-...)"
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
        </div>
      )}
    </AnimatePresence>
  );
}