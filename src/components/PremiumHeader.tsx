import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, User, Lock, Image, Moon, Sun, Globe, Mic2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserProfile } from "@/types/auth";
import { logout, updateProfile, updatePassword, loadTheme, saveTheme } from "@/lib/auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface PremiumHeaderProps {
  profile: UserProfile;
  onProfileUpdate?: () => void;
}

export default function PremiumHeader({ profile, onProfileUpdate }: PremiumHeaderProps) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "theme" | "language" | "voice">("profile");
  const [theme, setThemeState] = useState<"light" | "dark">(loadTheme());
  
  // Profile form
  const [name, setName] = useState(profile.name);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNameUpdate = () => {
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    updateProfile({ name: name.trim() });
    setSuccess("Name updated successfully!");
    setTimeout(() => setSuccess(""), 2000);
    onProfileUpdate?.();
  };

  const handlePasswordUpdate = () => {
    setError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    const result = updatePassword(oldPassword, newPassword);
    if (result.success) {
      setSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(""), 2000);
    } else {
      setError(result.error || "Failed to update password");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateProfile({ profileImage: base64 });
      setSuccess("Profile picture updated!");
      setTimeout(() => setSuccess(""), 2000);
      onProfileUpdate?.();
    };
    reader.readAsDataURL(file);
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    setSuccess("Theme updated!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const handleLanguageChange = (lang: "en" | "hi") => {
    updateProfile({ language: lang });
    setSuccess("Language updated!");
    setTimeout(() => setSuccess(""), 2000);
    onProfileUpdate?.();
  };

  const handleVoiceChange = (voice: "male" | "female") => {
    updateProfile({ voiceType: voice });
    setSuccess("Voice updated!");
    setTimeout(() => setSuccess(""), 2000);
    onProfileUpdate?.();
  };

  return (
    <>
      <nav className="fixed top-0 w-full glass-strong z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/dashboard")}
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-xl font-bold gradient-text">Saheli AI</span>
          </motion.div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full glass">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-white">{profile.name}</span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-purple-300 hover:text-purple-200 transition-colors"
            >
              <Settings size={18} />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setShowSettings(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] glass-strong rounded-2xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">Settings</h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings(false)}
                  className="text-purple-300 hover:text-white"
                >
                  <X size={24} />
                </motion.button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 px-6 pt-4 border-b border-white/10 overflow-x-auto">
                {[
                  { id: "profile", label: "Profile", icon: User },
                  { id: "theme", label: "Theme", icon: theme === "dark" ? Moon : Sun },
                  { id: "language", label: "Language", icon: Globe },
                  { id: "voice", label: "Voice", icon: Mic2 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${
                      activeTab === tab.id
                        ? "bg-white/10 text-white border-b-2 border-purple-400"
                        : "text-purple-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon size={16} />
                    <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm"
                  >
                    {error}
                  </motion.div>
                )}
                
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg text-sm"
                  >
                    {success}
                  </motion.div>
                )}

                {activeTab === "profile" && (
                  <div className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-4 p-6 glass rounded-xl">
                      {profile.profileImage ? (
                        <img src={profile.profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <span className="px-4 py-2 bg-white/10 hover:bg-white/20 text-purple-200 rounded-lg text-sm font-medium transition-colors inline-block">
                          Change Picture
                        </span>
                      </label>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-white text-sm font-medium">Name</label>
                      <div className="flex gap-2">
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white"
                        />
                        <Button onClick={handleNameUpdate} className="saheli-btn">
                          Update
                        </Button>
                      </div>
                    </div>

                    {/* Email (read-only) */}
                    <div className="space-y-2">
                      <label className="text-white text-sm font-medium">Email</label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-white/5 border-white/10 text-purple-300"
                      />
                    </div>

                    {/* Change Password */}
                    <div className="space-y-4 p-6 glass rounded-xl">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <Lock size={18} />
                        Change Password
                      </h3>
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Button onClick={handlePasswordUpdate} className="w-full saheli-btn">
                        Update Password
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "theme" && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "light", label: "Light", icon: "☀️" },
                      { value: "dark", label: "Dark", icon: "🌙" },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleThemeChange(option.value as "light" | "dark")}
                        className={`p-6 rounded-xl font-semibold transition-all border ${
                          theme === option.value
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400"
                            : "glass text-purple-200 border-white/20 hover:bg-white/20"
                        }`}
                      >
                        <span className="text-3xl mb-2 block">{option.icon}</span>
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                )}

                {activeTab === "language" && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "en", label: "English", icon: "🇺🇸" },
                      { value: "hi", label: "हिंदी", icon: "🇮🇳" },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleLanguageChange(option.value as "en" | "hi")}
                        className={`p-6 rounded-xl font-semibold transition-all border ${
                          profile.language === option.value
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400"
                            : "glass text-purple-200 border-white/20 hover:bg-white/20"
                        }`}
                      >
                        <span className="text-3xl mb-2 block">{option.icon}</span>
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                )}

                {activeTab === "voice" && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "female", label: "Female", icon: "👩" },
                      { value: "male", label: "Male", icon: "👨" },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVoiceChange(option.value as "male" | "female")}
                        className={`p-6 rounded-xl font-semibold transition-all border ${
                          profile.voiceType === option.value
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400"
                            : "glass text-purple-200 border-white/20 hover:bg-white/20"
                        }`}
                      >
                        <span className="text-3xl mb-2 block">{option.icon}</span>
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                <Button
                  onClick={handleLogout}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
