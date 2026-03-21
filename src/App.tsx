import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { Page } from './types';
import { Sidebar } from './components/Sidebar';
import { BackgroundEffects } from './components/BackgroundEffects';
import { Dashboard } from './pages/Dashboard';
import { TasksPage } from './pages/TasksPage';
import { CameraPage } from './pages/CameraPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoadmapPage } from './pages/RoadmapPage';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading for effect
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const renderPage = () => {
    switch(activePage) {
      case 'dashboard': return <Dashboard />;
      case 'tasks': return <TasksPage />;
      case 'camera': return <CameraPage />;
      case 'chat': return <ChatPage />;
      case 'profile': return <ProfilePage />;
      case 'roadmap': return <RoadmapPage />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff0f3] flex flex-col items-center justify-center relative overflow-hidden">
        <BackgroundEffects />
        <div className="absolute inset-0 bg-mesh opacity-10 pointer-events-none" />
        <div className="fixed top-[-20%] left-[-20%] w-[60%] h-[60%] bg-saheli-pink/20 blur-[150px] rounded-full pointer-events-none animate-pulse" />
        <div className="fixed bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-saheli-purple/20 blur-[150px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-saheli-pink via-saheli-rose to-saheli-deep-rose flex items-center justify-center shadow-xl shadow-saheli-pink/20 mb-8 animate-bounce">
            <Heart className="text-white fill-white" size={48} />
          </div>
          <h2 className="text-2xl font-display font-black tracking-widest text-saheli-text-primary uppercase">Saheli is waking up...</h2>
          <div className="mt-6 flex gap-2">
            <div className="w-2 h-2 bg-saheli-pink rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-saheli-purple rounded-full animate-bounce shadow-sm" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-saheli-peach rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-saheli-text-primary bg-mesh selection:bg-saheli-pink/30 relative overflow-x-hidden">
      <BackgroundEffects />
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-saheli-pink/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-saheli-purple/10 blur-[150px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <main className="flex-1 lg:ml-[300px] p-6 lg:p-10 transition-all duration-500 max-w-[1800px] mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.23, 1, 0.32, 1] 
            }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

