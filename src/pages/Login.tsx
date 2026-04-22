import { useEffect, useState } from "react";
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

export default function Login() {
  const t = getLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#07070f] via-[#0d0d1a] to-[#1a0b2e] overflow-hidden">
      <div className="w-full h-screen flex relative">
        <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-700/20 blur-3xl" />
        <div className="pointer-events-none absolute right-6 bottom-6 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />

        <div className="hidden md:block w-1/2 relative overflow-hidden">
          <img
            src="/anime.png"
            alt="Anime background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-r from-transparent to-[#0d0d1a]/80" />
          <div className="absolute left-10 top-20 text-purple-300 text-sm opacity-80 tracking-wide">
            Hey... you are here.
          </div>
        </div>

        <div className="w-full md:w-1/2 flex items-center justify-center px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-md backdrop-blur-xl bg-black/40 border border-purple-500/20 rounded-2xl shadow-2xl p-6"
          >
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
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-purple-500/20 focus:border-purple-400 outline-none text-white placeholder-white/40 transition-all"
              required
            />
          </div>
          <div className="relative group">
            <input
              type="password"
              placeholder={t.login.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-purple-500/20 focus:border-purple-400 outline-none text-white placeholder-white/40 transition-all"
              required
            />
          </div>

          {error && <p className="text-pink-400 text-sm text-center">{error}</p>}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-105 transition-all"
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
      </div>
    </div>
  );
}
