import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Heart, Bell, Sparkles, Star } from 'lucide-react';
import CinematicAtmosphere from "../CinematicAtmosphere";
import { AssistantReminder, useReminderStore } from "@/store/reminder-store";
import { speakSaheli, stopSaheliSpeech } from "@/utils/speechEngine";
import { useAppStore } from "@/store/app-store";
import { characterDb } from "../../utils/indexedDb";

// Mascot logic matching the chat page
const CHARACTER_IMAGE_MAP: Record<string, string> = {
  swara: "/butterfly.png",
  aarohi: "/Aarohi ✨.png",
  anvitha: "/Anvitha 🤎.png",
  kiyara: "/Kiyara 🌼.png",
  lavanya: "/Lavanya 💜.png",
  meher: "/Meher 🤎.png",
  nyra: "/Nyra 💙.png",
  suryanshi: "/Suryanshi 🌻.png",
  aelina: "/Aelina 💎.png",
  ruhi: "/Ruhi 🌸.png",
};

const THEME_HEX_MAP: Record<string, string> = {
  pink: "#ff0078",
  yellow: "#FFD700",
  blue: "#00E5FF",
  orchid: "#D500F9",
  peach: "#FF9E7D",
  beige: "#D4B895",
  maroon: "#D01C3F",
  gemini: "#4A89FF",
};

export function getThemeStyles(color: string, customColor: string) {
  const hex = color === "custom" ? customColor : (THEME_HEX_MAP[color] || "#ff0078");
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // Compute HSL lightened value
  const rNormal = r / 255;
  const gNormal = g / 255;
  const bNormal = b / 255;
  const max = Math.max(rNormal, gNormal, bNormal);
  const min = Math.min(rNormal, gNormal, bNormal);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNormal: h = (gNormal - bNormal) / d + (gNormal < bNormal ? 6 : 0); break;
      case gNormal: h = (bNormal - rNormal) / d + 2; break;
      case bNormal: h = (rNormal - gNormal) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const themeLight = `hsl(${hDeg}, ${sPct}%, 88%)`;

  // Compute contrast color based on luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textPrimary = luminance > 0.6 ? "#0f172a" : "#ffffff";

  return {
    "--theme-primary": `#${cleanHex}`,
    "--theme-primary-rgb": `${r}, ${g}, ${b}`,
    "--theme-glow": `rgba(${r}, ${g}, ${b}, 0.25)`,
    "--theme-border": `rgba(${r}, ${g}, ${b}, 0.22)`,
    "--theme-soft": `rgba(${r}, ${g}, ${b}, 0.08)`,
    "--theme-soft-hover": `rgba(${r}, ${g}, ${b}, 0.15)`,
    "--theme-light": themeLight,
    "--theme-text-primary": textPrimary,
  } as React.CSSProperties;
}

interface CinematicReminderOverlayProps {
  reminder: AssistantReminder;
  onDismiss: () => void;
  onSnooze: () => void;
}

