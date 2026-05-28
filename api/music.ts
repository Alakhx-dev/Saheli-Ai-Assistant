/* eslint-disable @typescript-eslint/no-explicit-any */
import { searchSongs, resolveSongUrl } from "../lib/musicService";

export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  // Retrieve RapidAPI key from environment
  const apiKey = (process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "").trim();

  // If no API Key is set up yet, don't crash, return a descriptive error so UI handles it gracefully
  if (!apiKey) {
    return jsonResponse({
      error: "RapidAPI Key is not configured on the server. Please add VITE_RAPIDAPI_KEY to your environment variables.",
      code: "NO_API_KEY",
    }, 400);
  }

  const url = new URL(request.url);

  // POST Request — handles song URL resolution /getsong
  if (request.method === "POST") {
    try {
      const body = await request.json().catch(() => ({}));
      const action = body.action || url.searchParams.get("action");
      const encryptedMediaUrl = body.encryptedMediaUrl || body.encrypted_media_url || url.searchParams.get("encryptedMediaUrl") || url.searchParams.get("url");

      if (action === "getsong" || encryptedMediaUrl) {
        if (!encryptedMediaUrl) {
          return jsonResponse({ error: "Missing encryptedMediaUrl parameter" }, 400);
        }
        const playableUrl = await resolveSongUrl(encryptedMediaUrl, apiKey);
        const proxiedUrl = `/api/music?action=stream&url=${encodeURIComponent(playableUrl)}`;
        return jsonResponse({ streamUrl: proxiedUrl });
      }

      return jsonResponse({ error: "Unsupported action in POST request" }, 400);
    } catch (error: any) {
      console.error("Music POST handler error:", error);
      return jsonResponse({ error: error?.message || "Internal Server Error" }, 500);
    }
  }

  // GET Request — handles search
  if (request.method === "GET") {
    try {
      const action = url.searchParams.get("action") || "search";
      const query = url.searchParams.get("query") || url.searchParams.get("q") || "";

      if (action === "search") {
        if (!query.trim()) {
          return jsonResponse({ songs: [] });
        }
        const songs = await searchSongs(query, apiKey);
        return jsonResponse({ songs });
      }

      // Also support getsong via GET for convenience
      if (action === "getsong") {
        const encryptedMediaUrl = url.searchParams.get("encryptedMediaUrl") || url.searchParams.get("url") || "";
        if (!encryptedMediaUrl) {
          return jsonResponse({ error: "Missing encryptedMediaUrl parameter" }, 400);
        }
        const playableUrl = await resolveSongUrl(encryptedMediaUrl, apiKey);
        const proxiedUrl = `/api/music?action=stream&url=${encodeURIComponent(playableUrl)}`;
        return jsonResponse({ streamUrl: proxiedUrl });
      }

      if (action === "stream") {
        const streamUrl = url.searchParams.get("url") || "";
        if (!streamUrl) {
          return jsonResponse({ error: "Missing stream URL parameter" }, 400);
        }

        const cdnResponse = await fetch(streamUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.jiosaavn.com/",
          },
        });

        if (!cdnResponse.ok) {
          return jsonResponse({ error: `CDN responded with status ${cdnResponse.status}` }, 500);
        }

        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", cdnResponse.headers.get("Content-Type") || "audio/mp4");
        if (cdnResponse.headers.has("Content-Length")) {
          responseHeaders.set("Content-Length", cdnResponse.headers.get("Content-Length")!);
        }
        if (cdnResponse.headers.has("Accept-Ranges")) {
          responseHeaders.set("Accept-Ranges", cdnResponse.headers.get("Accept-Ranges")!);
        }
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        return new Response(cdnResponse.body, {
          status: 200,
          headers: responseHeaders,
        });
      }

      return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
    } catch (error: any) {
      console.error("Music GET handler error:", error);
      return jsonResponse({ error: error?.message || "Internal Server Error" }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}
