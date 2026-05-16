import React from "react";
import type { AppLanguage } from "@/lib/ai-service";
import { GROQ_MODEL, OPENROUTER_MODEL, type AIProvider } from "@/lib/ai-service";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import { useAppStore } from "@/store/app-store";
import { Eye } from "lucide-react";
import { getLang } from "@/lib/useLanguage";
import ToggleSwitch from "@/components/settings/ToggleSwitch";

type ReplyLanguageMode = AppLanguage;

interface GeneralSettingsProps {
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
}

function GeneralSettings({ languageMode, onLanguageModeChange }: GeneralSettingsProps) {
  const t = getLang();
  const activeProvider = useAppStore((state) => state.settings.activeProvider);
  const setStoreSettings = useAppStore((state) => state.setSettings);

  const handleProviderToggle = (checked: boolean) => {
    const nextProvider: AIProvider = checked ? "Groq" : "OpenRouter";
    setStoreSettings({ activeProvider: nextProvider });
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        label="AI Model"
        title="Active AI Engine"
        description="Switch between OpenRouter and Groq for testing. OpenRouter still keeps Groq as silent fallback."
      >
        <SettingsRow
          title="Active AI Engine"
          description="Choose which provider should answer first."
        >
          <div className="flex w-full max-w-xs flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-pink-500/20 bg-white/5 px-4 py-2 text-sm font-medium tracking-wide text-pink-100">
              <Eye className="w-4 h-4 text-pink-400" />
              {activeProvider === "Groq" ? GROQ_MODEL.name : OPENROUTER_MODEL.name}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-pink-500/15 bg-white/5 px-4 py-3">
              <div className="min-w-0 pr-4">
                <div className="text-sm font-semibold text-white">OpenRouter</div>
                <div className="text-[11px] text-white/55">Off = OpenRouter</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ToggleSwitch
                  checked={activeProvider === "Groq"}
                  onCheckedChange={handleProviderToggle}
                  ariaLabel="Active AI Engine"
                />
                <div className="text-[11px] font-medium text-pink-100">
                  {activeProvider === "Groq" ? "Groq" : "OpenRouter"}
                </div>
              </div>
              <div className="min-w-0 pl-4 text-right">
                <div className="text-sm font-semibold text-white">Groq</div>
                <div className="text-[11px] text-white/55">On = Groq only</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-white/60">Status:</span>
              <span className="text-green-400 font-medium">
                {activeProvider === "Groq" ? "⚡ Ready (Groq only)" : "⚡ Ready (OpenRouter + Groq fallback)"}
              </span>
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
