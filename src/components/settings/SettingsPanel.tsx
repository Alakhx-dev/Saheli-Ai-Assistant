import React, { useMemo } from "react";
import type { AppLanguage } from "@/lib/ai-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GeneralSettings from "@/components/settings/sections/GeneralSettings";
import MemorySettings from "@/components/settings/sections/MemorySettings";
import AccountSettings from "@/components/settings/sections/AccountSettings";
import { getLang } from "@/lib/useLanguage";

type SettingsSectionId = "general" | "personalization" | "account";
type ReplyLanguageMode = "auto" | AppLanguage;

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
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
}

function SettingsPanel({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
  languageMode,
  onLanguageModeChange,
  selectedVoice,
  onVoiceChange,
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
}: SettingsPanelProps) {
  const t = getLang();
  const sections: Array<{ id: SettingsSectionId; label: string }> = useMemo(() => [
    { id: "general", label: t.settings.general },
    { id: "personalization", label: t.settings.personalization },
    { id: "account", label: t.settings.account },
  ], [t]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(44rem,calc(100vh-2rem))] w-[min(70rem,calc(100vw-2rem))] max-w-6xl overflow-hidden rounded-xl border border-pink-500/10 bg-[#0d0510] p-0 text-white">
        <div className="grid h-full min-h-0 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-pink-500/8 bg-[#0a0810] px-4 py-5 md:border-b-0 md:border-r">
            <DialogHeader className="space-y-2 px-2 text-left">
              <DialogTitle className="text-xl font-semibold text-white">{t.settings.title}</DialogTitle>
              <DialogDescription className="text-sm text-white/50">
                {t.settings.description}
              </DialogDescription>
            </DialogHeader>

            <nav className="mt-6 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-transform duration-200 ${
                    activeSection === section.id
                      ? "bg-pink-500/10 text-pink-100"
                      : "text-white/55 hover:bg-pink-500/5 hover:text-white"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-h-0 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl">
              {activeSection === "general" ? (
                <GeneralSettings
                  languageMode={languageMode}
                  onLanguageModeChange={onLanguageModeChange}
                  selectedVoice={selectedVoice}
                  onVoiceChange={onVoiceChange}
                />
              ) : null}
              {activeSection === "personalization" ? (
                <MemorySettings
                  memoryEnabled={memoryEnabled}
                  onMemoryToggle={onMemoryToggle}
                  onManageMemory={onManageMemory}
                />
              ) : null}
              {activeSection === "account" ? (
                <AccountSettings
                  profileName={profileName}
                  profileSubtext={profileSubtext}
                  profileImageUrl={profileImageUrl}
                  profileInitial={profileInitial}
                  onEditProfile={onEditProfile}
                  onChangePassword={onChangePassword}
                  onLogout={onLogout}
                />
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(SettingsPanel);
