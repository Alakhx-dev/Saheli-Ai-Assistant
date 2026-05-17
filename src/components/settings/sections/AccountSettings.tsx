import React from "react";
import { LogOut, UserPen, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";
import { getLang } from "@/lib/useLanguage";

interface AccountSettingsProps {
  profileName: string;
  profileSubtext: string;
  profileImageUrl?: string;
  profileInitial: string;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

function AccountSettings({
  profileName,
  profileSubtext,
  profileImageUrl,
  profileInitial,
  onEditProfile,
  onChangePassword,
  onLogout,
}: AccountSettingsProps) {
  const t = getLang();

  return (
    <SettingsSection
      label={t.settings.account}
      title={t.settings.profile}
      description={t.settings.profileDescription}
    >
      {/* Profile Section with Avatar */}
      <SettingsRow title={t.settings.profile} description={profileSubtext}>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-white">{profileName}</p>
            <p className="text-xs text-white/50 mt-0.5">{profileSubtext}</p>
          </div>
          <div className="relative group">
            <Avatar className="h-12 w-12 border-2 border-pink-500/30 ring-2 ring-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.1)]">
              <AvatarImage src={profileImageUrl || undefined} alt={profileName} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-pink-500/30 to-purple-500/30 text-sm font-bold text-white">
                {profileInitial}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center cursor-pointer">
              <span className="text-xs font-medium text-white">Edit</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-2 rounded-xl border border-pink-500/25 bg-gradient-to-r from-pink-500/10 to-purple-500/5 px-4 py-2.5 text-sm font-semibold text-pink-200 transition-all duration-300 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/15 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]"
          >
            <UserPen className="h-4 w-4" />
            {t.settings.edit}
          </button>
        </div>
      </SettingsRow>
      
      {/* Password Section */}
      <SettingsRow title={t.settings.changePassword} description={t.settings.changePasswordDescription}>
        <button
          type="button"
          onClick={onChangePassword}
          className="inline-flex items-center gap-2 rounded-xl border border-purple-500/25 bg-gradient-to-r from-purple-500/10 to-pink-500/5 px-4 py-2.5 text-sm font-semibold text-purple-200 transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/15 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
        >
          <Lock className="h-4 w-4" />
          {t.settings.change}
        </button>
      </SettingsRow>
      
      {/* Logout Section */}
      <SettingsRow
        title={t.settings.logout}
        description={t.settings.logoutDescription}
        border={false}
      >
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-gradient-to-r from-red-500/10 to-orange-500/5 px-4 py-2.5 text-sm font-semibold text-red-200 transition-all duration-300 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-orange-500/15 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        >
          <LogOut className="h-4 w-4" />
          {t.settings.logoutButton}
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(AccountSettings);
