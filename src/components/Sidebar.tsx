import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Camera, 
  MessageSquare, 
  User,
  Heart, 
  Menu, 
  X,
  Map,
  Sparkles,
  Smile
} from 'lucide-react';
import { motion } from 'motion/react';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  setActivePage: (p: Page) => void;
}

import { useUserMemory } from '../hooks/useUserMemory';

export const Sidebar = ({ activePage, setActivePage }: SidebarProps) => {
  const { memory } = useUserMemory();
  const [isOpen, setIsOpen] = useState(window.innerWidth > 1024);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'camera', label: 'Vibe Check', icon: Camera },
    { id: 'chat', label: 'Chat Bestie', icon: MessageSquare },
    { id: 'roadmap', label: 'My Journey', icon: Map },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-6 left-6 z-50 p-3 glass rounded-2xl shadow-lg border border-white/30 text-saheli-purple"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && window.innerWidth <= 1024 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <motion.aside 
        initial={false}
        animate={{ 
          width: window.innerWidth > 1024 ? (isOpen ? 300 : 100) : 300,
          x: window.innerWidth > 1024 ? 0 : (isOpen ? 0 : -300)
        }}
        className={`fixed left-0 top-0 h-screen bg-white/60 backdrop-blur-2xl border-r border-white/40 z-40 flex flex-col transition-all duration-500 ease-[0.23, 1, 0.32, 1] shadow-2xl ${window.innerWidth > 1024 && !isOpen && 'items-center'}`}
      >
        <div className="p-8 flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1, boxShadow: "0 0 20px rgba(255, 183, 197, 0.4)" }}
            transition={{ duration: 0.4 }}
            className="w-12 h-12 rounded-[1.5rem] bg-gradient-to-br from-saheli-pink via-saheli-rose to-saheli-deep-rose flex items-center justify-center shadow-lg shadow-saheli-pink/20"
          >
            <Heart className="text-white fill-white" size={24} />
          </motion.div>
          {(isOpen || window.innerWidth <= 1024) && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="font-display font-black text-2xl tracking-tight text-saheli-text-primary">
                Saheli
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-saheli-purple -mt-1">Best Friend</span>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 8, backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActivePage(item.id as Page);
                  if (window.innerWidth <= 1024) setIsOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative ${
                  isActive 
                    ? 'bg-saheli-pink/10 text-saheli-text-primary border border-saheli-pink/20 shadow-md' 
                    : 'text-saheli-text-secondary hover:text-saheli-text-primary'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-saheli-pink/20 text-saheli-pink shadow-sm' : 'group-hover:bg-white/20'}`}>
                  <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                </div>
                {(isOpen || window.innerWidth <= 1024) && <span className={`font-black tracking-tight text-base ${isActive ? 'text-saheli-text-primary' : ''}`}>{item.label}</span>}
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 w-1.5 h-8 bg-saheli-pink rounded-r-full shadow-sm shadow-saheli-pink/50"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-white/20">
          <div className={`flex items-center gap-3 p-3 rounded-[2rem] transition-all duration-300 ${(isOpen || window.innerWidth <= 1024) ? 'glass border border-white/40 shadow-md' : ''}`}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-saheli-pink/20 to-saheli-purple/20 border border-white/50 overflow-hidden shadow-sm">
              <img src="https://picsum.photos/seed/saheli-user/100/100" alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
            {(isOpen || window.innerWidth <= 1024) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-black truncate text-saheli-purple">{memory.name || 'Bestie'} 💜</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-saheli-pink animate-pulse" />
                  <p className="text-xs text-saheli-purple/40 font-black uppercase tracking-widest">Bestie Pro</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
};

