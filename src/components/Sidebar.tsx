import { Plus, MessageSquare, Trash2, Sun, Moon, Globe, LogOut, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { UserProfile } from "@/types/auth";
import { getI18n } from "@/lib/i18n";

interface Conversation {
  id: string;
  title: string;
}

interface SidebarProps {
  profile: UserProfile;
  isDarkMode: boolean;
  conversations: Conversation[];
  activeConvId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onThemeToggle: () => void;
  onLanguageChange: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  profile,
  isDarkMode,
  conversations,
  activeConvId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onThemeToggle,
  onLanguageChange,
  onLogout,
}: SidebarProps) {
  const i18n = getI18n(profile.language);

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 flex flex-col border-r transition-colors ${
      isDarkMode 
        ? "bg-slate-900 border-slate-800" 
        : "bg-slate-50 border-slate-200"
    }`}>
      {/* Top Section - Logo */}
      <div className="flex-shrink-0 p-4 border-b transition-colors" style={{
        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0'
      }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saheli-pink to-saheli-lavender flex items-center justify-center flex-shrink-0 shadow-lg">
            <Heart className="text-white" size={20} fill="white" />
          </div>
          <div>
            <h1 className={`font-display font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Saheli AIُ
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {profile.name || "Friend"}
            </p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="flex-shrink-0 p-4">
        <motion.button
          onClick={onNewChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            isDarkMode
              ? "bg-slate-800 hover:bg-slate-700 text-white"
              : "bg-slate-100 hover:bg-slate-200 text-slate-900"
          }`}
        >
          <Plus size={16} />
          {i18n.chat.newChat}
        </motion.button>
      </div>

      {/* Middle Section - Conversations (Scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 space-y-1.5" style={{
        scrollBehavior: 'smooth'
      }}>
        {conversations.length === 0 ? (
          <p className={`text-xs text-center mt-8 px-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {profile.language === "en" 
              ? "No chats yet. Start a new one! 💕"
              : "अभी कोई चैट नहीं। नया शुरू करो! 💕"}
          </p>
        ) : (
          conversations.map((conv) => (
            <motion.div
              key={conv.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate flex items-center gap-2 group transition-colors active:scale-[0.98] ${
                  conv.id === activeConvId
                    ? isDarkMode
                      ? "bg-gradient-to-r from-saheli-pink/30 to-saheli-lavender/30 text-white"
                      : "bg-gradient-to-r from-saheli-pink/20 to-saheli-lavender/20 text-slate-900"
                    : isDarkMode
                    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                    isDarkMode
                      ? "hover:bg-slate-700 hover:text-red-400 text-slate-500"
                      : "hover:bg-slate-200 hover:text-red-600 text-slate-400"
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Bottom Section - Controls */}
      <div className={`flex-shrink-0 p-3 border-t space-y-2 transition-colors ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {/* Controls Row 1: Theme & Language */}
        <div className="flex gap-2">
          <motion.button
            onClick={onThemeToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${
              isDarkMode
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>
          <motion.button
            onClick={onLanguageChange}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${
              isDarkMode
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title={profile.language === "en" ? "Switch to हिंदी" : "Switch to English"}
          >
            <Globe size={16} />
          </motion.button>
        </div>

        {/* Logout Button */}
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            isDarkMode
              ? "bg-slate-800 hover:bg-red-900/30 text-slate-200 hover:text-red-200"
              : "bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700"
          }`}
        >
          <LogOut size={14} />
          {i18n.auth.logout}
        </motion.button>
      </div>
    </aside>
  );
}