export default function CinematicReminderOverlay({
  reminder,
  onDismiss,
  onSnooze,
}: CinematicReminderOverlayProps) {
  const [characterId, setCharacterId] = useState("swara");
  const [mascotUrl, setMascotUrl] = useState<string>("");

  const [selectedColor, setSelectedColor] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "maroon";
    }
    return "maroon";
  });
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078";
    }
    return "#ff0078";
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const themeStyles = useMemo(() => getThemeStyles(selectedColor, customColor), [selectedColor, customColor]);

  useEffect(() => {
    try {
      const activeTheme = window.localStorage.getItem("saheli_theme_color") || "maroon";
      const savedId = window.localStorage.getItem(`saheli_selected_character_${activeTheme}`) || "swara";
      setCharacterId(savedId);

      // Try to load custom mascot from IndexedDB if it matches
      const loadCustomMascot = async () => {
        const user = useAppStore.getState().user;
        if (user?.uid) {
          try {
            const customs = await characterDb.getCustomCharacters(user.uid);
            const found = customs.find((c) => c.id === savedId);
            if (found) {
              setMascotUrl(found.url);
            }
          } catch (e) {
            console.error("Failed loading custom mascot for overlay:", e);
          }
        }
      };
      void loadCustomMascot();
    } catch (e) {
      console.error(e);
    }
    
    // Dispatch event for music ducking
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("saheli_reminder_active"));
    }

    // Play chime sound
    try {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg");
      audio.volume = 0.5;
      audio.play().catch(() => {});
      
      // Speak the reminder after a short delay
      setTimeout(() => {
        const textToSpeak = reminder.message || `You have a reminder: ${reminder.title}`;
        speakSaheli(textToSpeak);
      }, 1500);
    } catch (e) {}
    
    return () => {
      stopSaheliSpeech();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("saheli_reminder_dismissed"));
      }
    };
  }, [reminder.title]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const mascotSrc = mascotUrl || CHARACTER_IMAGE_MAP[characterId] || CHARACTER_IMAGE_MAP["swara"];

  // Memoized cute floating items for backdrop activity
  const floatingItems = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const types = ["heart", "star", "sparkle", "music"];
      const type = types[i % types.length];
      return {
        id: i,
        type,
        x: `${10 + Math.random() * 80}%`,
        y: `${15 + Math.random() * 65}%`,
        size: 12 + Math.random() * 16,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 10,
        rotation: Math.random() * 360,
      };
    });
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black overflow-y-auto md:overflow-hidden cute-body p-4 sm:p-6"
        style={themeStyles}
      >
        {/* Custom Styles for Keyframes and Cute Fonts */}
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Fredoka:wght@500;700&family=Quicksand:wght@500;600;700&display=swap');
          
          .cute-title {
            font-family: 'Fredoka', sans-serif;
            letter-spacing: 0.03em;
          }

          .comic-font {
            font-family: 'Comic Neue', cursive, sans-serif;
            letter-spacing: 0.02em;
          }

          .glass-btn-primary {
            background: linear-gradient(135deg, rgba(255, 116, 182, 0.22), rgba(255, 116, 182, 0.06)) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .glass-btn-primary:hover {
            background: linear-gradient(135deg, rgba(255, 116, 182, 0.35), rgba(255, 116, 182, 0.12)) !important;
          }

          .glass-btn-secondary {
            background: linear-gradient(135deg, rgba(255, 116, 182, 0.1), rgba(255, 116, 182, 0.02)) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .glass-btn-secondary:hover {
            background: linear-gradient(135deg, rgba(255, 116, 182, 0.2), rgba(255, 116, 182, 0.06)) !important;
          }
          
          .cute-body {
            font-family: 'Quicksand', sans-serif;
          }

          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spin-reverse-slow {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes swing {
            0%, 100% { transform: rotate(0deg); }
            20% { transform: rotate(12deg); }
            40% { transform: rotate(-12deg); }
            60% { transform: rotate(8deg); }
            80% { transform: rotate(-8deg); }
          }
          @keyframes heartBeat {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.15); }
            40% { transform: scale(1.05); }
            55% { transform: scale(1.20); }
          }
          @keyframes shimmer {
            100% { transform: translateX(350%); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
        `}} />

        {/* Ambient background particles & grid */}
        <CinematicAtmosphere layer="ambient" />

        {/* Cinematic Grid Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Soft ambient highlights (extremely subtle) */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom,rgba(var(--theme-primary-rgb),0.02)_0%,transparent_55%)] pointer-events-none" />

        {/* Cute Floating Items Layer */}
        {floatingItems.map((item) => {
          let element = null;
          if (item.type === "heart") {
            element = <Heart size={item.size} className="text-pink-400/60 fill-pink-400/30" />;
          } else if (item.type === "star") {
            element = <Star size={item.size} className="text-yellow-300/60 fill-yellow-300/30" />;
          } else if (item.type === "sparkle") {
            element = <Sparkles size={item.size} className="text-blue-300/60" />;
          } else {
            element = <Clock size={item.size} className="text-indigo-300/50" />;
          }
          return (
            <motion.div
              key={item.id}
              className="absolute pointer-events-none z-10 opacity-0"
              style={{
                left: item.x,
                top: item.y,
              }}
              animate={{
                y: [0, -120, -240],
                x: [0, Math.sin(item.id) * 40, 0],
                opacity: [0, 0.75, 0.75, 0.75, 0],
                scale: [0.4, 1.1, 1.1, 1.1, 0.4],
                rotate: [item.rotation, item.rotation + 180, item.rotation + 360],
              }}
              transition={{
                duration: item.duration,
                repeat: Infinity,
                delay: item.delay,
                ease: "linear",
              }}
            >
              {element}
            </motion.div>
          );
        })}

        {/* Floating Sparks */}
        <div className="absolute inset-0 z-10 pointer-events-none">
           {[...Array(15)].map((_, i) => {
             const maxOpacity = Math.random() * 0.5 + 0.25;
             return (
               <motion.div
                 key={i}
                 className="absolute rounded-full bg-white mix-blend-overlay"
                 style={{
                   width: Math.random() * 3 + 2 + "px",
                   height: Math.random() * 3 + 2 + "px",
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 100}%`,
                 }}
                 animate={{
                   y: [0, -Math.random() * 200 - 60],
                   opacity: [0, maxOpacity, maxOpacity, maxOpacity, 0],
                   scale: [0, 1.1, 1.1, 1.1, 0]
                 }}
                 transition={{
                   duration: Math.random() * 5 + 4,
                   repeat: Infinity,
                   ease: "linear",
                   delay: Math.random() * 2,
                 }}
               />
             );
           })}
        </div>

        {/* Content Container: Splits Mascot on Left & Card on Right (responsive layout) */}
        <div className="relative z-20 flex flex-col md:flex-row items-center justify-between w-full max-w-[1360px] pl-4 pr-4 sm:pl-8 sm:pr-6 md:pl-16 md:pr-4 py-10 md:py-0">
          
          {/* Left Column: Mascot Container (Fully Visible, not blocked by the card) */}
          <div className="relative w-full md:w-1/2 flex items-center justify-center pointer-events-none h-[40vh] md:h-[70vh] flex-shrink-0">
            {/* Ambient character-back visual deck */}
            <CinematicAtmosphere layer="characterBack" />
            


            {/* Glowing Aura Bloom centered on mascot */}
            <div 
              className="absolute w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] md:w-[320px] md:h-[320px] rounded-full mix-blend-screen opacity-20 blur-[70px] pointer-events-none animate-pulse"
              style={{
                backgroundColor: 'var(--theme-primary)',
                transform: `translate(${mousePos.x * 18}px, ${mousePos.y * 18}px)`
              }}
            />

            <motion.img
              src={mascotSrc}
              alt="Mascot"
              className="h-full object-contain max-h-[35vh] md:max-h-[65vh] drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)] z-10"
              animate={{ 
                y: [-12, 12, -12],
                rotate: [-0.8, 0.8, -0.8]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 6, 
                ease: "easeInOut" 
              }}
            />

            {/* Mascot Contact Shadow */}
            <motion.div
              className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[160px] h-[14px] md:w-[240px] md:h-[20px] rounded-full bg-black/75 blur-[8px] md:blur-[10px] z-0 pointer-events-none"
              animate={{
                scale: [0.85, 1.05, 0.85],
                opacity: [0.35, 0.75, 0.35]
              }}
              style={{
                transform: 'translateX(-50%)'
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: "easeInOut"
              }}
            />

            {/* Cute Speech Bubble representing Saheli talking */}
            {reminder.message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="absolute z-30 pointer-events-auto
                           /* Mobile: centered overlay above head */
                           bottom-[75%] left-[50%] -translate-x-[50%] w-[90%] max-w-[320px]
                           /* Desktop: positioned to the top-right of the mascot's face */
                           md:bottom-auto md:top-[6%] md:left-[70%] md:translate-x-0 md:w-[340px]"
              >
                <motion.div
                  animate={{
                    y: [-10, 10, -10],
                    rotate: [-0.6, 0.6, -0.6]
                  }}
                  transition={{
                    y: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                    rotate: { repeat: Infinity, duration: 6, ease: "easeInOut" }
                  }}
                  className="w-full bg-gradient-to-br from-[var(--theme-primary)]/10 via-white/[0.06] to-[var(--theme-primary)]/5 backdrop-blur-[24px]
                             border border-white/20 md:border-white/30 p-4 sm:p-5 rounded-[2rem]
                             shadow-[0_20px_40px_rgba(0,0,0,0.65),0_0_30px_rgba(var(--theme-primary-rgb),0.25),inset_0_1.5px_2.5px_rgba(255,255,255,0.35)]
                             hover:border-[var(--theme-primary)]/50 transition-all duration-300"
                >
                  <div className="flex flex-col">
                    {/* Message content */}
                    <p className="cute-body text-sm sm:text-[15px] text-white/95 font-semibold leading-relaxed drop-shadow-sm flex flex-wrap gap-x-1 gap-y-0.5 items-center">
                      <span>"</span>
                      {reminder.message.split(" ").map((word, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            delay: 0.8 + i * 0.05,
                            duration: 0.22,
                            ease: "easeOut"
                          }}
                          className="inline-block"
                        >
                          {word}
                        </motion.span>
                      ))}
                      <span>"</span>
                      <Heart className="inline-block w-3.5 h-3.5 text-pink-400 fill-pink-400 ml-1.5 animate-[heartBeat_1.5s_infinite]" />
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Premium & Cute Card Dashboard */}
          <motion.div 
            className="w-full md:w-[380px] flex-shrink-0"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 120, delay: 0.2 }}
            style={{ perspective: 1000 }}
          >
            <motion.div
              className="relative rounded-[2.5rem] bg-gradient-to-b from-white/[0.12] via-white/[0.05] to-white/[0.01] backdrop-blur-[60px] p-6 sm:p-8 border border-[var(--theme-primary)]/50 shadow-[0_25px_50px_rgba(0,0,0,0.75),inset_0_1.5px_2.5px_rgba(255,255,255,0.35),0_0_40px_rgba(var(--theme-primary-rgb),0.15)] overflow-hidden text-center group"
            >
               {/* Futuristic volumetric neon light bar at the top */}
               <div className="absolute top-0 left-[12%] right-[12%] h-[3px] bg-gradient-to-r from-transparent via-[var(--theme-light)] to-transparent opacity-80 shadow-[0_0_12px_var(--theme-light)] rounded-full z-10" />

               {/* Cute Custom Rounded Corner Marks */}
               <div className="absolute top-6 left-6 w-3.5 h-3.5 border-t-2 border-l-2 border-white/30 rounded-tl-sm pointer-events-none" />
               <div className="absolute top-6 right-6 w-3.5 h-3.5 border-t-2 border-r-2 border-white/30 rounded-tr-sm pointer-events-none" />
               <div className="absolute bottom-6 left-6 w-3.5 h-3.5 border-b-2 border-l-2 border-white/30 rounded-bl-sm pointer-events-none" />
               <div className="absolute bottom-6 right-6 w-3.5 h-3.5 border-b-2 border-r-2 border-white/30 rounded-br-sm pointer-events-none" />

               {/* Cute pulsing star/heart accents in corners */}
               <div className="absolute top-5 right-12 text-yellow-300/40 animate-pulse pointer-events-none">
                 <Star size={14} className="fill-yellow-300/20" />
               </div>
               <div className="absolute bottom-6 left-12 text-pink-300/40 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}>
                 <Heart size={14} className="fill-pink-300/20" />
               </div>

               {/* Dynamic inner corner glows */}
               <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[2.5rem] z-0">
                 <motion.div className="absolute -top-24 -left-24 w-56 h-56 bg-[var(--theme-primary)] rounded-full mix-blend-screen blur-[60px] opacity-45"
                             animate={{ scale: [1, 1.25, 1], x: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 5 }} />
                 <motion.div className="absolute -bottom-24 -right-24 w-56 h-56 bg-[var(--theme-light)] rounded-full mix-blend-screen blur-[60px] opacity-35"
                             animate={{ scale: [1, 1.3, 1], x: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 6 }} />
               </div>

               <div className="relative z-10 flex flex-col items-center py-2">
                  {/* Assistant Bell Icon with Pulsing sound rings */}
                  <div className="relative mb-6 flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full border-2 border-[var(--theme-primary)]/20 animate-[ping_3s_infinite] pointer-events-none" />
                    <div className="absolute w-18 h-18 rounded-full border border-[var(--theme-light)]/30 animate-[ping_2s_infinite] pointer-events-none" />
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-[0_0_25px_var(--theme-glow)] flex items-center justify-center backdrop-blur-md relative z-10">
                       <Bell className="w-8 h-8 text-white drop-shadow-md animate-[swing_2.5s_ease-in-out_infinite]" />
                    </div>
                  </div>

                  {/* Title in Comic Neue Font (Sentence Case) */}
                  <h1 
                    className="comic-font text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-[var(--theme-light)] to-white tracking-wider mb-8 drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" 
                    style={{ textShadow: "0 0 20px var(--theme-glow)" }}
                  >
                     {reminder.title ? (reminder.title.charAt(0).toUpperCase() + reminder.title.slice(1).toLowerCase()) : ""}
                  </h1>

                  {/* Buttons container */}
                  <div className="flex flex-col sm:flex-row gap-3.5 w-full relative z-10">
                     <button
                       onClick={onDismiss}
                       className="flex-1 py-3.5 px-6 rounded-full text-white font-extrabold text-base hover:scale-[1.05] active:scale-[0.97] active:translate-y-[2px] transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden group/btn cursor-pointer border border-white/25 backdrop-blur-xl bg-gradient-to-r from-[var(--theme-primary)] via-[var(--theme-primary)]/90 to-[var(--theme-glow)]"
                       style={{ 
                         boxShadow: "inset 0 1.5px 3px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.3), 0 10px 22px rgba(var(--theme-primary-rgb),0.45), 0 0 20px rgba(var(--theme-primary-rgb),0.2)"
                       }}
                     >
                       {/* Shine sweep effect */}
                       <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-150%] group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                       <Heart className="w-4.5 h-4.5 text-white fill-white animate-[heartBeat_1.5s_infinite]" />
                       <span className="relative z-10 drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.45)] tracking-wider cute-title text-white">Got it!</span>
                     </button>
                     
                     <button
                       onClick={onSnooze}
                       className="flex-1 py-3.5 px-6 rounded-full text-white/80 hover:text-white font-bold hover:scale-[1.03] active:scale-[0.97] active:translate-y-[2px] transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden group/snooze cursor-pointer border border-white/10 hover:border-[var(--theme-primary)]/45 backdrop-blur-md bg-white/[0.04] hover:bg-white/[0.1]"
                       style={{
                         boxShadow: "inset 0 1px 2px rgba(255,255,255,0.15), 0 6px 16px rgba(0,0,0,0.3)"
                       }}
                     >
                       <Clock className="w-4.5 h-4.5 text-white/80 group-hover/snooze:text-white transition-colors duration-300 group-hover/snooze:animate-[spin_4s_linear_infinite]" />
                       <span className="cute-title tracking-wider text-white/90 group-hover/snooze:text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.3)]">Snooze</span>
                     </button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        </div>

        <CinematicAtmosphere layer="foreground" />
      </motion.div>
    </AnimatePresence>
  );
}
