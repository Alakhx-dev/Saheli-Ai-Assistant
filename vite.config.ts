import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dns from "node:dns";
import { componentTagger } from "lovable-tagger";
import { generateChatTitle } from "./lib/generateChatTitle";
import { synthesizePollyAudioBase64 } from "./lib/pollyTts";
import { handleWeatherRequest } from "./lib/weatherService";

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
    plugins: [react(), mode === "development" && componentTagger(), mode === "development" && devPollyTtsMiddleware, mode === "development" && devTitleMiddleware, mode === "development" && devWeatherMiddleware].filter(Boolean),
    optimizeDeps: {},
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
