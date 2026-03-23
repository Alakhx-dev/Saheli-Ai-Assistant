import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, Moon, Sun, Globe, Mic2, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadProfile, saveProfile, logout as logoutAuth, clearProfile } from "@/lib/auth";
import { UserProfile } from "@/types/auth";
import FloatingElements from "@/components/FloatingElements";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>(loadProfile());
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile.isLoggedIn) {
      navigate("/login");
    }
  }, [profile, navigate]);

  const handleLanguageChange = (lang: "en" | "hi") => {
    const updated = { ...profile, language: lang };
    setProfile(updated);
    saveProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleVoiceTypeChange = (voiceType: "male" | "female") => {
    const updated = { ...profile, voiceType };
    setProfile(updated);
    saveProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenderChange = (gender: "male" | "female") => {
    const updated = { ...profile, gender };
    setProfile(updated);
    saveProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logoutAuth();
    clearProfile();
    navigate("/login");
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const settings = [
    {
      title: "Language",
      icon: Globe,
      options: [
        { label: "English", value: "en", emoji: "🇺🇸" },
        { label: "हिंदी", value: "hi", emoji: "🇮🇳" },
      ],
      currentValue: profile.language,
      onChange: (value: any) => handleLanguageChange(value as "en" | "hi"),
    },
    {
      title: "Voice Type",
      icon: Mic2,
      options: [
        { label: "Female", value: "female", emoji: "👩" },
        { label: "Male", value: "male", emoji: "👨" },
      ],
      currentValue: profile.voiceType,
      onChange: (value: any) => handleVoiceTypeChange(value as "male" | "female"),
    },
    {
      title: "Theme",
      icon: theme === "dark" ? Moon : Sun,
      options: [
        { label: "Light", value: "light", emoji: "☀️" },
        { label: "Dark", value: "dark", emoji: "🌙" },
      ],
      currentValue: theme,
      onChange: (value: any) => handleThemeChange(value as "light" | "dark"),
    },
    {
      title: "Gender",
      icon: null,
      options: [
        { label: "Female", value: "female", emoji: "👩" },
        { label: "Male", value: "male", emoji: "👨" },
      ],
      currentValue: profile.gender,
      onChange: (value: any) => handleGenderChange(value as "male" | "female"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 overflow-hidden relative">
      <FloatingElements />

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-xl border-b border-white/20 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/dashboard")}
              className="text-white hover:text-purple-300"
            >
              <ArrowLeft size={24} />
            </motion.button>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-purple-400" fill="currentColor" />
              <span className="text-2xl font-bold text-white">Saheli AI</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">⚙️ Settings</h1>
            <p className="text-purple-200">Customize your Saheli experience</p>
          </motion.div>

          {/* Success Message */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded-lg"
            >
              ✓ Settings saved!
            </motion.div>
          )}

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/50 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                  <p className="text-purple-200">{profile.email}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Settings */}
          <div className="space-y-6">
            {settings.map((setting, i) => (
              <motion.div
                key={setting.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    {setting.icon && <setting.icon size={24} />}
                    {setting.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {setting.options.map((option: any) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setting.onChange(option.value)}
                        className={`py-3 px-4 rounded-lg font-semibold transition-all border ${
                          setting.currentValue === option.value
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400"
                            : "bg-white/10 text-purple-200 border-white/20 hover:bg-white/20"
                        }`}
                      >
                        <span className="text-lg mr-2">{option.emoji}</span>
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 mb-8"
          >
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">About Saheli AI</h3>
              <p className="text-purple-200 mb-3">
                Saheli is your personal AI assistant, designed to help you with daily tasks, fashion feedback, voice conversations, and much more.
              </p>
              <p className="text-purple-300 text-sm">Version 1.0.0</p>
            </Card>
          </motion.div>

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              Logout
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
