import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, AlertCircle, Sparkles, CheckCircle2, Loader2, Scan, Star, Shirt, Scissors, Heart, Smile, Zap } from 'lucide-react';
import { analyzeStyle } from '../lib/gemini';
import { GlassCard } from '../components/GlassCard';
import { useUserMemory } from '../hooks/useUserMemory';

interface AnalysisResult {
  analysis: string;
  score: number;
  tips: string[];
  badges: {
    goodOutfit: boolean;
    needsImprovement: boolean;
    lowLighting: boolean;
  };
  patterns: {
    colorContrast: string;
    brightness: string;
    faceVisibility: string;
  };
}

const SCAN_INTERVAL = 5; // 5 seconds

export const CameraPage = () => {
  const { memory } = useUserMemory();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(SCAN_INTERVAL);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please ensure you have granted permission.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    setIsAnalyzing(true);
    setError(null);
    setCountdown(SCAN_INTERVAL);

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        const analysis = await analyzeStyle(imageData, memory);
        if (analysis) {
          setResult(analysis);
          setAnalysisCount(prev => prev + 1);
        }
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError("Style analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isCameraReady, memory]);

  useEffect(() => {
    if (!isCameraReady || isAnalyzing) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          captureAndAnalyze();
          return SCAN_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [captureAndAnalyze, isCameraReady, isAnalyzing]);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col pb-8">
      <header className="mb-8 lg:mb-10 px-4 lg:px-0">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-display font-black tracking-tight flex items-center gap-3 text-saheli-purple">
            Saheli <span className="text-saheli-pink">Vision</span>
            <Scan className="text-saheli-pink animate-pulse" size={28} />
          </h1>
          <p className="text-sm lg:text-base text-saheli-text-secondary font-medium">Real-time bestie feedback on your look! ✨</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-10 min-h-0">
        {/* Camera Feed */}
        <div className="flex-1 relative group">
          <motion.div 
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(255, 183, 197, 0.2)",
                "0 0 40px rgba(255, 183, 197, 0.4)",
                "0 0 20px rgba(255, 183, 197, 0.2)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-2 bg-gradient-to-r from-saheli-pink/20 via-saheli-rose/20 to-saheli-purple/20 rounded-[3.5rem] blur-2xl opacity-50 pointer-events-none" 
          />
          <div className="relative h-full glass rounded-[3rem] overflow-hidden border-2 border-white/50 aspect-video lg:aspect-auto min-h-[400px] shadow-2xl">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-white/80 backdrop-blur-xl">
                <div className="p-6 rounded-3xl bg-red-500/10 text-red-500 mb-6 shadow-sm">
                  <AlertCircle size={64} />
                </div>
                <h3 className="text-2xl font-bold text-saheli-text-primary mb-2">Camera Access Required</h3>
                <p className="text-saheli-text-secondary mb-8 max-w-sm leading-relaxed">{error}</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startCamera}
                  className="px-10 py-4 bg-saheli-pink rounded-2xl text-white font-bold hover:bg-saheli-pink/80 transition-all shadow-md shadow-saheli-pink/20"
                >
                  Retry Connection
                </motion.button>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  onLoadedMetadata={() => setIsCameraReady(true)}
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="glass px-5 py-2.5 rounded-2xl flex items-center gap-3 border border-white/40 shadow-md backdrop-blur-md"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${isAnalyzing ? 'bg-saheli-pink animate-pulse' : 'bg-green-400'}`} />
                      <span className="text-xs font-bold uppercase tracking-widest text-saheli-text-primary">
                        {isAnalyzing ? 'Analyzing...' : 'Live Look'}
                      </span>
                    </motion.div>
                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="glass px-6 py-3 rounded-2xl border border-white/40 shadow-md backdrop-blur-md"
                    >
                      <span className="text-xs font-bold text-saheli-text-primary uppercase tracking-widest">
                        SCANS: {analysisCount.toString().padStart(3, '0')}
                      </span>
                    </motion.div>
                  </div>

                  {/* Scanning Line Animation */}
                  <AnimatePresence>
                    {isAnalyzing && (
                      <motion.div 
                        initial={{ top: '0%' }}
                        animate={{ top: '100%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-saheli-pink to-transparent shadow-[0_0_20px_rgba(255,105,180,0.6)] z-10"
                      />
                    )}
                  </AnimatePresence>

                  {/* Corner Accents - Cute Hearts */}
                  <div className="absolute top-8 left-8 text-saheli-pink/30">
                    <Heart size={32} />
                  </div>
                  <div className="absolute top-8 right-8 text-saheli-pink/30">
                    <Heart size={32} />
                  </div>
                  <div className="absolute bottom-8 left-8 text-saheli-pink/30">
                    <Heart size={32} />
                  </div>
                  <div className="absolute bottom-8 right-8 text-saheli-pink/30">
                    <Heart size={32} />
                  </div>
                  
                  {/* Center Reticle - Soft Circle */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-64 h-64 border-2 border-dashed border-saheli-purple rounded-full flex items-center justify-center animate-spin-slow">
                      <div className="w-32 h-32 border-2 border-dashed border-saheli-pink rounded-full" />
                    </div>
                  </div>

                  {/* Rosy Dreamy Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-saheli-pink/10 to-transparent pointer-events-none" />
                  <motion.div 
                    animate={{ opacity: [0.05, 0.15, 0.05] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-saheli-rose/5 pointer-events-none" 
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Feedback Panel */}
        <div className="w-full lg:w-[420px] flex flex-col gap-6 px-4 lg:px-0">
          <GlassCard className="flex-1 flex flex-col border border-white/30 p-6 lg:p-8 overflow-y-auto scrollbar-hide shadow-xl relative">
            <div className="absolute inset-0 bg-mesh opacity-5 pointer-events-none" />
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="p-3 rounded-2xl bg-saheli-pink/10 text-saheli-pink shadow-sm">
                <Smile size={24} />
              </div>
              <div>
                <h2 className="font-display font-black text-2xl tracking-tight text-saheli-text-primary">Saheli's Feedback</h2>
                <p className="text-xs text-saheli-text-secondary/60 font-bold uppercase tracking-widest">Style & Vibe Check</p>
              </div>
            </div>

            <div className="space-y-8 flex-1 relative z-10">
              {/* Score Display */}
              <div className="text-center py-6 relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-saheli-pink/10 via-saheli-pink/5 to-transparent rounded-[3rem] -z-10 blur-xl opacity-50" />
                
                {/* Badges */}
                {result && (
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                    {result.badges.goodOutfit && (
                      <motion.span 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold uppercase tracking-widest border border-emerald-200"
                      >
                        Looking Fab! ✨
                      </motion.span>
                    )}
                    {result.badges.needsImprovement && (
                      <motion.span 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold uppercase tracking-widest border border-amber-200"
                      >
                        Quick Fix Needed 🎀
                      </motion.span>
                    )}
                    {result.badges.lowLighting && (
                      <motion.span 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest border border-blue-200"
                      >
                        Dim Vibes 🌙
                      </motion.span>
                    )}
                  </div>
                )}

                <motion.div 
                  key={result?.score}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="inline-block relative"
                >
                  <span className="text-7xl lg:text-8xl font-display font-black text-saheli-text-primary drop-shadow-sm">
                    {result?.score || 0}
                  </span>
                  <span className="text-xl lg:text-2xl font-black text-saheli-pink absolute -top-1 -right-8">/10</span>
                </motion.div>
                <p className="text-xs text-saheli-text-secondary/60 font-bold uppercase tracking-widest mt-4">Saheli Style Score</p>
              </div>

              <div className="space-y-6">
                {/* Patterns Section */}
                {result && (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-white/40 shadow-sm">
                      <span className="text-xs font-bold text-saheli-text-secondary uppercase tracking-widest">Colors</span>
                      <span className="text-sm text-saheli-text-primary font-bold">{result.patterns.colorContrast}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-white/40 shadow-sm">
                      <span className="text-xs font-bold text-saheli-text-secondary uppercase tracking-widest">Light</span>
                      <span className="text-sm text-saheli-text-primary font-bold">{result.patterns.brightness}</span>
                    </div>
                  </div>
                )}

                <FeedbackItem 
                  label="Saheli's Analysis" 
                  icon={Shirt}
                  analysis={result?.analysis}
                  tips={result?.tips}
                  isLoading={isAnalyzing} 
                  delay={0.1}
                  color="text-saheli-pink"
                />
              </div>

              {!result && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-saheli-purple/30">
                    <Camera size={28} className="opacity-40" />
                  </div>
                  <p className="text-saheli-text-secondary/60 text-sm font-medium leading-relaxed">Show Saheli your outfit for a vibe check! 💜</p>
                </motion.div>
              )}
            </div>

            {/* Next Scan Progress */}
            <div className="mt-8 pt-6 border-t border-white/20 relative z-10">
              <div className="flex items-center justify-between text-xs text-saheli-text-secondary/60 font-bold uppercase tracking-widest mb-3">
                <span className="flex items-center gap-2">
                  <Loader2 size={12} className={!isAnalyzing ? 'animate-spin' : ''} />
                  Bestie Refresh
                </span>
                <span className="font-bold text-saheli-pink">{isAnalyzing ? 'BUSY' : `${countdown}s`}</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden border border-white/30">
                <motion.div 
                  initial={false}
                  animate={{ width: `${(countdown / SCAN_INTERVAL) * 100}%` }}
                  className="h-full bg-gradient-to-r from-saheli-pink to-saheli-purple shadow-sm"
                />
              </div>
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={captureAndAnalyze}
              disabled={isAnalyzing || !isCameraReady}
              className="glass p-5 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-white/40 transition-all group border border-white/30 disabled:opacity-50 shadow-md"
            >
              <div className="p-2.5 rounded-xl bg-saheli-pink/10 text-saheli-pink group-hover:scale-110 transition-all">
                <RefreshCw size={20} className={isAnalyzing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-saheli-text-primary">Quick Scan</span>
            </motion.button>
            <motion.button 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass p-5 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-white/40 transition-all group border border-white/30 shadow-md"
            >
              <div className="p-2.5 rounded-xl bg-saheli-peach/10 text-saheli-peach group-hover:scale-110 transition-all">
                <Zap size={20} className="group-hover:animate-pulse" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-saheli-text-primary">Bestie Tips</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedbackItem = ({ label, icon: Icon, analysis, tips, isLoading, delay, color }: { label: string, icon: any, analysis?: string, tips?: string[], isLoading: boolean, delay: number, color: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="space-y-3"
  >
    <div className={`flex items-center gap-2 ${color}`}>
      <div className="p-1.5 rounded-lg bg-current/10">
        <Icon size={16} />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      {analysis && !isLoading && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto"
        >
          <div className="p-1 rounded-full bg-saheli-pink/20 text-saheli-pink">
            <CheckCircle2 size={14} />
          </div>
        </motion.div>
      )}
    </div>
    <div className="min-h-[4rem] flex flex-col bg-white/40 p-5 rounded-3xl border border-white/40 shadow-inner backdrop-blur-sm">
      {isLoading ? (
        <div className="w-full space-y-2">
          <div className="h-3 bg-saheli-pink/10 rounded-full animate-pulse w-full" />
          <div className="h-3 bg-saheli-pink/10 rounded-full animate-pulse w-3/4" />
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          <p className="text-sm text-saheli-text-primary leading-relaxed font-bold italic">
            "{analysis}"
          </p>
          <div className="space-y-2">
            {tips?.map((tip, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + (i * 0.1) }}
                className="flex items-start gap-2 text-xs text-saheli-text-secondary group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-saheli-pink mt-1.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
                <span className="leading-relaxed">{tip}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full opacity-20">
          <p className="text-xs font-bold uppercase tracking-widest italic text-saheli-purple">Waiting for your look... 💜</p>
        </div>
      )}
    </div>
  </motion.div>
);

