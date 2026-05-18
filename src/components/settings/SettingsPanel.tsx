import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageIcon, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLang } from "@/lib/useLanguage";

type SettingsSectionId = "personalization" | "memory" | "account" | "appearance" | "voice" | "about";
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
  { id: "butterfly", label: "Butterfly Aura", image: "/butterfly.png", accent: "from-pink-400/20 to-purple-400/10" },
  { id: "pink", label: "Pink Velvet", image: "/butterflies/pink-transparent.png", accent: "from-pink-500/20 to-rose-400/10" },
  { id: "lavender", label: "Lavender Mist", image: "/butterflies/lavender-transparent.png", accent: "from-violet-400/20 to-fuchsia-400/10" },
];

function NavButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition duration-300 ${active ? "border-pink-400/30 bg-white/10 text-white shadow-[0_0_24px_rgba(255,0,120,0.16)]" : "border-white/8 bg-white/[0.03] text-white/65 hover:border-white/12 hover:bg-white/[0.06] hover:text-white"}`}
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
    { id: "personalization" as const, label: "Personalization" },
    { id: "memory" as const, label: "Memory Vault" },
    { id: "account" as const, label: "Account" },
    { id: "appearance" as const, label: "Appearance" },
    { id: "voice" as const, label: "Voice & Audio" },
    { id: "about" as const, label: "About Saheli" },
  ]), []);

  const selectedCharacterCard = characterCards.find((card) => card.id === selectedCharacter) ?? characterCards[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] h-[min(46rem,calc(100vh-2rem))] w-[min(76rem,calc(100vw-2rem))] max-w-[76rem] overflow-hidden rounded-[32px] border border-white/12 bg-[#0a0a0a]/95 p-0 text-white shadow-[0 25px 50px rgba(0,0,0,0.8), 0 0 60px rgba(255,105,180,0.15)] backdrop-blur-[30px]">
        <div className="grid h-full min-h-0 md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-white/[0.03] px-4 py-5 md:border-b-0 md:border-r md:px-5">
            <DialogHeader className="space-y-3 px-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em] text-white">{t.settings.title}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-white/50">
                {t.settings.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-2">
              {sections.map((section) => (
                <NavButton
                  key={section.id}
                  active={activeSection === section.id}
                  label={section.label}
                  onClick={() => onSectionChange(section.id)}
                />
              ))}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto px-5 py-5 md:px-7 md:py-7">
            <AnimatePresence mode="wait">
              {activeSection === "personalization" ? (
                <motion.div key="personalization" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                  <SectionShell
                    label="Personalization"
                    title="Character Studio"
                    description="Switch Swara’s aura, palette, and presentation without touching the backend model or memory system."
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {characterCards.map((card) => {
                        const active = selectedCharacter === card.id;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => onCharacterChange(card.id)}
                            className={`group overflow-hidden rounded-[24px] border p-3 text-left transition duration-300 ${active ? "border-pink-400/30 bg-white/10 shadow-[0_0_28px_rgba(255,0,120,0.16)]" : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"}`}
                          >
                            <div className={`relative aspect-[4/5] overflow-hidden rounded-[20px] bg-gradient-to-br ${card.accent}`}>
                              <img src={card.image} alt={card.label} className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-white">{card.label}</p>
                                <p className="text-[11px] text-white/45">Frontend-only style variant</p>
                              </div>
                              {active ? <Sparkles className="h-4 w-4 text-pink-200" /> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </SectionShell>
                </motion.div>
              ) : null}

              {activeSection === "memory" ? (
                <motion.div key="memory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
                  <SectionShell
                    label="Memory Vault"
                    title="Swara’s Memory Vault"
                    description="Manage memory without exposing technical model or provider routing controls."
                  >
                    <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">Long-term Memory</p>
                          <p className="text-sm leading-6 text-white/50">Keep insights and visual memories enabled.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={memoryEnabled}
                          onClick={() => onMemoryToggle(!memoryEnabled)}
                          className={`relative inline-flex h-6 w-12 items-center rounded-full border transition duration-300 ${memoryEnabled ? "border-pink-400/20 bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_20px_rgba(255,0,120,0.25)]" : "border-white/10 bg-white/10"}`}
                        >
                          <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.28)] transition duration-300 ${memoryEnabled ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onManageMemory}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-pink-400/15 bg-pink-500/5 px-4 py-3 text-sm font-medium text-white transition duration-300 hover:border-pink-300/25 hover:bg-pink-500/10"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Open memory vault
                      </button>
                    </div>
                  </SectionShell>
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
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition duration-300 hover:border-pink-400/20 hover:bg-white/[0.08]"
                        >
                          Open emotional profile
                        </button>
                        <button
                          type="button"
                          onClick={onChangePassword}
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition duration-300 hover:border-purple-400/20 hover:bg-white/[0.08]"
                        >
                          Change password
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-red-400/20 bg-transparent px-4 py-3 text-sm font-medium text-red-100 transition duration-300 hover:border-red-300/30 hover:bg-red-500/5"
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
                        <div key={item.value} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
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
                          className={`inline-flex h-11 w-20 items-center rounded-full border px-1 transition duration-300 ${isTtsMuted ? "border-pink-400/20 bg-white/10" : "border-white/10 bg-gradient-to-r from-pink-500/20 to-purple-500/15"}`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition duration-300 ${isTtsMuted ? "translate-x-0" : "translate-x-8"}`}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}