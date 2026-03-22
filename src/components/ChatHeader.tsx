import { Moon, Sun, Globe, LogOut } from "lucide-react";
import { SaheliLogo } from "./SaheliLogo";
import { UserProfile } from "@/types/auth";
import { getI18n } from "@/lib/i18n";

interface ChatHeaderProps {
  profile: UserProfile;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onLanguageToggle: () => void;
  onLogout: () => void;
}

export default function ChatHeader({
  profile,
  isDarkMode,
  onThemeToggle,
  onLanguageToggle,
  onLogout,
}: ChatHeaderProps) {
  const i18n = getI18n(profile.language);

  return (
    <header className="glass-strong px-4 py-4 flex items-center justify-between border-b border-border z-20">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center">
          <SaheliLogo size={20} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-foreground leading-tight hidden sm:block">
          Saheli AI
        </h1>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          className="interactive-btn p-2 rounded-lg hover:bg-muted/50 active:scale-95 transition-transform"
          title={isDarkMode ? i18n.chat.light : i18n.chat.dark}
        >
          {isDarkMode ? (
            <Sun size={18} className="text-amber-500" />
          ) : (
            <Moon size={18} className="text-slate-400" />
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={onLanguageToggle}
          className="interactive-btn p-2 rounded-lg hover:bg-muted/50 active:scale-95 transition-transform text-sm font-semibold"
          title={i18n.chat.language}
        >
          <Globe size={18} className="text-saheli-pink" />
          <span className="hidden sm:inline ml-1 text-xs">
            {profile.language.toUpperCase()}
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="interactive-btn p-2 rounded-lg hover:bg-muted/50 active:scale-95 transition-transform"
          title={i18n.chat.logout}
        >
          <LogOut size={18} className="text-destructive" />
        </button>
      </div>
    </header>
  );
}
