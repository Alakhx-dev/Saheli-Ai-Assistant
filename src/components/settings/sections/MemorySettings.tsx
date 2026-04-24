import React from "react";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import { getLang } from "@/lib/useLanguage";

interface MemorySettingsProps {
  memoryEnabled: boolean;
  onMemoryToggle: (enabled: boolean) => void;
  onManageMemory: () => void;
}

function MemorySettings({ memoryEnabled, onMemoryToggle, onManageMemory }: MemorySettingsProps) {
  const t = getLang();

  return (
    <SettingsSection
      label={t.settings.personalization}
      title={t.settings.memory}
      description={t.settings.memoryDescription}
    >
      <SettingsRow
        title={t.settings.referenceSavedMemory}
        description={t.settings.referenceSavedMemoryDescription}
      >
        <button
          type="button"
          onClick={() => onMemoryToggle(!memoryEnabled)}
          className={`h-6 w-10 rounded-full p-1 transition duration-200 ${
            memoryEnabled ? "bg-pink-500" : "bg-pink-900/30"
          }`}
          aria-label="Toggle memory"
        >
          <div
            className={`h-4 w-4 rounded-full bg-white shadow-sm transition duration-200 ${
              memoryEnabled ? "translate-x-4" : ""
            }`}
          />
        </button>
      </SettingsRow>
      <SettingsRow
        title={t.settings.manageMemory}
        description={t.settings.manageMemoryDescription}
        border={false}
      >
        <button
          type="button"
          onClick={onManageMemory}
          className="rounded-xl border border-pink-500/15 bg-pink-500/5 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-pink-500/10"
        >
          {t.settings.manageMemoryButton}
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(MemorySettings);
