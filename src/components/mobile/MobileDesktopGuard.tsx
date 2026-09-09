import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Laptop, AlertTriangle, X, Sparkles, Monitor } from "lucide-react";

interface MobileDesktopGuardProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const MobileDesktopGuard: React.FC<MobileDesktopGuardProps> = ({
  isOpen,
  onClose,
  featureName = "This Feature",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl text-white"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Glowing Accent Icon */}
            <div className="mb-4 flex items-center justify-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-cyan-500/20 p-3 ring-1 ring-white/30 shadow-lg">
                <Laptop className="h-8 w-8 text-pink-400 animate-pulse" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-cyan-300" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-center text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-cyan-300">
              Desktop Optimized
            </h3>

            {/* Sub-text */}
            <p className="mt-2 text-center text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-pink-300">{featureName}</span> is designed for high-performance desktop screens.
            </p>

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Best experience ke liye kripya <strong>Saheli AI</strong> ko Laptop/PC browser par open karein.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Monitor className="h-4 w-4" />
                Got it / Understood
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileDesktopGuard;
