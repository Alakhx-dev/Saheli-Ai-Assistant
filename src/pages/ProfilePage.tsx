import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Target, Heart, Plus, X, Sparkles, ShieldCheck, Smile, Star, Coffee } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { useUserMemory } from '../hooks/useUserMemory';

export const ProfilePage = () => {
  const { memory, setName, addGoal, removeGoal, addPreference, removePreference } = useUserMemory();
  const [newGoal, setNewGoal] = useState('');
  const [newPref, setNewPref] = useState('');
  const [tempName, setTempName] = useState(memory.name || '');

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setName(tempName.trim());
    }
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.trim()) {
      addGoal(newGoal.trim());
      setNewGoal('');
    }
  };

  const handleAddPref = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPref.trim()) {
      addPreference(newPref.trim());
      setNewPref('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-12">
      <header className="mb-12 px-2 lg:px-0">
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saheli-pink/10 text-saheli-pink text-xs font-bold uppercase tracking-widest border border-saheli-pink/20"
          >
            <Smile size={12} className="fill-saheli-pink" />
            <span>Bestie Profile</span>
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight flex items-center gap-4 text-saheli-purple">
            About <span className="text-saheli-pink">Me</span>
            <Heart className="text-saheli-pink animate-pulse fill-saheli-pink" size={28} />
          </h1>
          <p className="text-base lg:text-lg text-saheli-purple/60 font-medium">Tell Saheli more about yourself so she can be the best bestie ever! 💜</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {/* Name Section */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 lg:p-3 rounded-2xl bg-saheli-pink/10 text-saheli-pink shadow-md">
              <User size={20} className="lg:w-6 lg:h-6" />
            </div>
            <h2 className="text-xl lg:text-2xl font-display font-black tracking-tight text-saheli-purple">My Name</h2>
          </div>
          <form onSubmit={handleUpdateName} className="relative group max-w-md">
            <div className="absolute -inset-1 bg-gradient-to-r from-saheli-pink to-saheli-purple rounded-[1.5rem] lg:rounded-[2rem] blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            <input 
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="What should I call you? 💜"
              className="w-full glass border border-white/50 rounded-[1.5rem] lg:rounded-[2rem] py-4 lg:py-5 px-6 lg:px-8 focus:outline-none focus:ring-4 focus:ring-saheli-pink/10 transition-all text-base lg:text-lg placeholder:text-saheli-purple/30 text-saheli-purple"
            />
            <button 
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl bg-saheli-pink text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-saheli-pink/20 text-xs lg:text-sm"
            >
              Save
            </button>
          </form>
        </div>

        {/* Goals Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-saheli-pink/10 text-saheli-pink shadow-md">
              <Target size={24} />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight text-saheli-purple">My Big Dreams</h2>
          </div>

          <form onSubmit={handleAddGoal} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-saheli-pink to-saheli-purple rounded-[2rem] blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            <input 
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="What's your next big goal? 🌟"
              className="w-full glass border border-white/50 rounded-[2rem] py-5 px-8 focus:outline-none focus:ring-4 focus:ring-saheli-pink/10 transition-all text-lg placeholder:text-saheli-purple/30 text-saheli-purple"
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-saheli-pink text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-saheli-pink/20"
            >
              <Plus size={20} />
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {memory.goals.map((goal, i) => (
                <motion.div 
                  key={goal}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-5 py-2.5 rounded-2xl bg-white/40 border border-white/50 text-saheli-purple font-bold shadow-sm flex items-center gap-3 group hover:border-saheli-pink/30 transition-all"
                >
                  <Star size={14} className="text-saheli-pink fill-saheli-pink opacity-50" />
                  {goal}
                  <button 
                    onClick={() => removeGoal(goal)}
                    className="p-1 rounded-full hover:bg-red-500/20 text-saheli-purple/30 hover:text-red-400 transition-all"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {memory.goals.length === 0 && (
              <p className="text-saheli-purple/40 italic font-medium py-4 px-2">No dreams added yet. Let's dream big! ✨</p>
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-saheli-purple/10 text-saheli-purple shadow-md">
              <Heart size={24} />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight text-saheli-purple">My Favorites</h2>
          </div>

          <form onSubmit={handleAddPref} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-saheli-purple to-saheli-peach rounded-[2rem] blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            <input 
              type="text"
              value={newPref}
              onChange={(e) => setNewPref(e.target.value)}
              placeholder="What do you love? (e.g., Coffee, Pink)..."
              className="w-full glass border border-white/50 rounded-[2rem] py-5 px-8 focus:outline-none focus:ring-4 focus:ring-saheli-purple/10 transition-all text-lg placeholder:text-saheli-purple/30 text-saheli-purple"
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-saheli-purple text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-saheli-purple/20"
            >
              <Plus size={20} />
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {memory.preferences.map((pref, i) => (
                <motion.div 
                  key={pref}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-5 py-2.5 rounded-2xl bg-white/40 border border-white/50 text-saheli-purple font-bold shadow-sm flex items-center gap-3 group hover:border-saheli-purple/30 transition-all"
                >
                  <Coffee size={14} className="text-saheli-purple/40" />
                  {pref}
                  <button 
                    onClick={() => removePreference(pref)}
                    className="p-1 rounded-full hover:bg-red-500/20 text-saheli-purple/30 hover:text-red-400 transition-all"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {memory.preferences.length === 0 && (
              <p className="text-saheli-purple/40 italic font-medium py-4 px-2">Tell Saheli what you like! 💜</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 lg:mt-16">
        <GlassCard className="!p-6 lg:!p-10 border border-white/50 shadow-xl !rounded-[2rem] lg:!rounded-[3rem]">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-10">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-[2rem] lg:rounded-[2.5rem] bg-gradient-to-br from-saheli-pink/20 to-saheli-purple/20 flex items-center justify-center text-saheli-pink shadow-inner">
              <Sparkles size={40} className="lg:w-12 lg:h-12 animate-pulse" />
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h3 className="text-2xl lg:text-3xl font-display font-black mb-2 lg:mb-3 text-saheli-purple">Bestie Sync Active</h3>
              <p className="text-base lg:text-lg text-saheli-purple/60 leading-relaxed max-w-2xl font-medium">
                Saheli uses your dreams and favorites to be the perfect best friend. 
                Everything she says and does is tailored just for you, making every day special! ✨
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:gap-3 w-full lg:w-auto">
              <div className="px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl bg-white/40 border border-white/50 text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-saheli-purple/40 shadow-sm text-center lg:text-left">
                Memory Status: <span className="text-saheli-pink">Sweetly Synced</span>
              </div>
              <div className="px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl bg-white/40 border border-white/50 text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-saheli-purple/40 shadow-sm text-center lg:text-left">
                Bestie Sync: <span className="text-saheli-purple">Always On</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

