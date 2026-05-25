import React from "react";
import type { AppLanguage } from "@/lib/ai-service";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import { useAppStore } from "@/store/app-store";
import { getLang } from "@/lib/useLanguage";

type ReplyLanguageMode = AppLanguage;

interface GeneralSettingsProps {
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
}

function GeneralSettings({ languageMode, onLanguageModeChange }: GeneralSettingsProps) {
  const t = getLang();
  return (
    <div className="space-y-6">

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
          <div className="rounded-xl border border-pink-500/15 bg-white/5 px-4 py-2 text-sm text-pink-100 font-medium tracking-wide">
            🎙️ AWS Polly voice enabled
          </div>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

export default React.memo(GeneralSettings);
