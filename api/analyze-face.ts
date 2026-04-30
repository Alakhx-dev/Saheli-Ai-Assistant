import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyzeFaceRequest = {
  image?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function decodeBase64Image(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const env = (globalThis as any).process?.env || {};
  const clean = (val: string | undefined) => val?.trim().replace(/['"]+/g, '') || "";

  // 🔥 DEDICATED VISION CONFIGURATION
  const VISION_CONFIG = {
    region: clean(env.AWS_REKOGNITION_REGION) || "ap-south-1",
    credentials: {
      accessKeyId: clean(env.AWS_REKOGNITION_ACCESS_KEY || env.AWS_REKOGNITION_ACCESS_KEY_ID),
      secretAccessKey: clean(env.AWS_REKOGNITION_SECRET_KEY || env.AWS_REKOGNITION_SECRET_ACCESS_KEY),
    },
  };

  if (!VISION_CONFIG.credentials.accessKeyId || !VISION_CONFIG.credentials.secretAccessKey) {
    console.error("❌ CRITICAL: AWS_REKOGNITION_ACCESS_KEY is missing from .env!");
    return jsonResponse({ ok: false, error: "Missing AWS Rekognition Credentials" }, 500);
  }

  // Log masked keys to verify they are loaded
  console.log("AWS Config Loaded:", {
    region: VISION_CONFIG.region,
    key: VISION_CONFIG.credentials.accessKeyId.substring(0, 4) + "...****",
  });

  try {
    const payload = (await request.json()) as AnalyzeFaceRequest;
    if (!payload.image) {
      return jsonResponse({ ok: false, error: "Image is required" }, 400);
    }

    const imageBytes = decodeBase64Image(payload.image);

    if (imageBytes.length < 1000) {
      console.error("❌ AWS ACTUAL ERROR: Image buffer is too small, capture might have failed.");
      return jsonResponse({ ok: false, error: "Image buffer is too small", details: "Image buffer is too small" }, 400);
    }

    const rekognition = new RekognitionClient(VISION_CONFIG);

    const command = new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ["ALL"], // CRITICAL for emotions/age
    });

    const response = await rekognition.send(command);
    
    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      console.log("⚠️ AWS VISION RESULT: No faces detected.");
      return jsonResponse({ ok: false, error: "No face detected" }, 422);
    }

    const face = response.FaceDetails[0];
    const primaryEmotion = face.Emotions?.reduce((prev: any, current: any) => 
      (prev.Confidence! > current.Confidence!) ? prev : current
    ).Type;

    const gender = face.Gender?.Value;
    const ageLow = face.AgeRange?.Low;
    const ageHigh = face.AgeRange?.High;

    const analysis = `User appears to be ${primaryEmotion?.toLowerCase()}, ${gender?.toLowerCase()}, aged between ${ageLow}-${ageHigh}.`;

    return jsonResponse({ 
      ok: true, 
      emotion: primaryEmotion?.toLowerCase() || "neutral", 
      analysis 
    }, 200);
  } catch (error: any) {
    console.error("❌ AWS ACTUAL ERROR:", error?.message || error);
    return jsonResponse({ ok: false, error: error?.message || "AWS Rekognition failed" }, 500);
  }
}