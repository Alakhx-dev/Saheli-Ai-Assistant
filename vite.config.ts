/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dns from "node:dns";
import https from "node:https";
import { componentTagger } from "lovable-tagger";
import { generateChatTitle } from "./lib/generateChatTitle";
import { synthesizePollyAudioBase64 } from "./lib/pollyTts";
import { handleWeatherRequest } from "./lib/weatherService";
import { searchSongs, resolveSongUrl } from "./lib/musicService";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  dns.setDefaultResultOrder("ipv4first");

  const devPollyTtsMiddleware = {
    name: "dev-polly-tts-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/tts", (req: any, res: any, next: any) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.end("ok");
          return;
        }

        if (req.method !== "POST") {
          next();
          return;
        }

        let rawBody = "";
        req.on("data", (chunk: Buffer) => {
          rawBody += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const hasAwsCredentials = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION);
            if (!hasAwsCredentials) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Missing AWS Polly environment variables" }));
              return;
            }

            const parsed = rawBody ? JSON.parse(rawBody) : {};
            const text = String(parsed.text || "").trim();
            if (!text) {
              res.statusCode = 204;
              res.end();
              return;
            }

            const audio = await synthesizePollyAudioBase64(text, {
              AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
              AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
              AWS_REGION: env.AWS_REGION,
            });
            if (!audio) {
              res.statusCode = 204;
              res.end();
              return;
            }

            const bytes = Buffer.from(audio, "base64");
            res.statusCode = 200;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Cache-Control", "no-cache");
            res.end(bytes);
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Dev /api/tts middleware failed", details: String(error?.message || error) }));
          }
        });
      });
    },
  };



  const devTitleMiddleware = {
    name: "dev-title-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/title", (req: any, res: any, next: any) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.end("ok");
          return;
        }

        if (req.method !== "POST") {
          next();
          return;
        }

        let rawBody = "";
        req.on("data", (chunk: Buffer) => {
          rawBody += chunk.toString();
        });

        req.on("end", async () => {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = rawBody ? JSON.parse(rawBody) : {};
            const firstMessage = String(parsed.firstMessage || parsed.message || "").trim();
            if (!firstMessage) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Message is required" }));
              return;
            }

            const title = (await generateChatTitle(firstMessage)).trim() || firstMessage.slice(0, 30);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ title }));
          } catch (error: any) {
            const firstMessage = String(parsed.firstMessage || parsed.message || "").trim();
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ title: firstMessage.slice(0, 30) }));
          }
        });
      });
    },
  };

  const devWeatherMiddleware = {
    name: "dev-weather-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/weather", (req: any, res: any, next: any) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
          res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
          res.end("ok");
          return;
        }

        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const lat = parsedUrl.searchParams.get("lat") || parsedUrl.searchParams.get("latitude");
        const lon = parsedUrl.searchParams.get("lon") || parsedUrl.searchParams.get("longitude");
        const action = parsedUrl.searchParams.get("action") || "all";

        if (!lat || !lon) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing lat/latitude or lon/longitude parameters" }));
          return;
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        if (isNaN(latitude) || isNaN(longitude)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid coordinates" }));
          return;
        }

        handleWeatherRequest(latitude, longitude, action)
          .then((data) => {
            res.statusCode = 200;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          })
          .catch((error) => {
            res.statusCode = 500;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error?.message || "Internal Server Error" }));
          });
      });
    },
  };

  const devMusicMiddleware = {
    name: "dev-music-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/music", (req: any, res: any, next: any) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.end("ok");
          return;
        }

        const apiKey = (env.VITE_RAPIDAPI_KEY || env.RAPIDAPI_KEY || "").trim();
        if (!apiKey) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify({
            error: "RapidAPI Key is not configured in .env. Please configure VITE_RAPIDAPI_KEY.",
            code: "NO_API_KEY",
          }));
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

        if (req.method === "POST") {
          let rawBody = "";
          req.on("data", (chunk: Buffer) => {
            rawBody += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const body = rawBody ? JSON.parse(rawBody) : {};
              const action = body.action || parsedUrl.searchParams.get("action");
              const encryptedMediaUrl = body.encryptedMediaUrl || body.encrypted_media_url || parsedUrl.searchParams.get("encryptedMediaUrl");

              if (action === "getsong" || encryptedMediaUrl) {
                if (!encryptedMediaUrl) {
                  res.statusCode = 400;
                  res.setHeader("Access-Control-Allow-Origin", "*");
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Missing encryptedMediaUrl" }));
                  return;
                }
                const playableUrl = await resolveSongUrl(encryptedMediaUrl, apiKey);
                const proxiedUrl = `/api/music?action=stream&url=${encodeURIComponent(playableUrl)}`;
                res.statusCode = 200;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ streamUrl: proxiedUrl }));
                return;
              }

              res.statusCode = 400;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Unsupported action in POST" }));
            } catch (error: any) {
              res.statusCode = 500;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Dev /api/music POST middleware failed", details: String(error?.message || error) }));
            }
          });
          return;
        }

        if (req.method === "GET") {
          const action = parsedUrl.searchParams.get("action") || "search";
          const query = parsedUrl.searchParams.get("query") || parsedUrl.searchParams.get("q") || "";

          if (action === "search") {
            if (!query.trim()) {
              res.statusCode = 200;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ songs: [] }));
              return;
            }
            searchSongs(query, apiKey)
              .then((songs) => {
                res.statusCode = 200;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ songs }));
              })
              .catch((error) => {
                res.statusCode = 500;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Search failed", details: error?.message || error }));
              });
            return;
          }

          if (action === "autocomplete") {
            if (!query.trim()) {
              res.statusCode = 200;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ suggestions: [] }));
              return;
            }
            const autocompleteUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`;
            fetch(autocompleteUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Referer": "https://www.jiosaavn.com/",
              }
            })
              .then(async (autoResponse) => {
                if (autoResponse.ok) {
                  const autoData = await autoResponse.json();
                  const rawSuggestions = autoData?.songs?.data || autoData?.songs || [];
                  const suggestions = rawSuggestions.map((s: any) => s.title || s.query || s.song).filter(Boolean);
                  res.statusCode = 200;
                  res.setHeader("Access-Control-Allow-Origin", "*");
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ suggestions }));
                } else {
                  res.statusCode = 200;
                  res.setHeader("Access-Control-Allow-Origin", "*");
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ suggestions: [] }));
                }
              })
              .catch((error) => {
                res.statusCode = 500;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Autocomplete failed", details: error?.message || error }));
              });
            return;
          }

          if (action === "getsong") {
            const encryptedMediaUrl = parsedUrl.searchParams.get("encryptedMediaUrl") || parsedUrl.searchParams.get("url") || "";
            if (!encryptedMediaUrl) {
              res.statusCode = 400;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Missing encryptedMediaUrl" }));
              return;
            }
            resolveSongUrl(encryptedMediaUrl, apiKey)
              .then((playableUrl) => {
                const proxiedUrl = `/api/music?action=stream&url=${encodeURIComponent(playableUrl)}`;
                res.statusCode = 200;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ streamUrl: proxiedUrl }));
              })
              .catch((error) => {
                res.statusCode = 500;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Resolve failed", details: error?.message || error }));
              });
            return;
          }

          if (action === "stream") {
            const streamUrl = parsedUrl.searchParams.get("url");
            if (!streamUrl) {
              res.statusCode = 400;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end("Missing stream URL");
              return;
            }

            const cdnUrl = new URL(streamUrl);
            const requestOptions = {
              hostname: cdnUrl.hostname,
              path: cdnUrl.pathname + cdnUrl.search,
              method: "GET",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.jiosaavn.com/",
              }
            };

            const cdnReq = https.request(requestOptions, (cdnRes) => {
              res.statusCode = cdnRes.statusCode || 200;
              if (cdnRes.headers["content-type"]) res.setHeader("Content-Type", cdnRes.headers["content-type"]);
              if (cdnRes.headers["content-length"]) res.setHeader("Content-Length", cdnRes.headers["content-length"]);
              if (cdnRes.headers["accept-ranges"]) res.setHeader("Accept-Ranges", cdnRes.headers["accept-ranges"]);
              res.setHeader("Access-Control-Allow-Origin", "*");
              cdnRes.pipe(res);
            });

            cdnReq.on("error", (err) => {
              res.statusCode = 500;
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end("Proxy streaming failed: " + err.message);
            });

            cdnReq.end();
            return;
          }

          res.statusCode = 400;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Unsupported action: ${action}` }));
          return;
        }

        res.statusCode = 405;
        res.end("Method not allowed");
      });
    },
  };

  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    server: {
      host: "::",
      port: 3000,
      open: true,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger(), mode === "development" && devPollyTtsMiddleware, mode === "development" && devTitleMiddleware, mode === "development" && devWeatherMiddleware, mode === "development" && devMusicMiddleware].filter(Boolean),
    optimizeDeps: {},
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
