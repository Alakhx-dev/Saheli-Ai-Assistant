/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

export interface JioSaavnSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  encryptedMediaUrl: string;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const JIOSAAVN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Referer": "https://www.jiosaavn.com/",
};

function parseSongResult(song: any): JioSaavnSong {
  let artistName = "Unknown Artist";
  if (song.primary_artists) {
    artistName = song.primary_artists;
  } else if (song.primaryArtists) {
    artistName = song.primaryArtists;
  } else if (song.artists?.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
    artistName = song.artists.primary.map((a: any) => a.name).join(", ");
  } else if (song.singers) {
    artistName = song.singers;
  } else if (song.artist) {
    artistName = typeof song.artist === "string" ? song.artist : (song.artist.name || "Unknown Artist");
  }

  let albumName = "Single";
  if (song.album && typeof song.album === "object") {
    albumName = song.album.name || "Unknown Album";
  } else if (song.album) {
    albumName = song.album;
  } else if (song.albumName) {
    albumName = song.albumName;
  }

  let imageUrl = "";
  if (Array.isArray(song.image) && song.image.length > 0) {
    const highQuality = song.image.find((img: any) => img.quality === "500x500") || song.image[song.image.length - 1];
    imageUrl = highQuality?.link || highQuality?.url || song.image[0];
  } else if (song.image) {
    imageUrl = song.image;
  } else if (song.albumArt) {
    imageUrl = song.albumArt;
  }

  if (typeof imageUrl === "string" && imageUrl) {
    imageUrl = imageUrl.replace("150x150", "500x500").replace("50x50", "500x500");
  }

  const encryptedMediaUrl = song.encrypted_media_url || song.encryptedMediaUrl || "";

  return {
    id: String(song.id || Math.random().toString(36).substring(2, 9)),
    title: String(song.song || song.name || song.title || "Unknown Song"),
    artist: artistName,
    album: albumName,
    image: imageUrl || "/placeholder-album.png",
    encryptedMediaUrl,
  };
}

