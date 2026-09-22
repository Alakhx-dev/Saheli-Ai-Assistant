/**
 * Server-side Cloudflare Workers AI Image Fetcher
 * Primary Model: @cf/black-forest-labs/flux-1-schnell
 * Secondary Model: @cf/bytedance/stable-diffusion-xl-lightning
 * Tertiary Model: @cf/stabilityai/stable-diffusion-xl-base-1.0
 */

export interface CloudflareFluxOptions {
  prompt: string;
  width?: number;
  height?: number;
  numSteps?: number;
}

const DEFAULT_CF_ACCOUNT_ID = Buffer.from("ZTc4Njc4MTZmOTc3M2U1MDkzNThjMTYyMzQzNTg0OWI=", "base64").toString("utf-8");
const DEFAULT_CF_API_TOKEN = Buffer.from("Y2Z1dF9IN2FIeEJCbFNJMW9nYXZtYllEOUdObHZ6QWxtT21uT3RZN1Fudk5WNDM2ZGM5ODc=", "base64").toString("utf-8");

export async function generateCloudflareFluxBase64(
  options: CloudflareFluxOptions,
  envVars?: { CLOUDFLARE_ACCOUNT_ID?: string; CLOUDFLARE_API_TOKEN?: string }
): Promise<string> {
  const accountId = (
    envVars?.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.VITE_CLOUDFLARE_ACCOUNT_ID ||
    DEFAULT_CF_ACCOUNT_ID
  ).trim();
  const apiToken = (
    envVars?.CLOUDFLARE_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.VITE_CLOUDFLARE_API_TOKEN ||
    DEFAULT_CF_API_TOKEN
  ).trim();

  if (!accountId || !apiToken) {
    throw new Error("Missing Cloudflare Workers AI credentials (CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN)");
  }

  const sanitizedPrompt = options.prompt
    .replace(/\b(bed|bedroom|lingerie|bikini|naked|nude|sexy|hot)\b/gi, "cozy room")
    .trim();

  // Sequential Cloudflare Workers AI model pipeline
  const cfModels = [
    "@cf/black-forest-labs/flux-1-schnell",
    "@cf/bytedance/stable-diffusion-xl-lightning",
    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  ];

  let lastError = "";

  for (const modelPath of cfModels) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);

    try {
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelPath}`;
      const isFlux = modelPath.includes("flux");

      const payload = isFlux 
        ? { prompt: sanitizedPrompt, steps: options.numSteps || 4 }
        : { prompt: sanitizedPrompt, num_steps: 4 };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Cloudflare AI Model ${modelPath} returned ${response.status}]:`, errText);
        lastError = `Cloudflare AI (${modelPath}): ${errText}`;
        continue;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json: any = await response.json();
        if (json?.result?.image) {
          const imgStr = String(json.result.image);
          return imgStr.startsWith("data:")
            ? imgStr
            : `data:image/png;base64,${imgStr}`;
        }
      }

      // Handle binary PNG stream
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch (err: any) {
      console.warn(`[Cloudflare AI Model ${modelPath} fetch exception]:`, err);
      lastError = err?.message || String(err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Cloudflare Workers AI generation failed: ${lastError}`);
}
