import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Search, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Maximize2, Music, X, Disc, AlertTriangle, ListMusic, Music4, Minus, ChevronUp } from "lucide-react";
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
  onPlaySong: (song: JioSaavnSong) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleFullscreen: () => void;
  musicQueue: JioSaavnSong[];
  currentQueueIndex: number;
  isMinimized?: boolean;
  onMinimizeToggle?: (minimized: boolean) => void;
}

const PLAYLISTS = [
  { id: "lofi", name: "Chill Lofi Beats ☕", query: "lofi chill instrumentals" },
  { id: "bollywood", name: "Bollywood Romance 🌸", query: "arijit singh hits" },
  { id: "indie", name: "Indie Pop 🌻", query: "indie acoustic" },
  { id: "study", name: "Focus & Study 🧠", query: "deep ambient focus" }
];

const PLAYLIST_SONGS: Record<string, JioSaavnSong[]> = {
  lofi: [
    {
      id: "demo-lofi-1",
      title: "Chill Lofi Study Session",
      artist: "Lofi Library",
      album: "Chill Beats Volume 1",
      image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
      id: "demo-lofi-2",
      title: "Rainy Night Café",
      artist: "Lofi Café",
      album: "Coffee & Beats",
      image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    {
      id: "demo-lofi-3",
      title: "Sunset Chill Vibe",
      artist: "Vibe Collector",
      album: "Golden Hour",
      image: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    }
  ],
  bollywood: [
    {
      id: "demo-bolly-1",
      title: "Kesariya (Chill Lofi)",
      artist: "Arijit Singh",
      album: "Bollywood Chill",
      image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
    },
    {
      id: "demo-bolly-2",
      title: "Tum Hi Ho (Acoustic)",
      artist: "Arijit Singh",
      album: "Romantic Guitar",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
    },
    {
      id: "demo-bolly-3",
      title: "Raataan Lambiyan (Lofi)",
      artist: "Jubin Nautiyal",
      album: "Late Night Romance",
      image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
    }
  ],
  indie: [
    {
      id: "demo-indie-1",
      title: "Choo Lo (Indie Cover)",
      artist: "The Local Train",
      album: "Indie Rock India",
      image: "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
    },
    {
      id: "demo-indie-2",
      title: "Kasoor (Acoustic)",
      artist: "Prateek Kuhad",
      album: "Sunset Acoustic",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
    },
    {
      id: "demo-indie-3",
      title: "Baarishein",
      artist: "Anuv Jain",
      album: "Rainy Day Indie",
      image: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"
    }
  ],
  study: [
    {
      id: "demo-study-1",
      title: "Deep Focus Ambient Space",
      artist: "Study Smart",
      album: "Alpha Waves Focus",
      image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"
    },
    {
      id: "demo-study-2",
      title: "Binaural Study Aid",
      artist: "Focus Flow",
      album: "Binaural Beats",
      image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3"
    },
    {
      id: "demo-study-3",
      title: "Zen Garden Meditation",
      artist: "Ambient Oasis",
      album: "Mindfulness Ambient",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=150&auto=format&fit=crop&q=60",
      encryptedMediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3"
    }
  ]
};

// Offline fallback tracks in case API key is missing or calls fail
const DEMO_TRACKS: JioSaavnSong[] = PLAYLIST_SONGS.lofi;

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
}: MusicPlayerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<JioSaavnSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const [localIsMinimized, setLocalIsMinimized] = useState(false);
  const isMinimized = isMinimizedProp !== undefined ? isMinimizedProp : localIsMinimized;
  const setIsMinimized = onMinimizeToggle !== undefined ? onMinimizeToggle : setLocalIsMinimized;

  const [dragBounds, setDragBounds] = useState({ left: 10, right: 800, top: 10, bottom: 600 });
  const [initialLeft, setInitialLeft] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth - 374;
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
      setInitialLeft(window.innerWidth - 374);
    }
  }, []);

  // Update bounds dynamically based on viewport size and minimization state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateBounds = () => {
      setDragBounds({
        left: 10,
        right: window.innerWidth - (isMinimized ? 300 : 370),
        top: 10,
        bottom: window.innerHeight - (isMinimized ? 70 : 600)
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
  const handlePlaylistClick = (playlist: typeof PLAYLISTS[0]) => {
    setSearchQuery(playlist.name);
    setSearchResults(PLAYLIST_SONGS[playlist.id] || []);
    setIsOfflineMode(true);
    setApiKeyError(null);
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
                    "0 15px 35px rgba(0,0,0,0.5), 0 0 20px rgba(255,105,180,0.15)",
                    "0 15px 35px rgba(0,0,0,0.5), 0 0 35px rgba(255,105,180,0.35)",
                    "0 15px 35px rgba(0,0,0,0.5), 0 0 20px rgba(255,105,180,0.15)"
                  ]
                : [
                    "0 25px 50px rgba(0,0,0,0.6), 0 0 25px rgba(255,105,180,0.12)",
                    "0 25px 50px rgba(0,0,0,0.6), 0 0 45px rgba(255,105,180,0.28)",
                    "0 25px 50px rgba(0,0,0,0.6), 0 0 25px rgba(255,105,180,0.12)"
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
              ? "w-[290px] h-[56px] rounded-full bg-zinc-950/90 border-white/20 p-2 items-center flex-row gap-2 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-[25px]"
              : "w-[350px] h-[580px] rounded-[30px] bg-zinc-950/80 border-white/[0.08] p-5 flex-col shadow-[0_25px_50px_rgba(0,0,0,0.6)] backdrop-blur-[35px]"
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
                    className={`h-5 w-5 text-pink-400 ${isPlaying ? "animate-spin" : ""}`}
                    style={{ animationDuration: "8s" }}
                  />
                )}
              </div>

              {/* Text metadata (Drag handle) */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex-1 min-w-0 pr-1 cursor-grab active:cursor-grabbing"
              >
                <h4 className="text-[11px] font-bold truncate leading-tight text-pink-300">
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
                <button
                  onClick={() => setIsMinimized(false)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition duration-200"
                  title="Maximize Player"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-white/5 text-red-400/80 hover:text-red-300 transition duration-200"
                  title="Close Player"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
                <div className="flex items-center gap-2 pointer-events-none">
                  <span className="p-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300">
                    <Music4 className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold tracking-wide">Saheli Music</h2>
                    <p className="text-[10px] text-white/40">Immersive Audio Companion</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/55 hover:text-white transition duration-200"
                    title="Minimize Player"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full hover:bg-white/5 text-white/55 hover:text-white transition duration-200"
                    title="Close Player"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
              <div className="mt-4 flex gap-1.5 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder={isOfflineMode ? "Search demo beats..." : "Search Hindi/English songs..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                    className="w-full rounded-full border border-white/5 bg-white/[0.03] py-2 pl-9 pr-4 text-xs outline-none transition focus:border-pink-500/35 focus:bg-white/[0.05]"
                  />
                </div>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/90 active:scale-95 transition"
                >
                  Search
                </button>
              </div>

              {/* Quick Playlists */}
              <div className="mt-3.5 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1.5">
                  <ListMusic className="h-3 w-3" />
                  Vibe Channels
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLAYLISTS.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => handlePlaylistClick(pl)}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-left text-[11px] font-medium text-white/70 hover:border-pink-500/20 hover:bg-white/[0.05] hover:text-white transition duration-200"
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Songs Result Area */}
              <div className="mt-4 flex-1 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
                  {isOfflineMode ? "Demo Playlists" : "Search Results"}
                </p>
                
                {isLoading ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                    <p className="text-xs text-white/40">Searching JioSaavn...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center text-center p-4">
                    <Music className="h-6 w-6 text-white/20 mb-2" />
                    <p className="text-xs text-white/45 font-medium">No songs found</p>
                    <p className="text-[10px] text-white/30 mt-1">Try another search query or pick a vibe channel</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((song) => {
                      const isCurrent = currentSong?.id === song.id;
                      return (
                        <button
                          key={song.id}
                          onClick={() => onPlaySong(song)}
                          className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition duration-200 border ${
                            isCurrent 
                              ? "bg-pink-500/10 border-pink-500/20 text-white" 
                              : "bg-transparent border-transparent hover:bg-white/[0.03]"
                          }`}
                        >
                          {/* Artwork */}
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5 border border-white/10">
                            {song.image ? (
                              <img src={song.image} alt={song.title} className="h-full w-full object-cover" />
                            ) : (
                              <Music className="h-5 w-5 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                            {isCurrent && isPlaying && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="flex items-center gap-0.5">
                                  <span className="w-0.5 h-3 bg-pink-400 animate-[bounce_0.8s_infinite_100ms]" />
                                  <span className="w-0.5 h-4 bg-pink-400 animate-[bounce_0.8s_infinite_300ms]" />
                                  <span className="w-0.5 h-3 bg-pink-400 animate-[bounce_0.8s_infinite_200ms]" />
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-[12px] font-semibold truncate ${isCurrent ? "text-pink-300" : "text-white"}`}>
                              {song.title}
                            </h4>
                            <p className="text-[10px] text-white/40 truncate mt-0.5">{song.artist}</p>
                          </div>

                          {/* Play button */}
                          <div className="shrink-0 text-white/40 hover:text-white transition">
                            {isCurrent && isPlaying ? (
                              <Pause className="h-4.5 w-4.5 text-pink-400" />
                            ) : (
                              <Play className="h-4.5 w-4.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Miniature Player Interface at Bottom */}
              {currentSong && (
                <div className="mt-3 shrink-0 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-3 shadow-lg">
                  {/* Timeline slider */}
                  <div className="group relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="timeline-slider w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none accent-pink-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-white/40 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 gap-2">
                    {/* Current info */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Disc className={`h-8 w-8 text-pink-400 shrink-0 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white truncate leading-none">{currentSong.title}</p>
                        <p className="text-[9px] text-white/45 truncate mt-1 leading-none">{currentSong.artist}</p>
                      </div>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={onPrevTrack}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={musicQueue.length <= 1}
                        className="p-1.5 rounded-full hover:bg-white/5 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <SkipBack className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={onPlayPause}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-2 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition"
                      >
                        {isPlaying ? (
                          <Pause className="h-3.5 w-3.5 fill-black" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-black translate-x-0.5" />
                        )}
                      </button>
                      <button
                        onClick={onNextTrack}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={musicQueue.length <= 1}
                        className="p-1.5 rounded-full hover:bg-white/5 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={onToggleFullscreen}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition ml-0.5"
                        title="Fullscreen cinematic view"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Volume bar */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-white/40">
                    <button 
                      onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)} 
                      onPointerDown={(e) => e.stopPropagation()}
                      className="hover:text-white transition"
                    >
                      {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="volume-slider flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none accent-pink-400"
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
