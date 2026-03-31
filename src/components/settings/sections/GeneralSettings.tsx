import React from "react";
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

type ReplyLanguageMode = "auto" | AppLanguage;

interface GeneralSettingsProps {
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
}

const LANGUAGE_OPTIONS: Array<{ value: ReplyLanguageMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
];

function GeneralSettings({ languageMode, onLanguageModeChange }: GeneralSettingsProps) {
  return (
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
  );
}

export default React.memo(GeneralSettings);
