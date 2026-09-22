/**
 * Server-side Cloudflare Workers AI Image Fetcher
 * Model: @cf/black-forest-labs/flux-1-schnell
 */

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
    throw new Error("Missing Cloudflare Workers AI credentials (CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN)");
  }

  const sanitizedPrompt = options.prompt
    .replace(/\b(bed|bedroom|lingerie|bikini|naked|nude|sexy|hot)\b/gi, "cozy room")
    .trim();

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  let lastError = "";

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

  throw new Error(`Cloudflare Workers AI generation failed: ${lastError}`);
}
