import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Sparkles, Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black text-white">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 bg-black">
        <div className="absolute top-0 left-[-20%] w-[70vw] h-[70vw] rounded-full mix-blend-screen filter blur-[100px] bg-purple-900/40 animate-pulse-glow"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[100px] bg-pink-800/30 animate-pulse-glow" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[80vw] h-[80vw] rounded-full mix-blend-screen filter blur-[100px] bg-indigo-900/40 animate-pulse-glow" style={{ animationDelay: "4s" }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_8px_32px_rgba(255,100,200,0.1)]"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], filter: ["drop-shadow(0 0 10px rgba(236, 72, 153, 0.5))", "drop-shadow(0 0 25px rgba(236, 72, 153, 0.8))", "drop-shadow(0 0 10px rgba(236, 72, 153, 0.5))"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="p-3 bg-white/10 rounded-full mb-4"
          >
            <Sparkles className="w-10 h-10 text-pink-400" />
          </motion.div>
          <h1 className="text-3xl font-light tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300">Saheli AI</h1>
          <p className="text-white/50 text-sm mt-2 font-light">Your Best Friend</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
              required
            />
          </div>
          
          {error && <p className="text-pink-500 text-sm text-center">{error}</p>}
          
          <button 
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
          >
            {isSignUp ? "Create Account" : "Welcome Back"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/60 hover:text-white/90 text-sm transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-2" />

          <button 
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm"
          >
            <Heart className="w-4 h-4 text-pink-400" />
            Skip Auth (Dev Mode)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
