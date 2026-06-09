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
  orchid: "213, 0, 249",
  peach: "255, 158, 125",
  beige: "212, 184, 149",
  maroon: "208, 28, 63",
  gemini: "74, 137, 255",
};

export default function ThemeTransitionOverlay({
  targetTheme,
  onThemeUpdate,
  onTransitionComplete,
}: ThemeTransitionOverlayProps) {
  const [show, setShow] = useState(false);
  const [activeRgb, setActiveRgb] = useState("255, 0, 120");

  useEffect(() => {
    if (targetTheme) {
      let nextRgb = THEME_RGBS[targetTheme] || THEME_RGBS.pink;
      if (targetTheme === "custom" && typeof window !== "undefined") {
        const customHex = window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078";
        const r = parseInt(customHex.slice(1, 3), 16);
        const g = parseInt(customHex.slice(3, 5), 16);
        const b = parseInt(customHex.slice(5, 7), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          nextRgb = `${r}, ${g}, ${b}`;
        }
      }
      setActiveRgb(nextRgb);
      setShow(true);

      // Phase 1 (Clean Swap): Swap theme class at 0.6s
      const swapTimer = setTimeout(() => {
        onThemeUpdate(targetTheme);
      }, 600);

      // Phase 2 (Complete): Finished transition at 1.8s
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
          {/* Pointer Events Blocker: Transparent, zIndex 99998 */}
          <div
            id="saheli-pointer-blocker"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99998,
              pointerEvents: "auto",
              background: "transparent",
            }}
          />

          {/* Cinematic Overlay Viewport Container */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {/* 1. Atmospheric Ambient Backdrop (Becomes opaque during swap at 0.5s - 0.7s to mask layout changes) */}
            <motion.div
              id="saheli-transition-backdrop"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.6,
                times: [0, 0.35, 0.65, 1],
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at center, rgba(${activeRgb}, 0.95) 0%, rgba(8, 4, 16, 1) 75%)`,
                backdropFilter: "blur(4px)",
              }}
            />

            {/* 2. Leading Energy Blade 1 (Vibrant blur glow path running ahead) */}
            <motion.div
              id="saheli-transition-blade-leading"
              initial={{ x: "-150%", opacity: 0 }}
              animate={{
                x: ["-150%", "0%", "150%"],
                opacity: [0, 0.45, 0.45, 0],
              }}
              transition={{
                duration: 1.4,
                times: [0, 0.3, 0.7, 1],
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                top: "-50%",
                bottom: "-50%",
                width: "60%",
                background: `linear-gradient(90deg, transparent, rgba(${activeRgb}, 0.5), transparent)`,
                filter: "blur(40px)",
                transform: "skewX(-25deg)",
                mixBlendMode: "screen",
              }}
            />

            {/* 3. Main Energy Shutter Blade 2 (Solid core with high-intensity glowing border) */}
            <motion.div
              id="saheli-transition-blade-main"
              initial={{ x: "-180%", opacity: 0 }}
              animate={{
                x: ["-180%", "0%", "180%"],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.4,
                times: [0, 0.35, 0.65, 1],
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                top: "-50%",
                bottom: "-50%",
                width: "50%",
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  rgba(${activeRgb}, 0.65) 20%, 
                  #ffffff 50%, 
                  rgba(${activeRgb}, 0.65) 80%, 
                  transparent 100%)`,
                filter: "blur(8px)",
                transform: "skewX(-25deg)",
                boxShadow: `0 0 40px rgba(${activeRgb}, 0.7), 0 0 80px rgba(${activeRgb}, 0.4)`,
              }}
            />

            {/* 4. Trailing Laser Line Blade 3 (Sharp neon line following slightly behind) */}
            <motion.div
              id="saheli-transition-blade-trailing"
              initial={{ x: "-200%", opacity: 0 }}
              animate={{
                x: ["-200%", "0%", "200%"],
                opacity: [0, 0.85, 0.85, 0],
              }}
              transition={{
                duration: 1.4,
                delay: 0.1,
                times: [0, 0.4, 0.7, 1],
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                top: "-50%",
                bottom: "-50%",
                width: "8px",
                background: `#ffffff`,
                boxShadow: `0 0 15px rgba(${activeRgb}, 1), 0 0 35px rgba(${activeRgb}, 0.8)`,
                transform: "skewX(-25deg)",
              }}
            />

            {/* 5. Cinematic Center Flash (expanding from center when blade sweeps through) */}
            <motion.div
              id="saheli-transition-flash"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0.8, 1.3, 1.8],
              }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                x: "-50%",
                y: "-50%",
                width: "500px",
                height: "500px",
                background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(${activeRgb},0.5) 40%, transparent 70%)`,
                mixBlendMode: "screen",
              }}
            />
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
