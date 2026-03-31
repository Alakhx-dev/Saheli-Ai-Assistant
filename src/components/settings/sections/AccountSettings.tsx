import React from "react";
import { LogOut, UserPen } from "lucide-react";
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
      <SettingsRow title={t.settings.profile} description={profileSubtext}>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white">{profileName}</p>
          </div>
          <Avatar className="h-10 w-10 border border-white/10">
            <AvatarImage src={profileImageUrl || undefined} alt={profileName} className="object-cover" />
            <AvatarFallback className="bg-white/10 text-sm font-medium text-white">
              {profileInitial}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
          >
            <UserPen className="h-4 w-4" />
            {t.settings.edit}
          </button>
        </div>
      </SettingsRow>
      <SettingsRow title={t.settings.changePassword} description={t.settings.changePasswordDescription}>
        <button
          type="button"
          onClick={onChangePassword}
          className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm text-white transition duration-200 hover:bg-white/20"
        >
          {t.settings.change}
        </button>
      </SettingsRow>
      <SettingsRow
        title={t.settings.logout}
        description={t.settings.logoutDescription}
        border={false}
      >
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          {t.settings.logoutButton}
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(AccountSettings);
