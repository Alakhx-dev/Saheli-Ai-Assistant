import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Search, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Music, X, Disc, AlertTriangle, ListMusic, Music4, Minus, ChevronUp, Heart } from "lucide-react";
import type { JioSaavnSong } from "../../../lib/musicService";

interface MusicPlayerPanelProps {
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
  onPlaySong: (song: JioSaavnSong, customQueue?: JioSaavnSong[]) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleFullscreen: () => void;
  musicQueue: JioSaavnSong[];
  currentQueueIndex: number;
  isMinimized?: boolean;
  onMinimizeToggle?: (minimized: boolean) => void;
  onPlaySongAtIndex?: (index: number) => void;
}

const PLAYLISTS = [
  { 
    id: "romantic", 
    name: "Romantic 🌸", 
    query: "bollywood romantic hits",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=60",
    gradient: "from-pink-600/35 via-rose-600/10 to-zinc-950/40"
  },
  { 
    id: "sad", 
    name: "Sad 🌧️", 
    query: "sad emotional hindi songs",
    image: "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=120&auto=format&fit=crop&q=60",
    gradient: "from-blue-600/30 via-indigo-600/10 to-zinc-950/40"
  },
  { 
    id: "party", 
    name: "Party ⚡", 
    query: "hindi dance party hits",
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=120&auto=format&fit=crop&q=60",
    gradient: "from-amber-600/35 via-orange-600/10 to-zinc-950/40"
  },
  { 
    id: "trending", 
    name: "Trending Now 🔥", 
    query: "latest trending hindi hits",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=120&auto=format&fit=crop&q=60",
    gradient: "from-purple-600/35 via-indigo-600/10 to-zinc-950/40"
  }
];

const PLAYLIST_SONGS: Record<string, JioSaavnSong[]> = {
  romantic: [
    {
      id: "demo-bolly-1",
      title: "Faded Corners of the Page",
      artist: "Acoustic Dreams",
      album: "Indian Summer",
      image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/faded-corners-of-the-page.mp3"
    },
    {
      id: "demo-bolly-2",
      title: "Margin Notes at Dusk",
      artist: "Sunset String Duo",
      album: "Evening Ragas",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/margin-notes-at-dusk.mp3"
    },
    {
      id: "demo-bolly-3",
      title: "Hour Between Clicks",
      artist: "Tablas & Lofi",
      album: "Rhythm of Chill",
      image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/hour-between-clicks.mp3"
    }
  ],
  sad: [
    {
      id: "demo-indie-1",
      title: "Dog Eared Pages",
      artist: "The Indie Reader",
      album: "Acoustic Chapters",
      image: "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/dog-eared-pages.mp3"
    },
    {
      id: "demo-indie-2",
      title: "Graphite Mornings",
      artist: "Sketchbook Acoustic",
      album: "Acoustic Chapters",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/graphite-mornings.mp3"
    },
    {
      id: "demo-indie-3",
      title: "Morning Pages",
      artist: "Notebook Skylines",
      album: "Acoustic Chapters",
      image: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/morning-pages.mp3"
    }
  ],
  party: [
    {
      id: "demo-lofi-1",
      title: "2 AM Debug Loop",
      artist: "Lofi Coder",
      album: "Late Night Hacks",
      image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/2-am-debug-loop.mp3"
    },
    {
      id: "demo-lofi-2",
      title: "Coffee Ring Notebook",
      artist: "Morning Flow",
      album: "Cozy Morning",
      image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/coffee-ring-notebook.mp3"
    },
    {
      id: "demo-lofi-3",
      title: "First Coffee Thoughts",
      artist: "Cozy Brew",
      album: "Warm Mug Beats",
      image: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/first-coffee-thoughts.mp3"
    }
  ],
  trending: [
    {
      id: "demo-study-1",
      title: "Brushstrokes and Rain",
      artist: "Ambient Canvas",
      album: "Focus Waves",
      image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/brushstrokes-and-rain.mp3"
    },
    {
      id: "demo-study-2",
      title: "Kettle Before Work",
      artist: "Tea & Ambient",
      album: "Focus Waves",
      image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/kettle-before-work.mp3"
    },
    {
      id: "demo-study-3",
      title: "Mat and Morning Light",
      artist: "Yoga Sunrises",
      album: "Focus Waves",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://raw.githubusercontent.com/btahir/open-lofi/main/tracks/activities/mat-and-morning-light.mp3"
    }
  ]
};

