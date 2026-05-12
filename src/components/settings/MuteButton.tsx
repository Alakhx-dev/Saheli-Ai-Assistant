import React from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface MuteButtonProps {
  muted: boolean;
  onToggle: () => void;
}

export default function MuteButton({ muted, onToggle }: MuteButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      aria-label={muted ? "Unmute Saheli voice" : "Mute Saheli voice"}
      className={`sidebar-footer-btn ${muted ? "muted" : ""}`}
    >
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </motion.button>
  );
}
