import React from "react";

interface SettingsSectionProps {
  label: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SettingsSection({ label, title, description, children }: SettingsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">{label}</p>
        <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
        {description ? <p className="max-w-2xl text-sm text-white/55">{description}</p> : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-pink-500/10 bg-[#130a18]">{children}</div>
    </section>
  );
}
