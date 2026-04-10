import { useCallback, useEffect, useRef, useState } from "react";
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
import { Sparkles, Github } from "lucide-react";
import { motion } from "framer-motion";
import { isMobile } from "@/lib/utils";

// Star Dust Cursor Particle System
function useStarDust(containerRef: React.RefObject<HTMLDivElement>) {
  const frameRef = useRef(0);

  const spawnParticle = useCallback(
    (x: number, y: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const particle = document.createElement("div");
      particle.className = "star-particle";

      // Random drift direction
      const tx = (Math.random() - 0.5) * 30;
      const ty = -(Math.random() * 20 + 5);
      particle.style.setProperty("--tx", `${tx}px`);
      particle.style.setProperty("--ty", `${ty}px`);
      particle.style.left = `${x - rect.left}px`;
      particle.style.top = `${y - rect.top}px`;

      container.appendChild(particle);

      // Clean up after animation
      setTimeout(() => particle.remove(), 800);
    },
    [containerRef]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      frameRef.current++;
      // Only spawn every 3rd frame to keep it subtle
      if (frameRef.current % 3 !== 0) return;
      // 40% chance per eligible frame — very subtle
      if (Math.random() > 0.4) return;
      spawnParticle(e.clientX, e.clientY);
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [containerRef, spawnParticle]);
}

export default function Login() {
  const t = getLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useStarDust(containerRef);

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Animated Drifting Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-15%] left-[-20%] w-[75vw] h-[75vw] rounded-full mix-blend-screen filter blur-[120px] blob-drift-1"
          style={{ background: 'rgba(88, 28, 135, 0.40)' }}
        />
        <div
          className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[120px] blob-drift-2"
          style={{ background: 'rgba(157, 23, 77, 0.40)' }}
        />
        <div
          className="absolute bottom-[-20%] left-[20%] w-[80vw] h-[80vw] rounded-full mix-blend-screen filter blur-[140px] blob-drift-3"
          style={{ background: 'rgba(67, 20, 110, 0.35)' }}
        />
      </div>

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-black/60 border border-purple-500/30 neon-card-border"
      >
        {/* Logo with Neon Breathe */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="p-4 bg-white/10 rounded-full mb-4 logo-neon-breathe"
          >
            <Sparkles className="w-10 h-10 text-pink-400" />
          </motion.div>
          <h1 className="text-3xl font-light tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300">
            Saheli AI
          </h1>
          <p className="text-white/50 text-sm mt-2 font-light tracking-wide">{t.login.bestFriend}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative group">
            <input
              type="email"
              placeholder={t.login.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-purple-500/30 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none transition-all neon-border-input"
              required
            />
          </div>
          <div className="relative group">
            <input
              type="password"
              placeholder={t.login.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-purple-500/30 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none transition-all neon-border-input"
              required
            />
          </div>

          {error && <p className="text-pink-400 text-sm text-center">{error}</p>}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white font-semibold transition-all btn-nebula-pulse"
          >
            {isSignUp ? t.login.createAccount : t.login.welcomeBack}
          </motion.button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/60 hover:text-white/90 text-sm transition-colors"
          >
            {isSignUp ? t.login.alreadyHaveAccount : t.login.needAccount}
          </button>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-1" />

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSocialAuth(new GoogleAuthProvider())}
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
              className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group backdrop-blur-md"
              aria-label="Continue with GitHub"
            >
              <Github className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
