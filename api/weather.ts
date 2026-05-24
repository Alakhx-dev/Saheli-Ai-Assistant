import { handleWeatherRequest } from "../lib/weatherService";

export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const lat = url.searchParams.get("lat") || url.searchParams.get("latitude");
    const lon = url.searchParams.get("lon") || url.searchParams.get("longitude");
    const action = url.searchParams.get("action") || "all";

    if (!lat || !lon) {
      return jsonResponse({ error: "Missing lat/latitude or lon/longitude parameters" }, 400);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return jsonResponse({ error: "Invalid coordinates" }, 400);
    }

    const data = await handleWeatherRequest(latitude, longitude, action);
    return jsonResponse(data);
  } catch (error: any) {
    console.error("Weather endpoint error:", error);
    return jsonResponse({ error: error?.message || "Internal Server Error" }, 500);
  }
}
