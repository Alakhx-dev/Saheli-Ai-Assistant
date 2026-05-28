import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Minimize2, Disc, Music, Heart } from "lucide-react";
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
}

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
}: FullscreenPlayerProps) {
  
  if (!isOpen || !currentSong) return null;

  // Format time (seconds -> mm:ss)
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[10100] flex flex-col justify-between bg-[#040108] p-6 md:p-12 text-white select-none overflow-hidden"
        >
          {/* Ambient blurred backdrop using Album Art */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none scale-110">
            {currentSong.image && (
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-[100px] opacity-25 scale-105"
                style={{ backgroundImage: `url(${currentSong.image})` }}
              />
            )}
            {/* Soft gradient lighting layer */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#040108] via-[#040108]/75 to-transparent" />
            <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 30%, #040108 90%)" />
          </div>

          {/* Glowing Aura Orb */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-15 pointer-events-none transition-all duration-1000 animate-pulse"
            style={{
              background: "radial-gradient(circle, var(--mood-blob-1, rgba(236, 72, 153, 0.4)) 0%, transparent 70%)",
              animationDuration: "8s"
            }}
          />

          {/* Floating Subtle Ambient Dust Particles */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
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
              <span className="p-1 rounded-lg bg-pink-500/10 border border-pink-500/25">
                <Heart className="h-4 w-4 text-pink-300 fill-current animate-pulse" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-pink-300">Saheli Immersive Vibe</span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Minimize2 className="h-4 w-4" />
              <span>Back to Chat</span>
            </button>
          </header>

          {/* Main Visualizer Stage */}
          <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 my-8 min-h-0">
            
            {/* Left: Album Artwork Stage */}
            <div className="relative flex items-center justify-center shrink-0">
              {/* Outer pulsing glow ring */}
              <div 
                className={`absolute w-[240px] h-[240px] md:w-[380px] md:h-[380px] rounded-full filter blur-[35px] opacity-40 transition-transform duration-1000 ${isPlaying ? "scale-105" : "scale-95"}`}
                style={{
                  background: "conic-gradient(from 0deg, #ff4fd8, #9954ef, #ff4fd8)",
                  animation: isPlaying ? "border-rotate 8s linear infinite" : "none"
                }}
              />
              
              {/* Actual Art Frame */}
              <div className="relative w-[220px] h-[220px] md:w-[340px] md:h-[340px] rounded-full border-[6px] border-white/10 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] bg-zinc-950">
                {currentSong.image ? (
                  <img 
                    src={currentSong.image} 
                    alt={currentSong.title} 
                    className={`h-full w-full object-cover select-none pointer-events-none transition-transform ${isPlaying ? "rotate-360" : ""}`}
                    style={{ 
                      borderRadius: "50%",
                      animation: isPlaying ? "spin 25s linear infinite" : "none",
                      transitionDuration: "4000ms"
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-zinc-900">
                    <Music className="h-16 w-16 text-white/20" />
                  </div>
                )}
                
                {/* Vinyl Record Center Hole style */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-10 md:h-10 rounded-full bg-[#040108] border-[3px] border-white/20 shadow-inner" />
              </div>
            </div>

            {/* Right: Meta & Lyrics/Wave Stage */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md w-full">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Now Playing</span>
                <h1 className="text-xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-pink-200 bg-clip-text text-transparent">
                  {currentSong.title}
                </h1>
                <h2 className="text-sm md:text-lg font-medium text-pink-300/80 tracking-wide mt-1">
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
                      className="w-0.5 rounded-full bg-gradient-to-t from-pink-500 to-purple-400"
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
                  className="timeline-slider w-full h-1.5 bg-white/10 hover:bg-white/15 rounded-lg appearance-none cursor-pointer outline-none transition-colors accent-pink-500"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/45 font-medium tracking-wide">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Panel Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              {/* Queue progress tag */}
              <div className="text-xs text-white/45 font-semibold bg-white/5 border border-white/5 px-4 py-2 rounded-full hidden sm:block">
                Track {currentQueueIndex + 1} of {musicQueue.length || 1}
              </div>

              {/* Main Playback Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={onPrevTrack}
                  disabled={musicQueue.length <= 1}
                  className="p-3 rounded-full hover:bg-white/5 text-white/70 hover:text-white border border-transparent hover:border-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition duration-200"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  onClick={onPlayPause}
                  className="p-5 rounded-full bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] transition"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-black" />
                  ) : (
                    <Play className="h-6 w-6 fill-black translate-x-0.5" />
                  )}
                </button>
                <button
                  onClick={onNextTrack}
                  disabled={musicQueue.length <= 1}
                  className="p-3 rounded-full hover:bg-white/5 text-white/70 hover:text-white border border-transparent hover:border-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition duration-200"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 w-36 text-white/50">
                <button onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)} className="hover:text-white transition">
                  {volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="volume-slider flex-1 h-1 bg-white/10 hover:bg-white/15 rounded-lg appearance-none cursor-pointer outline-none accent-pink-500"
                />
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
