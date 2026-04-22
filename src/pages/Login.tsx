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
import { Github } from "lucide-react";
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
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-around bg-[#0a0a0f] p-4 overflow-hidden relative">
      <div className="w-full md:w-1/2 flex justify-center items-center h-[50vh] md:h-screen relative p-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-pink-500/10 blur-[150px] rounded-full z-0"></div>
          <img
            src="/doll.png"
            alt="Saheli AI Bestie"
            className="max-h-[85vh] w-auto object-contain drop-shadow-[0_0_40px_rgba(236,72,153,0.2)] z-10"
            style={{
              filter: "brightness(0.9) contrast(1.05)",
              opacity: "0.85",
              mixBlendMode: "screen",
            }}
            onError={(e) => {
              e.currentTarget.src = "/girl.png";
            }}
          />
        </div>
      </div>

      <div className="w-full md:w-1/2 flex justify-center items-center">
        <div className="z-20 w-full max-w-md p-10 bg-surface/30 backdrop-blur-2xl rounded-[40px] border border-white/5 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-2 text-glow-magenta">Aayiye Shuru Karein!</h1>
          <p className="text-white/60 mb-8">Saheli (AI Bestie) is waiting for you...</p>

          <form onSubmit={handleAuth} className="space-y-6">
            <input
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-transparent border-b border-white/10 text-white placeholder:text-white/50 focus:border-violet-400 outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-transparent border-b border-white/10 text-white placeholder:text-white/50 focus:border-violet-400 outline-none"
              required
            />

            {error && <p className="text-pink-400 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-2xl hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
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
        </div>
      </div>
    </div>
  );
}