async function executeSongSearch(cleanQuery: string): Promise<JioSaavnSong[]> {
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(cleanQuery)}`;
  const response = await fetch(url, { headers: JIOSAAVN_HEADERS });
  if (!response.ok) {
    throw new Error(`JioSaavn Search failed with status ${response.status}`);
  }
  const resData: any = await response.json().catch(() => ({}));
  let rawSongs = resData?.results || resData?.data?.results || resData?.data || (Array.isArray(resData) ? resData : []);

  if (!Array.isArray(rawSongs) || rawSongs.length === 0) {
    const autocompleteUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(cleanQuery)}`;
    try {
      const autoResponse = await fetch(autocompleteUrl, { headers: JIOSAAVN_HEADERS });
      if (autoResponse.ok) {
        const autoData: any = await autoResponse.json().catch(() => ({}));
        const firstSongTitle = autoData?.songs?.data?.[0]?.title || autoData?.songs?.[0]?.title;
        if (firstSongTitle) {
          const retryUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(firstSongTitle)}`;
          const retryResponse = await fetch(retryUrl, { headers: JIOSAAVN_HEADERS });
          if (retryResponse.ok) {
            const retryData: any = await retryResponse.json().catch(() => ({}));
            const retrySongs = retryData?.results || retryData?.data?.results || retryData?.data || [];
            if (Array.isArray(retrySongs) && retrySongs.length > 0) {
              rawSongs = retrySongs;
            }
          }
        }
      }
    } catch {
      // ignore autocomplete error
    }
  }

  return (Array.isArray(rawSongs) ? rawSongs : [])
    .map(parseSongResult)
    .filter((song) => Boolean(song.encryptedMediaUrl));
}

async function executeResolveUrl(encryptedMediaUrl: string): Promise<string> {
  const url = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(encryptedMediaUrl)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`;
  const response = await fetch(url, { headers: JIOSAAVN_HEADERS });
  if (!response.ok) {
    throw new Error(`JioSaavn generateAuthToken failed with status ${response.status}`);
  }
  const data: any = await response.json().catch(() => ({}));
  const playableUrl = data?.auth_url;
  if (!playableUrl) {
    throw new Error("Playable media URL could not be resolved from JioSaavn response");
  }
  return playableUrl;
}

export default async function handler(req: any, res?: any) {
  // 1. Node.js Serverless runtime (Vercel Node.js)
  if (res && typeof res.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      return res.end();
    }

    try {
      const fullUrl = new URL(req.url || "", "https://saheli-music.local");
      const action = fullUrl.searchParams.get("action") || (req.method === "POST" ? "getsong" : "search");

      if (action === "search") {
        const query = fullUrl.searchParams.get("query") || fullUrl.searchParams.get("q") || "";
        if (!query.trim()) {
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ songs: [] }));
        }
        const songs = await executeSongSearch(query);
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ songs }));
      }

      if (action === "autocomplete") {
        const query = fullUrl.searchParams.get("query") || fullUrl.searchParams.get("q") || "";
        if (!query.trim()) {
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ suggestions: [] }));
        }
        const autocompleteUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`;
        const autoResponse = await fetch(autocompleteUrl, { headers: JIOSAAVN_HEADERS });
        const autoData: any = await autoResponse.json().catch(() => ({}));
        const rawSuggestions = autoData?.songs?.data || autoData?.songs || [];
        const suggestions = rawSuggestions.map((s: any) => s.title || s.query || s.song).filter(Boolean);
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ suggestions }));
      }

      if (action === "getsong") {
        let encryptedMediaUrl = fullUrl.searchParams.get("encryptedMediaUrl") || fullUrl.searchParams.get("url") || "";
        if (!encryptedMediaUrl && req.body) {
          const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
          encryptedMediaUrl = body.encryptedMediaUrl || body.encrypted_media_url || "";
        }
        if (!encryptedMediaUrl) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: "Missing encryptedMediaUrl parameter" }));
        }
        const playableUrl = await executeResolveUrl(encryptedMediaUrl);
        const proxiedUrl = `/api/music?action=stream&url=${encodeURIComponent(playableUrl)}`;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ streamUrl: playableUrl, proxiedUrl, directUrl: playableUrl }));
      }

      if (action === "stream") {
        const streamUrl = fullUrl.searchParams.get("url") || "";
        if (!streamUrl) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: "Missing stream URL parameter" }));
        }
        const cdnResponse = await fetch(streamUrl, {
          method: "GET",
          headers: JIOSAAVN_HEADERS,
        });
        if (!cdnResponse.ok) {
          res.statusCode = cdnResponse.status;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ error: `CDN error ${cdnResponse.status}` }));
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", cdnResponse.headers.get("Content-Type") || "audio/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        const buf = Buffer.from(await cdnResponse.arrayBuffer());
        return res.end(buf);
      }

      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: `Unsupported action: ${action}` }));
    } catch (error: any) {
      console.error("Music endpoint error:", error);
      res.statusCode = 200; // Return safe empty fallback so client doesn't crash
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ songs: [], error: error?.message || "Music service error" }));
    }
  }

  // 2. Web Standard Request/Response runtime
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const fullUrl = new URL(req.url || "", "https://saheli-music.local");
    const action = fullUrl.searchParams.get("action") || (req.method === "POST" ? "getsong" : "search");

    if (action === "search") {
      const query = fullUrl.searchParams.get("query") || fullUrl.searchParams.get("q") || "";
      if (!query.trim()) {
        return new Response(JSON.stringify({ songs: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const songs = await executeSongSearch(query);
      return new Response(JSON.stringify({ songs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "autocomplete") {
      const query = fullUrl.searchParams.get("query") || fullUrl.searchParams.get("q") || "";
      if (!query.trim()) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const autocompleteUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`;
      const autoResponse = await fetch(autocompleteUrl, { headers: JIOSAAVN_HEADERS });
      const autoData: any = await autoResponse.json().catch(() => ({}));
      const rawSuggestions = autoData?.songs?.data || autoData?.songs || [];
      const suggestions = rawSuggestions.map((s: any) => s.title || s.query || s.song).filter(Boolean);
      return new Response(JSON.stringify({ suggestions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "getsong") {
      let encryptedMediaUrl = fullUrl.searchParams.get("encryptedMediaUrl") || fullUrl.searchParams.get("url") || "";
      if (!encryptedMediaUrl && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        encryptedMediaUrl = body.encryptedMediaUrl || body.encrypted_media_url || "";
      }
      if (!encryptedMediaUrl) {
        return new Response(JSON.stringify({ error: "Missing encryptedMediaUrl parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const playableUrl = await executeResolveUrl(encryptedMediaUrl);
      const proxiedUrl = `/api/music?action=stream&url=${encodeURIComponent(playableUrl)}`;
      return new Response(JSON.stringify({ streamUrl: playableUrl, proxiedUrl, directUrl: playableUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stream") {
      const streamUrl = fullUrl.searchParams.get("url") || "";
      if (!streamUrl) {
        return new Response(JSON.stringify({ error: "Missing stream URL parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cdnResponse = await fetch(streamUrl, {
        method: "GET",
        headers: JIOSAAVN_HEADERS,
      });
      if (!cdnResponse.ok) {
        return new Response(JSON.stringify({ error: `CDN error ${cdnResponse.status}` }), {
          status: cdnResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const headers = new Headers();
      headers.set("Content-Type", cdnResponse.headers.get("Content-Type") || "audio/mp4");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Accept-Ranges", "bytes");
      return new Response(cdnResponse.body, { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Music endpoint error:", error);
    return new Response(JSON.stringify({ songs: [], error: error?.message || "Music service error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
