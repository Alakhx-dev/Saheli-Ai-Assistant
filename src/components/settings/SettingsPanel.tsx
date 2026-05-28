import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ImageIcon, MessageSquareText, Camera, Upload, Trash2, UserCircle, LogOut, KeyRound, Pencil, CalendarDays, Clock3, CloudSun, LocateFixed, RefreshCw, GripVertical, ChevronDown, ChevronRight, Maximize2, Undo2, X, LayoutGrid, Music } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getLang } from "@/lib/useLanguage";
import type { RealtimeAwarenessSnapshot } from "@/lib/realtime-awareness";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type SettingsSectionId = 
  | "personalization" | "character" | "memory" | "account" | "appearance" | "voice" | "about" | "realtime"
  | "color" | "customization" | "chat_memory" | "image_memory" | "memory_toggle"
  | "profile" | "password" | "logout" | "bestie_mentor" | "bond_progress" | "reset_memory"
  | "incognito" | "api_keys" | "music";
type ReplyLanguageMode = "auto" | "english" | "hindi" | "hinglish";

const getThemeClasses = (color: string, type: "active" | "inactive" | "text" | "badge" | "hoverBorder" | "textLight" | "switchActive") => {
  switch (color) {
    case "yellow":
      if (type === "active") return "border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 to-amber-500/15 text-white shadow-[0_0_20px_rgba(255,215,0,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-yellow-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-yellow-300";
      if (type === "hoverBorder") return "hover:border-yellow-500/20";
      if (type === "textLight") return "text-yellow-300";
      if (type === "switchActive") return "border-yellow-400/35 bg-yellow-500/15 text-yellow-100";
      return "border-yellow-300/30 bg-yellow-500/15 text-yellow-100";
    case "blue":
      if (type === "active") return "border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-white shadow-[0_0_20px_rgba(0,229,255,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-cyan-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-cyan-300";
      if (type === "hoverBorder") return "hover:border-cyan-500/20";
      if (type === "textLight") return "text-cyan-300";
      if (type === "switchActive") return "border-cyan-400/35 bg-cyan-500/15 text-cyan-100";
      return "border-cyan-300/30 bg-cyan-500/15 text-cyan-100";
    case "orchid":
      if (type === "active") return "border-purple-500/40 bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-white shadow-[0_0_20px_rgba(213,0,249,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-purple-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-purple-300";
      if (type === "hoverBorder") return "hover:border-purple-500/20";
      if (type === "textLight") return "text-purple-300";
      if (type === "switchActive") return "border-purple-400/35 bg-purple-500/15 text-purple-100";
      return "border-purple-300/30 bg-purple-500/15 text-purple-100";
    case "peach":
      if (type === "active") return "border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-red-500/15 text-white shadow-[0_0_20px_rgba(255,158,125,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-orange-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-orange-300";
      if (type === "hoverBorder") return "hover:border-orange-500/20";
      if (type === "textLight") return "text-orange-300";
      if (type === "switchActive") return "border-orange-400/35 bg-orange-500/15 text-orange-100";
      return "border-orange-300/30 bg-orange-500/15 text-orange-100";
    case "beige":
      if (type === "active") return "border-amber-500/30 bg-gradient-to-r from-amber-600/10 to-amber-900/10 text-white shadow-[0_0_20px_rgba(212,184,149,0.1)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-amber-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-amber-200";
      if (type === "hoverBorder") return "hover:border-amber-500/20";
      if (type === "textLight") return "text-amber-200";
      if (type === "switchActive") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
      return "border-amber-300/20 bg-amber-500/15 text-amber-200";
    case "maroon":
      if (type === "active") return "border-red-500/40 bg-gradient-to-r from-red-800/15 to-red-950/15 text-white shadow-[0_0_20px_rgba(208,28,63,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-red-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-red-300";
      if (type === "hoverBorder") return "hover:border-red-500/20";
      if (type === "textLight") return "text-red-300";
      if (type === "switchActive") return "border-red-400/35 bg-red-500/15 text-red-100";
      return "border-red-300/30 bg-red-500/15 text-red-100";
    case "gemini":
      if (type === "active") return "border-blue-500/40 bg-gradient-to-r from-blue-500/15 to-indigo-950/25 text-white shadow-[0_0_20px_rgba(74,137,255,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-blue-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-blue-300";
      if (type === "hoverBorder") return "hover:border-blue-500/20";
      if (type === "textLight") return "text-blue-300";
      if (type === "switchActive") return "border-blue-400/35 bg-blue-500/15 text-blue-100";
      return "border-blue-300/30 bg-blue-500/15 text-blue-100";
    case "pink":
    default:
      if (type === "active") return "border-pink-500/40 bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-white shadow-[0_0_20px_rgba(255,105,180,0.15)]";
      if (type === "inactive") return "border-white/5 bg-white/[0.02] text-white/70 hover:border-pink-500/20 hover:bg-white/[0.05] hover:text-white";
      if (type === "text") return "text-pink-300";
      if (type === "hoverBorder") return "hover:border-pink-500/20";
      if (type === "textLight") return "text-pink-300";
      if (type === "switchActive") return "border-pink-400/35 bg-pink-500/15 text-pink-100";
      return "border-pink-300/30 bg-pink-500/15 text-pink-100";
  }
};

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  languageMode: ReplyLanguageMode;
  onLanguageModeChange: (mode: ReplyLanguageMode) => void;
  memoryEnabled: boolean;
  onMemoryToggle: (enabled: boolean) => void;
  onManageMemory: () => void;
  profileName: string;
  profileSubtext: string;
  profileImageUrl?: string;
  profileInitial: string;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  isTtsMuted: boolean;
  onToggleTtsMute: () => void;
  selectedCharacter: string;
  onCharacterChange: (character: string) => void;
  activeMode: "bestie" | "mentor";
  onModeChange: (mode: "bestie" | "mentor") => void;
  // Inline account editing props
  profileDraftName: string;
  onProfileNameChange: (name: string) => void;
  onProfileImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileImageDelete: () => void;
  onSaveProfile: (nameOverride?: string) => void;
  isSavingProfile: boolean;
  /** The original email/OAuth photo URL (fallback when custom is deleted) */
  originalPhotoUrl?: string;
  realtimeAwareness: RealtimeAwarenessSnapshot;
  awarenessLocationLabel: string;
  awarenessWeatherLabel: string;
  awarenessTimeFormat: "12h" | "24h";
  awarenessShowDayDate: boolean;
  awarenessRefreshing: boolean;
  onAwarenessTimeFormatChange: (mode: "12h" | "24h") => void;
  onAwarenessToggleDayDateVisibility: () => void;
  onAwarenessRefresh: () => void;
  onOpenMusicSystem?: () => void;
}

const characterCards = [
  { id: "swara", label: "Swara 🦋", image: "/butterfly.png", accent: "from-pink-400/20 to-purple-400/10" },
  { id: "aarohi", label: "Aarohi ✨", image: "/Aarohi ✨.png", accent: "from-red-500/20 to-rose-400/10" },
  { id: "vaidehi", label: "Vaidehi 🌻", image: "/Vaidehi 🌻.png", accent: "from-amber-400/20 to-yellow-400/10" },
  { id: "anvika", label: "Anvika 🌸", image: "/Anvika 🌸.png", accent: "from-pink-400/20 to-rose-300/10" },
];

export interface ConfigItem {
  id: SettingsSectionId;
  label: string;
  type: "tab" | "item";
  parentId: SettingsSectionId | null;
}

