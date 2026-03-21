import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, TrendingUp, Zap, Calendar, CheckCircle2, User, Sparkles, Loader2, Target, ListTodo, Lightbulb, Flame, Sun, CloudSun, Moon, Coffee, Briefcase, MoonStar, MessageSquare, X, ChevronRight, ChevronLeft, Star, Heart, Music, Music2 } from 'lucide-react';
import { TASKS_STORAGE_KEY, DAILY_PLAN_STORAGE_KEY, DAILY_PLAN_DATE_KEY } from '../constants';
import { GlassCard } from '../components/GlassCard';
import { generateDailyPlan, generateNightReviewFeedback } from '../lib/gemini';
import { Task } from '../types';
import { useUserMemory } from '../hooks/useUserMemory';
import { useStreak } from '../hooks/useStreak';

interface DailyPlan {
  planSummary: string;
  tasks: string[];
  tips: string[];
  flow: {
    morning: string[];
    afternoon: string[];
    night: string[];
  };
}

interface NightReviewResult {
  feedback: string;
  nextDaySuggestions: string[];
  score: number;
}

export const Dashboard = () => {
  const { memory } = useUserMemory();
  const { streak } = useStreak();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Night Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStep, setReviewStep] = useState(1);
  const [reviewData, setReviewData] = useState({ completions: '', mood: '', improvements: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<NightReviewResult | null>(null);

  const goals = useMemo(() => memory.goals.length > 0 ? memory.goals : ['Stay productive', 'Learn something new', 'Exercise daily'], [memory.goals]);

  const fetchTasks = useCallback(() => {
    try {
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleGenerateDay = useCallback(async () => {
    setIsGenerating(true);
    try {
      const completed = tasks.filter(t => t.completed).map(t => t.text);
      const pending = tasks.filter(t => !t.completed).map(t => t.text);
      const plan = await generateDailyPlan(goals, completed, pending, memory);
      setDailyPlan(plan);
      localStorage.setItem(DAILY_PLAN_STORAGE_KEY, JSON.stringify(plan));
      localStorage.setItem(DAILY_PLAN_DATE_KEY, new Date().toDateString());
    } catch (err) {
      console.error('Error generating daily plan:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [tasks, goals, memory]);

  const handleSubmitReview = useCallback(async () => {
    setIsSubmittingReview(true);
    try {
      const result = await generateNightReviewFeedback(
        reviewData.completions,
        reviewData.mood,
        reviewData.improvements,
        memory
      );
      setReviewResult(result);
      setReviewStep(4);
    } catch (err) {
      console.error('Error submitting night review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  }, [reviewData, memory]);

  const resetReview = useCallback(() => {
    setIsReviewing(false);
    setReviewStep(1);
    setReviewData({ completions: '', mood: '', improvements: '' });
    setReviewResult(null);
  }, []);

  useEffect(() => {
    const savedPlan = localStorage.getItem(DAILY_PLAN_STORAGE_KEY);
    const savedDate = localStorage.getItem(DAILY_PLAN_DATE_KEY);
    if (savedPlan && savedDate === new Date().toDateString()) {
      setDailyPlan(JSON.parse(savedPlan));
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = useCallback(() => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  }, [isMusicPlaying]);

  const completedCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const progress = useMemo(() => tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0, [tasks.length, completedCount]);

  return (
    <div className="space-y-12 pb-20 relative">
      <div className="blob left-[-10%] top-[10%] animate-pulse-soft" />
      <div className="blob right-[-10%] bottom-[10%] animate-pulse-soft" style={{ background: 'radial-gradient(circle, rgba(226,209,249,0.2) 0%, transparent 70%)' }} />
      
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-black tracking-tight text-glow text-saheli-purple"
            >
              Hi {memory.name || 'Bestie'} <span className="text-saheli-pink animate-pulse">💜</span>
            </motion.h1>
            {streak.count > 0 && (
              <motion.div 
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-2xl bg-saheli-pink/20 border border-saheli-pink/40 text-saheli-pink shadow-glow-pink"
              >
                <Flame size={20} className="lg:w-6 lg:h-6 fill-current animate-pulse" />
                <span className="text-lg lg:text-xl font-black">{streak.count}</span>
              </motion.div>
            )}
          </div>
          <p className="text-lg lg:text-xl text-saheli-text-secondary font-medium">Your personal bestie is here to help you shine! ✨</p>
        </div>
        <div className="flex items-center gap-3 lg:gap-4">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5, boxShadow: "0 0 20px rgba(255, 183, 197, 0.4)" }}
            whileTap={{ scale: 0.9, y: 2 }}
            onClick={toggleMusic}
            className={`p-3 lg:p-4 rounded-full glass border transition-all ${isMusicPlaying ? 'text-saheli-pink border-saheli-pink/40 shadow-glow-pink' : 'text-slate-400 border-white/40'}`}
          >
            {isMusicPlaying ? <Music size={20} className="lg:w-6 lg:h-6" /> : <Music2 size={20} className="lg:w-6 lg:h-6" />}
          </motion.button>
          <motion.button
            whileHover={{ 
              scale: 1.05, 
              y: -4, 
              boxShadow: "0 20px 40px -10px rgba(255, 105, 180, 0.3)",
              transition: { type: "spring", stiffness: 400, damping: 10 } 
            }}
            whileTap={{ scale: 0.95, y: 2 }}
            onClick={handleGenerateDay}
            disabled={isGenerating}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 lg:px-8 py-3.5 lg:py-4 bg-gradient-to-br from-saheli-pink via-saheli-rose to-saheli-deep-rose rounded-[1.5rem] lg:rounded-[2rem] font-black text-white shadow-glow-pink hover:shadow-glow-rose transition-all disabled:opacity-50 disabled:scale-100 border-2 border-white/40"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Sparkles size={18} className="animate-float" />
            )}
            <span className="text-base lg:text-lg">Plan Our Day</span>
          </motion.button>
        </div>
      </header>

      {/* Daily AI Coach Section */}
      <AnimatePresence mode="wait">
        {dailyPlan ? (
          <div className="space-y-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <GlassCard title="Bestie's Focus" icon={Target} className="lg:col-span-1 glow-pink">
                <p className="text-xl text-saheli-purple font-display font-black mb-3">Our Main Goal 🌸</p>
                <p className="text-lg text-saheli-text-secondary leading-relaxed italic font-medium">
                  "{dailyPlan.planSummary}"
                </p>
              </GlassCard>

              <GlassCard title="Sweet Tasks" icon={ListTodo} className="lg:col-span-1 glow-lavender">
                <div className="space-y-3">
                  {dailyPlan.tasks.map((task, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1, type: "spring" }}
                      className="flex items-start gap-3 p-4 rounded-[1.5rem] bg-white/70 border border-white/60 hover:bg-white/90 transition-all shadow-sm group"
                    >
                      <div className="mt-1 w-5 h-5 rounded-full border-2 border-saheli-pink flex-shrink-0 shadow-glow-pink group-hover:scale-110 transition-transform" />
                      <span className="text-saheli-text-primary font-bold text-base">{task}</span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard title="Bestie's Tips" icon={Sparkles} className="lg:col-span-1 glow-pink">
                <div className="space-y-5">
                  <div className="p-5 rounded-[2rem] bg-saheli-pink/20 border border-saheli-pink/40 shadow-inner">
                    <p className="text-saheli-purple font-display font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Heart size={12} fill="currentColor" /> Bestie Insight
                    </p>
                    <p className="text-saheli-text-primary leading-relaxed font-bold text-base">{dailyPlan.tips[0]}</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] text-saheli-text-secondary uppercase tracking-widest font-black">Sweet Reminders</p>
                    {dailyPlan.tips.slice(1).map((tip, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-saheli-lavender mt-2 shadow-glow-lavender" />
                        <p className="text-sm text-saheli-text-secondary leading-relaxed font-medium">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Daily Flow System */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-1.5 bg-gradient-to-r from-saheli-pink to-transparent rounded-full" />
                <h2 className="text-3xl font-display font-black tracking-tight text-saheli-purple">Our Daily <span className="text-saheli-pink">Magic</span> ✨</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass p-8 rounded-[2.5rem] border border-white/60 relative overflow-hidden group hover:shadow-glow-pink transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12">
                    <Sun size={80} className="text-saheli-pink" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-saheli-pink/20 text-saheli-pink shadow-inner">
                      <Coffee size={24} />
                    </div>
                    <h3 className="text-xl font-display font-black text-saheli-purple">Morning Glow</h3>
                  </div>
                  <ul className="space-y-4">
                    {dailyPlan.flow.morning.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-saheli-text-primary font-bold text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-saheli-pink shadow-glow-pink" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass p-8 rounded-[2.5rem] border border-white/60 relative overflow-hidden group hover:shadow-glow-lavender transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12">
                    <CloudSun size={80} className="text-saheli-lavender" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-saheli-lavender/20 text-saheli-purple shadow-inner">
                      <Briefcase size={24} />
                    </div>
                    <h3 className="text-xl font-display font-black text-saheli-purple">Afternoon Vibes</h3>
                  </div>
                  <ul className="space-y-4">
                    {dailyPlan.flow.afternoon.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-saheli-text-primary font-bold text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-saheli-lavender shadow-glow-lavender" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass p-8 rounded-[2.5rem] border border-white/60 relative overflow-hidden group hover:shadow-glow-pink transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12">
                    <Moon size={80} className="text-saheli-purple" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-saheli-purple/20 text-saheli-purple shadow-inner">
                      <MoonStar size={24} />
                    </div>
                    <h3 className="text-xl font-display font-black text-saheli-purple">Night Cuddles</h3>
                  </div>
                  <ul className="space-y-4">
                    {dailyPlan.flow.night.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-saheli-text-primary font-bold text-base">
                        <div className="w-1.5 h-1.5 rounded-full bg-saheli-pink shadow-glow-pink" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsReviewing(true)}
                    className="mt-8 w-full py-4 rounded-[1.5rem] bg-saheli-pink/20 border-2 border-saheli-pink/40 text-saheli-purple font-black text-base flex items-center justify-center gap-3 hover:bg-saheli-pink/30 transition-all shadow-glow-pink"
                  >
                    <MessageSquare size={20} />
                    Sweet Night Review
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        ) : (
          !isGenerating && (
            <motion.div
              key="no-plan"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-24 glass rounded-[4rem] border-4 border-dashed border-saheli-pink/30 text-center group hover:border-saheli-pink/60 transition-all duration-700 relative z-10"
            >
              <div className="w-32 h-32 bg-saheli-pink/20 rounded-full flex items-center justify-center mx-auto mb-10 text-saheli-pink group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 shadow-glow-pink">
                <Sparkles size={64} />
              </div>
              <h3 className="text-4xl font-display font-black mb-6 tracking-tight text-saheli-purple">Ready for a magical day? 🌸</h3>
              <p className="text-xl text-saheli-text-secondary mb-12 max-w-xl mx-auto leading-relaxed font-medium">
                Click "Plan Our Day" and let's create a beautiful, productive, and happy day together, bestie! 💜
              </p>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Night Review Modal */}
      <AnimatePresence>
        {isReviewing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetReview}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(139,92,246,0.2)] overflow-hidden"
            >
              <div className="p-8 lg:p-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-saheli-pink/20 text-saheli-pink">
                      <MoonStar size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-black tracking-tight text-saheli-purple">Night Review</h2>
                      <p className="text-sm text-saheli-purple/40 font-bold uppercase tracking-widest">Step {reviewStep} of 3</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetReview}
                    className="p-3 rounded-2xl hover:bg-white/5 text-slate-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {reviewStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-2xl font-display font-bold text-saheli-purple">What did you complete today?</h3>
                      <p className="text-saheli-purple/60 font-medium">List your achievements, no matter how small.</p>
                      <textarea 
                        autoFocus
                        value={reviewData.completions}
                        onChange={(e) => setReviewData(prev => ({ ...prev, completions: e.target.value }))}
                        className="w-full h-40 glass rounded-3xl p-6 text-lg text-saheli-purple focus:outline-none focus:ring-4 focus:ring-saheli-pink/20 placeholder:text-saheli-purple/30"
                        placeholder="I finished the project proposal, went for a run..."
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setReviewStep(2)}
                          disabled={!reviewData.completions.trim()}
                          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-saheli-pink to-saheli-purple text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-saheli-pink/20"
                        >
                          Next <ChevronRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {reviewStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-2xl font-display font-bold text-saheli-purple">How was your mood today?</h3>
                      <p className="text-saheli-purple/60 font-medium">Be honest about your energy and emotional state.</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {['Energized', 'Productive', 'Tired', 'Stressed'].map((m) => (
                          <button 
                            key={m}
                            onClick={() => setReviewData(prev => ({ ...prev, mood: m }))}
                            className={`p-5 rounded-[1.5rem] border transition-all font-bold ${
                              reviewData.mood === m 
                                ? 'bg-saheli-pink/20 border-saheli-pink text-saheli-purple shadow-lg shadow-saheli-pink/20' 
                                : 'bg-white/20 border-white/40 text-saheli-purple/40 hover:bg-white/40'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="text"
                        value={reviewData.mood}
                        onChange={(e) => setReviewData(prev => ({ ...prev, mood: e.target.value }))}
                        className="w-full glass rounded-2xl p-6 text-lg text-saheli-purple focus:outline-none focus:ring-4 focus:ring-saheli-pink/20 placeholder:text-saheli-purple/30"
                        placeholder="Or describe it here..."
                      />
                      <div className="flex justify-between">
                        <button 
                          onClick={() => setReviewStep(1)}
                          className="flex items-center gap-2 px-8 py-4 text-saheli-purple/40 font-bold"
                        >
                          <ChevronLeft size={20} /> Back
                        </button>
                        <button 
                          onClick={() => setReviewStep(3)}
                          disabled={!reviewData.mood.trim()}
                          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-saheli-pink to-saheli-purple text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-saheli-pink/20"
                        >
                          Next <ChevronRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {reviewStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-2xl font-display font-bold text-saheli-purple">Any improvements for tomorrow?</h3>
                      <p className="text-saheli-purple/60 font-medium">What could have gone better? What will you change?</p>
                      <textarea 
                        autoFocus
                        value={reviewData.improvements}
                        onChange={(e) => setReviewData(prev => ({ ...prev, improvements: e.target.value }))}
                        className="w-full h-40 glass rounded-3xl p-6 text-lg text-saheli-purple focus:outline-none focus:ring-4 focus:ring-saheli-pink/20 placeholder:text-saheli-purple/30"
                        placeholder="Start earlier, take more breaks..."
                      />
                      <div className="flex justify-between">
                        <button 
                          onClick={() => setReviewStep(2)}
                          className="flex items-center gap-2 px-8 py-4 text-saheli-purple/40 font-bold"
                        >
                          <ChevronLeft size={20} /> Back
                        </button>
                        <button 
                          onClick={handleSubmitReview}
                          disabled={!reviewData.improvements.trim() || isSubmittingReview}
                          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-saheli-pink to-saheli-purple text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-saheli-pink/20"
                        >
                          {isSubmittingReview ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                          Complete Review
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {reviewStep === 4 && reviewResult && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-saheli-pink to-saheli-lavender">Saheli's Analysis</h3>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-saheli-pink/20 border border-saheli-pink/40 text-saheli-purple">
                          <Star size={18} fill="currentColor" />
                          <span className="font-black text-xl">{reviewResult.score}/10</span>
                        </div>
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-white/40 border border-white/60 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Sparkles size={100} className="text-saheli-pink" />
                        </div>
                        <p className="text-xl text-saheli-text-primary leading-relaxed italic font-bold relative z-10">
                          "{reviewResult.feedback}"
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm uppercase tracking-[0.3em] font-black text-slate-500">Tomorrow's Strategy</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {reviewResult.nextDaySuggestions.map((s, i) => (
                            <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                              <div className="w-8 h-8 rounded-xl bg-saheli-purple/10 text-saheli-purple flex items-center justify-center font-black">
                                {i + 1}
                              </div>
                              <p className="text-saheli-text-secondary font-bold">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={resetReview}
                        className="w-full py-5 bg-saheli-pink/20 hover:bg-saheli-pink/30 text-saheli-purple rounded-[2rem] font-black transition-all border border-saheli-pink/40 shadow-glow-pink"
                      >
                        Close Review
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard title="Recent Activity" icon={CheckSquare} className="lg:col-span-2">
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-saheli-pink opacity-50" size={40} />
              </div>
            ) : tasks.length > 0 ? (
              tasks.slice(0, 4).map((task, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 lg:gap-5 p-4 lg:p-5 rounded-[1.2rem] lg:rounded-[1.5rem] bg-white/20 border border-white/40 hover:bg-white/40 transition-all group"
                >
                  <div className={`w-6 h-6 lg:w-7 lg:h-7 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-saheli-pink border-saheli-pink shadow-glow-pink' : 'border-saheli-purple/30 group-hover:border-saheli-pink'}`}>
                    {task.completed && <CheckCircle2 size={14} className="lg:w-4 lg:h-4 text-white" />}
                  </div>
                  <span className={`text-base lg:text-lg font-bold transition-all ${task.completed ? 'text-saheli-purple/40 line-through' : 'text-saheli-text-primary'}`}>{task.text}</span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-500 space-y-4">
                <ListTodo size={48} className="mx-auto opacity-10" />
                <p className="text-lg">No recent tasks found.</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard title="Daily Progress" icon={TrendingUp} className="glow-blue">
          <div className="flex flex-col items-center justify-center h-full py-6">
            <div className="relative w-32 h-32 lg:w-40 lg:h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/[0.03] lg:hidden" />
                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/[0.03] hidden lg:block" />
                <motion.circle 
                  cx="80" cy="80" r="72" 
                  stroke="currentColor" strokeWidth="10" fill="transparent" 
                  strokeDasharray="452" 
                  initial={{ strokeDashoffset: 452 }}
                  animate={{ strokeDashoffset: 452 - (452 * progress) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-saheli-pink hidden lg:block" 
                />
                <motion.circle 
                  cx="64" cy="64" r="58" 
                  stroke="currentColor" strokeWidth="8" fill="transparent" 
                  strokeDasharray="364" 
                  initial={{ strokeDashoffset: 364 }}
                  animate={{ strokeDashoffset: 364 - (364 * progress) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-saheli-pink lg:hidden" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl lg:text-4xl font-display font-black text-saheli-text-primary">{progress}%</span>
                <span className="text-[10px] lg:text-xs uppercase tracking-[0.2em] text-saheli-text-secondary font-bold mt-1">Efficiency</span>
              </div>
            </div>
            <div className="mt-8 lg:mt-10 grid grid-cols-2 gap-6 lg:gap-8 w-full text-center">
              <div>
                <p className="text-2xl lg:text-3xl font-display font-bold text-saheli-text-primary">{tasks.length}</p>
                <p className="text-xs lg:text-sm text-saheli-text-secondary font-medium uppercase tracking-widest">Total</p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-display font-bold text-saheli-pink">{tasks.length - completedCount}</p>
                <p className="text-xs lg:text-sm text-saheli-text-secondary font-medium uppercase tracking-widest">Pending</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Goals Section */}
      <GlassCard title="Strategic Goals" icon={Target} className="glow-purple">
        <div className="flex flex-wrap gap-4">
          {goals.map((goal, i) => (
            <motion.div 
              key={i} 
              whileHover={{ scale: 1.05 }}
              className="px-6 py-3 rounded-2xl bg-white/20 border border-white/40 text-saheli-purple font-bold shadow-sm hover:bg-white/40 transition-all cursor-default"
            >
              {goal}
            </motion.div>
          ))}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-2xl border border-dashed border-saheli-purple/20 text-saheli-purple/40 font-bold hover:border-saheli-pink hover:text-saheli-pink transition-all flex items-center gap-2"
          >
            <span>+</span> Add New Goal
          </motion.button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Energy', value: 'High', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Meetings', value: '3 Today', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Habits', value: '80%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Focus', value: 'Deep', icon: User, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <GlassCard key={i} className="flex items-center gap-6 !p-6">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-xs text-saheli-purple/40 uppercase tracking-[0.2em] font-bold mb-1">{stat.label}</p>
              <p className="text-2xl font-display font-bold text-saheli-purple">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
