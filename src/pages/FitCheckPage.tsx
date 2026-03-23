import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, Camera, RotateCcw, Send, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadProfile } from "@/lib/auth";
import { addFitCheckRecord, getFitCheckHistory } from "@/lib/local-storage";
import { speakText, stopSpeaking } from "@/lib/saheli-api";
import FloatingElements from "@/components/FloatingElements";

// Simulated fit check responses
const FIT_CHECK_RESPONSES = [
  "Outfit acha hai 👍 but color contrast improve karo. Darker shade ke sath better lagega!",
  "Aaah sweet! 💜 Ye colors suit kar rahe ho. Ek suggestion - accessories add karo poori look banane ke liye.",
  "Wow, minimal look pasand aaya! 😊 Fit bhi perfect hai. Confidence ke saath yeh outfit crush karega.",
  "Nice choice! 👗 Fabric quality achhi lagti hai. Bas ek suggestion - hem thoda adjust kara lo.",
  "Casual vibe I like! 😄 Comfortable aur stylish dono ho. Perfect for a day out!",
  "Ethnic touch is beautiful! 🌸 Embroidery achhi hai. Isme confidence hi sabse bada accessory hai.",
  "Bold colors! Fearless! 💪 Ye teri style ko perfectly reflect kar rahe hain. Love it!",
  "Classic aur timeless! 👌 Ye outfit kabhi out of style nahi hoga. Smart choice!",
];

export default function FitCheckPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [profile, setProfile] = useState(loadProfile());
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [history, setHistory] = useState(getFitCheckHistory());

  useEffect(() => {
    if (!profile.isLoggedIn) {
      navigate("/login");
    }
  }, [profile, navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("Please allow camera access to use Fit Check");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        stopCamera();

        // Simulate AI analysis
        setLoading(true);
        setTimeout(() => {
          const randomFeedback =
            FIT_CHECK_RESPONSES[Math.floor(Math.random() * FIT_CHECK_RESPONSES.length)];
          setFeedback(randomFeedback);
          addFitCheckRecord(randomFeedback, imageData);
          setHistory(getFitCheckHistory());
          setLoading(false);

          if (audioOn) {
            speakText(randomFeedback);
          }
        }, 2000);
      }
    }
  };

  const resetFitCheck = () => {
    setCapturedImage(null);
    setFeedback(null);
    stopSpeaking();
  };

  const handleRetry = () => {
    resetFitCheck();
    startCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 overflow-hidden relative">
      <FloatingElements />

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-xl border-b border-white/20 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/dashboard")}
              className="text-white hover:text-purple-300"
            >
              <ArrowLeft size={24} />
            </motion.button>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-purple-400" fill="currentColor" />
              <span className="text-2xl font-bold text-white">Saheli AI</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAudioOn(!audioOn)}
            className={`${audioOn ? "text-green-400" : "text-red-400"}`}
          >
            {audioOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </motion.button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">📸 Fit Check</h1>
            <p className="text-purple-200">Get instant AI feedback on your outfit</p>
          </motion.div>

          {/* Camera/Preview Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
              {cameraActive ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto bg-black"
                  />
                  <div className="absolute inset-0 border-4 border-pink-400/50 pointer-events-none flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-pink-300 font-semibold mb-2">Position yourself in frame</p>
                      <p className="text-pink-200 text-sm">Make sure your outfit is fully visible</p>
                    </div>
                  </div>
                </div>
              ) : capturedImage ? (
                <div className="relative">
                  <img src={capturedImage} alt="Captured outfit" className="w-full h-auto" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Camera size={64} className="text-purple-300 mb-4" />
                  </motion.div>
                  <p className="text-purple-200 text-lg font-semibold">Ready to check your fit?</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
          >
            {cameraActive ? (
              <>
                <Button
                  onClick={captureImage}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold md:col-span-2 flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  Capture Outfit
                </Button>
                <Button
                  onClick={stopCamera}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 font-semibold"
                >
                  Cancel
                </Button>
              </>
            ) : capturedImage ? (
              <>
                <Button
                  onClick={handleRetry}
                  className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/50 font-semibold flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Retry
                </Button>
                {feedback && (
                  <Button
                    onClick={() => {
                      if (audioOn) {
                        speakText(feedback);
                      }
                    }}
                    className="bg-green-500/20 hover:bg-green-500/40 text-green-200 border border-green-500/50 font-semibold flex items-center justify-center gap-2"
                  >
                    <Volume2 size={18} />
                    Read Again
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold md:col-span-2 flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  Start Camera
                </Button>
              </>
            )}
          </motion.div>

          {/* Feedback Section */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-8"
              >
                <Card className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="inline-block mb-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                  </motion.div>
                  <p className="text-purple-200 text-lg">Analyzing your outfit...</p>
                </Card>
              </motion.div>
            )}

            {feedback && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/50 p-8">
                  <div className="flex gap-4 items-start">
                    <div className="text-4xl">💜</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Saheli's Feedback</h3>
                      <p className="text-purple-100 text-lg leading-relaxed">{feedback}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History Section */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-4">Recent Checks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.slice().reverse().slice(0, 4).map((record) => (
                  <Card key={record.id} className="bg-white/10 backdrop-blur-xl border border-white/20 p-4">
                    <p className="text-purple-200 text-sm mb-2">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-white">{record.feedback}</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
