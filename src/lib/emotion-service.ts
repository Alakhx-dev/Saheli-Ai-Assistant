import type { EmotionLabel } from "@/lib/ai-service";

export interface FaceAnalysisResponse {
  ok: boolean;
  emotion: EmotionLabel | null;
  analysis: string;
  fallbackMessage?: string;
}

const CAMERA_ANALYSIS_FALLBACK_MESSAGE = "Camera analysis failed, try again";

export async function analyzeFaceImage(imageBase64: string): Promise<FaceAnalysisResponse> {
  if (!imageBase64) {
    return {
      ok: false,
      emotion: null,
      analysis: CAMERA_ANALYSIS_FALLBACK_MESSAGE,
      fallbackMessage: CAMERA_ANALYSIS_FALLBACK_MESSAGE,
    };
  }

  try {
    const response = await fetch("/api/analyze-face", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageBase64,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as Partial<FaceAnalysisResponse>;
    const fallbackMessage = data.fallbackMessage || CAMERA_ANALYSIS_FALLBACK_MESSAGE;

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        emotion: null,
        analysis: data.analysis?.trim() || fallbackMessage,
        fallbackMessage,
      };
    }

    return {
      ok: true,
      emotion: data.emotion ?? null,
      analysis: data.analysis?.trim() || "Luxand detected a neutral expression.",
    };
  } catch (error) {
    console.error("Emotion analysis failed", error);
    return {
      ok: false,
      emotion: null,
      analysis: CAMERA_ANALYSIS_FALLBACK_MESSAGE,
      fallbackMessage: CAMERA_ANALYSIS_FALLBACK_MESSAGE,
    };
  }
}

