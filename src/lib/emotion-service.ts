import type { EmotionLabel } from "@/lib/ai-service";

interface EmotionDetectionResponse {
  emotion: EmotionLabel | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function detectEmotionFromImage(imageBase64: string): Promise<EmotionLabel | undefined> {
  if (!SUPABASE_URL || !imageBase64) {
    return undefined;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/luxand-emotion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageBase64,
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as EmotionDetectionResponse;
    return data.emotion ?? undefined;
  } catch (error) {
    console.warn("Emotion detection failed", error);
    return undefined;
  }
}
