import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Sparkles, Dumbbell, BookOpen, Sun, Heart, AlertCircle, Loader2, User, Mic, MicOff, Volume2, VolumeX, Coffee, Moon, Star, Smile } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithSaheliStream, generateSaheliAudio, generateSaheliAudioStream } from '../lib/gemini';
import { useUserMemory } from '../hooks/useUserMemory';
import { Task } from '../types';
import { TASKS_STORAGE_KEY } from '../constants';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const QUICK_ACTIONS = [
  { id: 'routine', label: 'Din ki planning', icon: Coffee, prompt: 'Hmm... Saheli! Aaj ka din plan karne mein meri help karo na?' },
  { id: 'fitness', label: 'Thoda workout', icon: Dumbbell, prompt: 'Acha Saheli, aaj thoda move karne ka mann hai! Koi fun workout idea hai?' },
  { id: 'skincare', label: 'Glow up tips', icon: Sparkles, prompt: 'Waise aaj thoda self-care karna hai! Kuch ache glow-up tips batao?' },
  { id: 'vent', label: 'Bas baatein', icon: Heart, prompt: 'Umm... aaj ka din thoda lamba tha, bas tumse baatein karni hai 💜' },
];

export const ChatPage = () => {
  const { memory } = useUserMemory();
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      text: `Hmm... Waise aaj tum kaafi achhe lag rahe ho ${memory.name || ''} 🙈. Batao na, aaj ka din kaisa ja raha hai? ✨`,
      timestamp: Date.now()
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError(`Voice recognition error: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        setError("Speech recognition is not supported in this browser.");
        return;
      }
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const fallbackSpeak = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }
    console.log("Saheli: Falling back to browser TTS");
    const utterance = new SpeechSynthesisUtterance(text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, ''));
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang === 'hi-IN' && v.name.toLowerCase().includes('female')) || 
                       voices.find(v => v.lang === 'hi-IN') ||
                       voices[0];
    if (hindiVoice) utterance.voice = hindiVoice;
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const addWavHeader = useCallback((pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // RIFF type
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // format chunk identifier
    view.setUint32(12, 0x666d7420, false); // "fmt "
    // format chunk length
    view.setUint16(16, 16, true);
    // sample format (1 for PCM)
    view.setUint16(20, 1, true);
    // channel count (1 for mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false); // "data"
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    return new Blob([header, pcmData], { type: 'audio/wav' });
  }, []);

  const speak = useCallback(async (text: string, emotion: string = 'caring') => {
    if (!isTTSEnabled) return;
    
    return new Promise<void>(async (resolve) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Stop any currently playing speech synthesis
        window.speechSynthesis.cancel();

        await generateSaheliAudioStream(text, emotion, async (data, mimeType) => {
          // Convert base64 to ArrayBuffer
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          try {
            let bufferToDecode: ArrayBuffer;
            if (mimeType.includes('pcm')) {
              const rateMatch = mimeType.match(/rate=(\d+)/);
              const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
              const wavBlob = addWavHeader(bytes, sampleRate);
              bufferToDecode = await wavBlob.arrayBuffer();
            } else {
              bufferToDecode = bytes.buffer;
            }
            
            const audioBuffer = await audioContext.decodeAudioData(bufferToDecode);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            
            source.onended = () => {
              audioContext.close();
              resolve();
            };
            
            source.start(0);
          } catch (decodeError) {
            console.error("Audio stream decode error:", decodeError);
            fallbackSpeak(text);
            resolve();
          }
        });
      } catch (error) {
        console.error("Speech error:", error);
        fallbackSpeak(text);
        resolve();
      }
    });
  }, [isTTSEnabled, fallbackSpeak, addWavHeader]);

  useEffect(() => {
    const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    if (storedTasks) {
      try {
        setTasks(JSON.parse(storedTasks));
      } catch (e) {
        console.error("Error parsing tasks in chat:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const audioQueue = useRef<string[]>([]);
  const isSpeaking = useRef(false);

  const processAudioQueue = useCallback(async () => {
    if (isSpeaking.current || audioQueue.current.length === 0 || !isTTSEnabled) return;
    
    isSpeaking.current = true;
    const textToSpeak = audioQueue.current.shift()!;
    
    try {
      // Check again before speaking
      if (isTTSEnabled) {
        await speak(textToSpeak);
      }
    } catch (err) {
      console.error("Queue speak error:", err);
    } finally {
      isSpeaking.current = false;
      // Small delay between sentences for natural feel
      setTimeout(() => processAudioQueue(), 100);
    }
  }, [isTTSEnabled, speak]);

  useEffect(() => {
    if (isTTSEnabled && audioQueue.current.length > 0) {
      processAudioQueue();
    } else if (!isTTSEnabled) {
      // Clear queue if muted
      audioQueue.current = [];
      window.speechSynthesis.cancel();
    }
  }, [isTTSEnabled, processAudioQueue]);

  const queueSpeech = useCallback((text: string) => {
    if (!text.trim()) return;
    audioQueue.current.push(text);
    processAudioQueue();
  }, [processAudioQueue]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    const userMsg: Message = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setError(null);

    // Reset audio queue for new message
    audioQueue.current = [];
    isSpeaking.current = false;

    try {
      let saheliText = "";
      let saheliEmotion = "caring";
      let currentSentence = "";

      const result = await chatWithSaheliStream(text, memory, { tasks }, (chunk, emotion) => {
        saheliEmotion = emotion;
        saheliText += chunk;
        currentSentence += chunk;
        
        // Update the UI with the streaming text
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            return [...prev.slice(0, -1), { ...lastMsg, text: saheliText }];
          } else {
            return [...prev, { role: 'assistant', text: saheliText, timestamp: Date.now() }];
          }
        });

        // Trigger speech for complete sentences during streaming
        if (currentSentence.match(/[.!?\n]/) && currentSentence.trim().length > 5) {
          queueSpeech(currentSentence);
          currentSentence = "";
        }
      });

      // Speak any remaining text after stream ends
      if (currentSentence.trim()) {
        queueSpeech(currentSentence);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setError("Failed to connect to Saheli. Please check your connection or API key.");
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, memory, tasks, queueSpeech]);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] lg:h-[calc(100vh-10rem)] flex flex-col pb-4 lg:pb-6">
      <header className="mb-4 lg:mb-8 flex items-center justify-between px-4 lg:px-0">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-4xl font-display font-black tracking-tight flex items-center gap-3 text-saheli-purple">
            Saheli <Heart size={24} className="text-saheli-pink fill-saheli-pink animate-pulse lg:w-7 lg:h-7" />
          </h1>
          <p className="text-xs lg:text-base text-saheli-text-secondary font-medium">Your Personal Best Friend ✨</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            className={`p-2.5 lg:p-3 rounded-xl lg:rounded-2xl glass border transition-all shadow-sm ${isTTSEnabled ? 'text-saheli-pink border-saheli-pink/30' : 'text-slate-400 border-white/10'}`}
            title={isTTSEnabled ? "Mute Voice" : "Unmute Voice"}
          >
            {isTTSEnabled ? <Volume2 size={18} className="lg:w-5 lg:h-5" /> : <VolumeX size={18} className="lg:w-5 lg:h-5" />}
          </motion.button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6 lg:mb-8 overflow-x-auto pb-2 scrollbar-hide px-4 lg:px-0">
        {QUICK_ACTIONS.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ y: -4, scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSend(action.prompt)}
            disabled={isTyping}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 glass rounded-2xl text-xs font-bold hover:bg-white/40 transition-all border border-white/20 disabled:opacity-50 shadow-sm text-saheli-text-primary"
          >
            <div className="p-1.5 rounded-xl bg-saheli-pink/10 text-saheli-pink">
              <action.icon size={16} />
            </div>
            {action.label}
          </motion.button>
        ))}
      </div>

      {/* Chat Container */}
      <div 
        ref={scrollRef}
        className="flex-1 glass rounded-[2rem] lg:rounded-[3rem] p-4 lg:p-8 mb-4 lg:mb-8 overflow-y-auto space-y-6 lg:space-y-8 scrollbar-hide border border-white/20 shadow-xl relative group/chat"
      >
        <div className="absolute inset-0 bg-mesh opacity-5 pointer-events-none" />
        
        {/* Floating elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-10 right-10 animate-float">
            <Heart size={40} fill="currentColor" className="text-saheli-pink" />
          </div>
          <div className="absolute bottom-20 left-10 animate-float" style={{ animationDelay: '2s' }}>
            <Sparkles size={32} className="text-saheli-purple" />
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} relative z-10`}
            >
              <div className={`flex items-end gap-2 max-w-[90%] lg:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar/Icon */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-white/60 border border-white/40' 
                    : 'bg-gradient-to-br from-saheli-pink to-saheli-purple shadow-saheli-pink/20'
                }`}>
                  {msg.role === 'user' ? <User size={18} className="text-saheli-text-primary" /> : <Smile size={18} className="text-white" />}
                </div>

                <div className={`p-4 lg:p-6 rounded-[2rem] shadow-sm relative ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-saheli-pink to-saheli-purple text-white rounded-tr-none' 
                    : 'bg-white/70 border border-white/40 rounded-tl-none text-saheli-text-primary backdrop-blur-md'
                }`}>
                  <div className="markdown-content prose prose-sm lg:prose-base max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:font-bold prose-headings:text-saheli-text-primary prose-p:text-inherit">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              
              {/* Timestamp */}
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className={`text-[9px] uppercase tracking-widest font-bold mt-1.5 text-saheli-purple ${msg.role === 'user' ? 'mr-12' : 'ml-12'}`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </motion.span>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex justify-start relative z-10"
            >
              <div className="bg-white/60 backdrop-blur-md border border-white/40 p-5 rounded-[2rem] rounded-tl-none flex items-center gap-3 shadow-sm">
                <div className="flex gap-1.5">
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-saheli-pink rounded-full" 
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-saheli-purple rounded-full" 
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-saheli-peach rounded-full" 
                  />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-black text-saheli-pink/60">Saheli is thinking...</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center relative z-10"
            >
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold backdrop-blur-md">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
        className="relative group px-4 lg:px-0"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-saheli-pink via-saheli-peach to-saheli-purple rounded-[2.5rem] blur-lg opacity-10 group-focus-within:opacity-20 transition duration-500" />
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell Saheli anything... 💜"
            disabled={isTyping}
            className="w-full bg-white/70 backdrop-blur-md rounded-[2rem] lg:rounded-[2.5rem] py-4 lg:py-6 px-6 lg:px-10 pr-24 lg:pr-36 focus:outline-none focus:ring-2 focus:ring-saheli-pink/30 transition-all text-sm lg:text-lg placeholder:text-saheli-text-secondary/30 text-saheli-text-primary disabled:opacity-50 shadow-lg border border-white/30"
          />
          <div className="absolute right-2 lg:right-3 flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={toggleListening}
              disabled={isTyping}
              className={`p-2.5 lg:p-4 rounded-[1.2rem] lg:rounded-[1.5rem] transition-all flex items-center justify-center shadow-sm ${
                isListening 
                  ? 'bg-red-400 text-white animate-pulse shadow-red-400/30' 
                  : 'bg-white/10 text-saheli-purple/60 hover:bg-white/20'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 105, 180, 0.9)' }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2.5 lg:p-4 bg-saheli-pink text-white rounded-[1.2rem] lg:rounded-[1.5rem] hover:bg-saheli-pink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md shadow-saheli-pink/20"
            >
              {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </motion.button>
          </div>
        </div>
      </form>
    </div>
  );
};