export const DEFAULT_LAYOUT: ConfigItem[] = [
  { id: "personalization", label: "Personalization", type: "tab", parentId: null },
  { id: "character", label: "Character Selection", type: "item", parentId: "personalization" },
  { id: "realtime", label: "Date, Time & Weather", type: "item", parentId: "personalization" },
  { id: "color", label: "Theme Color", type: "item", parentId: "personalization" },
  { id: "customization", label: "Customization", type: "item", parentId: "personalization" },
  { id: "music", label: "Music System", type: "item", parentId: null },

  { id: "memory", label: "Memory", type: "tab", parentId: null },
  { id: "chat_memory", label: "Chat Memory", type: "item", parentId: "memory" },
  { id: "image_memory", label: "Image Memory", type: "item", parentId: "memory" },
  { id: "memory_toggle", label: "Memory Auto-Save", type: "item", parentId: "memory" },

  { id: "account", label: "Account", type: "tab", parentId: null },
  { id: "profile", label: "Profile Settings", type: "item", parentId: "account" },
  { id: "password", label: "Change Password", type: "item", parentId: "account" },
  { id: "logout", label: "Logout", type: "item", parentId: "account" },

  { id: "appearance", label: "Personality", type: "tab", parentId: null },
  { id: "bestie_mentor", label: "Interaction Style", type: "item", parentId: "appearance" },

  { id: "about", label: "Privacy", type: "tab", parentId: null },
  { id: "incognito", label: "Incognito Mode", type: "item", parentId: "about" },
  { id: "api_keys", label: "Custom API Keys", type: "item", parentId: "about" },
];

const sanitizeAndMigrateLayout = (loadedLayout: ConfigItem[]): ConfigItem[] => {
  let cleaned = loadedLayout.filter(
    item => item.id !== "voice" && 
            item.id !== "bond_progress" && 
            item.id !== "reset_memory" && 
            item.parentId !== "voice"
  );
  const musicItem = cleaned.find(item => item.id === "music");
  if (!musicItem) {
    cleaned.push({ id: "music", label: "Music System", type: "item", parentId: null });
  } else if (musicItem.parentId === "personalization") {
    musicItem.parentId = null;
  }
  return cleaned;
};

function NavButton({
  active,
  label,
  onClick,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverActive,
  id,
  themeColor
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  dragOverActive?: boolean;
  id?: string;
  themeColor: string;
}) {
  const isMusic = id === "music";
  const activeClasses = getThemeClasses(themeColor, "active");
  const inactiveClasses = getThemeClasses(themeColor, "inactive");

  let checkColorClass = "text-pink-200";
  if (themeColor === "yellow") checkColorClass = "text-yellow-200";
  else if (themeColor === "blue") checkColorClass = "text-cyan-200";
  else if (themeColor === "orchid") checkColorClass = "text-purple-200";
  else if (themeColor === "peach") checkColorClass = "text-orange-200";
  else if (themeColor === "beige") checkColorClass = "text-amber-200";
  else if (themeColor === "maroon") checkColorClass = "text-red-200";
  else if (themeColor === "gemini") checkColorClass = "text-blue-200";

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type="button"
      draggable={draggable}
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDrop={onDrop as any}
      onClick={onClick}
      className={`settings-nav-button flex w-full items-center justify-between border text-left transition duration-300 backdrop-blur-md px-4 py-3 text-sm rounded-[18px] ${
        dragOverActive
          ? "border-pink-500/55 bg-pink-500/10 shadow-[0_0_15px_rgba(255,105,180,0.2)] text-white"
          : active 
            ? activeClasses 
            : inactiveClasses
      }`}
    >
      <span>{label}</span>
      {active && !dragOverActive ? <Check className={`h-4 w-4 ${checkColorClass}`} /> : null}
    </motion.button>
  );
}