// Offline fallback tracks in case API key is missing or calls fail
const DEMO_TRACKS: JioSaavnSong[] = PLAYLIST_SONGS.romantic;

const getMusicThemeClasses = (color: string) => {
  switch (color) {
    case "yellow":
      return {
        text: "text-yellow-400",
        textLight: "text-yellow-300",
        border: "border-yellow-500/20",
        borderActive: "border-yellow-500/40",
        bgActive: "bg-yellow-500/10",
        accentBg: "bg-yellow-500",
        accentText: "text-yellow-950",
        glow: "rgba(234, 179, 8, 0.35)",
        sliderAccent: "accent-yellow-500",
        glowShadow: "0 0 25px rgba(234, 179, 8, 0.25)"
      };
    case "blue":
      return {
        text: "text-cyan-400",
        textLight: "text-cyan-300",
        border: "border-cyan-500/20",
        borderActive: "border-cyan-500/40",
        bgActive: "bg-cyan-500/10",
        accentBg: "bg-cyan-500",
        accentText: "text-cyan-950",
        glow: "rgba(6, 182, 212, 0.35)",
        sliderAccent: "accent-cyan-500",
        glowShadow: "0 0 25px rgba(6, 182, 212, 0.25)"
      };
    case "orchid":
      return {
        text: "text-purple-400",
        textLight: "text-purple-300",
        border: "border-purple-500/20",
        borderActive: "border-purple-500/40",
        bgActive: "bg-purple-500/10",
        accentBg: "bg-purple-500",
        accentText: "text-purple-950",
        glow: "rgba(168, 85, 247, 0.35)",
        sliderAccent: "accent-purple-500",
        glowShadow: "0 0 25px rgba(168, 85, 247, 0.25)"
      };
    case "peach":
      return {
        text: "text-orange-400",
        textLight: "text-orange-300",
        border: "border-orange-500/20",
        borderActive: "border-orange-500/40",
        bgActive: "bg-orange-500/10",
        accentBg: "bg-orange-500",
        accentText: "text-orange-950",
        glow: "rgba(249, 115, 22, 0.35)",
        sliderAccent: "accent-orange-500",
        glowShadow: "0 0 25px rgba(249, 115, 22, 0.25)"
      };
    case "beige":
      return {
        text: "text-amber-300",
        textLight: "text-amber-200",
        border: "border-amber-500/15",
        borderActive: "border-amber-500/30",
        bgActive: "bg-amber-500/5",
        accentBg: "bg-amber-600",
        accentText: "text-amber-50",
        glow: "rgba(245, 158, 11, 0.2)",
        sliderAccent: "accent-amber-500",
        glowShadow: "0 0 25px rgba(245, 158, 11, 0.15)"
      };
    case "maroon":
      return {
        text: "text-red-400",
        textLight: "text-red-300",
        border: "border-red-500/20",
        borderActive: "border-red-500/40",
        bgActive: "bg-red-500/10",
        accentBg: "bg-red-600",
        accentText: "text-red-950",
        glow: "rgba(220, 38, 38, 0.35)",
        sliderAccent: "accent-red-600",
        glowShadow: "0 0 25px rgba(220, 38, 38, 0.25)"
      };
    case "gemini":
      return {
        text: "text-blue-400",
        textLight: "text-blue-300",
        border: "border-blue-500/20",
        borderActive: "border-blue-500/40",
        bgActive: "bg-blue-500/10",
        accentBg: "bg-blue-500",
        accentText: "text-blue-950",
        glow: "rgba(59, 130, 246, 0.35)",
        sliderAccent: "accent-blue-500",
        glowShadow: "0 0 25px rgba(59, 130, 246, 0.25)"
      };
    case "pink":
    default:
      return {
        text: "text-pink-400",
        textLight: "text-pink-300",
        border: "border-pink-500/20",
        borderActive: "border-pink-500/40",
        bgActive: "bg-pink-500/10",
        accentBg: "bg-pink-500",
        accentText: "text-pink-950",
        glow: "rgba(244, 63, 94, 0.35)",
        sliderAccent: "accent-pink-500",
        glowShadow: "0 0 25px rgba(244, 63, 94, 0.25)"
      };
  }
};

