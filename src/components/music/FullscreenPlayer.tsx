import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Minimize2, Disc, Music, Heart, ListMusic } from "lucide-react";
import type { JioSaavnSong } from "../../../lib/musicService";

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: JioSaavnSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  musicQueue: JioSaavnSong[];
  currentQueueIndex: number;
  onPlaySongAtIndex?: (index: number) => void;
}

const getFullscreenThemeClasses = (color: string) => {
  switch (color) {
    case "yellow":
      return {
        text: "text-yellow-400",
        textLight: "text-yellow-300",
        border: "border-yellow-500/25",
        bgActive: "bg-yellow-500/10",
        accentBg: "bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]",
        accentText: "text-yellow-950",
        sliderAccent: "accent-yellow-500",
        moodBlob: "rgba(234, 179, 8, 0.4)",
        conicGradient: "from-amber-400 via-yellow-300 to-amber-400",
        waveGradient: "from-yellow-500 to-amber-400",
        glowColor: "rgba(234, 179, 8, 0.25)"
      };
    case "blue":
      return {
        text: "text-cyan-400",
        textLight: "text-cyan-300",
        border: "border-cyan-500/25",
        bgActive: "bg-cyan-500/10",
        accentBg: "bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]",
        accentText: "text-cyan-950",
        sliderAccent: "accent-cyan-500",
        moodBlob: "rgba(6, 182, 212, 0.4)",
        conicGradient: "from-blue-400 via-cyan-300 to-blue-400",
        waveGradient: "from-cyan-500 to-blue-400",
        glowColor: "rgba(6, 182, 212, 0.25)"
      };
    case "orchid":
      return {
        text: "text-purple-400",
        textLight: "text-purple-300",
        border: "border-purple-500/25",
        bgActive: "bg-purple-500/10",
        accentBg: "bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]",
        accentText: "text-purple-950",
        sliderAccent: "accent-purple-500",
        moodBlob: "rgba(168, 85, 247, 0.4)",
        conicGradient: "from-pink-500 via-purple-400 to-pink-500",
        waveGradient: "from-purple-500 to-pink-400",
        glowColor: "rgba(168, 85, 247, 0.25)"
      };
    case "peach":
      return {
        text: "text-orange-400",
        textLight: "text-orange-300",
        border: "border-orange-500/25",
        bgActive: "bg-orange-500/10",
        accentBg: "bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]",
        accentText: "text-orange-950",
        sliderAccent: "accent-orange-500",
        moodBlob: "rgba(249, 115, 22, 0.4)",
        conicGradient: "from-red-400 via-orange-300 to-red-400",
        waveGradient: "from-orange-500 to-red-400",
        glowColor: "rgba(249, 115, 22, 0.25)"
      };
    case "beige":
      return {
        text: "text-amber-300",
        textLight: "text-amber-200",
        border: "border-amber-500/20",
        bgActive: "bg-amber-500/5",
        accentBg: "bg-amber-600 shadow-[0_0_30px_rgba(212,184,149,0.2)]",
        accentText: "text-amber-50",
        sliderAccent: "accent-amber-500",
        moodBlob: "rgba(212, 184, 149, 0.3)",
        conicGradient: "from-amber-700 via-amber-400 to-amber-700",
        waveGradient: "from-amber-500 to-amber-300",
        glowColor: "rgba(212, 184, 149, 0.15)"
      };
    case "maroon":
      return {
        text: "text-red-400",
        textLight: "text-red-300",
        border: "border-red-500/25",
        bgActive: "bg-red-500/10",
        accentBg: "bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]",
        accentText: "text-red-950",
        sliderAccent: "accent-red-600",
        moodBlob: "rgba(220, 38, 38, 0.4)",
        conicGradient: "from-red-800 via-red-500 to-red-800",
        waveGradient: "from-red-600 to-red-400",
        glowColor: "rgba(220, 38, 38, 0.25)"
      };
    case "gemini":
      return {
        text: "text-blue-400",
        textLight: "text-blue-300",
        border: "border-blue-500/25",
        bgActive: "bg-blue-500/10",
        accentBg: "bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]",
        accentText: "text-blue-950",
        sliderAccent: "accent-blue-500",
        moodBlob: "rgba(59, 130, 246, 0.4)",
        conicGradient: "from-indigo-500 via-blue-400 to-indigo-500",
        waveGradient: "from-blue-500 to-indigo-400",
        glowColor: "rgba(59, 130, 246, 0.25)"
      };
    case "pink":
    default:
      return {
        text: "text-pink-400",
        textLight: "text-pink-300",
        border: "border-pink-500/25",
        bgActive: "bg-pink-500/10",
        accentBg: "bg-pink-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]",
        accentText: "text-pink-950",
        sliderAccent: "accent-pink-500",
        moodBlob: "rgba(244, 63, 94, 0.4)",
        conicGradient: "from-purple-500 via-pink-400 to-purple-500",
        waveGradient: "from-pink-500 to-purple-400",
        glowColor: "rgba(244, 63, 94, 0.25)"
      };
  }
};

