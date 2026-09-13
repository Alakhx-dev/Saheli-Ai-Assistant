import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Maximize2, RefreshCw, Copy, Check, Sparkles, Camera, X, Heart } from "lucide-react";
import { toast } from "sonner";

export interface BestieSnapCardProps {
  imageUrl?: string;
  prompt: string;
  isGenerating?: boolean;
  caption?: string;
  provider?: string;
  activeTheme?: string;
  onRegenerate?: () => void;
}

// Ornamental Filigree Corner Flourish matching vintage baroque vector pattern
const FiligreeCorner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    className={`w-16 h-16 sm:w-20 sm:h-20 text-pink-400 filter drop-shadow-[0_0_15px_rgba(244,114,182,0.95)] ${className}`}
    fill="currentColor"
  >
    <g>
      {/* Outer spiral scroll 1 */}
      <path d="M 35,6 C 22,6 14,15 16,26 C 18,34 27,37 32,32 C 36,27 31,22 26,24 C 22,26 22,20 28,16 C 36,12 47,22 42,34 C 39,40 32,44 26,48 C 20,52 14,58 10,67 C 6,77 6,90 17,97 C 26,102 37,94 34,86 C 32,80 24,80 22,85 C 20,90 27,94 30,90 C 34,86 28,74 18,76 C 12,77 10,64 18,54 C 24,46 34,42 40,36 C 47,28 47,12 35,6 Z" />
      {/* Outer spiral scroll 2 */}
      <path d="M 6,35 C 6,22 15,14 26,16 C 34,18 37,27 32,32 C 27,36 22,31 24,26 C 26,22 20,22 16,28 C 12,36 22,47 34,42 C 40,39 44,32 48,26 C 52,20 58,14 67,10 C 77,6 90,6 97,17 C 102,26 94,37 86,34 C 80,32 80,24 85,22 C 90,20 94,27 90,30 C 86,34 74,28 76,18 C 77,12 64,10 54,18 C 46,24 42,34 36,40 C 28,47 12,47 6,35 Z" />
      {/* Fleur-de-lis leaves */}
      <path d="M 30,30 C 18,18 38,8 46,20 C 50,26 42,34 34,30 Z" />
      <path d="M 30,30 C 18,18 8,38 20,46 C 26,50 34,42 30,34 Z" />
      <path d="M 40,40 C 30,30 48,22 55,32 C 58,36 50,44 42,40 Z" />
      <path d="M 40,40 C 30,30 22,48 32,55 C 36,58 44,50 40,42 Z" />
      {/* Center bead */}
      <circle cx="38" cy="38" r="3.5" />
    </g>
  </svg>
);