export default function MusicPlayerPanel({
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
  onPlaySong,
  onNextTrack,
  onPrevTrack,
  onToggleFullscreen,
  musicQueue,
  currentQueueIndex,
  isMinimized: isMinimizedProp,
  onMinimizeToggle,
  onPlaySongAtIndex,
}: MusicPlayerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<JioSaavnSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "queue">("search");
  const [isResultActive, setIsResultActive] = useState(false);
  
  const [localIsMinimized, setLocalIsMinimized] = useState(false);
  const isMinimized = isMinimizedProp !== undefined ? isMinimizedProp : localIsMinimized;
  const setIsMinimized = onMinimizeToggle !== undefined ? onMinimizeToggle : setLocalIsMinimized;

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "maroon";
    }
    return "maroon";
  });

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

  const theme = getMusicThemeClasses(selectedColor);

  const [dragBounds, setDragBounds] = useState({ left: 10, right: 800, top: 10, bottom: 600 });
  const [initialLeft, setInitialLeft] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth - 344;
    }
    return null;
  });

  const dragControls = useDragControls();

  // Reset minimized state when opened
  useEffect(() => {
    if (isOpen && isMinimizedProp === undefined) {
      setLocalIsMinimized(false);
    }
  }, [isOpen, isMinimizedProp]);

  // Set initial position on the right side of the screen on mount if needed
  useEffect(() => {
    if (typeof window !== "undefined" && initialLeft === null) {
      setInitialLeft(window.innerWidth - 344);
    }
  }, []);

  // Update bounds dynamically based on viewport size and minimization state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateBounds = () => {
      setDragBounds({
        left: 10,
        right: window.innerWidth - (isMinimized ? 300 : 338),
        top: 10,
        bottom: window.innerHeight - (isMinimized ? 70 : 520)
      });
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [isMinimized, isOpen]);

  // Perform search
  const handleSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setIsResultActive(true);
    setIsLoading(true);
    setApiKeyError(null);

    try {
      const response = await fetch(`/api/music?action=search&query=${encodeURIComponent(q)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        if (data.code === "NO_API_KEY") {
          setApiKeyError("RapidAPI Key is not configured on the server.");
          setIsOfflineMode(true);
          setSearchResults(DEMO_TRACKS.filter(track => 
            track.title.toLowerCase().includes(q.toLowerCase()) || 
            track.artist.toLowerCase().includes(q.toLowerCase())
          ));
        } else {
          throw new Error(data.error || "Search request failed");
        }
      } else {
        setSearchResults(data.songs || []);
        setIsOfflineMode(false);
      }
    } catch (error: any) {
      console.error("Music search error:", error);
      setIsOfflineMode(true);
      setSearchResults(DEMO_TRACKS.filter(track => 
        track.title.toLowerCase().includes(q.toLowerCase()) || 
        track.artist.toLowerCase().includes(q.toLowerCase())
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Select Quick Playlist
  const handlePlaylistClick = async (playlist: typeof PLAYLISTS[0]) => {
    setSearchQuery(playlist.name);
    setIsLoading(true);
    setApiKeyError(null);
    try {
      const response = await fetch(`/api/music?action=search&query=${encodeURIComponent(playlist.query)}`);
      const data = await response.json();
      if (response.ok && data.songs && data.songs.length > 0) {
        setSearchResults(data.songs);
        setIsOfflineMode(false);
      } else {
        setSearchResults(PLAYLIST_SONGS[playlist.id] || []);
        setIsOfflineMode(true);
      }
    } catch (e) {
      console.warn("Playlist search failed, falling back to offline tracks:", e);
      setSearchResults(PLAYLIST_SONGS[playlist.id] || []);
      setIsOfflineMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Enable demo tracks
  const handleEnableDemoMode = () => {
    setSearchResults(DEMO_TRACKS);
    setIsOfflineMode(true);
    setApiKeyError(null);
  };

  // Initialize with demo tracks on mount if no search is active
  useEffect(() => {
    if (searchResults.length === 0) {
      setSearchResults(DEMO_TRACKS);
      setIsOfflineMode(true);
    }
  }, []);

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
        <motion.aside
          layout
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.05}
          dragConstraints={dragBounds}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: 1,
            boxShadow: isPlaying
              ? isMinimized
                ? [
                    `0 15px 35px rgba(0,0,0,0.5), 0 0 20px ${theme.glow.replace("0.35", "0.2")}`,
                    `0 15px 35px rgba(0,0,0,0.5), 0 0 35px ${theme.glow.replace("0.35", "0.4")}`,
                    `0 15px 35px rgba(0,0,0,0.5), 0 0 20px ${theme.glow.replace("0.35", "0.2")}`
                  ]
                : [
                    `0 25px 50px rgba(0,0,0,0.6), 0 0 25px ${theme.glow.replace("0.35", "0.15")}`,
                    `0 25px 50px rgba(0,0,0,0.6), 0 0 45px ${theme.glow.replace("0.35", "0.35")}`,
                    `0 25px 50px rgba(0,0,0,0.6), 0 0 25px ${theme.glow.replace("0.35", "0.15")}`
                  ]
              : isMinimized
              ? "0 15px 35px rgba(0,0,0,0.5), 0 0 0px rgba(0,0,0,0)"
              : "0 25px 50px rgba(0,0,0,0.6), 0 0 0px rgba(0,0,0,0)"
          }}
          transition={{
            boxShadow: {
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut"
            },
            type: "spring",
            damping: 26,
            stiffness: 210
          }}
          onPointerDown={(e) => {
            if (isMinimized) {
              dragControls.start(e);
            }
          }}
          className={`fixed z-[10001] flex text-white select-none border transition-colors duration-300 ${
            isMinimized
              ? "w-[290px] h-[56px] rounded-full bg-zinc-900/40 border-white/15 p-2 items-center flex-row gap-2 shadow-[0_15px_35px_rgba(0,0,0,0.3)] backdrop-blur-[20px]"
              : "w-[320px] h-auto rounded-[24px] bg-zinc-900/35 border-white/15 p-4 flex-col shadow-[0_25px_50px_rgba(0,0,0,0.4)] backdrop-blur-[25px]"
          }`}
          style={{
            top: "100px",
            left: initialLeft !== null ? `${initialLeft}px` : "auto",
            right: initialLeft !== null ? "auto" : "24px"
          }}
        >
          {isMinimized ? (
            /* ================= MINIMIZED badge UI ================= */
            <>
              {/* Spinning Disc / Artwork (Drag handle) */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/5 border border-white/15 flex items-center justify-center cursor-grab active:cursor-grabbing"
              >
                {currentSong?.image ? (
                  <img
                    src={currentSong.image}
                    alt=""
                    className={`h-full w-full object-cover select-none pointer-events-none ${isPlaying ? "animate-spin" : ""}`}
                    style={{ animationDuration: "8s" }}
                  />
                ) : (
                  <Disc
                    className={`h-5 w-5 ${theme.text} ${isPlaying ? "animate-spin" : ""}`}
                    style={{ animationDuration: "8s" }}
                  />
                )}
              </div>

              {/* Text metadata (Drag handle) */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex-1 min-w-0 pr-1 cursor-grab active:cursor-grabbing"
              >
                <h4 className={`text-[11px] font-bold truncate leading-tight ${theme.text}`}>
                  {currentSong ? currentSong.title : "Saheli Music"}
                </h4>
                <p className="text-[9px] text-white/40 truncate leading-none mt-0.5">
                  {currentSong ? currentSong.artist : "No song playing"}
                </p>
              </div>

              {/* Minimized Controls */}
              <div className="flex items-center gap-0.5 shrink-0">
                {currentSong && (
                  <button
                    onClick={onPlayPause}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition duration-200"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMinimized(false)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition duration-200"
                  title="Maximize Player"
                >
                  <ChevronUp className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-white/5 text-red-400/80 hover:text-red-300 transition duration-200"
                  title="Close Player"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </>
          ) : (
            /* ================= FULL EXPANDED UI ================= */
            <>
              {/* Header (Drag handle area) */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0 cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-xl border ${theme.bgActive} ${theme.borderActive} ${theme.text}`}>
                    <Heart className="h-4 w-4 fill-current animate-pulse text-pink-500" />
                  </span>
                  <div>
                    <h2 className={`text-xs font-bold tracking-wide ${theme.text}`}>Saheli's Sweet Melody Hub 🎵</h2>
                    <p className="text-[9px] text-white/50 leading-none mt-0.5 font-medium">Your Cute Music Companion</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsMinimized(true)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/55 hover:text-white transition duration-200"
                    title="Minimize Player"
                  >
                    <Minus className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/55 hover:text-white transition duration-200"
                    title="Close Player"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {/* API Warning if missing */}
              {apiKeyError && (
                <div className="mt-3 shrink-0 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-[11px] text-yellow-200/90 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="font-semibold text-yellow-300 leading-none">API Key Required</p>
                    <p className="leading-relaxed opacity-85">Configure <code className="bg-black/40 px-1 py-0.5 rounded text-[10px]">VITE_RAPIDAPI_KEY</code> in your .env file to enable live search.</p>
                    <button
                      onClick={handleEnableDemoMode}
                      className="underline text-yellow-300 font-bold hover:text-white transition"
                    >
                      Play local demo beats
                    </button>
                  </div>
                </div>
              )}

              {/* Search Box */}
              <div className="mt-3 flex gap-1.5 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                  <input
                    type="text"
                    placeholder={isOfflineMode ? "Search demo beats..." : "Search Hindi/English songs..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                    className={`w-full rounded-xl border bg-white/[0.02] py-2 pl-9 pr-3 text-xs outline-none transition backdrop-blur-md ${theme.border} focus:border-white/30 focus:bg-white/[0.05]`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setIsResultActive(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-300 border backdrop-blur-md bg-white/[0.03] ${theme.text} ${theme.border} hover:bg-white/[0.08] hover:border-white/20 active:scale-95`}
                >
                  Search
                </button>
              </div>

              {/* Small Playlist Pills */}
              {!isResultActive ? (
                <div className="mt-3 shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1.5">
                    <ListMusic className="h-3 w-3 text-white/40" />
                    Select Vibe Playlist
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLAYLISTS.map((pl) => {
                      const icon = pl.name.split(" ")[1] || "🌸";
                      const title = pl.name.split(" ")[0] || pl.id;
                      return (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          key={pl.id}
                          onClick={() => {
                            handlePlaylistClick(pl);
                            setIsResultActive(true);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-semibold transition bg-zinc-950/40 hover:bg-white/[0.05] hover:border-white/20 ${theme.border}`}
                        >
                          <span className="text-[11px] leading-none select-none">{icon}</span>
                          <span>{title}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Songs Result Area */
                <div className="mt-3 max-h-[220px] overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                      {isOfflineMode ? "Demo Playlists" : "Search Results"}
                    </p>
                    <div className="flex items-center gap-2">
                      {searchResults.length > 0 && (
                        <button
                          onClick={() => {
                            const firstSong = searchResults[0];
                            const remaining = searchResults.slice(1);
                            // Fisher-Yates Shuffle
                            for (let i = remaining.length - 1; i > 0; i--) {
                              const j = Math.floor(Math.random() * (i + 1));
                              [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
                            }
                            onPlaySong(firstSong, [firstSong, ...remaining]);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold transition-all duration-300 bg-white/[0.04] ${theme.border} hover:bg-white/[0.08] ${theme.text}`}
                          title="Play & Shuffle Playlist"
                        >
                          <Play className="h-2.5 w-2.5 fill-current" />
                          <span>Play Vibe</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsResultActive(false);
                          setSearchQuery("");
                        }}
                        className={`text-[8.5px] uppercase font-bold tracking-wider hover:underline ${theme.text}`}
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex h-24 flex-col items-center justify-center gap-2">
                      <div className={`h-4 w-4 animate-spin rounded-full border-2 ${theme.text} border-t-transparent`} />
                      <p className="text-[10px] text-white/40">Searching JioSaavn...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex h-24 flex-col items-center justify-center text-center p-4">
                      <Music className="h-5 w-5 text-white/20 mb-1" />
                      <p className="text-[10px] text-white/45 font-medium">No songs found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((song) => {
                        const isCurrent = currentSong?.id === song.id;
                        return (
                          <button
                            key={song.id}
                            onClick={() => onPlaySong(song, searchResults)}
                            className={`flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition duration-200 border ${
                              isCurrent 
                                ? `${theme.bgActive} ${theme.borderActive} text-white` 
                                : "bg-transparent border-transparent hover:bg-white/[0.03]"
                            }`}
                          >
                            {/* Artwork */}
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white/5 border border-white/10">
                              {song.image ? (
                                <img src={song.image} alt={song.title} className="h-full w-full object-cover" />
                              ) : (
                                <Music className="h-4 w-4 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              )}
                              {isCurrent && isPlaying && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="flex items-center gap-0.5">
                                    <span className={`w-0.5 h-2 ${theme.accentBg} animate-[bounce_0.8s_infinite_100ms]`} />
                                    <span className={`w-0.5 h-3 ${theme.accentBg} animate-[bounce_0.8s_infinite_300ms]`} />
                                    <span className={`w-0.5 h-2 ${theme.accentBg} animate-[bounce_0.8s_infinite_200ms]`} />
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-[11px] font-semibold truncate ${isCurrent ? theme.text : "text-white"}`}>
                                {song.title}
                              </h4>
                              <p className="text-[9px] text-white/40 truncate leading-none mt-0.5">{song.artist}</p>
                            </div>

                            {/* Play button */}
                            <div className="shrink-0 text-white/40 hover:text-white transition">
                              {isCurrent && isPlaying ? (
                                <Pause className={`h-4 w-4 ${theme.text}`} />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Miniature Player Interface at Bottom */}
              {currentSong && (
                <div className="mt-2.5 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 shadow-xl backdrop-blur-md">
                  {/* Timeline slider */}
                  <div className="group relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`timeline-slider w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none ${theme.sliderAccent}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-white/40 mt-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    {/* Current info */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Disc className={`h-7 w-7 ${theme.text} shrink-0 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white truncate leading-none">{currentSong.title}</p>
                        <p className="text-[8px] text-white/45 truncate mt-0.5 leading-none">{currentSong.artist}</p>
                      </div>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-0.5">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onPrevTrack}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={musicQueue.length <= 1}
                        className="p-1 rounded-full hover:bg-white/5 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <SkipBack className="h-3 w-3" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onPlayPause}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`p-1.5 rounded-full text-white transition-all duration-300 border ${theme.accentBg} ${theme.accentText} hover:brightness-110`}
                        style={{ boxShadow: `0 0 10px ${theme.glow.replace("0.35", "0.2")}` }}
                      >
                        {isPlaying ? (
                          <Pause className="h-3 w-3 fill-current" />
                        ) : (
                          <Play className="h-3 w-3 fill-current translate-x-0.5" />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onNextTrack}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={musicQueue.length <= 1}
                        className="p-1 rounded-full hover:bg-white/5 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <SkipForward className="h-3 w-3" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onToggleFullscreen}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-1 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition ml-0.5"
                        title="Fullscreen cinematic view"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Volume bar */}
                  <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-white/5 text-white/40">
                    <motion.button 
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)} 
                      onPointerDown={(e) => e.stopPropagation()}
                      className="hover:text-white transition"
                    >
                      {volume === 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                    </motion.button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`volume-slider flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none ${theme.sliderAccent}`}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
