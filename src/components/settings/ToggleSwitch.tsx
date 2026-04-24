import React from "react";
import { Switch } from "@/components/ui/switch";

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
}

export default function ToggleSwitch({ checked, onCheckedChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className="border border-pink-500/15 bg-pink-900/30 data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-pink-900/30"
    />
  );
}
