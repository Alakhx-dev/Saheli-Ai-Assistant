import React from "react";
import { LogOut, UserPen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SettingsRow from "@/components/settings/SettingsRow";
import SettingsSection from "@/components/settings/SettingsSection";

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
  return (
    <SettingsSection
      label="Account"
      title="Profile"
      description="Update your identity details and manage the current session."
    >
      <SettingsRow title="Profile" description={profileSubtext}>
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
            Edit
          </button>
        </div>
      </SettingsRow>
      <SettingsRow title="Change Password" description="Update your account password.">
        <button
          type="button"
          onClick={onChangePassword}
          className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm text-white transition duration-200 hover:bg-white/20"
        >
          Change
        </button>
      </SettingsRow>
      <SettingsRow
        title="Logout"
        description="Sign out of the current account and return to the landing page."
        border={false}
      >
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}

export default React.memo(AccountSettings);
