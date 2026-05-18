import React from "react";
import { KeyRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      <DialogContent className="z-[100] w-[min(46rem,calc(100vw-2rem))] max-w-[46rem] overflow-hidden rounded-[32px] border border-white/12 bg-[#0f0819]/94 p-0 text-white shadow-[0_32px_90px_rgba(0,0,0,0.7)] backdrop-blur-[32px]">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.03em] text-white">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-white/50">{description}</DialogDescription>
          </DialogHeader>
          <p className="mt-3 text-sm text-pink-100/80">Alakh with Swara ✨</p>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="absolute inset-[-10px] rounded-full bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-pink-500/30 blur-xl" />
              <div className="relative rounded-full p-1.5">
                <div className="absolute inset-0 rounded-full border border-pink-400/20 shadow-[0_0_28px_rgba(255,0,120,0.25)]" />
                <Avatar className="h-28 w-28 rounded-full border border-white/10 bg-white/5 p-1">
                  <AvatarImage src={profilePreviewSource || profileDraftPhotoUrl || undefined} alt={effectiveUserName} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500/25 to-purple-500/25 text-3xl font-semibold text-white">
                    {profileInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <button
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/85 transition duration-300 hover:border-pink-400/20 hover:bg-white/[0.08]"
            >
              {uploadLabel}
            </button>
            <input ref={profileImageInputRef} type="file" accept="image/*" className="hidden" aria-label="Upload profile image" onChange={onProfileImageSelect} />
          </div>

          <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.26em] text-white/35">{nameLabel}</label>
              <input
                type="text"
                value={profileDraftName}
                onChange={(event) => onProfileNameChange(event.target.value)}
                placeholder={enterNameLabel}
                className="w-full border-0 border-b border-white/15 bg-transparent px-0 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-pink-400/40 focus:ring-0"
              />
              <p className="text-sm text-white/45">{userEmail || guestModeLabel}</p>
            </div>

            {profileImageSource ? (
              <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
                    <span>Zoom</span>
                    <span>{profileCropZoom.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="1" max="3" step="0.1" value={profileCropZoom} onChange={(event) => onProfileCropZoomChange(Number(event.target.value))} className="w-full accent-pink-400" aria-label="Zoom" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
                    <span>X</span>
                    <span>{profileCropX}</span>
                  </div>
                  <input type="range" min="-100" max="100" step="1" value={profileCropX} onChange={(event) => onProfileCropXChange(Number(event.target.value))} className="w-full accent-pink-400" aria-label="Horizontal offset" />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/35">
                    <span>Y</span>
                    <span>{profileCropY}</span>
                  </div>
                  <input type="range" min="-100" max="100" step="1" value={profileCropY} onChange={(event) => onProfileCropYChange(Number(event.target.value))} className="w-full accent-pink-400" aria-label="Vertical offset" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void onSaveProfile()}
              disabled={isSavingProfile}
              className="inline-flex flex-1 items-center justify-center rounded-[20px] border border-pink-400/20 bg-gradient-to-r from-pink-500/20 to-purple-500/15 px-4 py-3 text-sm font-medium text-white transition duration-300 hover:from-pink-500/25 hover:to-purple-500/20 disabled:opacity-60"
            >
              {isSavingProfile ? savingLabel : saveProfileLabel}
            </button>
            <button
              type="button"
              onClick={() => void onPasswordReset()}
              disabled={!canResetPassword}
              className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/80 transition duration-300 hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-40"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          </div>

          {profileStatus ? <p className="text-center text-sm text-white/55">{profileStatus}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}