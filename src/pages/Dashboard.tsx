import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, CheckSquare, Camera, Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { loadProfile } from "@/lib/auth";
import { UserProfile } from "@/types/auth";
import FloatingElements from "@/components/FloatingElements";
import PremiumHeader from "@/components/PremiumHeader";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = () => {
    const p = loadProfile();
    if (!p.isLoggedIn) {
      navigate("/login");
    } else {
      setProfile(p);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [navigate]);

  const features = [
    {
      id: "chat",
      icon: MessageSquare,
      title: "Chat Assistant",
      description: "Chat with Saheli, your personal AI assistant",
      gradient: "from-purple-500 via-purple-600 to-pink-500",
      action: () => navigate("/chat"),
    },
    {
      id: "todo",
      icon: CheckSquare,
      title: "To-Do Tasks",
      description: "Manage your daily tasks and reminders",
      gradient: "from-blue-500 via-blue-600 to-cyan-500",
      action: () => navigate("/todo"),
    },
    {
      id: "fitcheck",
      icon: Camera,
      title: "Fit Check",
      description: "Get AI feedback on your outfit",
      gradient: "from-orange-500 via-orange-600 to-red-500",
      action: () => navigate("/fit-check"),
    },
    {
      id: "voiceassistant",
      icon: Mic,
      title: "Live Talk",
      description: "Voice conversations with AI assistant",
      gradient: "from-green-500 via-green-600 to-emerald-500",
      action: () => navigate("/voice-assistant"),
    },
  ];

  if (!profile) return null;

  return (
    <div className="min-h-screen gradient-bg overflow-hidden relative">
      <FloatingElements />
      
      <PremiumHeader profile={profile} onProfileUpdate={refreshProfile} />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Welcome back, <span className="gradient-text">{profile.name}</span>
            </h1>
            <p className="text-purple-200/80 text-lg">What would you like to do today?</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={feature.action}
                className="cursor-pointer group"
              >
                <Card className="glass-panel overflow-hidden h-full transition-all duration-300 hover:border-purple-400/30">
                  <div className="p-8">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg`}
                    >
                      <feature.icon className="w-8 h-8 text-white" strokeWidth={2} />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-purple-200/70 text-sm leading-relaxed mb-4">{feature.description}</p>
                    <motion.div
                      className="inline-flex items-center gap-2 text-purple-300 text-sm font-semibold group-hover:text-purple-200 transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      <span>Get started</span>
                      <span>→</span>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
