import { useEffect, useState, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type AuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getLang } from "@/lib/useLanguage";
import { useNavigate } from "react-router-dom";
import { Github } from "lucide-react";
import { isMobile } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const t = getLang();
  const dialogues = {
    welcome: [
      "Aa gaye? Chalo fatafat login karo! ✨",
      "Tumhara hi intezar tha, jaldi aao! 🌸",
      "Missing me? Login karo phir baatein karte hain! ❤️",
    ],
    signup: [
      "Ohoo, naye dost? Chalo ID banao jaldi! 🎀",
      "Nayi shuruat? I'm excited! Details bharo. ✨",
      "Pehli baar? Don't worry, main hoon na! 🥰",
    ],
    google: [
      "Smart choice! Google se toh kaam aur asaan ho gaya. 😎",
      "Direct entry? Wah, smart ho tum! ⚡",
    ],
    github: [
      "Ohoo... Developer ho? Code-shode likhte ho kya? 💻",
      "GitHub? Lagta hai koi bada project ban raha hai! 🚀",
    ],
    error: [
      "Hey! Kuch toh gadbad hai, password phir se check karo. 🤨",
      "Password bhool gaye? Itni jaldi? Dhyan se dalo! 🧐",
    ],
    emailFocus: [
      "Email se shuru karo, bestie. Main yahin hoon. ✨",
      "Bas sahi email dalo aur hum start karte hain. 🌸",
    ],
    passwordFocus: [
      "Password carefully, warna main tease karungi. 😉",
      "Shhh... secret password safe rakhna. 🔐",
    ],
    hoverDoll: [
      "Ooye! Idhar kya kar rahe ho? 🤨",
      "Dobara aa gaye? Maanoge nahi tum... 🙄",
      "Phir se mujhe pareshan karne aa gaye? Jaao apna kaam karo! 😤",
      "Arae! Mere itne paas mat aao, thodi duri rakho! 🎀",
      "Tumhe aur koi kaam nahi hai kya? Sirf mujhe dekhna hai? 🙄",
    ],
    clickDoll: [
      "Pagal ho kya? Mujhe kyun chhu rahe ho! 😡",
      "Hath hatao! Mujhe pareshan mat karo! 😤",
      "Ab toh tum pakka pitoge! Chalo piche hato! 👊",
      "Hey! Ye badtameezi hai, main tumse baat nahi karungi! 🤐",
      "Touch kyun kiya? Seedhe login karo aur jao! 💢",
    ],
  };

  type DialogueKey = keyof typeof dialogues;

  const [message, setMessage] = useState("Aayiye shuru karein!");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [isClicked, setIsClicked] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const bubbleTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const ANGRY_EMOJIS = ["😕", "😐", "😑", "😤", "😠"];
  const HOVER_EMOJIS = ["🥰", "😍", "😘", "🥺", "😊", "💖", "🌸", "✨", "💕", "💘", "💓", "🤗", "🎀", "😽", "♥️", "🙈", "🤭", "🤤", "🫶", "💞"];
  
  const CLICK_TEXTS_NORMAL = ["ouch!", "aah", "kya hai?", "mat kr yaar", "dard hota h", "kyu chhu rahe ho?", "seriously?", "kya chahiye?", "bas bhi karo..."];
  const CLICK_TEXTS_FAST = ["pitungi!", "maar khayega!", "rone lagungi... 😭", "kyu presan kr rha hai?!", "lagta hai padega ek mukka!", "hatooooo!", "maroge kya?!", "dobara kiya to dekhna 😤"];
  
  const HOVER_TEXTS_NORMAL = ["are are are...", "kya kar rahe ho?", "koi dekh lega...", "uff...", "shhh...", "please...", "kya chahiye bestie?", "hmm?"];
  const HOVER_TEXTS_FAST = ["itna fast?", "aram se yaar", "what!", "hey stop!", "dhyan se!", "chakkar aa raha hai", "udte hue aaye?"];

  const [clickCount, setClickCount] = useState(0);
  const [hoverCount, setHoverCount] = useState(0);
  const interactionTimer = useRef<number>(Date.now());
  
  interface ReactionEffect {
    id: number;
    content: string;
    isText: boolean;
    sparkles: { id: string; left: string; top: string; delay: number }[];
  }
  const [activeEffects, setActiveEffects] = useState<ReactionEffect[]>([]);

  const createReaction = (content: string, isText: boolean) => {
    const newId = Date.now() + Math.random();
    
    const newEffect: ReactionEffect = {
      id: newId,
      content,
      isText,
      sparkles: [
         { id: `s1-${newId}`, left: `${Math.random() * 20 + 5}%`, top: `${Math.random() * 20 + 5}%`, delay: 0 },
         { id: `s2-${newId}`, left: `${Math.random() * 20 + 75}%`, top: `${Math.random() * 20 + 10}%`, delay: 0.1 },
         { id: `s3-${newId}`, left: `${Math.random() * 40 + 30}%`, top: `${Math.random() * 10}%`, delay: 0.2 }
      ]
    };
    
    // Replace array so strictly ONLY 1 reaction exists at a time (No overlaps)
    setActiveEffects([newEffect]);
    
    window.setTimeout(() => {
      setActiveEffects(curr => curr.filter(e => e.id !== newId));
    }, 600);
  };

  const setRandomMessage = (pool: string[]) => {
    if (pool.length === 0) {
      return;
    }

    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) {
      while (next === message) {
        next = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    setMessage(next);
  };

  const handleTease = (action: DialogueKey) => {
    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    setRandomMessage(dialogues[action]);
    setShowBubble(true);
  };

  const showCustomTease = (messages: string[]) => {
    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    setRandomMessage(messages);
    setShowBubble(true);
  };

  const hideBubble = () => {
    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    setShowBubble(false);
  };

  useEffect(() => {
    let cancelled = false;

    void getRedirectResult(auth)
      .then((result) => {
        if (cancelled || !result?.user) {
          return;
        }

        navigate("/chat");
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setError(err instanceof Error ? err.message : "Social authentication failed.");
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const star = document.createElement("div");
      star.className = "sparkle-star";
      star.style.left = `${e.pageX}px`;
      star.style.top = `${e.pageY}px`;
      const size = `${Math.random() * 10 + 5}px`;
      star.style.width = size;
      star.style.height = size;
      star.style.background = "radial-gradient(circle, #fff 0%, #ff6ad5 55%, #7928ca 100%)";
      document.body.appendChild(star);
      window.setTimeout(() => star.remove(), 800);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/chat");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      handleTease("error");
    }
  };

  const handleSocialAuth = async (provider: AuthProvider) => {
    setError("");
    try {
      if (isMobile()) {
        await signInWithRedirect(auth, provider);
        return;
      }

      await signInWithPopup(auth, provider);
      navigate("/chat");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Social authentication failed.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-around bg-[#0a0a0f] p-4 overflow-hidden relative">
      <div className="w-full md:w-1/2 flex justify-center items-center h-[50vh] md:h-screen relative group">
        <div className="relative group flex items-center justify-center">
          {/* Anchored Chat Bubble: Toggled by Hover/Focus */}
          <AnimatePresence>
            {showBubble && (
              <motion.div
                key="main-system-bubble"
                initial={{ opacity: 0, scale: 0.5, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: -5 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ duration: 0.4 }}
                className="absolute z-50 left-[60%] md:left-[80%] top-[10%] drop-shadow-md pointer-events-none"
              >
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={message}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#1a0a14]/70 border border-pink-500/20 text-pink-100 text-xs md:text-sm font-medium px-3 py-1.5 rounded-2xl w-max max-w-[200px] md:max-w-[260px] text-center tracking-wide shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                  >
                    {message}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Click Interaction Effects: Emojis & Sparkles */}
          <AnimatePresence>
            {activeEffects.map((effect) => (
              <div key={effect.id} className="absolute inset-0 pointer-events-none z-40">
                {/* Progressive Mixed Reaction (Text / Emoji) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 15 }}
                  animate={{ opacity: 1, scale: effect.isText ? 1 : 1.3, y: -5 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className={`absolute z-50 left-[75%] md:left-[85%] top-[10%] drop-shadow-md pointer-events-none ${
                    effect.isText 
                      ? "bg-[#1a0a14]/70 border border-pink-500/20 text-pink-100 text-sm md:text-[15px] font-medium px-3 py-1.5 rounded-2xl w-max max-w-[180px] md:max-w-[220px] text-center tracking-wide shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                      : "text-3xl md:text-4xl emoji-native"
                  }`}
                >
                  {effect.content}
                </motion.div>

                {/* Sparkles */}
                {effect.sparkles.map((sp) => (
                  <motion.div
                    key={sp.id}
                    initial={{ opacity: 0, scale: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, y: -20 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.3, delay: sp.delay }}
                    className="absolute text-pink-300 text-xl filter drop-shadow-md"
                    style={{ left: sp.left, top: sp.top }}
                  >
                    ✦
                  </motion.div>
                ))}
              </div>
            ))}
          </AnimatePresence>

          {/* Character Image with Multi-Layered Animations */}
          <img
            src="/doll.png"
            alt="Saheli AI Bestie"
            className={`anime-girl max-h-[85vh] w-auto object-contain z-10 ${isClicked ? "tap-soft" : ""}`}
            // Multi-Event Binding
            onMouseEnter={() => {
              hideBubble(); 
              
              const now = Date.now();
              const timeSinceLast = now - interactionTimer.current;
              interactionTimer.current = now;
              const isFast = timeSinceLast < 450;
              
              setHoverCount(prev => {
                const current = prev + 1;
                // Text occurs 85% of the time, emoji occasionally (~15%)
                const isText = Math.random() > 0.15;
                
                let content = "";
                if (isText) {
                  const arr = isFast ? HOVER_TEXTS_FAST : HOVER_TEXTS_NORMAL;
                  content = arr[Math.floor(Math.random() * arr.length)];
                } else {
                  content = HOVER_EMOJIS[Math.floor(Math.random() * HOVER_EMOJIS.length)];
                }
                
                createReaction(content, isText);
                return current;
              });
            }}
            onClick={() => {
              setIsClicked(true);
              hideBubble(); 
              window.setTimeout(() => setIsClicked(false), 150);

              const now = Date.now();
              const timeSinceLast = now - interactionTimer.current;
              interactionTimer.current = now;
              const isFast = timeSinceLast < 350;

              setClickCount(prev => {
                const current = prev + 1;
                // Text occurs 85% of the time, emoji occasionally (~15%)
                const isText = Math.random() > 0.15;
                
                let content = "";
                if (isText) {
                  const arr = isFast ? CLICK_TEXTS_FAST : CLICK_TEXTS_NORMAL;
                  content = arr[Math.floor(Math.random() * arr.length)];
                } else {
                  content = ANGRY_EMOJIS[Math.floor(Math.random() * ANGRY_EMOJIS.length)];
                }
                
                createReaction(content, isText);
                return current;
              });
            }}
            style={{
              mixBlendMode: "lighten",
              // These are optimized from the base animation class
              willChange: "transform, filter",
            }}
            onError={(e) => {
              e.currentTarget.src = "/girl.png";
            }}
          />

          {/* 3. Soft realistic shadow under feet */}
          <div className="girl-ground-shadow" />

          {/* 2. Ground light — barely visible pink oval patch */}
          <div className="girl-ground-light" />

          {/* 1. Spotlight — soft top-center cone on girl only */}
          <div className="girl-spotlight" />

          {/* 4. Ambient glow — very faint depth around character */}
          <div className="girl-ambient-glow" />
        </div>
      </div>

      <div className="w-full md:w-1/2 flex justify-center items-center">
        <div className="login-card-premium z-20 w-full max-w-md p-10 rounded-[40px] relative overflow-hidden">
          <h1 className="text-4xl font-bold text-white mb-2 text-glow-magenta">Aayiye Shuru Karein!</h1>
          <p className="text-white/60 mb-8">Saheli (AI Bestie) is waiting for you...</p>

          <form onSubmit={handleAuth} className="space-y-6">
            <input
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => handleTease("emailFocus")}
              onBlur={hideBubble}
              className="w-full p-4 bg-transparent border-b border-white/10 text-white placeholder:text-white/50 focus:border-violet-400 outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => handleTease("passwordFocus")}
              onBlur={hideBubble}
              className="w-full p-4 bg-transparent border-b border-white/10 text-white placeholder:text-white/50 focus:border-violet-400 outline-none"
              required
            />

            {error && <p className="text-pink-400 text-sm">{error}</p>}

            <button
              type="submit"
              onMouseEnter={() => handleTease(isSignUp ? "signup" : "welcome")}
              onMouseLeave={hideBubble}
              className="w-full py-4 bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-400 text-white font-semibold rounded-2xl shadow-[0_4px_25px_rgba(244,163,187,0.4),0_2px_10px_rgba(232,121,249,0.25)] hover:shadow-[0_6px_35px_rgba(244,163,187,0.55),0_4px_15px_rgba(232,121,249,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => {
                handleTease("signup");
                setIsSignUp(!isSignUp);
              }}
              className="text-white/60 hover:text-white/90 text-sm transition-colors"
            >
              {isSignUp ? t.login.alreadyHaveAccount : t.login.needAccount}
            </button>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-1" />

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleSocialAuth(new GoogleAuthProvider())}
                onMouseEnter={() => showCustomTease(dialogues.google)}
                onMouseLeave={hideBubble}
                className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group backdrop-blur-md"
                aria-label="Continue with Google"
              >
                <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleSocialAuth(new GithubAuthProvider())}
                onMouseEnter={() => showCustomTease(dialogues.github)}
                onMouseLeave={hideBubble}
                className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group backdrop-blur-md"
                aria-label="Continue with GitHub"
              >
                <Github className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
