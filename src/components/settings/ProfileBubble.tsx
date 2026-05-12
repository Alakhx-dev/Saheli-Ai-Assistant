import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, UserCircle2 } from "lucide-react";

interface ProfileBubbleProps {
  open: boolean;
  profileName: string;
  profileEmail?: string;
  profileInitial: string;
  userPhotoUrl?: string;
  isGuest: boolean;
  onClose: () => void;
}

export default function ProfileBubble({
  open,
  profileName,
  profileEmail,
  profileInitial,
  userPhotoUrl,
  isGuest,
  onClose,
}: ProfileBubbleProps) {
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Logic handled in parent component to close
    };
    return () => {};
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layoutId="profile-bubble"
          initial={{ opacity: 0, scale: 0, borderRadius: "50%", originX: 0.5, originY: 1 }}
          animate={{ opacity: 1, scale: [0, 1.1, 1], borderRadius: ["50%", "20%", "24px"] }}
          exit={{ opacity: 0, scale: 0, borderRadius: "50%" }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
          className="liquid-bubble-glass absolute bottom-[calc(100%+15px)] left-1/2 -translate-x-1/2 z-50 w-56 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3 p-2 rounded-xl border border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.03)] bg-white/5">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt="avatar"
                className="h-10 w-10 rounded-full object-cover shadow-md"
              />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-white font-bold">
                {profileInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate tracking-wide">{profileName}</p>
              <p className="text-[10px] font-light text-white/50 truncate tracking-wide">{profileEmail || "guest@saheli.ai"}</p>
            </div>
          </div>
          
          <div className="pt-1">
            <div className="text-[9px] uppercase tracking-widest text-white/40 mb-1.5 px-1 font-light">Login Status</div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 text-[11px] font-light text-white/80">
              <span className={`h-1.5 w-1.5 rounded-full ${isGuest ? 'bg-amber-400' : 'bg-emerald-400'} shadow-[0_0_6px_currentColor]`} />
              {isGuest ? "Guest Mode" : "Authenticated"}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
