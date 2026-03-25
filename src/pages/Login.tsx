import { useCallback, useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Sparkles, Heart, Star } from "lucide-react";
import { motion } from "framer-motion";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useStarDust(containerRef);

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
      setError(err.message);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem("devMode", "true");
    navigate("/chat");
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
          <p className="text-white/50 text-sm mt-2 font-light tracking-wide">Your Best Friend</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-purple-500/30 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none transition-all neon-border-input"
              required
            />
          </div>
          <div className="relative group">
            <input
              type="password"
              placeholder="Password"
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
            {isSignUp ? "Create Account" : "Welcome Back"}
          </motion.button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/60 hover:text-white/90 text-sm transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-1" />

          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/10 hover:border-pink-500/30 hover:bg-white/[0.03] text-white/60 hover:text-pink-300 transition-all text-sm skip-sparkle"
          >
            <Star className="w-3.5 h-3.5 text-pink-400/70" />
            <span className="tracking-wide">Skip Login</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
