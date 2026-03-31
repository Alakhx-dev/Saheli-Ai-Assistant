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
      className="border border-white/10 bg-white/10 data-[state=checked]:bg-white data-[state=unchecked]:bg-white/10"
    />
  );
}