function SectionShell({
  label,
  title,
  description,
  children,
  compact = false,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-2">
        <p className={compact ? "text-[10px] font-medium uppercase tracking-[0.26em] text-white/35" : "text-[11px] font-medium uppercase tracking-[0.28em] text-white/35"}>{label}</p>
        <h3 className={compact ? "text-[1.35rem] font-semibold tracking-[-0.02em] text-white" : "text-2xl font-semibold tracking-[-0.02em] text-white"}>{title}</h3>
        <p className={compact ? "max-w-2xl text-[13px] leading-6 text-white/55" : "max-w-2xl text-sm leading-6 text-white/55"}>{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPanel({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
  languageMode,
  onLanguageModeChange,
  memoryEnabled,
  onMemoryToggle,
  onManageMemory,
  profileName,
  profileSubtext,
  profileImageUrl,
  profileInitial,
  onEditProfile,
  onChangePassword,
  onLogout,
  isTtsMuted,
  onToggleTtsMute,
  selectedCharacter,
  onCharacterChange,
  activeMode,
  onModeChange,
  profileDraftName,
  onProfileNameChange,
  onProfileImageSelect,
  onProfileImageDelete,
  onSaveProfile,
  isSavingProfile,
  originalPhotoUrl,
  realtimeAwareness,
  awarenessLocationLabel,
  awarenessWeatherLabel,
  awarenessTimeFormat,
  awarenessShowDayDate,
  awarenessRefreshing,
  onAwarenessTimeFormatChange,
  onAwarenessToggleDayDateVisibility,
  onAwarenessRefresh,
  onOpenMusicSystem,
}: SettingsPanelProps) {
  const t = getLang();
  const accountFileRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(profileDraftName);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [activeInnerTab, setActiveInnerTab] = useState<"personality" | "privacy">(() => {
    if (activeSection === "about") {
      return "privacy";
    }

    return "personality";
  });
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [groqKey, setGroqKey] = useState("");
  const [personalizationChild, setPersonalizationChild] = useState<SettingsSectionId | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("saheli_theme_color");
      if (saved) return saved;
    }
    return "pink";
  });

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saheli_theme_color", color);
      window.dispatchEvent(new Event("saheli_theme_color_changed"));
    }
  };

  const [isWidescreenCustomizerOpen, setIsWidescreenCustomizerOpen] = useState(false);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const [layout, setLayout] = useState<ConfigItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("saheli_settings_layout");
      if (saved) {
        try {
          return sanitizeAndMigrateLayout(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_LAYOUT;
  });

  // Sync layout from Firestore on open
  useEffect(() => {
    if (!open) return;
    
    const fetchFirestoreLayout = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setIsLayoutLoading(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data && data.settingsLayout) {
              const migrated = sanitizeAndMigrateLayout(data.settingsLayout as ConfigItem[]);
              setLayout(migrated);
              await setDoc(userDocRef, { settingsLayout: migrated }, { merge: true });
            } else {
              const savedLocal = window.localStorage.getItem("saheli_settings_layout");
              let initialLayout = DEFAULT_LAYOUT;
              if (savedLocal) {
                try {
                  initialLayout = sanitizeAndMigrateLayout(JSON.parse(savedLocal) as ConfigItem[]);
                } catch (e) {
                  console.error(e);
                }
              }
              setLayout(initialLayout);
              await setDoc(userDocRef, { settingsLayout: initialLayout }, { merge: true });
            }
          } else {
            const savedLocal = window.localStorage.getItem("saheli_settings_layout");
            let initialLayout = DEFAULT_LAYOUT;
            if (savedLocal) {
              try {
                initialLayout = sanitizeAndMigrateLayout(JSON.parse(savedLocal) as ConfigItem[]);
              } catch (e) {
                console.error(e);
              }
            }
            setLayout(initialLayout);
            await setDoc(userDocRef, { settingsLayout: initialLayout }, { merge: true });
          }
        } catch (err) {
          console.error("Error loading settings layout from Firestore:", err);
        } finally {
          setIsLayoutLoading(false);
        }
      } else {
        const saved = window.localStorage.getItem("saheli_settings_layout");
        if (saved) {
          try {
            const migrated = sanitizeAndMigrateLayout(JSON.parse(saved) as ConfigItem[]);
            window.localStorage.setItem("saheli_settings_layout", JSON.stringify(migrated));
            setLayout(migrated);
          } catch (e) {
            console.error(e);
            setLayout(DEFAULT_LAYOUT);
          }
        } else {
          setLayout(DEFAULT_LAYOUT);
        }
      }
    };

    fetchFirestoreLayout();
  }, [open]);

  const saveLayout = async (newLayout: ConfigItem[]) => {
    setLayout(newLayout);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("saheli_settings_layout", JSON.stringify(newLayout));
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, { settingsLayout: newLayout }, { merge: true });
      } catch (err) {
        console.error("Error saving settings layout to Firestore:", err);
      }
    }
  };

  const [draggedId, setDraggedId] = useState<SettingsSectionId | null>(null);
  const [dragOverId, setDragOverId] = useState<SettingsSectionId | "sidebar-column" | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    personalization: false,
    memory: false,
    account: false,
    appearance: false,
    about: false,
  });

  const handleDragStart = (e: React.DragEvent, id: SettingsSectionId) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: SettingsSectionId) => {
    e.preventDefault();
    if (draggedId === id) return;
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: SettingsSectionId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedItem = layout.find(item => item.id === draggedId);
    const targetItem = layout.find(item => item.id === targetId);

    if (!draggedItem || !targetItem) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    let newLayout = [...layout];

    // Remove dragged item from its current position
    newLayout = newLayout.filter(item => item.id !== draggedId);

    // Case 1: Drop on a Tab
    if (targetItem.type === "tab") {
      if (draggedItem.type === "tab") {
        // If dragged is a tab, place it before/after target tab
        const targetIndex = newLayout.findIndex(item => item.id === targetId);
        newLayout.splice(targetIndex, 0, draggedItem);
      } else {
        // If dragged is an item, make it a child of target tab
        draggedItem.parentId = targetId;
        // Insert it as the last child of this tab
        const childrenIndices = newLayout.map((item, index) => ({ item, index }))
          .filter(({ item }) => item.parentId === targetId);
        const lastChildIndex = childrenIndices.pop()?.index;

        if (lastChildIndex !== undefined) {
          newLayout.splice(lastChildIndex + 1, 0, draggedItem);
        } else {
          // If no children yet, place it immediately after the tab
          const targetIndex = newLayout.findIndex(item => item.id === targetId);
          newLayout.splice(targetIndex + 1, 0, draggedItem);
        }
      }
    } 
    // Case 2: Drop on an Item
    else {
      if (draggedItem.type === "tab") {
        // A tab cannot be a child of another item or tab.
        // It must be placed at the top level (parentId = null).
        draggedItem.parentId = null;
        let parentTabId = targetItem.parentId;
        if (!parentTabId) {
          const targetIndex = newLayout.findIndex(item => item.id === targetId);
          newLayout.splice(targetIndex, 0, draggedItem);
        } else {
          const parentIndex = newLayout.findIndex(item => item.id === parentTabId);
          newLayout.splice(parentIndex, 0, draggedItem);
        }
      } else {
        draggedItem.parentId = targetItem.parentId;
        const targetIndex = newLayout.findIndex(item => item.id === targetId);
        newLayout.splice(targetIndex, 0, draggedItem);
      }
    }

    saveLayout(newLayout);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDropTopLevel = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId) return;

    const draggedItem = layout.find(item => item.id === draggedId);
    if (!draggedItem) return;

    const newLayout = layout.map(item => {
      if (item.id === draggedId) {
        return { ...item, parentId: null } as ConfigItem;
      }
      return item;
    });

    saveLayout(newLayout);
    setDraggedId(null);
    setDragOverId(null);
  };

  const [widescreenDraggedId, setWidescreenDraggedId] = useState<SettingsSectionId | null>(null);

  const handleWidescreenDragStart = (e: React.DragEvent, id: SettingsSectionId) => {
    setWidescreenDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleWidescreenDragOver = (e: React.DragEvent, targetTabId: SettingsSectionId | null) => {
    e.preventDefault();
    if (!widescreenDraggedId) return;

    const draggedItem = layout.find(item => item.id === widescreenDraggedId);
    if (draggedItem?.type === "tab" && targetTabId !== null) {
      return;
    }

    setDragOverId(targetTabId === null ? "sidebar-column" : targetTabId);
  };

  const handleWidescreenDrop = (e: React.DragEvent, targetTabId: SettingsSectionId | null) => {
    e.preventDefault();
    if (!widescreenDraggedId) {
      setDragOverId(null);
      return;
    }

    const draggedItem = layout.find(item => item.id === widescreenDraggedId);
    if (!draggedItem) {
      setWidescreenDraggedId(null);
      setDragOverId(null);
      return;
    }

    if (draggedItem.parentId === targetTabId) {
      setWidescreenDraggedId(null);
      setDragOverId(null);
      return;
    }

    if (draggedItem.type === "tab" && targetTabId !== null) {
      const targetItem = layout.find(item => item.id === targetTabId);
      if (targetItem && targetItem.type === "tab") {
        let newLayout = [...layout];
        newLayout = newLayout.filter(item => item.id !== widescreenDraggedId);
        const targetIndex = newLayout.findIndex(item => item.id === targetTabId);
        if (targetIndex !== -1) {
          newLayout.splice(targetIndex, 0, draggedItem);
        } else {
          newLayout.push(draggedItem);
        }
        saveLayout(newLayout);
      }
      setWidescreenDraggedId(null);
      setDragOverId(null);
      return;
    }

    if (draggedItem.type === "tab" && targetTabId === null) {
      setWidescreenDraggedId(null);
      setDragOverId(null);
      return;
    }

    let newLayout = [...layout];
    newLayout = newLayout.map(item => {
      if (item.id === widescreenDraggedId) {
        return { ...item, parentId: targetTabId };
      }
      return item;
    });

    saveLayout(newLayout);
    setWidescreenDraggedId(null);
    setDragOverId(null);
  };

  const handleWidescreenDragOverOnCard = (e: React.DragEvent, targetId: SettingsSectionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!widescreenDraggedId || widescreenDraggedId === targetId) return;
    
    setDragOverId(targetId);
  };

  const handleWidescreenDropOnCard = (e: React.DragEvent, targetId: SettingsSectionId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!widescreenDraggedId || widescreenDraggedId === targetId) {
      setDragOverId(null);
      return;
    }

    const draggedItem = layout.find(item => item.id === widescreenDraggedId);
    const targetItem = layout.find(item => item.id === targetId);

    if (!draggedItem || !targetItem) {
      setWidescreenDraggedId(null);
      setDragOverId(null);
      return;
    }

    if (draggedItem.type === "tab" && targetItem.parentId !== null) {
      setWidescreenDraggedId(null);
      setDragOverId(null);
      return;
    }

    let newLayout = [...layout];
    newLayout = newLayout.filter(item => item.id !== widescreenDraggedId);

    const updatedDragged = { ...draggedItem, parentId: targetItem.parentId };

    const targetIndex = newLayout.findIndex(item => item.id === targetId);
    if (targetIndex !== -1) {
      newLayout.splice(targetIndex, 0, updatedDragged);
    } else {
      newLayout.push(updatedDragged);
    }

    saveLayout(newLayout);
    setWidescreenDraggedId(null);
    setDragOverId(null);
  };

  const handleExpandAll = () => {
    setExpandedTabs({
      personalization: true,
      memory: true,
      account: true,
      appearance: true,
      about: true,
    });
  };

  const handleCollapseAll = () => {
    setExpandedTabs({
      personalization: false,
      memory: false,
      account: false,
      appearance: false,
      about: false,
    });
  };

  const isActionItem = (id: string) => {
    return ["chat_memory", "image_memory", "password", "logout", "reset_memory"].includes(id);
  };

  const handleItemAction = (id: string) => {
    if (id === "chat_memory") {
      window.dispatchEvent(new CustomEvent("saheli-memory-tab", { detail: "chat" }));
      onManageMemory();
    } else if (id === "image_memory") {
      window.dispatchEvent(new CustomEvent("saheli-memory-tab", { detail: "image" }));
      onManageMemory();
    } else if (id === "password") {
      onChangePassword();
    } else if (id === "logout") {
      onLogout();
    } else if (id === "reset_memory") {
      // For core memory reset trigger
      console.log("Reset Core Memory");
    }
  };

  const renderCustomizationView = () => {
    return (
      <motion.div key="personalization-customization" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Menu Customizer</h3>
            <p className="text-[11.5px] text-white/50 leading-relaxed">
              Drag and drop items to reorder them, promote them to the main sidebar, or group them inside tabs.
            </p>
          </div>

          {/* Tree List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            {layout.map((item) => {
              if (item.parentId !== null) return null;
 
              const isTab = item.type === "tab";
              const isExpanded = expandedTabs[item.id] || false;
              const children = layout.filter(child => child.parentId === item.id);
 
              return (
                <div key={item.id} className="space-y-1">
                  {/* Top level card */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all duration-200 ${
                      dragOverId === item.id 
                        ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_10px_rgba(255,105,180,0.2)]" 
                        : isTab 
                          ? "border-white/10 bg-white/[0.03] text-white font-semibold" 
                          : "border-white/5 bg-white/[0.01] text-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/85 transition">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      {isTab && (
                        <button 
                          type="button"
                          onClick={() => setExpandedTabs(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="text-white/50 hover:text-white transition"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-white/30 bg-white/5 px-1.5 py-0.5 rounded-md">
                      {item.type}
                    </span>
                  </div>
 
                  {/* Children list */}
                  {isTab && isExpanded && (
                    <div className="pl-6 space-y-1 border-l border-white/5 ml-4 my-1">
                      {children.length === 0 ? (
                        <div className="text-[10px] text-white/35 py-1 italic">Empty tab (drop items here)</div>
                      ) : (
                        children.map((child) => (
                          <div
                            key={child.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, child.id)}
                            onDragOver={(e) => handleDragOver(e, child.id)}
                            onDrop={(e) => handleDrop(e, child.id)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-[11px] transition-all duration-200 ${
                              dragOverId === child.id 
                                ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_10px_rgba(255,105,180,0.2)]" 
                                : "border-white/5 bg-white/[0.01] text-white/70"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/75 transition">
                                <GripVertical className="h-3 w-3" />
                              </div>
                              <span>{child.label}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
 
          {/* Controls */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsWidescreenCustomizerOpen(true)}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:text-white transition duration-300"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirmRestore(true);
              }}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-red-500/20 bg-red-500/5 text-red-200/80 hover:bg-red-500/15 hover:text-red-100 transition duration-300"
            >
              Restore Defaults
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderWidescreenCustomizer = () => {
    const tabs = layout.filter(item => item.type === "tab");
    const sidebarItems = layout.filter(item => item.parentId === null);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-[#07030e]/85 backdrop-blur-xl p-4 md:p-8 pointer-events-auto select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          style={{
            background: "rgba(12, 6, 22, 0.45)",
            backdropFilter: "blur(40px)",
            border: "1.5px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 40px 80px rgba(0, 0, 0, 0.7), 0 0 50px rgba(255, 105, 180, 0.08)"
          }}
          className="relative w-[96vw] max-w-[1550px] h-full max-h-[85vh] rounded-[36px] p-4 md:p-5 flex flex-col gap-4 overflow-hidden text-white"
        >
          {/* Close Button at top-right */}
          <button
            type="button"
            onClick={() => setIsWidescreenCustomizerOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col gap-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/25">
                <LayoutGrid className="h-4 w-4 text-pink-300 animate-pulse" />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">Layout Canvas</p>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-pink-200 bg-clip-text text-transparent">
              Settings Canvas Editor
            </h2>
            <p className="text-[11px] text-white/50 leading-normal">
              Drag cards across columns to change their tabs. Drop cards into the <b>Sidebar Menu</b> column to pin them to the main settings menu. Reorder columns or cards by dropping them on top of each other.
            </p>
          </div>

          {/* Editor Workspace */}
          <div className="flex-1 grid grid-cols-7 gap-1.5 w-full min-h-0 overflow-hidden no-scrollbar">
            
            {/* COLUMN 1: Pinned Sidebar Menu Items (parentId === null) */}
            <div 
              onDragOver={(e) => handleWidescreenDragOver(e, null)}
              onDrop={(e) => handleWidescreenDrop(e, null)}
              className={`flex flex-col w-full rounded-2xl border p-2 transition-all duration-300 bg-gradient-to-b from-white/[0.03] to-transparent min-h-0 ${
                dragOverId === "sidebar-column" 
                  ? "border-pink-500/50 bg-pink-500/5 shadow-[0_0_20px_rgba(255,105,180,0.15)]" 
                  : "border-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/5 shrink-0">
                <div className="truncate">
                  <h3 className="text-[11px] font-bold text-pink-200 truncate">Sidebar Menu</h3>
                  <p className="text-[8px] text-white/40">Navigation</p>
                </div>
                <span className="text-[8px] uppercase tracking-wider bg-pink-500/20 text-pink-200 px-1 py-0.5 rounded font-semibold border border-pink-500/20 shrink-0">
                  Nav
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-0.5 no-scrollbar">
                {sidebarItems.map((item, index) => {
                  const isTabItem = item.type === "tab";
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleWidescreenDragStart(e, item.id);
                      }}
                      onDragOver={(e) => handleWidescreenDragOverOnCard(e, item.id)}
                      onDrop={(e) => handleWidescreenDropOnCard(e, item.id)}
                      className={`flex items-center justify-between p-1.5 px-2 rounded-xl border text-[10px] transition-all duration-200 cursor-grab active:cursor-grabbing ${
                        isTabItem
                          ? "border-pink-500/20 bg-pink-500/5 text-pink-100 hover:border-pink-500/40 hover:bg-pink-500/10"
                          : "border-white/10 bg-white/[0.02] text-white hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <GripVertical className="h-3 w-3 text-white/30 shrink-0" />
                        <span className="font-medium truncate">{item.label}</span>
                      </div>
                      <span className={`text-[7px] uppercase tracking-wide px-0.5 rounded font-semibold border shrink-0 ${
                        isTabItem 
                          ? "bg-purple-500/15 border-purple-500/20 text-purple-200" 
                          : "bg-white/5 border-white/5 text-white/40"
                      }`}>
                        {item.type === "tab" ? "tab" : "item"}
                      </span>
                    </div>
                  );
                })}
                {sidebarItems.length === 0 && (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl p-2 text-center text-[10px] text-white/30 italic">
                    Empty
                  </div>
                )}
              </div>
            </div>

            {/* COLUMNS 2+: Tab Columns */}
            {tabs.map((tab) => {
              const tabChildren = layout.filter(child => child.parentId === tab.id);
              return (
                <div
                  key={tab.id}
                  draggable
                  onDragStart={(e) => handleWidescreenDragStart(e, tab.id)}
                  onDragOver={(e) => handleWidescreenDragOver(e, tab.id)}
                  onDrop={(e) => handleWidescreenDrop(e, tab.id)}
                  className={`flex flex-col w-full rounded-2xl border p-2 transition-all duration-300 min-h-0 ${
                    dragOverId === tab.id 
                      ? "border-pink-500/50 bg-pink-500/5 shadow-[0_0_20px_rgba(255,105,180,0.15)]" 
                      : "border-white/5 bg-white/[0.01]"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/5 cursor-grab active:cursor-grabbing hover:opacity-85 transition shrink-0">
                    <div className="flex items-center gap-1 truncate">
                      <GripVertical className="h-3 w-3 text-white/30 shrink-0" />
                      <h3 className="text-[11px] font-bold text-white truncate">{tab.label}</h3>
                    </div>
                  </div>

                  {/* Column Body */}
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-0.5 no-scrollbar">
                    {tabChildren.map((child) => (
                      <div
                        key={child.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleWidescreenDragStart(e, child.id);
                        }}
                        onDragOver={(e) => handleWidescreenDragOverOnCard(e, child.id)}
                        onDrop={(e) => handleWidescreenDropOnCard(e, child.id)}
                        className="flex items-center justify-between p-1.5 px-2 rounded-xl border border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03] text-[10px] transition duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <GripVertical className="h-3 w-3 text-white/30 shrink-0" />
                          <span className="text-white/80 font-medium truncate">{child.label}</span>
                        </div>
                      </div>
                    ))}
                    {tabChildren.length === 0 && (
                      <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-xl p-2 text-center text-[8px] text-white/25 italic">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmRestore(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-red-500/20 bg-red-500/5 text-red-200 hover:bg-red-500/15 hover:text-white transition duration-300"
              >
                <Undo2 className="h-4 w-4" />
                Restore Defaults
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {isLayoutLoading && (
                <span className="text-xs text-white/40 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pink-400 animate-ping" />
                  Saving layout...
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsWidescreenCustomizerOpen(false)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-white/90 active:scale-95 transition duration-300"
              >
                Done & Save
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderConfirmationModal = () => {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 pointer-events-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 20, stiffness: 400 }}
          style={{
            background: "rgba(20, 10, 25, 0.7)",
            backdropFilter: "blur(30px)",
            border: "1px solid rgba(255, 105, 180, 0.15)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 105, 180, 0.05)"
          }}
          className="w-full max-w-[380px] rounded-[24px] p-6 flex flex-col gap-4 text-center text-white relative overflow-hidden"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-300">
            <Undo2 className="h-6 w-6" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-bold tracking-tight text-white">Restore Customization?</h3>
            <p className="text-xs text-white/55 leading-relaxed">
              Do you really want to restore your customization? This will reset all your menu settings to default.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowConfirmRestore(false);
                toast.info("Restoration cancelled.");
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition duration-200"
            >
              No, Keep
            </button>
            <button
              type="button"
              onClick={() => {
                saveLayout(DEFAULT_LAYOUT);
                handleCollapseAll();
                setShowConfirmRestore(false);
                toast.success("Customization restored successfully!");
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition duration-200"
            >
              Yes, Restore
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderItemContent = (itemId: string, isCompact: boolean) => {
    switch (itemId) {
      case "character":
        return (
          <motion.div key="personalization-character" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <SectionShell label="Personalization" title="Character Selection" description="Select your AI companion." compact={isCompact}>
              <div className="flex flex-col gap-2">
                {characterCards.map((card) => {
                  const active = selectedCharacter === card.id;
                  return (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      key={card.id}
                      type="button"
                      onClick={() => onCharacterChange(card.id)}
                      className={`settings-character-btn flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition-all duration-300 ${active ? getThemeClasses(selectedColor, "active") : getThemeClasses(selectedColor, "inactive")}`}
                    >
                      <span className="font-medium">{card.label}</span>
                      {active ? (
                        <span className={`settings-character-badge inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getThemeClasses(selectedColor, "badge")}`}>
                          <Check className={`h-3 w-3 ${getThemeClasses(selectedColor, "textLight")}`} />
                          Active
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            </SectionShell>
          </motion.div>
        );

      case "color":
        return (
          <motion.div key="personalization-color" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Theme Color</h3>
                <p className="text-[11.5px] text-white/50 leading-relaxed">Customize Saheli AI's visual accents.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "pink", label: "Pink", gradientBg: "linear-gradient(135deg, #ff0078 0%, #ff69b4 100%)", flower: "🌸", glowColor: "rgba(255, 0, 120, 0.35)" },
                  { id: "yellow", label: "Light Yellow", gradientBg: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", flower: "🌼", glowColor: "rgba(255, 215, 0, 0.35)" },
                  { id: "blue", label: "Sky Blue", gradientBg: "linear-gradient(135deg, #87CEEB 0%, #00E5FF 100%)", flower: "🪻", glowColor: "rgba(0, 229, 255, 0.35)" },
                  { id: "orchid", label: "Orchid", gradientBg: "linear-gradient(135deg, #D500F9 0%, #FF66CC 100%)", flower: "🪷", glowColor: "rgba(213, 0, 249, 0.35)" },
                  { id: "peach", label: "Sweet Peach", gradientBg: "linear-gradient(135deg, #FF9E7D 0%, #FF6B6B 100%)", flower: "🏵️", glowColor: "rgba(255, 158, 125, 0.35)" },
                  { id: "beige", label: "Dark Cream", gradientBg: "linear-gradient(135deg, #EADBC8 0%, #8D7B68 100%)", flower: "🌾", glowColor: "rgba(212, 184, 149, 0.35)" },
                  { id: "maroon", label: "Maroon", gradientBg: "linear-gradient(135deg, #D01C3F 0%, #6E0016 100%)", flower: "🌹", glowColor: "rgba(208, 28, 63, 0.35)" },
                  { id: "gemini", label: "Gemini Blue", gradientBg: "linear-gradient(135deg, #4A89FF 0%, #1A365D 100%)", flower: "💙", glowColor: "rgba(74, 137, 255, 0.35)" },
                ].map((item) => {
                  const active = selectedColor === item.id;
                  return (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={item.id}
                      type="button"
                      onClick={() => handleColorChange(item.id)}
                      className={`relative flex flex-col items-center justify-center gap-2 rounded-[14px] border px-2 py-3 text-center text-sm transition-all duration-300 ${
                        active 
                          ? "bg-white/[0.04] text-white shadow-[0_12px_24px_rgba(0,0,0,0.4)]" 
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                      }`}
                      style={
                        active 
                          ? { 
                              borderColor: item.glowColor.replace("0.35", "0.5"), 
                              boxShadow: `0 8px 20px rgba(0, 0, 0, 0.4), 0 0 12px ${item.glowColor}` 
                            } 
                          : {}
                      }
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-md relative overflow-hidden transition-transform duration-300"
                        style={{ 
                          background: item.gradientBg, 
                          border: active ? "1.5px solid rgba(255,255,255,0.45)" : "1.5px solid rgba(255,255,255,0.15)"
                        }}
                      >
                        <span className={`select-none text-[1.1rem] leading-none z-10 transition-transform duration-300 ${active ? "scale-110" : "hover:scale-105"}`}>
                          {item.flower}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none" />
                      </div>
                      <span className={`font-semibold text-[10px] tracking-wide ${active ? "text-white" : "text-white/60"}`}>{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );

      case "realtime":
        return (
          <motion.div key="personalization-realtime" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <section className="space-y-2">
              <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Date, Time & Weather</h3>
              <div className="space-y-2">
                <div className="settings-glass-card space-y-2 !p-2.5">
                  <div className="flex items-center gap-2 text-white/85">
                    <Clock3 className="h-4 w-4 text-pink-300" />
                    <p className="text-[12px] font-semibold">Current time</p>
                  </div>
                  <p className="text-[14px] font-semibold text-white">{realtimeAwareness.datetime.currentTime}</p>
                  {awarenessShowDayDate ? (
                    <div className="space-y-0.5 text-[11px] text-white/62">
                      <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-purple-300" /> {realtimeAwareness.datetime.currentDate}</p>
                      <p>{realtimeAwareness.datetime.weekday} • {realtimeAwareness.datetime.dayState === "night" ? "Night" : "Day"}</p>
                    </div>
                  ) : null}
                </div>

                <div className="settings-glass-card space-y-1 !p-2.5">
                  <p className="text-[12px] font-semibold text-white/90">Time format</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAwarenessTimeFormatChange("12h")}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-5 transition ${awarenessTimeFormat === "12h" ? getThemeClasses(selectedColor, "switchActive") : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"}`}
                    >
                      12-hour
                    </button>
                    <button
                      type="button"
                      onClick={() => onAwarenessTimeFormatChange("24h")}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium leading-5 transition ${awarenessTimeFormat === "24h" ? getThemeClasses(selectedColor, "switchActive") : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"}`}
                    >
                      24-hour
                    </button>
                  </div>
                </div>

                <div className="settings-glass-card flex items-start justify-between gap-2.5 !p-2.5">
                  <div>
                    <p className="text-[12px] font-semibold text-white">Show on chat page</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={awarenessShowDayDate}
                    onClick={onAwarenessToggleDayDateVisibility}
                    className={`settings-toggle-track scale-90 origin-right ${awarenessShowDayDate ? "settings-toggle-track-on" : ""}`}
                  >
                    <span className={`settings-toggle-thumb ${awarenessShowDayDate ? "settings-toggle-thumb-on" : ""}`} />
                  </button>
                </div>

                <div className="settings-glass-card space-y-1.5 !p-2.5">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-white">
                    <CloudSun className="h-4 w-4 text-amber-300" />
                    Weather
                  </p>
                  <p className="text-[12px] text-white/75">{awarenessWeatherLabel}</p>
                  {realtimeAwareness.weather ? (
                    <div className="space-y-0.5 text-[11px] text-white/60">
                      <p>
                        Temp: {Math.round(realtimeAwareness.weather.temperatureC)}°C • {realtimeAwareness.weather.condition}
                      </p>
                      {typeof realtimeAwareness.weather.feelsLikeC === "number" ? (
                        <p>Feels like: {Math.round(realtimeAwareness.weather.feelsLikeC)}°C</p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="flex items-center gap-2 text-[11px] text-white/55">
                    <LocateFixed className="h-3.5 w-3.5 text-cyan-300" />
                    {awarenessLocationLabel}
                  </p>
                  <button
                    type="button"
                    onClick={onAwarenessRefresh}
                    disabled={awarenessRefreshing}
                    className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/20 bg-pink-500/10 px-2.5 py-1 text-[11px] font-medium text-pink-100 transition hover:border-pink-300/35 hover:bg-pink-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3 w-3 ${awarenessRefreshing ? "animate-spin" : ""}`} />
                    Refresh weather/location
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        );

      case "customization":
        return renderCustomizationView();

      case "profile":
        return (
          <motion.div key="account-profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <input
              ref={accountFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onProfileImageSelect}
            />
            <div className="space-y-4">
              <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Profile</h3>
              <div className="flex flex-col items-center gap-2 pt-1">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => setIsPhotoMenuOpen((prev) => !prev)}
                    className="h-20 w-20 rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_0_22px_rgba(255,0,120,0.14)] transition hover:border-pink-400/25"
                  >
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-400/20 to-purple-400/20">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt={profileName} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle className="h-10 w-10 text-white/30" />
                      )}
                    </div>
                  </button>

                  {isPhotoMenuOpen && (
                    <div className="absolute left-1/2 top-[88px] z-20 w-44 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#120b1b]/95 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => {
                          accountFileRef.current?.removeAttribute("capture");
                          accountFileRef.current?.click();
                          setIsPhotoMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload from Gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (accountFileRef.current) {
                            accountFileRef.current.setAttribute("capture", "user");
                            accountFileRef.current.click();
                            setTimeout(() => accountFileRef.current?.removeAttribute("capture"), 500);
                          }
                          setIsPhotoMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Capture with Camera
                      </button>
                      {profileImageUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            onProfileImageDelete();
                            setIsPhotoMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-red-200/80 transition hover:bg-red-500/10 hover:text-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Photo
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">Username</p>
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={localName}
                          onChange={(e) => setLocalName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const trimmed = localName.trim();
                              if (trimmed) {
                                onProfileNameChange(trimmed);
                                onSaveProfile(trimmed);
                              }
                              setIsEditingName(false);
                            }
                          }}
                          autoFocus
                          className="w-full rounded-xl border border-pink-400/25 bg-white/[0.02] px-3 py-1.5 text-sm font-medium text-white outline-none transition focus:border-pink-300/45"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = localName.trim();
                            if (trimmed) {
                              onProfileNameChange(trimmed);
                              onSaveProfile(trimmed);
                            }
                            setIsEditingName(false);
                          }}
                          className="rounded-full border border-pink-400/25 bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-100 transition hover:bg-pink-500/20"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalName(profileDraftName);
                          setIsEditingName(true);
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-pink-400/25 hover:bg-white/[0.04]"
                      >
                        <span className="truncate text-sm font-medium text-white">{profileName}</span>
                        <Pencil className="h-3.5 w-3.5 text-white/45" />
                      </button>
                    )}
                    <p className="mt-1 text-[11px] text-white/40">{profileSubtext}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case "bestie_mentor":
        return (
          <motion.div key="appearance-bestie-mentor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <SectionShell
              label="Personality"
              title="Interaction Style"
              description="Pick how Saheli should sound in your conversations."
              compact={isCompact}
            >
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => onModeChange("bestie")}
                  className={`settings-glass-card settings-personality-card text-left !p-3 ${activeMode === "bestie" ? "settings-personality-card-active" : ""}`}
                >
                  <p className={`text-[13px] font-semibold tracking-[-0.02em] ${activeMode === "bestie" ? "text-pink-100" : "text-white"}`}>
                    Bestie Mode
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/58">
                    Casual, friendly, and matches your energy. Perfect for daily chats.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onModeChange("mentor")}
                  className={`settings-glass-card settings-personality-card text-left !p-3 ${activeMode === "mentor" ? "settings-personality-card-active" : ""}`}
                >
                  <p className={`text-[13px] font-semibold tracking-[-0.02em] ${activeMode === "mentor" ? "text-pink-100" : "text-white"}`}>
                    Study Coach / Mentor
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/58">
                    Serious, academic, and professional. Best for solving doubts and code.
                  </p>
                </button>
              </div>
            </SectionShell>
          </motion.div>
        );

      case "api_keys":
        return (
          <motion.div key="about-api-keys" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <div className="settings-glass-card flex items-start justify-between gap-3 !p-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-[-0.02em] text-white">Custom API Keys (Optional)</p>
                <p className="mt-1 text-[12px] leading-5 text-white/45">
                  Use your own keys to bypass system limits. Models and backend logic will remain 100% identical.
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  <input
                    value={groqKey}
                    onChange={(event) => setGroqKey(event.target.value)}
                    type="password"
                    placeholder="Enter Groq API Key (gsk_...)"
                    className="settings-api-input py-2.5 text-[13px] w-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case "memory_toggle":
        return (
          <motion.div key="memory-toggle-direct" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Memory Auto-Save</p>
                <p className="text-[11px] leading-5 text-white/50">Auto-save insights from chats</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={memoryEnabled}
                onClick={() => onMemoryToggle(!memoryEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-300 backdrop-blur-md ${memoryEnabled ? "border-pink-400/40 bg-white/10 shadow-[0_0_15px_rgba(255,105,180,0.3)]" : "border-white/10 bg-white/5 hover:border-white/20"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full transition duration-300 ${memoryEnabled ? "bg-white shadow-[0_0_15px_rgba(255,105,180,0.8)] translate-x-[22px]" : "bg-white/40 translate-x-[3px]"}`} />
              </button>
            </div>
          </motion.div>
        );

      case "incognito":
        return (
          <motion.div key="about-incognito-direct" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <div className="settings-glass-card flex items-start justify-between gap-3 !p-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-[-0.02em] text-white">Incognito Mode</p>
                <p className="mt-1 text-[12px] leading-5 text-white/55">
                  Keeps these settings local while it is on. Nothing from this panel is stored.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={incognitoMode}
                onClick={() => setIncognitoMode(!incognitoMode)}
                className={`settings-toggle-track scale-90 origin-right ${incognitoMode ? "settings-toggle-track-on" : ""}`}
              >
                <span className={`settings-toggle-thumb ${incognitoMode ? "settings-toggle-thumb-on" : ""}`} />
              </button>
            </div>
          </motion.div>
        );

      case "chat_memory":
        return (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleItemAction("chat_memory")}
            className="flex w-full items-center gap-3 rounded-[16px] border border-pink-500/10 bg-gradient-to-r from-pink-500/5 to-purple-500/5 px-4 py-3.5 text-left text-sm font-medium text-white transition duration-300 hover:border-pink-500/30 hover:from-pink-500/10 hover:to-purple-500/10 hover:shadow-[0_0_20px_rgba(255,105,180,0.15)]"
          >
            <MessageSquareText className="h-4 w-4 text-pink-300" />
            Manage Chat Memory
          </motion.button>
        );

      case "image_memory":
        return (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleItemAction("image_memory")}
            className="flex w-full items-center gap-3 rounded-[16px] border border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5 px-4 py-3.5 text-left text-sm font-medium text-white transition duration-300 hover:border-purple-500/30 hover:from-purple-500/10 hover:to-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
          >
            <ImageIcon className="h-4 w-4 text-purple-300" />
            Manage Image Memory
          </motion.button>
        );

      case "password":
        return (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleItemAction("password")}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/75 transition duration-300 hover:border-purple-400/20 hover:bg-white/[0.05] hover:text-white"
          >
            <KeyRound className="h-4 w-4 text-purple-300" />
            Change Password
          </motion.button>
        );

      case "logout":
        return (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleItemAction("logout")}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-100 transition duration-300 hover:border-red-300/40 hover:bg-red-500/15"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </motion.button>
        );

      case "music":
        return (
          <motion.div key="personalization-music" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-white">Music System</h3>
                <p className="text-[11.5px] text-white/50 leading-relaxed">
                  Immersive JioSaavn music player integration with dynamic AI companion awareness.
                </p>
              </div>

              <div className="settings-glass-card space-y-2 !p-3.5 text-xs text-white/70 leading-relaxed">
                <p className="font-semibold text-white/95">Features & Interaction:</p>
                <ul className="list-disc pl-4 space-y-1 mt-1.5">
                  <li>Search and stream millions of songs directly inside the app.</li>
                  <li>Unlock beautiful Fullscreen & Mini-player visual modes.</li>
                  <li>Saheli knows what you are listening to and reacts naturally.</li>
                  <li>Ask her to play music or vibe with you in chat!</li>
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: selectedColor === "yellow"
                    ? ["0 0 12px rgba(234,179,8,0.15)", "0 0 22px rgba(245,158,11,0.35)", "0 0 12px rgba(234,179,8,0.15)"]
                    : selectedColor === "blue"
                    ? ["0 0 12px rgba(6,182,212,0.15)", "0 0 22px rgba(59,130,246,0.35)", "0 0 12px rgba(6,182,212,0.15)"]
                    : selectedColor === "orchid"
                    ? ["0 0 12px rgba(168,85,247,0.15)", "0 0 22px rgba(236,72,153,0.35)", "0 0 12px rgba(168,85,247,0.15)"]
                    : selectedColor === "peach"
                    ? ["0 0 12px rgba(249,115,22,0.15)", "0 0 22px rgba(239,68,68,0.35)", "0 0 12px rgba(249,115,22,0.15)"]
                    : selectedColor === "beige"
                    ? ["0 0 12px rgba(245,158,11,0.1)", "0 0 22px rgba(180,83,9,0.25)", "0 0 12px rgba(245,158,11,0.15)"]
                    : selectedColor === "maroon"
                    ? ["0 0 12px rgba(220,38,38,0.15)", "0 0 22px rgba(127,29,29,0.35)", "0 0 12px rgba(220,38,38,0.15)"]
                    : selectedColor === "gemini"
                    ? ["0 0 12px rgba(59,130,246,0.15)", "0 0 22px rgba(79,70,229,0.35)", "0 0 12px rgba(59,130,246,0.15)"]
                    : ["0 0 12px rgba(244,63,94,0.25)", "0 0 22px rgba(168,85,247,0.45)", "0 0 12px rgba(244,63,94,0.25)"]
                }}
                transition={{
                  boxShadow: {
                    repeat: Infinity,
                    duration: 3.5,
                    ease: "easeInOut"
                  }
                }}
                type="button"
                onClick={() => {
                  if (onOpenMusicSystem) {
                    onOpenMusicSystem();
                  }
                  onOpenChange(false); // Close Settings Panel
                }}
                className={`relative overflow-hidden group flex w-full items-center justify-center gap-2.5 rounded-[18px] border px-5 py-3 text-xs font-bold transition-all duration-300 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.07] ${
                  selectedColor === "yellow"
                    ? "border-yellow-500/25 text-yellow-300 hover:border-yellow-500/40"
                    : selectedColor === "blue"
                    ? "border-cyan-500/25 text-cyan-300 hover:border-cyan-500/40"
                    : selectedColor === "orchid"
                    ? "border-purple-500/25 text-purple-300 hover:border-purple-500/40"
                    : selectedColor === "peach"
                    ? "border-orange-500/25 text-orange-300 hover:border-orange-500/40"
                    : selectedColor === "beige"
                    ? "border-amber-500/15 text-amber-200 hover:border-amber-500/30"
                    : selectedColor === "maroon"
                    ? "border-red-500/25 text-red-300 hover:border-red-500/40"
                    : selectedColor === "gemini"
                    ? "border-blue-500/25 text-blue-300 hover:border-blue-500/40"
                    : "border-pink-500/25 text-pink-300 hover:border-pink-500/40"
                }`}
              >
                {/* Diagonal sweep light shimmer on hover */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                
                <span className="relative z-10 flex items-center gap-2 tracking-wider">
                  <Music className="h-4 w-4 animate-pulse" />
                  <span>LAUNCH MUSIC PLAYER</span>
                </span>
              </motion.button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const [showContentPanel, setShowContentPanel] = useState(false);
  const sections = useMemo(() => ([
    { id: "personalization" as const, label: "Personalization" },
    { id: "memory" as const, label: "Memory" },
    { id: "account" as const, label: "Account" },
    { id: "appearance" as const, label: "Personality" },
    { id: "about" as const, label: "Privacy" },
  ]), []);
  const personalizationSections = useMemo(() => ([
    { id: "character" as const, label: "Character" },
    { id: "realtime" as const, label: "Date, Time & Weather" },
    { id: "color" as const, label: "Theme Color" },
  ]), []);

  const selectedCharacterCard = characterCards.find((card) => card.id === selectedCharacter) ?? characterCards[0];
  const activeItem = layout.find((item) => item.id === activeSection);
  const isTab = activeItem?.type === "tab";
  const activeSettingsView = activeSection === "appearance"
    ? "personality"
    : activeSection === "about"
      ? "privacy"
      : null;

  useEffect(() => {
    if (activeSettingsView) {
      setActiveInnerTab(activeSettingsView);
    }
  }, [activeSettingsView]);

  useEffect(() => {
    setPersonalizationChild(null);
  }, [activeSection]);

  useEffect(() => {
    if (open) {
      setShowContentPanel(false);
      setPersonalizationChild(null);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-end pb-[24px] pl-[320px]">
            {/* Overlay to close */}
            <div className="absolute inset-0 pointer-events-auto" onClick={() => onOpenChange(false)} />

            <div className="flex items-end animate-soft-float pointer-events-none">
              {/* Level 1: Menu */}
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 500, mass: 0.3 }}
                style={{
                  background: "rgba(15, 15, 15, 0.4)",
                  backdropFilter: "blur(25px)",
                  border: "0.5px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
                }}
                className="settings-menu-container relative pointer-events-auto w-[260px] rounded-[28px] p-4 flex flex-col gap-2"
              >
                <div className="mb-2 px-2">
                  <h2 className="text-xl font-semibold tracking-tight text-white">{t.settings.title}</h2>
                  <p className="text-[11px] text-white/50">{t.settings.description}</p>
                </div>
                
                <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto pr-1 no-scrollbar">
                  {layout
                    .filter((item) => item.parentId === null)
                    .map((item) => {
                      const active = activeSection === item.id;
                      return (
                        <NavButton
                          key={item.id}
                          id={item.id}
                          themeColor={selectedColor}
                          active={active}
                          label={item.label}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragOver={(e) => handleDragOver(e, item.id)}
                          onDrop={(e) => handleDrop(e, item.id)}
                          dragOverActive={dragOverId === item.id}
                          onClick={() => {
                            if (isActionItem(item.id)) {
                              handleItemAction(item.id);
                              return;
                            }
                            setShowContentPanel(true);
                            onSectionChange(item.id as SettingsSectionId);
                            setPersonalizationChild(null);
                          }}
                        />
                      );
                    })}
                </div>
              </motion.div>

              {/* Level 2: Content Panel */}
              <AnimatePresence>
                {showContentPanel ? (
                  <motion.div
                    key="content-panel"
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 500, mass: 0.3 }}
                    style={{
                      background: "rgba(15, 15, 15, 0.4)",
                      backdropFilter: "blur(25px)",
                      border: "0.5px solid rgba(255, 255, 255, 0.06)",
                      boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
                    }}
                    className={`settings-content-panel relative pointer-events-auto ml-4 ${activeItem?.id === "personalization" ? "mb-6" : "mb-2"} flex max-h-[calc(100vh-100px)] flex-col rounded-[32px] overflow-hidden transition-[width] duration-300 ${
                      activeItem?.id === "character" ? "w-[280px]" : activeItem?.id === "memory" ? "w-[300px]" : activeItem?.id === "personalization" ? "w-[320px]" : activeItem?.id === "realtime" ? "w-[380px]" : activeItem?.id === "color" ? "w-[245px]" : activeItem?.id === "customization" ? "w-[350px]" : "w-[360px]"
                    }`}
                  >
                    <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
                      <AnimatePresence mode="wait">
                        {isTab ? (
                          <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                            <SectionShell
                              label="Settings"
                              title={activeItem?.label || ""}
                              description={`Manage your ${activeItem?.label || ""} preferences.`}
                              compact
                            >
                              <div className="flex flex-col gap-2.5">
                                {layout
                                  .filter((child) => child.parentId === activeSection)
                                  .map((child) => {
                                    if (child.id === "memory_toggle") {
                                      return (
                                        <div
                                          key={child.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, child.id)}
                                          onDragOver={(e) => handleDragOver(e, child.id)}
                                          onDrop={(e) => handleDrop(e, child.id)}
                                          className={`flex items-center justify-between gap-4 rounded-[20px] border p-4 backdrop-blur-xl transition duration-300 ${
                                            dragOverId === child.id 
                                              ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_10px_rgba(255,105,180,0.2)]" 
                                              : "border-white/10 bg-white/[0.03]"
                                          }`}
                                        >
                                          <div className="min-w-0">
                                            <div>
                                              <p className="text-sm font-medium text-white">{child.label}</p>
                                              <p className="text-[11px] leading-5 text-white/50">Auto-save insights from chats</p>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            role="switch"
                                            aria-checked={memoryEnabled}
                                            onClick={() => onMemoryToggle(!memoryEnabled)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-300 backdrop-blur-md ${memoryEnabled ? "border-pink-400/40 bg-white/10 shadow-[0_0_15px_rgba(255,105,180,0.3)]" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                                          >
                                            <span className={`inline-block h-4 w-4 rounded-full transition duration-300 ${memoryEnabled ? "bg-white shadow-[0_0_15px_rgba(255,105,180,0.8)] translate-x-[22px]" : "bg-white/40 translate-x-[3px]"}`} />
                                          </button>
                                        </div>
                                      );
                                    }

                                    if (child.id === "incognito") {
                                      return (
                                        <div
                                          key={child.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, child.id)}
                                          onDragOver={(e) => handleDragOver(e, child.id)}
                                          onDrop={(e) => handleDrop(e, child.id)}
                                          className={`settings-glass-card flex items-start justify-between gap-3 !p-3 transition duration-300 ${
                                            dragOverId === child.id 
                                              ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_10px_rgba(255,105,180,0.2)]" 
                                              : ""
                                          }`}
                                        >
                                          <div className="min-w-0">
                                            <div>
                                              <p className="text-[13px] font-semibold tracking-[-0.02em] text-white">{child.label}</p>
                                              <p className="mt-1 text-[12px] leading-5 text-white/55">
                                                Keeps settings local while on. Nothing from this panel is stored.
                                              </p>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            role="switch"
                                            aria-checked={incognitoMode}
                                            onClick={() => setIncognitoMode(!incognitoMode)}
                                            className={`settings-toggle-track scale-90 origin-right ${incognitoMode ? "settings-toggle-track-on" : ""}`}
                                          >
                                            <span className={`settings-toggle-thumb ${incognitoMode ? "settings-toggle-thumb-on" : ""}`} />
                                          </button>
                                        </div>
                                      );
                                    }

                                    const isAction = isActionItem(child.id);
                                    const active = personalizationChild === child.id;

                                    return (
                                      <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        key={child.id}
                                        type="button"
                                        draggable
                                        onDragStart={(e: any) => handleDragStart(e, child.id)}
                                        onDragOver={(e: any) => handleDragOver(e, child.id)}
                                        onDrop={(e: any) => handleDrop(e, child.id)}
                                        onClick={() => {
                                          if (isAction) {
                                            handleItemAction(child.id);
                                          } else {
                                            setPersonalizationChild(child.id);
                                          }
                                        }}
                                        className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition-all duration-300 ${
                                          dragOverId === child.id 
                                            ? "border-pink-500/55 bg-pink-500/10 shadow-[0_0_10px_rgba(255,105,180,0.2)] text-white" 
                                            : active 
                                              ? getThemeClasses(selectedColor, "active") 
                                              : getThemeClasses(selectedColor, "inactive")
                                        }`}
                                      >
                                        <span className="font-medium truncate">{child.label}</span>
                                        {active && dragOverId !== child.id ? <Check className={`h-4 w-4 ${getThemeClasses(selectedColor, "textLight")}`} /> : null}
                                      </motion.button>
                                    );
                                  })}
                              </div>
                            </SectionShell>
                          </motion.div>
                        ) : (
                          renderItemContent(activeSection, true)
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Level 3: Child Panel */}
              <AnimatePresence>
                {showContentPanel && activeItem?.type === "tab" && personalizationChild ? (
                  <motion.div
                    key="personalization-child-panel"
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 500, mass: 0.3 }}
                    style={{
                      background: "rgba(15, 15, 15, 0.4)",
                      backdropFilter: "blur(25px)",
                      border: "0.5px solid rgba(255, 255, 255, 0.06)",
                      boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 105, 180, 0.08)"
                    }}
                    className={`settings-child-panel relative pointer-events-auto ml-4 mb-6 flex max-h-[calc(100vh-100px)] flex-col rounded-[28px] overflow-hidden transition-[width] duration-300 ${
                      personalizationChild === "color" 
                        ? "w-[245px]" 
                        : personalizationChild === "character" 
                          ? "w-[280px]" 
                          : personalizationChild === "customization" 
                            ? "w-[350px]" 
                            : "w-[340px]"
                    }`}
                  >
                    <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
                      <AnimatePresence mode="wait">
                        {renderItemContent(personalizationChild, false)}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {createPortal(
            <AnimatePresence>
              {isWidescreenCustomizerOpen && renderWidescreenCustomizer()}
              {showConfirmRestore && renderConfirmationModal()}
            </AnimatePresence>,
            document.body
          )}
        </>
      )}
    </AnimatePresence>
  );
}