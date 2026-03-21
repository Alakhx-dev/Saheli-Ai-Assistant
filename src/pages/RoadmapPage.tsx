import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Sparkles, Loader2, ArrowRight, Target, Calendar, CheckCircle2, AlertCircle, Search, Heart, Star, Smile } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { generateRoadmap } from '../lib/gemini';
import { useUserMemory } from '../hooks/useUserMemory';

interface Roadmap {
  weeklyGoals: { week: number; goal: string }[];
  dayWisePlan: { day: number; task: string }[];
  actionSteps: string[];
  difficulty: number;
}

export const RoadmapPage = () => {
  const { memory } = useUserMemory();
  const [topic, setTopic] = useState('');
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateRoadmap(topic, memory);
      setRoadmap(result);
    } catch (err) {
      console.error("Roadmap generation error:", err);
      setError("Failed to generate roadmap. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col pb-12">
      <header className="mb-12 px-2 lg:px-0">
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saheli-pink/10 text-saheli-pink text-xs font-bold uppercase tracking-widest border border-saheli-pink/20"
          >
            <Map size={12} className="fill-saheli-pink" />
            <span>Bestie Roadmap</span>
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight flex items-center gap-4 text-saheli-purple">
            My Journey <span className="text-saheli-pink">Map</span>
            <Sparkles className="text-saheli-pink animate-pulse" size={28} />
          </h1>
          <p className="text-base lg:text-lg text-saheli-text-secondary font-medium">Let's plan your path to success, step by step! 💜</p>
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:gap-12">
        {/* Input Section */}
        <div className="max-w-3xl">
          <form onSubmit={handleGenerate} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-saheli-pink to-saheli-purple rounded-[2rem] lg:rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-20 transition duration-500" />
            <div className="relative flex items-center">
              <div className="absolute left-5 lg:left-6 text-saheli-purple/30">
                <Search size={20} className="lg:w-6 lg:h-6" />
              </div>
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want to learn today, bestie? ✨"
                className="w-full bg-white/70 backdrop-blur-md border border-white/50 rounded-[2rem] lg:rounded-[2.5rem] py-4 lg:py-6 pl-12 lg:pl-16 pr-12 md:pr-44 focus:outline-none focus:ring-4 focus:ring-saheli-pink/10 transition-all text-base lg:text-xl placeholder:text-saheli-text-secondary/30 text-saheli-text-primary shadow-lg"
              />
              <button 
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="absolute right-2 lg:right-3 px-4 md:px-8 py-2.5 md:py-4 rounded-xl lg:rounded-2xl bg-gradient-to-br from-saheli-pink to-saheli-purple text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-saheli-pink/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                <span className="hidden md:inline text-sm lg:text-base">{isGenerating ? 'Planning...' : 'Plan it!'}</span>
              </button>
            </div>
          </form>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20 text-red-400 flex items-center gap-4"
          >
            <AlertCircle size={24} />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {roadmap ? (
            <motion.div 
              key="roadmap-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Weekly Overview */}
              <div className="lg:col-span-1 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-2xl bg-saheli-pink/10 text-saheli-pink shadow-sm">
                    <Calendar size={20} />
                  </div>
                  <h2 className="text-xl font-display font-black uppercase tracking-widest text-saheli-text-primary">Weekly Goals</h2>
                </div>
                <div className="space-y-4">
                  {roadmap.weeklyGoals.map((wg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass p-6 rounded-[2rem] border border-white/50 relative overflow-hidden group hover:bg-white/40 transition-all"
                    >
                      <div className="absolute top-0 right-0 p-4 text-4xl font-display font-black text-saheli-pink/5 group-hover:text-saheli-pink/10 transition-colors">
                        0{wg.week}
                      </div>
                      <p className="text-xs font-black text-saheli-pink uppercase tracking-[0.3em] mb-2">Week {wg.week}</p>
                      <p className="text-saheli-text-primary font-bold leading-relaxed">{wg.goal}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/50 bg-gradient-to-br from-saheli-pink/5 to-transparent shadow-lg">
                  <h3 className="text-xs font-black uppercase tracking-widest text-saheli-text-secondary/60 mb-4">Bestie Difficulty</h3>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-display font-black text-saheli-text-primary">{roadmap.difficulty}</span>
                    <span className="text-xl font-bold text-saheli-text-secondary/20 mb-1">/10</span>
                  </div>
                  <div className="h-2.5 bg-white/30 rounded-full overflow-hidden border border-white/50 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${roadmap.difficulty * 10}%` }}
                      className="h-full bg-gradient-to-r from-saheli-pink to-saheli-purple shadow-sm shadow-saheli-pink/30"
                    />
                  </div>
                </div>
              </div>

              {/* Middle Column: Day-wise Plan */}
              <div className="lg:col-span-1 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-2xl bg-saheli-purple/10 text-saheli-purple shadow-sm">
                    <Target size={20} />
                  </div>
                  <h2 className="text-xl font-display font-black uppercase tracking-widest text-saheli-text-primary">7-Day Sprint</h2>
                </div>
                <div className="space-y-3">
                  {roadmap.dayWisePlan.map((dp, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/20 border border-white/50 hover:bg-white/40 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-saheli-purple/10 text-saheli-purple flex items-center justify-center font-display font-black text-lg group-hover:scale-110 transition-transform shadow-sm">
                        {dp.day}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-saheli-text-secondary/40 uppercase tracking-widest mb-0.5">Day {dp.day}</p>
                        <p className="text-sm text-saheli-text-primary font-bold">{dp.task}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right Column: Action Steps */}
              <div className="lg:col-span-1 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-2xl bg-saheli-peach/10 text-saheli-peach shadow-sm">
                    <Smile size={20} />
                  </div>
                  <h2 className="text-xl font-display font-black uppercase tracking-widest text-saheli-text-primary">Action Steps</h2>
                </div>
                <div className="space-y-4">
                  {roadmap.actionSteps.map((step, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-4 p-6 rounded-[2rem] glass border border-white/50 hover:border-saheli-pink/30 transition-all shadow-md"
                    >
                      <div className="mt-1 p-1 rounded-full bg-saheli-pink/20 text-saheli-pink shadow-sm">
                        <CheckCircle2 size={16} />
                      </div>
                      <p className="text-saheli-text-primary font-bold leading-relaxed">{step}</p>
                    </motion.div>
                  ))}
                </div>

                <GlassCard className="!p-8 border border-white/50 mt-8 !rounded-[2.5rem] shadow-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-saheli-pink/10 flex items-center justify-center text-saheli-pink shadow-inner">
                      <ArrowRight size={20} />
                    </div>
                    <h4 className="font-black text-saheli-text-primary">Next Steps</h4>
                  </div>
                  <p className="text-sm text-saheli-text-secondary font-medium leading-relaxed">
                    This roadmap is synced with your Bestie Profile. You can add these tasks to your dashboard to start your journey today! 💜
                  </p>
                </GlassCard>
              </div>
            </motion.div>
          ) : !isGenerating && (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-32 h-32 rounded-[3rem] bg-white/40 border border-white/50 flex items-center justify-center text-saheli-purple/10 mb-8 shadow-inner">
                <Map size={56} className="opacity-20 animate-pulse" />
              </div>
              <h2 className="text-2xl font-display font-black text-saheli-text-primary mb-4">Where to next, bestie?</h2>
              <p className="text-saheli-text-secondary/60 max-w-md mx-auto font-bold">
                Enter a goal or skill above to generate a sweet roadmap tailored just for you! ✨
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

