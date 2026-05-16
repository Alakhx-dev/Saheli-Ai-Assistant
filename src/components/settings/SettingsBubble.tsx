import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  ImageIcon,
  MessageSquareText,
  MoonStar,
  UserRound,
  ArrowLeft,
} from "lucide-react";
import type { AIProvider } from "@/lib/ai-service";

interface SettingsBubbleProps {
  open: boolean;
  isLightMode: boolean;
  memoryEnabled: boolean;
  profileName: string;
  profileEmail?: string;
  profileInitial: string;
  onClose: () => void;
  onThemeToggle: (nextValue: boolean) => void;
  onMemoryToggle: (nextValue: boolean) => void;
  onOpenMemory: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  activeProvider: AIProvider;
  onSelectProvider: (provider: AIProvider) => void;
}

type BubbleSection = "home" | "personalization" | "model" | "memory" | "account";

function playPopSound() {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(180, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.onended = () => void context.close();
  } catch {}
}

function LiquidSwitch({ checked, onChange }: { checked: boolean; onChange: (nextValue: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="liquid-switch-track-glass"
    >
      <motion.span
        layout
        className="liquid-switch-thumb-glass"
        animate={{
          x: checked ? 20 : 0,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
    </button>
  );
}

function BubbleAction({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      layout
      whileHover={{ y: -1.5, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bubble-action-glass ${active ? "active" : ""}`}
    >
      <span className="bubble-icon-wrap">{icon}</span>
      <span className="bubble-label-text">{label}</span>
    </motion.button>
  );
}

export default function SettingsBubble({
  open,
  isLightMode,
  activeProvider,
  onClose,
  onThemeToggle,
  onOpenMemory,
  onOpenProfile,
  onSelectProvider,
}: SettingsBubbleProps) {
  const [section, setSection] = useState<BubbleSection>("home");

  useEffect(() => {
    if (!open) {
      setSection("home");
    }
  }, [open]);

  const handleOpenMemoryTab = (tab: "chat" | "image") => {
    playPopSound();
    onOpenMemory();
    onClose();
    setTimeout(() => window.dispatchEvent(new CustomEvent('saheli-memory-tab', { detail: tab })), 50);
  };

  const renderHome = () => (
    <motion.div layout className="space-y-1.5">
      <BubbleAction
        label="Personalization"
        icon={<MoonStar className="h-4 w-4 text-purple-300" />}
        onClick={() => setSection("personalization")}
      />
      <BubbleAction
        label="Memory"
        icon={<MessageSquareText className="h-4 w-4 text-pink-300" />}
        onClick={() => setSection("memory")}
      />
      <BubbleAction
        label="Account"
        icon={<UserRound className="h-4 w-4 text-purple-300" />}
        onClick={() => setSection("account")}
      />
      <BubbleAction
        label="AI Model"
        icon={<Atom className="h-4 w-4 text-pink-300" />}
        onClick={() => setSection("model")}
      />
    </motion.div>
  );

  const renderMemory = () => (
    <motion.div layout className="space-y-1.5">
      <BubbleAction
        label="Chat Memory"
        icon={<MessageSquareText className="h-4 w-4 text-pink-300" />}
        onClick={() => handleOpenMemoryTab("chat")}
      />
      <BubbleAction
        label="Image Memory"
        icon={<ImageIcon className="h-4 w-4 text-purple-300" />}
        onClick={() => handleOpenMemoryTab("image")}
      />
    </motion.div>
  );

  const renderAccount = () => (
    <motion.div layout className="space-y-1.5">
      <BubbleAction
        label="Open Full Profile"
        icon={<UserRound className="h-4 w-4 text-pink-300" />}
        onClick={() => { playPopSound(); onOpenProfile(); onClose(); }}
      />
    </motion.div>
  );

  const renderPersonalization = () => (
    <motion.div layout className="space-y-1.5">
      <div className="bubble-action-glass justify-between cursor-default">
        <span className="bubble-label-text">Light Mode</span>
        <LiquidSwitch checked={isLightMode} onChange={onThemeToggle} />
      </div>
    </motion.div>
  );

  const renderModel = () => (
    <motion.div layout className="space-y-1.5">
      <div className="bubble-action-glass justify-between cursor-default">
        <div className="min-w-0 pr-4">
          <div className="bubble-label-text">OpenRouter</div>
          <div className="text-[11px] text-white/45">Off = OpenRouter</div>
        </div>
        <LiquidSwitch
          checked={activeProvider === "Groq"}
          onChange={(checked) => onSelectProvider(checked ? "Groq" : "OpenRouter")}
        />
      </div>
      <div className="bubble-action-glass justify-between cursor-default">
        <div className="min-w-0 pr-4">
          <div className="bubble-label-text">Groq</div>
          <div className="text-[11px] text-white/45">On = Groq only</div>
        </div>
        <div className="text-xs font-semibold text-pink-100">
          {activeProvider === "Groq" ? "Selected" : ""}
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layoutId="settings-bubble"
          initial={{ opacity: 0, scale: 0, borderRadius: "50%", originX: 0, originY: 1 }}
          animate={{ opacity: 1, scale: [0, 1.1, 1], borderRadius: ["50%", "20%", "24px"], x: 10 }}
          exit={{ opacity: 0, scale: 0, borderRadius: "50%" }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
          className="liquid-bubble-glass"
        >
          {section !== "home" && (
            <div className="mb-2">
              <motion.button
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                type="button"
                onClick={() => setSection("home")}
                className="bubble-back-minimal"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </motion.button>
            </div>
          )}
          
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {section === "home" && renderHome()}
              {section === "personalization" && renderPersonalization()}
              {section === "memory" && renderMemory()}
              {section === "account" && renderAccount()}
              {section === "model" && renderModel()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
