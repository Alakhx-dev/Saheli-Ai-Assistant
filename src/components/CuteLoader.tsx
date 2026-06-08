import React, { useState, useEffect } from "react";
import SaheliLogo from "./SaheliLogo";
import CinematicAtmosphere from "./CinematicAtmosphere";
import { auth } from "../lib/firebase";
import { characterDb } from "../utils/indexedDb";

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

const CHARACTER_LABELS: Record<string, string> = {
  swara: "Swara 🦋",
  aarohi: "Aarohi ✨",
  anvitha: "Anvitha 🤎",
  kiyara: "Kiyara 🌼",
  lavanya: "Lavanya 💜",
  meher: "Meher 🤎",
  nyra: "Nyra 💙",
  suryanshi: "Suryanshi 🌻",
  aelina: "Aelina 💎",
  ruhi: "Ruhi 🌸",
};

export default function CuteLoader() {
  const [mascotUrl, setMascotUrl] = useState("/butterfly.png");
  const [mascotLabel, setMascotLabel] = useState("Swara 🦋");
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Dynamic character load from localStorage and IndexedDB
  useEffect(() => {
    const loadMascot = async () => {
      if (typeof window === "undefined") return;
      
      const themeColor = window.localStorage.getItem("saheli_theme_color") || "maroon";
      const characterId = window.localStorage.getItem(`saheli_selected_character_${themeColor}`) || "swara";
      
      if (CHARACTER_IMAGE_MAP[characterId]) {
        setMascotUrl(CHARACTER_IMAGE_MAP[characterId]);
        setMascotLabel(CHARACTER_LABELS[characterId] || "Swara 🦋");
        return;
      }
      
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const customs = await characterDb.getCustomCharacters(currentUser.uid);
          const customMatch = customs.find((c) => c.id === characterId);
          if (customMatch) {
            setMascotUrl(customMatch.url);
            setMascotLabel(customMatch.name || "Companion ✨");
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to load custom companion in loader:", err);
      }
      
      // Fallback
      setMascotUrl(CHARACTER_IMAGE_MAP.swara);
      setMascotLabel(CHARACTER_LABELS.swara);
    };
    
    loadMascot();
  }, []);

  const nameOnly = mascotLabel.split(" ")[0];
  const dialogues = [
    `Bas 2 min bestie, baal thik kar rhi hu! 🎀`,
    `Humari pyari baatein load ho rhi hain... 💖`,
    `Sshh... ${nameOnly} aapke liye warm welcome soch rhi hai! 💭`,
    `Tab tak ek pyaari si smile do! 😊`,
    `Hurry up loader! Mujhe bestie se milna hai. 😡`,
    `Hahaha, aaj tumhare paas bohot saari gossips hain kya? 😉`,
    `Almost ready! Bas thoda sa intezaar aur... 🌸`
  ];

  const finalWelcome = `Aap aa gaye! Chalo, humari pyari baatein shuru karte hain! 🥰`;

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % dialogues.length);
    }, 2200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        const remaining = 100 - prev;
        const diff = Math.max(1, Math.floor(remaining * 0.12));
        return prev + diff;
      });
    }, 350);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [dialogues.length]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#07040d] text-pink-200 relative overflow-hidden">
      {/* 1. Deepest Layer: Glowing Ambient Background Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Pink Blob */}
        <div 
          className="absolute top-[20%] left-[15%] w-[450px] h-[450px] rounded-full bg-pink-500/15 filter blur-[100px] animate-pulse" 
          style={{ animationDuration: "8s" }} 
        />
        {/* Soft Purple Blob */}
        <div 
          className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] rounded-full bg-purple-600/15 filter blur-[110px] animate-pulse" 
          style={{ animationDuration: "10s", animationDelay: "1.5s" }} 
        />
        {/* Soft Cyan/Teal Blob */}
        <div 
          className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 filter blur-[90px] animate-pulse" 
          style={{ animationDuration: "9s", animationDelay: "3s" }} 
        />
      </div>

      {/* 2. Cinematic Ambient Atmosphere (Fog, particles) */}
      <div className="absolute inset-0 z-5">
        <CinematicAtmosphere layer="ambient" />
      </div>

      {/* 3. Frosted Glass Backdrop Blur Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ 
          backdropFilter: "blur(54px)", 
          WebkitBackdropFilter: "blur(54px)",
          backgroundColor: "rgba(7, 4, 13, 0.28)" 
        }} 
      />

      {/* 4. Cinematic Foreground Atmosphere (Petals, 3D butterflies) */}
      <div className="absolute inset-0 z-15">
        <CinematicAtmosphere layer="foreground" />
      </div>

      {/* 5. Floating Interactive Dialogue Speech Bubble */}
      <div 
        className="relative mb-6 animate-float z-30 select-none" 
        style={{ 
          animationDuration: "3.5s",
          willChange: "transform"
        }}
      >
        <div 
          className="bg-white/[0.02] border border-white/10 text-pink-100 text-[13px] font-semibold px-5 py-3.5 rounded-[22px] w-max max-w-[280px] text-center relative"
          style={{
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 0 20px rgba(255, 119, 169, 0.05)"
          }}
        >
          <span className="animate-fade-in block leading-relaxed">
            {progress >= 100 ? finalWelcome : dialogues[messageIndex]}
          </span>
          {/* Bubble Tail */}
          <div 
            className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white/[0.02] border-r border-b border-white/10 rotate-45"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          />
        </div>
      </div>

      {/* 6. Active Companion Mascot Display */}
      <div className="relative h-72 w-72 flex items-center justify-center mb-6 z-20 select-none">
        {/* Glowing orbital ring borders */}
        <div className="absolute inset-4 rounded-full border border-dashed border-pink-500/20 animate-spin" style={{ animationDuration: "25s" }} />
        <div className="absolute inset-10 rounded-full border border-dashed border-purple-500/20 animate-spin" style={{ animationDuration: "18s", animationDirection: "reverse" }} />
        
        {/* Soft aura glow behind companion */}
        <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-pink-500/20 via-purple-500/15 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />

        {/* Active Mascot Doll image */}
        <img 
          src={mascotUrl} 
          alt={mascotLabel}
          className="h-[95%] w-[95%] object-contain z-10 animate-float"
          style={{ 
            animationDuration: "5s",
            filter: "drop-shadow(0 15px 25px rgba(0, 0, 0, 0.5))",
            willChange: "transform"
          }}
        />
      </div>

      {/* 7. Redesigned Cute Custom Progress Tracker Panel */}
      <div 
        className="relative z-30 flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 rounded-[28px] overflow-visible max-w-[290px] w-full mx-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="w-full space-y-4 overflow-visible">
          {/* Progress Bar Track */}
          <div className="relative w-full h-2 bg-pink-500/10 border border-pink-500/20 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            {/* Filled Segment */}
            <div 
              className="h-full bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,119,169,0.6)]"
              style={{ width: `${progress}%` }}
            />
            
            {/* Gliding Bouncing Butterfly Mascot */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300 ease-out flex flex-col items-center pointer-events-none z-10"
              style={{ left: `${progress}%` }}
            >
              <span 
                className="text-lg filter drop-shadow-[0_0_6px_rgba(255,105,180,0.8)] animate-bounce"
                style={{ animationDuration: "1.8s" }}
              >
                🦋
              </span>
            </div>

            {/* Target Heart Plug at the 100% destination */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-0">
              <span 
                className={`text-sm filter drop-shadow-[0_0_5px_rgba(255,119,169,0.8)] transition-all duration-500 ${
                  progress >= 100 ? "animate-ping scale-125 text-pink-400" : "text-pink-300/40"
                }`}
              >
                ❤️
              </span>
            </div>
          </div>

          {/* Details & Percentage Badges */}
          <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-bold px-1 select-none">
            <span className="text-pink-300/60 flex items-center gap-1.5">
              <span className="animate-spin text-pink-400/80" style={{ animationDuration: "4s" }}>⚙️</span> 
              Loading
            </span>
            <span className="text-pink-300 font-extrabold bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20 shadow-[0_0_10px_rgba(255,119,169,0.1)]">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
