import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Loader2, Heart, Sparkles, Star, Flower } from 'lucide-react';
import { Task } from '../types';
import { useStreak } from '../hooks/useStreak';

const TASKS_STORAGE_KEY = 'saheli_local_tasks';

const BurstEffect = ({ x, y }: { x: number, y: number }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x, y, opacity: 1, scale: 0 }}
          animate={{ 
            x: x + (Math.random() - 0.5) * 150, 
            y: y + (Math.random() - 0.5) * 150, 
            opacity: 0, 
            scale: Math.random() * 1.2,
            rotate: Math.random() * 360
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute"
        >
          <Flower size={16} className="text-saheli-rose fill-saheli-pink/30" />
        </motion.div>
      ))}
    </div>
  );
};

export const TasksPage = () => {
  const { updateStreak } = useStreak();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [burst, setBurst] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
    setLoading(false);
  }, []);

  const saveTasks = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
  }, []);

  const addTask = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    setAdding(true);
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTask,
      completed: false,
      createdAt: Date.now(),
      user_id: 'local-user'
    };

    const updatedTasks = [task, ...tasks];
    saveTasks(updatedTasks);
    setNewTask('');
    setAdding(false);
  }, [newTask, tasks, saveTasks]);

  const toggleTask = useCallback((id: string, completed: boolean, e: React.MouseEvent) => {
    const newCompleted = !completed;
    const updatedTasks = tasks.map(t => 
      t.id === id ? { ...t, completed: newCompleted } : t
    );

    saveTasks(updatedTasks);
    
    if (newCompleted) {
      setBurst({ x: e.clientX, y: e.clientY });
      setTimeout(() => setBurst(null), 800);
      updateStreak();
    }
  }, [tasks, saveTasks, updateStreak]);

  const deleteTask = useCallback((id: string) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    saveTasks(updatedTasks);
  }, [tasks, saveTasks]);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {burst && <BurstEffect x={burst.x} y={burst.y} />}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saheli-pink/10 text-saheli-pink text-[10px] lg:text-xs font-bold uppercase tracking-widest border border-saheli-pink/20"
          >
            <Star size={10} className="lg:w-3 lg:h-3 fill-saheli-pink" />
            <span>Bestie's Focus</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-saheli-purple"
          >
            My Sweet <span className="text-saheli-pink">Tasks</span>
          </motion.h1>
          <p className="text-base lg:text-lg text-saheli-text-secondary font-medium">Let's make today wonderful together! ✨</p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-right glass p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] border-white/50 shadow-xl min-w-[120px] lg:min-w-[140px]"
        >
          <p className="text-4xl lg:text-5xl font-display font-black text-saheli-pink drop-shadow-sm">{tasks.filter(t => !t.completed).length}</p>
          <p className="text-[9px] lg:text-[10px] text-saheli-purple/40 uppercase tracking-[0.2em] font-bold mt-1">Left to do</p>
        </motion.div>
      </header>

      <form onSubmit={addTask} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-saheli-pink to-saheli-purple rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-20 transition duration-500" />
        <div className="relative">
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What's on your mind, bestie? 💜"
            disabled={adding}
            className="w-full bg-white/70 backdrop-blur-md rounded-[2.5rem] py-6 px-8 pr-20 focus:outline-none focus:ring-4 focus:ring-saheli-pink/10 transition-all text-lg placeholder:text-saheli-text-secondary/30 text-saheli-text-primary border border-white/50 disabled:opacity-50 shadow-lg"
          />
          <button 
            type="submit"
            disabled={adding || !newTask.trim()}
            className="absolute right-3 top-3 bottom-3 px-6 bg-gradient-to-br from-saheli-pink to-saheli-purple text-white rounded-[2rem] hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-saheli-pink/20"
          >
            {adding ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-32">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-saheli-pink/10 border-t-saheli-pink rounded-full"
            />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className={`group flex items-center gap-6 p-6 rounded-[2.5rem] border transition-all ${
                  task.completed 
                    ? 'bg-white/10 border-white/20 opacity-60' 
                    : 'glass border-white/50 hover:border-saheli-pink/30 hover:bg-white/40 shadow-lg'
                }`}
              >
                <motion.button 
                  whileHover={{ scale: 1.1, boxShadow: "0 0 15px rgba(255, 194, 209, 0.5)" }}
                  whileTap={{ scale: 0.9, y: 2 }}
                  onClick={(e) => toggleTask(task.id, task.completed, e)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.completed 
                      ? 'bg-saheli-pink border-saheli-pink shadow-md shadow-saheli-pink/30' 
                      : 'border-saheli-purple/20 hover:border-saheli-pink bg-white/50'
                  }`}
                >
                  {task.completed && <CheckCircle2 size={20} className="text-white" />}
                </motion.button>
                
                <span className={`flex-1 text-lg font-bold transition-all ${task.completed ? 'text-saheli-text-secondary/40 line-through' : 'text-saheli-text-primary'}`}>
                  {task.text}
                </span>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="p-3 text-saheli-purple/20 hover:text-red-400 hover:bg-red-50/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!loading && tasks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 space-y-6"
          >
            <div className="w-28 h-28 bg-white/40 rounded-[3rem] flex items-center justify-center mx-auto text-saheli-pink border border-white/50 shadow-inner">
              <Sparkles size={56} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-display font-bold text-saheli-text-primary">All Clear, Bestie! 💜</p>
              <p className="text-saheli-text-secondary/60 font-medium">Your focus list is empty. Ready for something new?</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

