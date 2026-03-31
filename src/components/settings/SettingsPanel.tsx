import React, { useMemo } from "react";
import { LogOut, UserPen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppLanguage } from "@/lib/ai-service";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";

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

const LANGUAGE_OPTIONS: Array<{ value: ReplyLanguageMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
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
  const content = useMemo(() => ({
    general: (
      <SettingsSection
        label="General"
        title="Language"
        description="Choose a fixed reply language or let the app detect Hindi, English, or Hinglish from each message."
      >
        <SettingsRow
          title="Response language"
          description="Auto will mirror the language style used in the current prompt."
          border={false}
        >
          <Select value={languageMode} onValueChange={(value) => onLanguageModeChange(value as ReplyLanguageMode)}>
            <SelectTrigger className="w-[180px] rounded-xl border-white/10 bg-[#1e1e1e] text-white ring-0 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-[#1e1e1e] text-white">
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg text-white/80 focus:bg-white/10 focus:text-white"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
    ),
    personalization: (
      <SettingsSection
        label="Personalization"
        title="Memory"
        description="Control whether the assistant saves durable preferences, facts, and recent context."
      >
        <SettingsRow
          title="Reference saved memory"
          description="When enabled, replies can use stored memory that is relevant to the current conversation."
        >
          <button
            type="button"
            onClick={() => onMemoryToggle(!memoryEnabled)}
            className={`h-6 w-10 rounded-full p-1 transition duration-200 ${
              memoryEnabled ? "bg-purple-500" : "bg-gray-600"
            }`}
            aria-label="Toggle memory"
          >
            <div
              className={`h-4 w-4 rounded-full bg-white shadow-md transition duration-200 ${
                memoryEnabled ? "translate-x-4" : ""
              }`}
            />
          </button>
        </SettingsRow>
        <SettingsRow
          title="Manage memory"
          description="Review saved entries, delete individual items, or clear everything."
          border={false}
        >
          <button
            type="button"
            onClick={onManageMemory}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Manage Memory
          </button>
        </SettingsRow>
      </SettingsSection>
    ),
    account: (
      <SettingsSection
        label="Account"
        title="Profile"
        description="Update your identity details and manage the current session."
      >
        <SettingsRow
          title="Profile"
          description={profileSubtext}
        >
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{profileName}</p>
            </div>
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src={profileImageUrl || undefined} alt={profileName} className="object-cover" />
              <AvatarFallback className="bg-white/10 text-sm font-medium text-white">
                {profileInitial}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <UserPen className="h-4 w-4" />
              Edit
            </button>
          </div>
        </SettingsRow>
        <SettingsRow
          title="Change Password"
          description="Update your account password."
        >
          <button
            type="button"
            onClick={onChangePassword}
            className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm text-white transition duration-200 hover:bg-white/20"
          >
            Change
          </button>
        </SettingsRow>
        <SettingsRow
          title="Logout"
          description="Sign out of the current account and return to the landing page."
          border={false}
        >
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </SettingsRow>
      </SettingsSection>
    ),
  }) satisfies Record<SettingsSectionId, React.ReactNode>, [
    languageMode,
    onLanguageModeChange,
    memoryEnabled,
    onMemoryToggle,
    onManageMemory,
    profileSubtext,
    profileName,
    profileImageUrl,
    profileInitial,
    onEditProfile,
    onChangePassword,
    onLogout,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(44rem,calc(100vh-2rem))] w-[min(70rem,calc(100vw-2rem))] max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] p-0 text-white shadow-[0_8px_24px_rgba(0,0,0,0.32)]">
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
                  className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition duration-200 ${
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
            <div className="mx-auto max-w-3xl">{content[activeSection]}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(SettingsPanel);
