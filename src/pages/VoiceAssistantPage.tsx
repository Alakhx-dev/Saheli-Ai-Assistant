import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { loadProfile } from "@/lib/auth";
import { sendChat, type ChatMsg } from "@/lib/saheli-api";
import { speak, stopSpeaking } from "@/utils/voice";
import PremiumHeader from "@/components/PremiumHeader";

interface Message {
  id: string;
  sender: "user" | "saheli";
  text: string;
  timestamp: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceAssistantPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(loadProfile());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastSpokenRef = useRef<string>("");

  const refreshProfile = () => {
    setProfile(loadProfile());
  };

  // Auto-speak AI messages when they appear (SAFE)
  useEffect(() => {
    if (!audioOn || !messages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const messageText = lastMessage.text || "";

    if (
      lastMessage?.sender === "saheli" &&
      messageText &&
      messageText !== lastSpokenRef.current
    ) {
      try {
        setIsSpeaking(true);
        speak(messageText)
          .then(() => setIsSpeaking(false))
          .catch((err) => {
            console.error("Voice error:", err);
            setIsSpeaking(false);
          });
        lastSpokenRef.current = messageText;
      } catch (err) {
        console.error("Voice error:", err);
        setIsSpeaking(false);
      }
    }
  }, [messages, audioOn]);

  useEffect(() => {
    if (!profile.isLoggedIn) {
      navigate("/login");
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = profile.language === "hi" ? "hi-IN" : "en-US";

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentTranscript(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [profile, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setCurrentTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopVoiceInput = async () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);

      if (currentTranscript.trim()) {
        await handleSendMessage(currentTranscript);
        setCurrentTranscript("");
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Get AI response
    try {
      const response = await sendChat([
        { role: "user", content: text }
      ]);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "saheli",
        text: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSpeaking(false);
    }
  };

  const toggleAudio = () => {
    const newAudioState = !audioOn;
    setAudioOn(newAudioState);
    if (!newAudioState) {
      stopSpeaking();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg overflow-hidden relative flex flex-col">
      <PremiumHeader profile={profile} onProfileUpdate={refreshProfile} />

      {/* Chat Messages */}
      <div className="flex-1 pt-20 pb-32 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Live Talk</h1>
            <p className="text-purple-200/70">Chat with your AI assistant using voice</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAudio}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  audioOn ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                {audioOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span className="text-sm font-medium">{audioOn ? "Audio On" : "Audio Off"}</span>
              </motion.button>
            </div>
          </motion.div>

          {messages.length === 0 && !isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Mic size={64} className="mx-auto text-purple-300 mb-4 opacity-50" />
              </motion.div>
              <p className="text-purple-200 text-lg">Press the mic button to start talking</p>
            </motion.div>
          )}

          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`chat-bubble max-w-xs lg:max-w-md ${
                      msg.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-60 mt-1.5">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </Card>
                </motion.div>
              ))}

              {currentTranscript && isListening && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <Card className="chat-bubble chat-bubble-ai max-w-xs lg:max-w-md">
                    <p className="text-sm italic opacity-70">{currentTranscript}</p>
                  </Card>
                </motion.div>
              )}

              {isSpeaking && (
                <motion.div
                  key="speaking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <Card className="chat-bubble chat-bubble-ai">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                          className="w-2 h-2 bg-green-400 rounded-full"
                        />
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Voice Input Controls */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center px-4 z-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 items-center"
        >
          {isListening ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopVoiceInput}
              className="relative w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 flex items-center justify-center shadow-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute w-28 h-28 rounded-full border-4 border-red-400"
              />
              <MicOff size={32} className="text-white relative z-10" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startVoiceInput}
              className="w-20 h-20 rounded-full saheli-btn flex items-center justify-center shadow-2xl"
            >
              <Mic size={32} className="text-white" />
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
