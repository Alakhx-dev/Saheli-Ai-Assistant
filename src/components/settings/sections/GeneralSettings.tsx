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
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import { INWORLD_TTS_ALAKH_VOICE_ID, INWORLD_TTS_DEFAULT_VOICE_ID } from "@/lib/tts-config";
import { getLang } from "@/lib/useLanguage";

type ReplyLanguageMode = AppLanguage;

interface GeneralSettingsProps {
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

function GeneralSettings({
  languageMode,
  onLanguageModeChange,
  selectedVoice,
  onVoiceChange,
}: GeneralSettingsProps) {
  const t = getLang();

  const LANGUAGE_OPTIONS: Array<{ value: ReplyLanguageMode; label: string }> = [
    { value: "english", label: "English" },
    { value: "hindi", label: "Hindi" },
    { value: "hinglish", label: "Hinglish" },
  ];

  return (
    <SettingsSection
      label={t.settings.general}
      title={t.settings.language}
      description={t.settings.languageDescription}
    >
      <SettingsRow
        title={t.settings.responseLanguage}
        description={t.settings.responseLanguageDescription}
      >
        <div className="rounded-xl border border-pink-500/15 bg-white/5 px-4 py-2 text-sm text-pink-100 font-medium tracking-wide">
          ✨ Auto-detecting Language
        </div>
      </SettingsRow>

      <SettingsRow
        title={t.settings.voiceSelection}
        description={t.settings.voiceSelectionDescription}
        border={false}
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm ${selectedVoice === INWORLD_TTS_DEFAULT_VOICE_ID ? "text-white" : "text-white/50"}`}>
            Female (Swara)
          </span>
          <ToggleSwitch
            checked={selectedVoice === INWORLD_TTS_ALAKH_VOICE_ID}
            onCheckedChange={(checked) => onVoiceChange(checked ? INWORLD_TTS_ALAKH_VOICE_ID : INWORLD_TTS_DEFAULT_VOICE_ID)}
            ariaLabel={t.settings.voiceSelection}
          />
          <span className={`text-sm ${selectedVoice === INWORLD_TTS_ALAKH_VOICE_ID ? "text-white" : "text-white/50"}`}>
            Male (Alakh)
          </span>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(GeneralSettings);
