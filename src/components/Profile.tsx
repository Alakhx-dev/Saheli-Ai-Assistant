import React from "react";
import { KeyRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  uploadLabel: string;
  nameLabel: string;
  enterNameLabel: string;
  saveProfileLabel: string;
  savingLabel: string;
  guestModeLabel: string;
  profileStatus: string | null;
  isSavingProfile: boolean;
  profileInitial: string;
  effectiveUserName: string;
  userEmail?: string | null;
  profileDraftName: string;
  profileDraftPhotoUrl: string;
  profilePreviewSource: string;
  profileImageSource: string | null;
  profileCropZoom: number;
  profileCropX: number;
  profileCropY: number;
  profileImageInputRef: React.RefObject<HTMLInputElement>;
  onProfileImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileNameChange: (name: string) => void;
  onProfileCropZoomChange: (zoom: number) => void;
  onProfileCropXChange: (x: number) => void;
  onProfileCropYChange: (y: number) => void;
  onSaveProfile: () => void | Promise<void>;
  onPasswordReset: () => void | Promise<void>;
  canResetPassword: boolean;
}

export default function Profile({
  open,
  onOpenChange,
  title,
  description,
  uploadLabel,
  nameLabel,
  enterNameLabel,
  saveProfileLabel,
  savingLabel,
  guestModeLabel,
  profileStatus,
  isSavingProfile,
  profileInitial,
  effectiveUserName,
  userEmail,
  profileDraftName,
  profileDraftPhotoUrl,
  profilePreviewSource,
  profileImageSource,
  profileCropZoom,
  profileCropX,
  profileCropY,
  profileImageInputRef,
  onProfileImageSelect,
  onProfileNameChange,
  onProfileCropZoomChange,
  onProfileCropXChange,
  onProfileCropYChange,
  onSaveProfile,
  onPasswordReset,
  canResetPassword,
}: ProfileProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#1e1e1e] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/55">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24 border border-white/10">
              <AvatarImage src={profilePreviewSource || profileDraftPhotoUrl || undefined} alt={effectiveUserName} className="object-cover" />
              <AvatarFallback className="bg-white/10 text-2xl font-light text-white">
                {profileInitial}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
            >
              {uploadLabel}
            </button>
            <input
              ref={profileImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload profile image"
              onChange={onProfileImageSelect}
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-[#232323] p-4">
            <label className="text-xs uppercase tracking-[0.2em] text-white/35">{nameLabel}</label>
            <input
              type="text"
              value={profileDraftName}
              onChange={(event) => onProfileNameChange(event.target.value)}
              placeholder={enterNameLabel}
              className="w-full rounded-xl border border-white/10 bg-[#1e1e1e] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
            />
            <p className="text-xs text-white/45">{userEmail || guestModeLabel}</p>
          </div>

          {profileImageSource ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#232323] p-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
                  <span>Zoom</span>
                  <span>{profileCropZoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={profileCropZoom}
                  onChange={(event) => onProfileCropZoomChange(Number(event.target.value))}
                  className="w-full accent-pink-400"
                  aria-label="Zoom"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Horizontal</div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={profileCropX}
                    onChange={(event) => onProfileCropXChange(Number(event.target.value))}
                    className="w-full accent-pink-400"
                    aria-label="Horizontal offset"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Vertical</div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={profileCropY}
                    onChange={(event) => onProfileCropYChange(Number(event.target.value))}
                    className="w-full accent-pink-400"
                    aria-label="Vertical offset"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {profileStatus ? <p className="text-center text-xs text-white/55">{profileStatus}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onSaveProfile()}
              disabled={isSavingProfile}
              className="flex-1 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {isSavingProfile ? savingLabel : saveProfileLabel}
            </button>
            <button
              type="button"
              onClick={() => void onPasswordReset()}
              disabled={!canResetPassword}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/80 transition hover:bg-white/10 disabled:opacity-40"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
