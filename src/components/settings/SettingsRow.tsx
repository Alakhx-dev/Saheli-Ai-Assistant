import React from "react";

interface SettingsRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  border?: boolean;
}

export default function SettingsRow({
  title,
  description,
  children,
  border = true,
}: SettingsRowProps) {
  return (
    <div className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${border ? "border-b border-pink-500/8" : ""}`}>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-white">{title}</p>
        {description ? <p className="text-sm leading-6 text-white/50">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}