export default function FullscreenPlayer({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onNextTrack,
  onPrevTrack,
  musicQueue,
  currentQueueIndex,
  onPlaySongAtIndex,
}: FullscreenPlayerProps) {
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "maroon";
    }
    return "maroon";
  });

  const [isQueueOpen, setIsQueueOpen] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      if (typeof window !== "undefined") {
        setSelectedColor(window.localStorage.getItem("saheli_theme_color") || "maroon");
      }
    };
    window.addEventListener("saheli_theme_color_changed", handleThemeChange);
    return () => {
      window.removeEventListener("saheli_theme_color_changed", handleThemeChange);
    };
  }, []);

  const theme = getFullscreenThemeClasses(selectedColor);

  if (!currentSong) return null;

  // Format time (seconds -> mm:ss)
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const conicColors = selectedColor === "yellow"
    ? "#eab308, #d97706, #eab308"
    : selectedColor === "blue"
    ? "#06b6d4, #2563eb, #06b6d4"
    : selectedColor === "orchid"
    ? "#a855f7, #db2777, #a855f7"
    : selectedColor === "peach"
    ? "#f97316, #dc2626, #f97316"
    : selectedColor === "beige"
    ? "#d97706, #78350f, #d97706"
    : selectedColor === "maroon"
    ? "#dc2626, #7f1d1d, #dc2626"
    : selectedColor === "gemini"
    ? "#3b82f6, #4f46e5, #3b82f6"
    : "#ec4899, #8b5cf6, #ec4899";

  const gradientFrom = selectedColor === "beige" 
    ? "from-amber-950/80" 
    : selectedColor === "yellow" 
    ? "from-yellow-950/80" 
    : selectedColor === "blue" 
    ? "from-cyan-950/80" 
    : selectedColor === "orchid" 
    ? "from-purple-950/80" 
    : selectedColor === "peach" 
    ? "from-orange-950/80" 
    : selectedColor === "maroon" 
    ? "from-red-950/80" 
    : selectedColor === "gemini" 
    ? "from-blue-950/80" 
    : "from-pink-950/80";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[10100] flex flex-col justify-between bg-zinc-950/70 backdrop-blur-[24px] p-6 md:p-12 text-white select-none overflow-hidden"
        >
          {/* Ambient blurred backdrop using Album Art */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none scale-110">
            {currentSong.image && (
              <motion.div 
                animate={{
                  scale: [1.05, 1.15, 1.05],
                  rotate: [0, 1, 0]
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-cover bg-center filter blur-[120px] opacity-30"
                style={{ backgroundImage: `url(${currentSong.image})` }}
              />
            )}
            {/* Soft gradient lighting layer */}
            <div className={`absolute inset-0 bg-gradient-to-t ${gradientFrom} via-zinc-950/60 to-transparent`} />
            <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 20%, #0c0a0f/80 90%)" />
          </div>

          {/* Glowing Aura Orb */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-[550px] h-[550px] rounded-full filter blur-[130px] opacity-25 pointer-events-none transition-all duration-1000 animate-pulse"
            style={{
              background: `radial-gradient(circle, ${theme.moodBlob} 0%, transparent 70%)`,
              animationDuration: "8s"
            }}
          />

          {/* Floating Subtle Ambient Dust Particles */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/40 filter blur-[0.5px]"
                style={{
                  width: `${Math.random() * 4 + 2}px`,
                  height: `${Math.random() * 4 + 2}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `dustRiseFloat ${Math.random() * 20 + 20}s linear infinite`,
                  animationDelay: `${Math.random() * 10}s`
                }}
              />
            ))}
          </div>

          {/* Header */}
          <header className="relative z-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className={`p-1 rounded-lg bg-white/5 border border-white/10 ${theme.text}`}>
                <Heart className={`h-4 w-4 ${theme.text} fill-current animate-pulse`} />
              </span>
              <span className={`text-xs font-bold uppercase tracking-[0.25em] ${theme.textLight}`}>Saheli Immersive Vibe</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10 hover:${theme.text} transition-all duration-200`}
            >
              <Minimize2 className="h-4 w-4" />
              <span>Back to Chat</span>
            </motion.button>
          </header>

          {/* Main Visualizer Stage */}
          <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 my-8 min-h-0">
            
            {/* Left: Album Artwork Stage */}
            <div className="relative flex items-center justify-center shrink-0">
              {/* Outer pulsing glow ring */}
              <div 
                className={`absolute w-[240px] h-[240px] md:w-[380px] md:h-[380px] rounded-full filter blur-[35px] opacity-40 transition-transform duration-1000 ${isPlaying ? "scale-105" : "scale-95"}`}
                style={{
                  background: `conic-gradient(from 0deg, ${conicColors})`,
                  animation: isPlaying ? "border-rotate 8s linear infinite" : "none"
                }}
              />
              
              {/* Actual Art Frame */}
              <div className="relative w-[220px] h-[220px] md:w-[340px] md:h-[340px] rounded-full border-[8px] border-zinc-900/80 overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.05)] bg-zinc-950">
                {currentSong.image ? (
                  <>
                    <img 
                      src={currentSong.image} 
                      alt={currentSong.title} 
                      className={`h-full w-full object-cover select-none pointer-events-none transition-transform ${isPlaying ? "rotate-360" : ""}`}
                      style={{ 
                        borderRadius: "50%",
                        animation: isPlaying ? "spin 25s linear infinite" : "none",
                        transitionDuration: "25000ms"
                      }}
                    />
                    {/* Concentric Vinyl Groove Rings overlay */}
                    <div className="absolute inset-0 rounded-full pointer-events-none bg-[radial-gradient(circle,_transparent_30%,_rgba(0,0,0,0.35)_30.5%,_transparent_31%,_transparent_40%,_rgba(0,0,0,0.35)_40.5%,_transparent_41%,_transparent_50%,_rgba(0,0,0,0.35)_50.5%,_transparent_51%,_transparent_60%,_rgba(0,0,0,0.35)_60.5%,_transparent_61%,_transparent_70%,_rgba(0,0,0,0.35)_70.5%,_transparent_71%,_transparent_80%,_rgba(0,0,0,0.35)_80.5%,_transparent_81%,_transparent_90%,_rgba(0,0,0,0.35)_90.5%,_transparent_91%)] opacity-25" />
                    {/* Vinyl Light Reflection Sheen overlay */}
                    <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 transform origin-center opacity-60" />
                  </>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                    <Music className="h-16 w-16 text-white/20" />
                  </div>
                )}
                
                {/* Vinyl Record Center Hole style */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-10 md:h-10 rounded-full bg-zinc-950 border-[3px] border-white/20 shadow-inner" />
              </div>
            </div>

            {/* Right: Meta & Lyrics/Wave Stage */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md w-full">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Now Playing</span>
                <h1 className="text-xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-zinc-100 bg-clip-text text-transparent">
                  {currentSong.title}
                </h1>
                <h2 className={`text-sm md:text-lg font-semibold ${theme.text} tracking-wide mt-1`}>
                  {currentSong.artist}
                </h2>
                <p className="text-xs text-white/45 italic">{currentSong.album}</p>
              </div>

              {/* Decorative Audio Waves */}
              <div className="h-10 flex items-center gap-1.5 justify-center md:justify-start mt-6 w-full opacity-60">
                {Array.from({ length: 18 }).map((_, i) => {
                  const bounceDuration = 0.5 + Math.random() * 0.7;
                  return (
                    <span 
                      key={i} 
                      className={`w-0.5 rounded-full bg-gradient-to-t ${theme.waveGradient}`}
                      style={{
                        height: isPlaying ? "8px" : "3px",
                        animation: isPlaying ? `premium-wave ${bounceDuration}s ease-in-out infinite alternate` : "none",
                        animationDelay: `${i * 45}ms`
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </main>

          {/* Footer controls section */}
          <footer className="relative z-10 w-full max-w-4xl mx-auto flex flex-col gap-4 shrink-0">
            {/* Timeline */}
            <div className="space-y-1">
              <div className="group relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className={`timeline-slider w-full h-1.5 bg-white/10 hover:bg-white/15 rounded-lg appearance-none cursor-pointer outline-none transition-colors ${theme.sliderAccent}`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/45 font-medium tracking-wide">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Panel Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              {/* Queue progress button with Popover */}
              <div className="relative hidden sm:block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsQueueOpen(!isQueueOpen)}
                  className="text-xs text-white/75 font-semibold bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ListMusic className="h-4 w-4 opacity-70" />
                  <span>Track {currentQueueIndex + 1} of {musicQueue.length || 1}</span>
                </motion.button>

                <AnimatePresence>
                  {isQueueOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute bottom-full left-0 mb-3.5 w-[310px] rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col select-none"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2 shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 flex items-center gap-1.5">
                          <ListMusic className="h-4 w-4 text-white/50" />
                          Upcoming Queue
                        </p>
                        <button 
                          onClick={() => setIsQueueOpen(false)}
                          className="text-white/40 hover:text-white text-[9px] uppercase font-bold tracking-wider transition duration-150"
                        >
                          Close
                        </button>
                      </div>
                      
                      <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {musicQueue.map((song, queueIdx) => {
                          if (queueIdx < currentQueueIndex) return null;
                          const isCurrent = queueIdx === currentQueueIndex;
                          return (
                            <motion.button
                              whileHover={{ scale: 1.01, x: 2 }}
                              whileTap={{ scale: 0.99 }}
                              key={`${song.id}-queue-popover-${queueIdx}`}
                              onClick={() => {
                                onPlaySongAtIndex?.(queueIdx);
                              }}
                              className={`flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition ${
                                isCurrent 
                                  ? "bg-white/10 text-white" 
                                  : "bg-transparent hover:bg-white/[0.03] text-white/60 hover:text-white"
                              }`}
                            >
                              <span className={`text-[10px] font-mono w-4 text-center shrink-0 ${isCurrent ? theme.text : "opacity-35"}`}>
                                {queueIdx + 1}
                              </span>
                              
                              <div className="h-7 w-7 rounded overflow-hidden shadow shrink-0 border border-white/10">
                                <img src={song.image} alt="" className="h-full w-full object-cover select-none pointer-events-none" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className={`text-[10.5px] font-bold truncate ${isCurrent ? theme.text : ""}`}>{song.title}</p>
                                <p className="text-[8.5px] opacity-50 truncate leading-none mt-0.5">{song.artist}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                        {musicQueue.length - 1 <= currentQueueIndex && (
                          <p className="text-[9px] text-white/30 text-center py-4 italic leading-none">No upcoming songs in queue</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Main Playback Buttons */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onPrevTrack}
                  disabled={musicQueue.length <= 1}
                  className="p-3 rounded-full hover:bg-white/5 text-white/70 hover:text-white border border-transparent hover:border-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition duration-200"
                >
                  <SkipBack className="h-5 w-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayPause}
                  className={`p-5 rounded-full text-white transition-all duration-300 border ${theme.accentBg} ${theme.accentText} hover:brightness-110`}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-current" />
                  ) : (
                    <Play className="h-6 w-6 fill-current translate-x-0.5" />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onNextTrack}
                  disabled={musicQueue.length <= 1}
                  className="p-3 rounded-full hover:bg-white/5 text-white/70 hover:text-white border border-transparent hover:border-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition duration-200"
                >
                  <SkipForward className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 w-36 text-white/50">
                <motion.button 
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)} 
                  className="hover:text-white transition"
                >
                  {volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                </motion.button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className={`volume-slider flex-1 h-1 bg-white/10 hover:bg-white/15 rounded-lg appearance-none cursor-pointer outline-none ${theme.sliderAccent}`}
                />
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
