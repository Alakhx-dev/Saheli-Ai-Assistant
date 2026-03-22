import { useState } from "react";
import { motion } from "framer-motion";
import { SaheliLogo } from "./SaheliLogo";
import { UserProfile } from "@/types/auth";
import { saveProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";

interface LoginSignupProps {
  onSuccess: (profile: UserProfile) => void;
}

export default function LoginSignup({ onSuccess }: LoginSignupProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const i18n = getI18n(language);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const profile: UserProfile = {
      name: name.trim(),
      gender,
      language,
      isLoggedIn: true,
    };

    saveProfile(profile);
    onSuccess(profile);
  };

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-saheli-pink/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-saheli-lavender/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="glass-strong rounded-3xl p-8 sm:p-12 w-full max-w-md relative z-10 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center mb-4 shadow-lg">
            <SaheliLogo size={32} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text leading-tight">
            Saheli AI
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            {i18n.auth.loginDescription}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              {i18n.auth.name}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={i18n.auth.namePlaceholder}
              className="w-full px-4 py-3 rounded-xl glass border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-saheli-pink/40 transition-all"
              autoFocus
              required
            />
          </div>

          {/* Gender Toggle */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              {i18n.auth.gender}
            </label>
            <div className="flex gap-3">
              {(["male", "female"] as const).map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                    className="w-4 h-4 accent-saheli-pink"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {i18n.auth[g]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Language Toggle */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              {i18n.auth.language}
            </label>
            <div className="flex gap-3">
              {(["en", "hi"] as const).map((lang) => (
                <label key={lang} className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    name="language"
                    value={lang}
                    checked={language === lang}
                    onChange={() => setLanguage(lang)}
                    className="w-4 h-4 accent-saheli-pink"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {lang === "en" ? i18n.auth.english : i18n.auth.hindi}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!name.trim()}
            className="saheli-btn w-full py-3 rounded-xl font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            whileTap={{ scale: 0.97 }}
          >
            {i18n.auth.startChatting}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-medium">
          {language === "en"
            ? "Your personal AI companion awaits 💕"
            : "तुम्हारी बेस्ट फ्रेंड तुम्हारे लिए है 💕"}
        </p>
      </motion.div>
    </div>
  );
}
