import React from "react";
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

type SettingsSectionId = "general" | "personalization" | "account";
type ReplyLanguageMode = "auto" | AppLanguage;

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
}

const SECTIONS: Array<{ id: SettingsSectionId; label: string }> = [
  { id: "general", label: "General" },
  { id: "personalization", label: "Personalization" },
  { id: "account", label: "Account" },
];

function SettingsPanel({
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
}: SettingsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(44rem,calc(100vh-2rem))] w-[min(70rem,calc(100vw-2rem))] max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] p-0 text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
        <div className="grid h-full min-h-0 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 bg-[#171717] px-4 py-5 md:border-b-0 md:border-r">
            <DialogHeader className="space-y-2 px-2 text-left">
              <DialogTitle className="text-xl font-semibold text-white">Settings</DialogTitle>
              <DialogDescription className="text-sm text-white/50">
                Preferences for language, memory, and account.
              </DialogDescription>
            </DialogHeader>

            <nav className="mt-6 space-y-1">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-transform duration-200 ${
                    activeSection === section.id
                      ? "bg-white/10 text-white"
                      : "text-white/55 hover:bg-white/5 hover:text-white"
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
