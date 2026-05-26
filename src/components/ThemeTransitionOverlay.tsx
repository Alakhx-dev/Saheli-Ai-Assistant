import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeTransitionOverlayProps {
  targetTheme: string | null;
  onThemeUpdate: (theme: string) => void;
  onTransitionComplete: () => void;
}

const THEME_RGBS: Record<string, string> = {
  pink: "255, 0, 120",
  yellow: "255, 215, 0",
  blue: "0, 229, 255",
  peach: "255, 158, 128",
  lavender: "179, 136, 255",
  orchid: "213, 0, 249",
  teal: "29, 233, 182",
};

export default function ThemeTransitionOverlay({
  targetTheme,
  onThemeUpdate,
  onTransitionComplete,
}: ThemeTransitionOverlayProps) {
  const [show, setShow] = useState(false);
  const [auraOpacity, setAuraOpacity] = useState(0);
  const [activeRgb, setActiveRgb] = useState("255, 0, 120");

  useEffect(() => {
    if (targetTheme) {
      const nextRgb = THEME_RGBS[targetTheme] || THEME_RGBS.pink;
      setActiveRgb(nextRgb);
      setShow(true);
      
      // Phase 1 (The Bleed Preparation): Fade in new color aura over 0.6s
      setAuraOpacity(0.4);

      // Phase 3 (The Clean Swap): Swap theme class at 0.6s, start fading out aura
      const swapTimer = setTimeout(() => {
        onThemeUpdate(targetTheme);
        setAuraOpacity(0);
      }, 600);

      // Phase 4 (Complete): Finished transition at 1.8s (0.6s swap + 1.2s crossfade duration)
      const completeTimer = setTimeout(() => {
        setShow(false);
        onTransitionComplete();
      }, 1800);

      return () => {
        clearTimeout(swapTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [targetTheme]);

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Pointer Events Blocker: Transparent, zIndex 99999 */}
          <div
            id="saheli-pointer-blocker"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              pointerEvents: "auto",
              background: "transparent",
            }}
          />

          {/* Blurred Glow Aura Layer: zIndex 10 (Behind sidebar/composer, above background) */}
          <motion.div
            id="saheli-transition-glow-layer"
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{ 
              opacity: auraOpacity,
              scale: auraOpacity > 0 ? 2.2 : 0.5
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: auraOpacity > 0 ? 0.6 : 1.2,
              ease: "easeOut",
            }}
            style={{
              position: "fixed",
              left: "-50%",
              top: "-50%",
              width: "200%",
              height: "200%",
              background: `radial-gradient(circle at 50% 70%, rgba(${activeRgb}, 0.65) 0%, rgba(${activeRgb}, 0.25) 35%, rgba(${activeRgb}, 0.05) 60%, transparent 80%)`,
              filter: "blur(80px)",
              zIndex: 10,
              pointerEvents: "none",
              mixBlendMode: "screen",
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