export const BestieSnapCard: React.FC<BestieSnapCardProps> = ({
  imageUrl,
  prompt,
  isGenerating = false,
  caption,
  provider = "Cloudflare FLUX.1",
  activeTheme = "pink",
  onRegenerate,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Saheli_Snap_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Photo saved to your device! 📸✨");
    } catch {
      // Fallback direct open/download
      const link = document.createElement("a");
      link.href = imageUrl;
      link.target = "_blank";
      link.download = "Saheli_Snap.png";
      link.click();
      toast.success("Opening photo... 📸");
    }
  };

  const handleCopyImage = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      let pngBlob = blob;
      if (blob.type !== "image/png") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        pngBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b || blob), "image/png")
        );
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [pngBlob.type]: pngBlob }),
      ]);
      setCopied(true);
      toast.success("Image copied to clipboard! 🖼️✨");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(imageUrl);
        setCopied(true);
        toast.success("Image link copied to clipboard! 🔗✨");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy image.");
      }
    }
  };

  // Dynamic theme shadow, border glow, gradients & modal tokens mapping
  // Dynamic theme shadow, border glow, gradients & modal tokens mapping
  const themeStylesMap: Record<
    string,
    {
      border: string;
      glow: string;
      text: string;
      badge: string;
      modalCardBg: string;
      modalOrb1: string;
      modalOrb2: string;
      modalButtonBg: string;
      modalBadgeBg: string;
      iconColor: string;
      heartFill: string;
    }
  > = {
    pink: {
      border: "border-white/10",
      glow: "rgba(244, 114, 182, 0.12)",
      text: "text-pink-300",
      badge: "bg-white/[0.06] text-pink-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#14081c]/95 via-[#0e0415]/95 to-[#06010a]/95",
      modalOrb1: "bg-pink-600/15",
      modalOrb2: "bg-purple-600/15",
      modalButtonBg: "from-pink-500/80 via-purple-500/80 to-indigo-500/80 shadow-[0_4px_20px_rgba(244,114,182,0.25)]",
      modalBadgeBg: "from-pink-500/15 via-rose-500/15 to-purple-500/15 border-white/15 text-pink-200",
      iconColor: "text-pink-400",
      heartFill: "fill-pink-400 text-pink-400",
    },
    blue: {
      border: "border-white/10",
      glow: "rgba(6, 182, 212, 0.12)",
      text: "text-cyan-300",
      badge: "bg-white/[0.06] text-cyan-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#061420]/95 via-[#040e17]/95 to-[#02070c]/95",
      modalOrb1: "bg-cyan-600/15",
      modalOrb2: "bg-blue-600/15",
      modalButtonBg: "from-cyan-500/80 via-blue-500/80 to-indigo-500/80 shadow-[0_4px_20px_rgba(6,182,212,0.25)]",
      modalBadgeBg: "from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border-white/15 text-cyan-200",
      iconColor: "text-cyan-400",
      heartFill: "fill-cyan-400 text-cyan-400",
    },
    orchid: {
      border: "border-white/10",
      glow: "rgba(168, 85, 247, 0.12)",
      text: "text-purple-300",
      badge: "bg-white/[0.06] text-purple-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#140522]/95 via-[#0c0217]/95 to-[#05010a]/95",
      modalOrb1: "bg-purple-600/15",
      modalOrb2: "bg-fuchsia-600/15",
      modalButtonBg: "from-purple-500/80 via-fuchsia-500/80 to-pink-500/80 shadow-[0_4px_20px_rgba(168,85,247,0.25)]",
      modalBadgeBg: "from-purple-500/15 via-fuchsia-500/15 to-pink-500/15 border-white/15 text-purple-200",
      iconColor: "text-purple-400",
      heartFill: "fill-purple-400 text-purple-400",
    },
    peach: {
      border: "border-white/10",
      glow: "rgba(251, 146, 60, 0.12)",
      text: "text-orange-300",
      badge: "bg-white/[0.06] text-orange-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#1f0b04]/95 via-[#140602]/95 to-[#0a0301]/95",
      modalOrb1: "bg-orange-600/15",
      modalOrb2: "bg-rose-600/15",
      modalButtonBg: "from-orange-500/80 via-rose-500/80 to-amber-500/80 shadow-[0_4px_20px_rgba(251,146,60,0.25)]",
      modalBadgeBg: "from-orange-500/15 via-rose-500/15 to-amber-500/15 border-white/15 text-orange-200",
      iconColor: "text-orange-400",
      heartFill: "fill-orange-400 text-orange-400",
    },
    yellow: {
      border: "border-white/10",
      glow: "rgba(251, 191, 36, 0.12)",
      text: "text-amber-300",
      badge: "bg-white/[0.06] text-amber-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#1d1403]/95 via-[#120c02]/95 to-[#090601]/95",
      modalOrb1: "bg-amber-600/15",
      modalOrb2: "bg-yellow-600/15",
      modalButtonBg: "from-amber-500/80 via-yellow-500/80 to-orange-500/80 shadow-[0_4px_20px_rgba(251,191,36,0.25)]",
      modalBadgeBg: "from-amber-500/15 via-yellow-500/15 to-orange-500/15 border-white/15 text-amber-200",
      iconColor: "text-amber-400",
      heartFill: "fill-amber-400 text-amber-400",
    },
    maroon: {
      border: "border-white/10",
      glow: "rgba(225, 29, 72, 0.12)",
      text: "text-rose-300",
      badge: "bg-white/[0.06] text-rose-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#1e030b]/95 via-[#130107]/95 to-[#090003]/95",
      modalOrb1: "bg-rose-700/15",
      modalOrb2: "bg-red-700/15",
      modalButtonBg: "from-rose-600/80 via-red-600/80 to-pink-600/80 shadow-[0_4px_20px_rgba(225,29,72,0.25)]",
      modalBadgeBg: "from-rose-600/15 via-red-600/15 to-pink-600/15 border-white/15 text-rose-200",
      iconColor: "text-rose-400",
      heartFill: "fill-rose-400 text-rose-400",
    },
    beige: {
      border: "border-white/10",
      glow: "rgba(254, 243, 199, 0.10)",
      text: "text-amber-100",
      badge: "bg-white/[0.06] text-amber-200/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#17110c]/95 via-[#0e0a07]/95 to-[#070503]/95",
      modalOrb1: "bg-amber-500/12",
      modalOrb2: "bg-orange-400/12",
      modalButtonBg: "from-amber-400/80 via-amber-500/80 to-orange-400/80 text-amber-950 shadow-[0_4px_20px_rgba(251,191,36,0.25)]",
      modalBadgeBg: "from-amber-200/12 via-orange-200/12 to-yellow-200/12 border-white/15 text-amber-100",
      iconColor: "text-amber-300",
      heartFill: "fill-amber-300 text-amber-300",
    },
    custom: {
      border: "border-white/10",
      glow: "rgba(255, 255, 255, 0.10)",
      text: "text-white/90",
      badge: "bg-white/[0.06] text-white/95 border-white/10 backdrop-blur-xl",
      modalCardBg: "from-[#0f0f16]/95 via-[#0a0a0e]/95 to-[#050507]/95",
      modalOrb1: "bg-purple-600/12",
      modalOrb2: "bg-pink-600/12",
      modalButtonBg: "from-purple-500/80 via-pink-500/80 to-rose-500/80 shadow-[0_4px_20px_rgba(255,255,255,0.15)]",
      modalBadgeBg: "from-white/10 via-white/10 to-white/10 border-white/15 text-white",
      iconColor: "text-pink-300",
      heartFill: "fill-pink-300 text-pink-300",
    },
  };

  const themeStyle = themeStylesMap[activeTheme] || themeStylesMap.pink;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative my-3.5 overflow-hidden rounded-[30px] border border-white/[0.12] bg-slate-950/40 p-4 sm:p-5 text-white backdrop-blur-2xl transition-all duration-300 max-w-sm sm:max-w-md select-none group/card"
        style={{
          boxShadow: `0 30px 60px -12px rgba(0, 0, 0, 0.85), 0 0 35px ${themeStyle.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.5)`,
        }}
      >
        {/* Soft Ambient Background Mesh Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[30px]">
          <div className={`absolute -top-24 -left-24 w-60 h-60 rounded-full blur-[80px] opacity-20 transition-all duration-700 ${themeStyle.modalOrb1}`} />
          <div className={`absolute -bottom-24 -right-24 w-60 h-60 rounded-full blur-[80px] opacity-20 transition-all duration-700 ${themeStyle.modalOrb2}`} />
          {/* Glass glare line across top corner */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between mb-3.5 px-0.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-xl shadow-inner">
              <Camera className={`h-3.5 w-3.5 ${themeStyle.text}`} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm"></span>
              </span>
            </div>
            <span className="text-xs font-bold tracking-wider uppercase opacity-95 text-white/90 flex items-center gap-1.5 drop-shadow-sm">
              Saheli's Snap
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            </span>
          </div>

          <span className={`px-3 py-1 text-[10.5px] font-medium tracking-wide rounded-full border backdrop-blur-xl shadow-sm ${themeStyle.badge}`}>
            {isGenerating ? "Snapping... 📸" : "Just Now • FLUX.1"}
          </span>
        </div>

        {/* Photo Container with Ambient Blurred Backdrop */}
        <div className="relative z-10 group overflow-hidden rounded-[22px] bg-black/50 border border-white/10 aspect-square sm:aspect-[4/3] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          {isGenerating ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {/* Shimmer & Ambient Radial Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.12),transparent_70%)] animate-pulse" />
              
              {/* Animated Glowing Ring & Camera Lens */}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center">
                  {/* Outer Pulsating Ring */}
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.08, 1] }}
                    transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                    className="w-16 h-16 rounded-full border border-white/20 border-dashed p-1 flex items-center justify-center shadow-[0_0_30px_rgba(244,114,182,0.2)]"
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-md" />
                  </motion.div>

                  {/* Inner Camera Icon */}
                  <motion.div
                    animate={{ scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/25 shadow-xl"
                  >
                    <Camera className={`h-5 w-5 ${themeStyle.text}`} />
                  </motion.div>

                  {/* Floating Sparkles */}
                  <motion.div
                    animate={{ y: [-4, 4, -4], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="h-4.5 w-4.5 text-amber-300 animate-spin" />
                  </motion.div>
                </div>

                {/* Animated Status Text */}
                <div className="space-y-1 z-10">
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs sm:text-sm font-semibold tracking-wide text-white/95 flex items-center justify-center gap-1.5"
                  >
                    Saheli is snapping a photo... ✨
                  </motion.p>
                  <p className="text-[10.5px] text-white/40 font-medium">Cloudflare Workers AI • Flux-1 Schnell</p>
                </div>
              </div>
            </div>
          ) : imageUrl ? (
            <>
              {/* Ambient Blurred Background Image */}
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none filter saturate-150"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none z-10" />

              {/* Main Photo */}
              <img
                src={imageUrl}
                alt="Saheli Generated Snap"
                className="relative z-10 w-full h-full object-cover rounded-[20px] transition-transform duration-700 ease-out group-hover:scale-[1.025] cursor-pointer"
                onClick={() => setIsLightboxOpen(true)}
              />

              {/* Hover Overlay Buttons - Appears on Mouse Hover over Image */}
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3 pointer-events-none">
                {/* Top Row Quick Actions (Copy Image) */}
                <div className="flex justify-end pointer-events-auto">
                  <button
                    onClick={handleCopyImage}
                    title="Copy Image to Clipboard"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-xl text-white/90 hover:text-white transition border border-white/20 cursor-pointer shadow-lg active:scale-95 text-xs font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bottom Row Action Dock on Image */}
                <div className="flex items-center justify-between gap-1.5 pointer-events-auto">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsLightboxOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-xl text-white text-xs font-semibold border border-white/20 transition cursor-pointer shadow-lg active:scale-95"
                      title="Full View"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Full</span>
                    </button>

                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-xl text-white text-xs font-semibold border border-white/20 transition cursor-pointer shadow-lg active:scale-95"
                        title="Re-snap variation"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-purple-300" />
                        <span>Re-snap</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleDownload}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${themeStyle.modalButtonBg} hover:brightness-110 text-white text-xs font-semibold border border-white/25 transition cursor-pointer shadow-xl active:scale-95`}
                    title="Save HD Photo"
                  >
                    <Download className="h-3.5 w-3.5" /> Save HD
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-white/50">Failed to render photo</div>
          )}
        </div>

        {/* Caption Box */}
        {caption && (
          <div className="relative z-10 mt-3 p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-start gap-2.5 shadow-sm">
            <Heart className={`w-3.5 h-3.5 ${themeStyle.heartFill} flex-shrink-0 mt-0.5 animate-pulse filter drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]`} />
            <p className="text-xs text-white/85 leading-relaxed font-light italic">
              "{caption}"
            </p>
          </div>
        )}
      </motion.div>

      {/* Polaroid Bestie Snap Lightbox Modal - Rendered via Portal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isLightboxOpen && imageUrl && (
              <motion.div
                key="lightbox-overlay"
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(32px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#05020a]/92 p-3 sm:p-6 select-none overflow-y-auto"
                onClick={() => setIsLightboxOpen(false)}
              >
                {/* Floating Multicolored Glowing Ambient Orbs matching Active Theme */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className={`absolute top-[12%] left-[18%] w-[500px] h-[500px] ${themeStyle.modalOrb1} rounded-full blur-[140px] animate-pulse`} />
                  <div className={`absolute bottom-[12%] right-[18%] w-[500px] h-[500px] ${themeStyle.modalOrb2} rounded-full blur-[140px] animate-pulse`} style={{ animationDelay: "1s" }} />
                </div>

                {/* Floating Cute Hearts & Sparkles Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[
                    { top: "10%", left: "8%", size: "text-3xl", delay: 0, dur: 3.5, char: "💖" },
                    { top: "18%", right: "10%", size: "text-3xl", delay: 0.8, dur: 4.2, char: "✨" },
                    { bottom: "16%", left: "6%", size: "text-2xl", delay: 0.4, dur: 3.8, char: "💕" },
                    { bottom: "10%", right: "8%", size: "text-3xl", delay: 1.2, dur: 4.5, char: "🌸" },
                    { top: "52%", left: "3%", size: "text-2xl", delay: 1.8, dur: 3.2, char: "🎀" },
                    { top: "45%", right: "4%", size: "text-2xl", delay: 1.5, dur: 4.0, char: "💖" },
                  ].map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 0, opacity: 0.35, scale: 0.8 }}
                      animate={{
                        y: [-14, 14, -14],
                        opacity: [0.35, 0.85, 0.35],
                        scale: [0.85, 1.15, 0.85],
                        rotate: [-8, 8, -8],
                      }}
                      exit={{
                        y: 30,
                        opacity: 0,
                        scale: 0.2,
                        transition: { duration: 0.25 },
                      }}
                      transition={{
                        duration: h.dur,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: h.delay,
                      }}
                      className={`absolute ${h.size} filter drop-shadow-[0_0_15px_rgba(244,114,182,0.8)]`}
                      style={{ top: h.top, left: h.left, right: h.right, bottom: h.bottom }}
                    >
                      {h.char}
                    </motion.span>
                  ))}
                </div>

                {/* Polaroid Bestie Card Container with Ultra-Premium Glassmorphism & Filigree Corners */}
                <motion.div
                  key="lightbox-card"
                  initial={{ scale: 0.35, opacity: 0, y: 50, rotate: -3 }}
                  animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                  exit={{ scale: 0.35, opacity: 0, y: 50, rotate: -3 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 26,
                  }}
                  className="relative w-fit max-w-[92vw] max-h-[92vh] rounded-[36px] border border-white/[0.15] bg-slate-950/50 backdrop-blur-3xl p-3 sm:p-4 flex flex-col items-center overflow-hidden select-none group/modal"
                  style={{
                    boxShadow: `0 40px 80px -15px rgba(0, 0, 0, 0.95), 0 0 70px ${themeStyle.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.5)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Camera Shutter Flash Effect */}
                  <motion.div
                    initial={{ opacity: 0.9, scale: 1.1 }}
                    animate={{ opacity: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 z-50 bg-gradient-to-tr from-white via-pink-200 to-transparent pointer-events-none rounded-[36px]"
                  />

                  {/* Soft Background Mesh & Specular Shine */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[36px]">
                    <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] opacity-30 ${themeStyle.modalOrb1}`} />
                    <div className={`absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-30 ${themeStyle.modalOrb2}`} />
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                  </div>

                  {/* Floating Close Button in Top-Right Corner */}
                  <button
                    onClick={() => setIsLightboxOpen(false)}
                    className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-all duration-200 border border-white/20 backdrop-blur-2xl cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 flex items-center justify-center group/close"
                    title="Close"
                  >
                    <X className="h-4.5 w-4.5 transition-transform duration-200 group-hover/close:rotate-90" />
                  </button>

                  {/* Main Photo Container with Baroque Filigree Corners */}
                  <div className="relative rounded-[26px] overflow-hidden border border-white/15 bg-black/60 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex items-center justify-center min-h-0 w-full group relative z-10 p-1.5 sm:p-2">
                    {/* 4 Decorative Filigree Corners */}
                    <FiligreeCorner className={`absolute top-2 left-2 pointer-events-none z-30 opacity-80 ${themeStyle.iconColor}`} />
                    <FiligreeCorner className={`absolute top-2 right-2 rotate-90 pointer-events-none z-30 opacity-80 ${themeStyle.iconColor}`} />
                    <FiligreeCorner className={`absolute bottom-2 left-2 -rotate-90 pointer-events-none z-30 opacity-80 ${themeStyle.iconColor}`} />
                    <FiligreeCorner className={`absolute bottom-2 right-2 rotate-180 pointer-events-none z-30 opacity-80 ${themeStyle.iconColor}`} />

                    {/* Ambient Blurred Background Layer */}
                    <img
                      src={imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-125 pointer-events-none filter saturate-150"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none z-10" />

                    {/* Main High-Res Image */}
                    <img
                      src={imageUrl}
                      alt="Saheli Full Resolution Snap"
                      className="relative z-20 max-h-[78vh] w-auto object-contain rounded-[20px] mx-auto shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default BestieSnapCard;
