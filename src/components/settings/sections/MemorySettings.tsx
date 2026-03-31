import React from "react";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";

interface MemorySettingsProps {
  memoryEnabled: boolean;
  onMemoryToggle: (enabled: boolean) => void;
  onManageMemory: () => void;
}

function MemorySettings({ memoryEnabled, onMemoryToggle, onManageMemory }: MemorySettingsProps) {
  return (
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
            className={`h-4 w-4 rounded-full bg-white shadow-sm transition duration-200 ${
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
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
        >
          Manage Memory
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(MemorySettings);
