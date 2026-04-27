import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dns from "node:dns";
import { componentTagger } from "lovable-tagger";
import { generateChatTitle } from "./lib/generateChatTitle";
import { synthesizePollyAudioBase64 } from "./lib/pollyTts";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawApiProxyTarget = env.VITE_API_PROXY_TARGET?.trim();
  const viteHost = "localhost";
  const vitePort = 3000;
  const isSelfProxyTarget = (() => {
    if (!rawApiProxyTarget) {
      return false;
    }

    try {
      const parsed = new URL(rawApiProxyTarget);
      const hostname = parsed.hostname.toLowerCase();
      const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
      const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
      return isLocalHost && port === vitePort;
    } catch {
      return false;
    }
  })();
  const apiProxyTarget = isSelfProxyTarget ? undefined : rawApiProxyTarget;
  dns.setDefaultResultOrder("ipv4first");

  const devPollyTtsMiddleware = {
    name: "dev-polly-tts-middleware",
    configureServer(server: any) {
      if (apiProxyTarget) {
        return;
      }

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

  const devAnalyzeFaceMiddleware = {
    name: "dev-analyze-face-middleware",
    configureServer(server: any) {
      if (apiProxyTarget) {
        return;
      }

      server.middlewares.use("/api/analyze-face", (req: any, res: any, next: any) => {
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
            const analyzeFaceKey = String(env.LUXAND_API_KEY || env.VITE_LUXAND_API_KEY || "").trim();
            if (!analyzeFaceKey) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "Missing LUXAND_API_KEY", fallbackMessage: "Camera analysis failed, try again" }));
              return;
            }

            const parsed = rawBody ? JSON.parse(rawBody) : {};
            const image = String(parsed.image || "").trim();
            if (!image) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "Image is required", fallbackMessage: "Camera analysis failed, try again" }));
              return;
            }

            const cleanBase64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
            const binary = Buffer.from(cleanBase64, "base64");
            const formData = new FormData();
            formData.append("photo", new Blob([binary], { type: "image/jpeg" }), "image.jpg");

            const luxandResponse = await fetch("https://api.luxand.cloud/photo/emotions", {
              method: "POST",
              headers: {
                token: analyzeFaceKey,
              },
              body: formData,
            });

            if (!luxandResponse.ok) {
              const errorText = await luxandResponse.text();
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                ok: false,
                analysis: "Camera analysis failed, try again",
                fallbackMessage: "Camera analysis failed, try again",
                details: errorText,
              }));
              return;
            }

            const result = (await luxandResponse.json()) as {
              faces?: Array<{ emotions?: Record<string, number> }>;
            };

            const emotions = result.faces?.[0]?.emotions ?? {};
            const supportedEmotions: Array<[string, string]> = [
              ["happiness", "happy"],
              ["neutral", "neutral"],
              ["sadness", "sad"],
              ["anger", "angry"],
            ];

            let bestEmotion = "neutral";
            let bestScore = -Infinity;

            for (const [sourceKey, mappedEmotion] of supportedEmotions) {
              const score = emotions[sourceKey];
              if (typeof score === "number" && score > bestScore) {
                bestScore = score;
                bestEmotion = mappedEmotion;
              }
            }

            const detectedScore = Number.isFinite(bestScore) && bestScore >= 0 ? bestScore : null;
            const analysis = detectedScore !== null
              ? `Luxand detected a ${bestEmotion} expression with confidence ${detectedScore.toFixed(2)}.`
              : `Luxand detected a ${bestEmotion} expression.`;

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              ok: true,
              emotion: bestEmotion,
              analysis,
            }));
          } catch (error: any) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              ok: false,
              analysis: "Camera analysis failed, try again",
              fallbackMessage: "Camera analysis failed, try again",
              details: String(error?.message || error),
            }));
          }
        });
      });
    },
  };

  const devTitleMiddleware = {
    name: "dev-title-middleware",
    configureServer(server: any) {
      if (apiProxyTarget) {
        return;
      }

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

  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    server: {
      host: "::",
      port: 3000,
      open: true,
      hmr: {
        overlay: false,
      },
      proxy: {
        ...(apiProxyTarget
          ? {
              "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            }
          : {}),
        "/functions/v1": {
          target: "http://127.0.0.1:54321",
          changeOrigin: true
        }
      },
    },
    plugins: [react(), mode === "development" && componentTagger(), mode === "development" && devPollyTtsMiddleware, mode === "development" && devAnalyzeFaceMiddleware, mode === "development" && devTitleMiddleware].filter(Boolean),
    optimizeDeps: {
      force: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
