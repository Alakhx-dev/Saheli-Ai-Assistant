/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface CloudflareFluxOptions {
  prompt: string;
  width?: number;
  height?: number;
  numSteps?: number;
}

export async function generateCloudflareFluxBase64(
  options: CloudflareFluxOptions,
  envVars?: { CLOUDFLARE_ACCOUNT_ID?: string; CLOUDFLARE_API_TOKEN?: string }
): Promise<string> {
  const accountId = (
    envVars?.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.VITE_CLOUDFLARE_ACCOUNT_ID ||
    ""
  ).trim();
  const apiToken = (
    envVars?.CLOUDFLARE_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.VITE_CLOUDFLARE_API_TOKEN ||
    ""
  ).trim();

  if (!accountId || !apiToken) {
    throw new Error("Missing Cloudflare Workers AI credentials. Please ensure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (or VITE_CLOUDFLARE_ACCOUNT_ID & VITE_CLOUDFLARE_API_TOKEN) are set in your environment variables.");
  }

  const sanitizedPrompt = options.prompt
    .replace(/\b(bed|bedroom|lingerie|bikini|naked|nude|sexy|hot)\b/gi, "cozy room")
    .trim();

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  let lastError = "";

  // Retry up to 3 attempts with slight backoff for concurrency/rate-limit
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: sanitizedPrompt,
          steps: options.numSteps || 4,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Cloudflare FLUX attempt ${attempt} returned ${response.status}]:`, errText);
        lastError = `FLUX Error (${response.status}): ${errText}`;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1200 * attempt));
          continue;
        }
        break;
      }

      const contentType = response.headers.get("content-type") || "";

      let rawBase64 = "";
      if (contentType.includes("application/json")) {
        const json: any = await response.json();
        if (json?.result?.image) {
          rawBase64 = String(json.result.image).replace(/^data:image\/[a-z]+;base64,/, "");
        }
      } else {
        const arrayBuffer = await response.arrayBuffer();
        rawBase64 = Buffer.from(arrayBuffer).toString("base64");
      }

      // Check if image is a blank/black safety filter artifact (blank image is under 35KB)
      if (!rawBase64 || rawBase64.length < 40000) {
        console.warn(`[Cloudflare FLUX attempt ${attempt}]: Image too small or black (${rawBase64.length} chars), retrying...`);
        lastError = "Generated image was blank/black artifact";
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }

      // Determine correct mime type
      const mime = rawBase64.startsWith("/9j/") ? "image/jpeg" : "image/png";
      return `data:${mime};base64,${rawBase64}`;
    } catch (err: any) {
      console.warn(`[Cloudflare FLUX attempt ${attempt} exception]:`, err);
      lastError = err?.message || String(err);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Cloudflare FLUX generation failed: ${lastError}`);
}

async function parseFluxBody(req: any): Promise<CloudflareFluxOptions> {
  // 1. If Web standard Request object with .json() method
  if (typeof req.json === "function") {
    try {
      const data = await req.json();
      if (data && typeof data === "object") {
        return data;
      }
    } catch {
      // ignore
    }
  }

  // 2. If already parsed by Vercel Node / express body-parser
  if (req.body) {
    if (typeof req.body === "object" && typeof req.body.getReader !== "function") {
      return req.body;
    }
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return { prompt: req.body };
      }
    }
  }

  // 3. If Node.js IncomingMessage stream
  if (typeof req.on === "function") {
    return new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk: any) => {
        raw += chunk.toString();
      });
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : { prompt: "" });
        } catch {
          resolve({ prompt: raw });
        }
      });
      req.on("error", () => resolve({ prompt: "" }));
    });
  }

  return { prompt: "" };
}

export default async function handler(req: any, res?: any) {
  // 1. Node.js Serverless runtime (Vercel Node.js standard runtime)
  if (res && (typeof res.setHeader === "function" || typeof res.status === "function")) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (typeof res.setHeader === "function") {
        res.setHeader(key, value);
      }
    }

    if (req.method === "OPTIONS") {
      if (typeof res.status === "function") {
        return res.status(200).end("ok");
      }
      res.statusCode = 200;
      return res.end("ok");
    }

    if (req.method !== "POST") {
      const errJson = JSON.stringify({ error: "Method not allowed" });
      if (typeof res.status === "function") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      return res.end(errJson);
    }

    try {
      const payload = await parseFluxBody(req);
      const prompt = (payload.prompt || "").trim();

      if (!prompt) {
        const errJson = JSON.stringify({ error: "Prompt is required" });
        if (typeof res.status === "function") {
          return res.status(400).json({ error: "Prompt is required" });
        }
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(errJson);
      }

      const imageBase64 = await generateCloudflareFluxBase64({
        prompt,
        numSteps: payload.numSteps,
      });

      const responseData = { image: imageBase64, provider: "cloudflare-flux" };
      if (typeof res.status === "function") {
        return res.status(200).json(responseData);
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(responseData));
    } catch (error: any) {
      console.error("Cloudflare FLUX API route error:", error);
      const errJson = JSON.stringify({ error: error?.message || "Cloudflare FLUX generation failed" });
      if (typeof res.status === "function") {
        return res.status(500).json({ error: error?.message || "Cloudflare FLUX generation failed" });
      }
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(errJson);
    }
  }

  // 2. Web Standard Request/Response runtime (Vercel Edge / Fetch standard)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await parseFluxBody(req);
    const prompt = (payload.prompt || "").trim();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageBase64 = await generateCloudflareFluxBase64({
      prompt,
      numSteps: payload.numSteps,
    });

    return new Response(JSON.stringify({ image: imageBase64, provider: "cloudflare-flux" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Cloudflare FLUX API route error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Cloudflare FLUX generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
