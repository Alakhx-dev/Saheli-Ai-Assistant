import React from "react";
import type { AppLanguage } from "@/lib/ai-service";
import { OPENROUTER_MODEL } from "@/lib/ai-service";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import { useAppStore } from "@/store/app-store";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye } from "lucide-react";
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
        label="AI Model"
        title="OpenRouter"
        description="Swara is powered through OpenRouter for model routing and fallback."
      >
        <SettingsRow
          title="Active Model"
          description="The AI model powering Swara's brain and vision."
        >
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <div className="rounded-xl border border-pink-500/20 bg-white/5 px-4 py-2 text-sm text-pink-100 font-medium tracking-wide flex items-center gap-2">
              <Eye className="w-4 h-4 text-pink-400" />
              {OPENROUTER_MODEL.name}
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-white/60">Status:</span>
              <span className="text-green-400 font-medium">⚡ Ready (OpenRouter)</span>
            </div>
          </div>
        </SettingsRow>
      </SettingsSection>

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
