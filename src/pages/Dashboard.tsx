import { MessageCircle, Camera, CheckSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

const quickActions = [
  {
    title: "Chat with Saheli",
    desc: "Talk to your AI companion",
    icon: MessageCircle,
    to: "/chat",
    gradient: "from-saheli-pink to-saheli-rose",
    delay: "0ms",
  },
  {
    title: "Fit-Check",
    desc: "Get outfit & wellness feedback",
    icon: Camera,
    to: "/fit-check",
    gradient: "from-saheli-lavender to-saheli-pink",
    delay: "80ms",
  },
  {
    title: "My Tasks",
    desc: "Stay organized and productive",
    icon: CheckSquare,
    to: "/tasks",
    gradient: "from-saheli-teal to-saheli-lavender",
    delay: "160ms",
  },
];

const Dashboard = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Greeting */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-saheli-pink animate-pulse-glow" />
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              {greeting}
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight" style={{ lineHeight: "1.1" }}>
            Welcome to{" "}
            <span className="saheli-gradient-text">Saheli</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-base max-w-lg">
            Your caring AI companion — here to chat, analyze your style, and keep you on track. ✨
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((a) => (
            <Link
              key={a.title}
              to={a.to}
              className="group glass rounded-xl p-5 transition-all duration-300 hover:saheli-glow active:scale-[0.97] animate-fade-in"
              style={{ animationDelay: a.delay }}
            >
              <div
                className={`inline-flex items-center justify-center rounded-lg p-2.5 mb-4 bg-gradient-to-br ${a.gradient} transition-transform duration-300 group-hover:scale-105`}
              >
                <a.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </Link>
          ))}
        </div>

        {/* Status card */}
        <div
          className="glass rounded-xl p-6 animate-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <h2 className="font-display font-semibold text-lg mb-3">✨ Saheli says…</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            "Aaj ka din kuch khaas hone wala hai! Mujhse baat karo ya apna fit-check karwao — main hamesha yahan hoon tumhare liye. 💕"
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
