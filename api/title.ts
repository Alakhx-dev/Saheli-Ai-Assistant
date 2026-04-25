import { generateChatTitle } from "../lib/generateChatTitle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TitleRequest = {
  message?: string;
  firstMessage?: string;
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

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let firstMessage = "";

  try {
    const payload = (await request.json()) as TitleRequest;
    firstMessage = (payload.firstMessage || payload.message || "").trim();
    if (!firstMessage) {
      return jsonResponse({ error: "Message is required" }, 400);
    }

    const title = (await generateChatTitle(firstMessage)).trim();
    const safeTitle = title || firstMessage.slice(0, 30);

    return jsonResponse({ title: safeTitle }, 200);
  } catch (error) {
    console.error("Title route failed", error);
    return jsonResponse({
      title: firstMessage.slice(0, 30),
    }, 200);
  }
}