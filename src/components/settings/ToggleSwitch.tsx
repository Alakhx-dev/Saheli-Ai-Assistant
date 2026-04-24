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
      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-fuchsia-500 data-[state=unchecked]:bg-[#2a1635] border border-pink-500/20 data-[state=unchecked]:border-pink-500/10 transition-colors duration-300 shadow-sm"
    />
  );
}
