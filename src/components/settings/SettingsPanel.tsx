import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageIcon, Sparkles, Volume2, VolumeX, MessageSquareText } from "lucide-react";
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
}

const characterCards = [
  { id: "swara", label: "Swara 🦋", image: "/butterfly.png", accent: "from-pink-400/20 to-purple-400/10" },
  { id: "aarohi", label: "Aarohi 🌸", image: "/Aarohi 🌸.png", accent: "from-pink-500/20 to-rose-400/10" },
  { id: "elina", label: "Elina 🖤", image: "/Elina 🖤.png", accent: "from-gray-400/20 to-zinc-400/10" },
  { id: "kiara", label: "Kiara 🎀", image: "/Kiara 🎀.png", accent: "from-rose-400/20 to-pink-400/10" },
  { id: "meher", label: "Meher ✨", image: "/Meher ✨.jpeg", accent: "from-amber-400/20 to-yellow-400/10" },
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

function SectionShell({ label, title, description, children }: { label: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/35">{label}</p>
        <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white">{title}</h3>
        <p className="max-w-2xl text-sm leading-6 text-white/55">{description}</p>
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
}: SettingsPanelProps) {
  const t = getLang();
  const sections = useMemo(() => ([
    { id: "character" as const, label: "Character" },
    { id: "memory" as const, label: "Memory" },
    { id: "account" as const, label: "Account" },
    { id: "appearance" as const, label: "Appearance" },
    { id: "voice" as const, label: "Voice & Audio" },
    { id: "about" as const, label: "About Saheli" },
  ]), []);

  const selectedCharacterCard = characterCards.find((card) => card.id === selectedCharacter) ?? characterCards[0];

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
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
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
            transition={{ type: "spring", damping: 25, stiffness: 250, delay: 0.05 }}
            style={{
              background: "rgba(15, 15, 15, 0.4)",
              backdropFilter: "blur(25px)",
              border: "0.5px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
            }}
            className={`relative pointer-events-auto ml-4 flex max-h-[calc(100vh-100px)] flex-col rounded-[32px] overflow-hidden transition-[width] duration-300 ${activeSection === "character" ? "w-[280px]" : activeSection === "memory" ? "w-[300px]" : "w-[420px]"}`}
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
                  <SectionShell
                    label="Account"
                    title="Emotional Profile"
                    description="Open the immersive profile editor directly from here and keep the companion-facing identity polished."
                  >
                    <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                      <div className="flex items-center gap-4">
                        <div className="relative h-18 w-18 shrink-0 rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_0_26px_rgba(255,0,120,0.16)]">
                          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-400/20 to-purple-400/20">
                            {profileImageUrl ? (
                              <img src={profileImageUrl} alt={profileName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-2xl font-semibold text-white">{profileInitial}</span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-medium text-white">{profileName}</p>
                          <p className="truncate text-sm text-white/50">{profileSubtext}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={onEditProfile}
                          className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition duration-300 hover:border-pink-400/30 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-purple-500/10 hover:shadow-[0_0_20px_rgba(255,105,180,0.15)]"
                        >
                          Open emotional profile
                        </button>
                        <button
                          type="button"
                          onClick={onChangePassword}
                          className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition duration-300 hover:border-purple-400/30 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                        >
                          Change password
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-200 transition duration-300 hover:border-red-400/40 hover:bg-red-500/15 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      >
                        Logout
                      </button>
                    </div>
                  </SectionShell>
                </motion.div>
              ) : null}

              {activeSection === "appearance" ? (
                <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                  <SectionShell
                    label="Appearance"
                    title="Atmospheric Styling"
                    description="Tune the companion space’s visual tone without exposing routing or backend controls."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Soft Bloom", value: "bloom" },
                        { label: "Noir Glow", value: "noir" },
                        { label: "Velvet Mist", value: "mist" },
                        { label: "Orbital Warmth", value: "warm" },
                      ].map((item, index) => (
                        <div key={item.value} className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4 transition duration-300 hover:border-pink-400/30 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(255,105,180,0.1)] cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{item.label}</p>
                              <p className="text-xs text-white/45">Palette preset {index + 1}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-[0_0_20px_rgba(255,0,120,0.16)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionShell>
                </motion.div>
              ) : null}

              {activeSection === "voice" ? (
                <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                  <SectionShell
                    label="Voice & Audio"
                    title="Voice Presence"
                    description="Keep the voice layer elegant and quiet when needed."
                  >
                    <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">TTS Mute</p>
                          <p className="text-sm leading-6 text-white/50">Silence Saheli’s voice without changing the backend pipeline.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isTtsMuted}
                          onClick={onToggleTtsMute}
                          className={`inline-flex h-11 w-20 items-center rounded-full border px-1 transition duration-300 backdrop-blur-md ${isTtsMuted ? "border-pink-400/40 bg-white/10 shadow-[0_0_15px_rgba(255,105,180,0.3)]" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full transition duration-300 ${isTtsMuted ? "bg-white shadow-[0_0_15px_rgba(255,105,180,0.8)] text-pink-600 translate-x-0" : "bg-white/40 text-white/50 translate-x-9"}`}>
                            {isTtsMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </span>
                        </button>
                      </div>
                      <div className="rounded-[18px] border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white/55">
                        Reply language remains {languageMode === "auto" ? "automatic" : languageMode}.
                      </div>
                    </div>
                  </SectionShell>
                </motion.div>
              ) : null}

              {activeSection === "about" ? (
                <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                  <SectionShell
                    label="About Saheli"
                    title="A living AI companion space"
                    description="Cinematic, emotional, and fully frontend-driven on the presentation layer."
                  >
                    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-white/60 backdrop-blur-xl">
                      <p>Saheli keeps the same backend behavior and replaces only the visual language with glass, glow, and softer motion.</p>
                      <p className="mt-3">Selected character: {selectedCharacterCard.label}</p>
                    </div>
                  </SectionShell>
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