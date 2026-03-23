import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

const VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vision`;

const FitCheck = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }, []);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    setAnalyzing(true);
    setAnalysis(null);
    setError(null);

    try {
      const resp = await fetch(VISION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Vision failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      const data = await resp.json();
      setAnalysis(data.analysis);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Fit-Check <span className="saheli-gradient-text">by Saheli</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Camera se photo lo, Saheli tumhe styling aur wellness tips degi! 📸
          </p>
        </div>

        {/* Camera area */}
        <div className="glass rounded-xl overflow-hidden relative aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ display: streaming ? "block" : "none" }}
          />
          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <Button onClick={startCamera} variant="outline" className="gap-2">
                <Camera className="h-4 w-4" /> Start Camera
              </Button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action buttons */}
        {streaming && (
          <div className="flex gap-3">
            <Button
              onClick={capture}
              disabled={analyzing}
              className="flex-1 h-11 gap-2"
              style={{ background: "linear-gradient(135deg, hsl(340,72%,62%), hsl(280,50%,60%))" }}
            >
              {analyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Camera className="h-4 w-4" /> Scan & Analyze</>
              )}
            </Button>
            <Button variant="outline" onClick={stopCamera} size="icon" className="h-11 w-11">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass rounded-xl p-4 border-destructive/30">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Analysis results */}
        {analysis && (
          <div className="glass rounded-xl p-6 animate-fade-in">
            <h2 className="font-display font-semibold text-lg mb-3 saheli-gradient-text">
              Saheli's Analysis ✨
            </h2>
            <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FitCheck;
