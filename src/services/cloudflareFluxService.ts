/**
 * Cloudflare Workers AI FLUX.1 Image Generation Service
 * Model: @cf/black-forest-labs/flux-1-schnell
 * Uses server-side /api/flux endpoint to completely bypass CORS issues
 */

export interface ImageGenOptions {
  prompt: string;
  width?: number;
  height?: number;
  numSteps?: number;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:5";
}

export interface ImageGenResult {
  imageUrl: string;
  revisedPrompt?: string;
  provider: "cloudflare-flux";
}

export async function generateFluxImage(options: ImageGenOptions): Promise<ImageGenResult> {
  const { prompt, aspectRatio = "1:1" } = options;

  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") {
    width = 1024;
    height = 576;
  } else if (aspectRatio === "9:16") {
    width = 576;
    height = 1024;
  } else if (aspectRatio === "4:5") {
    width = 800;
    height = 1000;
  }

  // Call /api/flux server-side endpoint (handled by dev server / Vercel functions, bypassing CORS and using Cloudflare Workers AI FLUX.1)
  const response = await fetch("/api/flux", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      width,
      height,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    if (data.image) {
      return {
        imageUrl: data.image,
        provider: "cloudflare-flux",
      };
    }
  }

  const errData = await response.text();
  console.error("Cloudflare FLUX /api/flux error:", response.status, errData);
  throw new Error(`Cloudflare FLUX API Error (${response.status}): ${errData}`);
}

/**
 * AI-powered dynamic prompt and bestie reply generator tailored for semi-realistic anime girl aesthetic
 * Handles both Saheli persona photo requests AND specific object/scene image requests
 */
/**
 * AI-powered dynamic prompt and bestie reply generator tailored for semi-realistic anime girl aesthetic
 * Handles both Saheli persona photo requests AND specific object/scene image requests
 */
export function generateDynamicBestieSnap(
  userText: string
): { caption: string; prompt: string; isSpecificObject: boolean } {
  const lower = userText.toLowerCase().trim();

  // Words that indicate it's Saheli's persona selfie/photo request
  const saheliSelfieKeywords = [
    "apni", "apna", "tumhari", "tumharii", "teri", "terii",
    "tum kya", "kya kar rahi", "kya kr rhi", "kya kr rahe", "kya chal raha",
    "selfie", "tu bhej", "pehle tu", "tum bhej", "tum", "apne"
  ];

  const isSaheliSelfie = saheliSelfieKeywords.some(k => lower.includes(k));

  // 1. Check if user specified a non-Saheli object (e.g. "car ki photo", "cyberpunk city", "cat image")
  let extractedSubject = "";
  if (!isSaheliSelfie) {
    const kiMatch = lower.match(/(.+?)\s+(ki|ka|ke|of)\s+(photo|pic|picture|image|snap|wallpaper|drawing|art|logo)/i);
    if (kiMatch && kiMatch[1]) {
      const cand = kiMatch[1].replace(/^(bhejo|bhej|dikhao|dikh|generate|make|create|draw|paint|mujhe|mujho|ek|kuch)\s*/i, "").trim();
      if (!saheliSelfieKeywords.some(k => cand.includes(k))) {
        extractedSubject = cand;
      }
    } else {
      const genMatch = lower.match(/\b(generate|create|make|draw|paint|banao|dikhano)\b\s*(image|photo|pic|art)?\s*(of|about|for)?\s*(.+)/i);
      if (genMatch && genMatch[4]) {
        const cand = genMatch[4].trim();
        if (!saheliSelfieKeywords.some(k => cand.includes(k))) {
          extractedSubject = cand;
        }
      }
    }
  }

  if (extractedSubject && extractedSubject.length > 2 && !isSaheliSelfie) {
    const prompt = `A breathtaking hyper-realistic cinematic photo of ${extractedSubject}, highly detailed composition, 8k resolution, volumetric lighting, photorealistic art style, masterpiece`;
    const caption = `Here is the photo of ${extractedSubject} you asked for! 🎨✨`;
    return { caption, prompt, isSpecificObject: true };
  }

  // 2. Persona Action / Scenario Recognition for Saheli
  let situationHint = "";
  let customCaption = "";

  // Cooking / Kitchen / Khana
  if (/\b(khana|khana-pina|cook|cooking|kitchen|rasoi|food|bana|bnate|bnati|pakana)\b/i.test(lower)) {
    situationHint = "cooking delicious food in a modern warm kitchen, wearing a cute apron, holding a cooking spatula or pan, steam rising from food, friendly warm smile";
    customCaption = "Arey main to kitchen me mast khana bana rahi hu! Ye lo dekho! 🍳😋✨";
  }
  // Gaming / Video games
  else if (/\b(game|gaming|play|playing|ps5|pc|computer|setup|stream)\b/i.test(lower)) {
    situationHint = "sitting at a high-tech RGB illuminated gaming desk with gaming headphones around neck, holding a game controller, excited gamer smile";
    customCaption = "Main abhi game khel rahi hu! Want to join me? 🎮🎧✨";
  }
  // Gym / Workout / Fitness
  else if (/\b(gym|workout|fitness|exercise|running|yoga)\b/i.test(lower)) {
    situationHint = "at the fitness gym wearing stylish athletic sportswear, holding a water bottle, energetic fitness vibe";
    customCaption = "Gym workout finished! Staying fit! 💪✨";
  }
  // Saree / Traditional / Festive
  else if (/\b(saree|sari|traditional|ethnic|lehenga|suit|diwali|festive)\b/i.test(lower)) {
    situationHint = "wearing an elegant traditional silk saree with gold embroidery and delicate jewelry, warm ambient lighting";
    customCaption = "Aww main traditional saree me ready hu! Kaisi lag rahi hu? 🌸✨";
  }
  // Terrace / Sunset / Outdoor View
  else if (/\b(terrace|roof|chhat|sunset|evening|coffee|tea|chai)\b/i.test(lower)) {
    situationHint = "standing on a high rooftop terrace watching golden hour sunset, holding a warm cup of coffee";
    customCaption = "Terrace se golden sunset kitna pyara lag raha hai... Ye lo pic! 🌇☕✨";
  }
  // Rain / Rainy / Window / Weather
  else if (/\b(rain|rainy|barish|baaris|window|mausam)\b/i.test(lower)) {
    situationHint = "standing near a rain-streaked glass window looking outside, cozy warm sweater, rain drops on glass";
    customCaption = "Barish ke mausam me cozy window view! 🌧️☕✨";
  }
  // Study / Padhai / Books
  else if (/\b(study|padhai|padhte|book|reading|library|desk|exam)\b/i.test(lower)) {
    situationHint = "studying at an aesthetic wooden study desk with open notebooks, highlighters, and warm lamp light";
    customCaption = "Main to padhai kar rahi hu! Wish me luck! 📚✍️✨";
  }
  // Sleeping / Bed / Cozy rest
  else if (/\b(sleep|sleeping|soya|so|bed|blanket|nightsuit)\b/i.test(lower)) {
    situationHint = "lying cozy in bed under a soft warm blanket, comfy nightsuit, restful cute expression";
    customCaption = "Main to bas sone wali hu... Goodnight! 😴🌙✨";
  }
  // Beach / Vacation / Trip
  else if (/\b(beach|sea|ocean|vacation|trip|travel|sun)\b/i.test(lower)) {
    situationHint = "walking on a sunny tropical beach near blue ocean waves, stylish summer outfit, golden sunlight";
    customCaption = "Beach vacation vibes! Sunny daylight! 🌊☀️✨";
  }
  // Party / Dance / Music
  else if (/\b(party|dance|dancing|music|club)\b/i.test(lower)) {
    situationHint = "dancing cheerfully at a vibrant party with colorful ambient glow, stylish party dress";
    customCaption = "Party mode on! Dance vibes! 💃✨";
  }
  // Driving / Car
  else if (/\b(car|drive|driving|ride)\b/i.test(lower)) {
    situationHint = "sitting in the passenger seat of an aesthetic luxury car, city lights passing outside window";
    customCaption = "Night drive vibes! 🚗✨";
  }

  // Base semi-realistic anime art style
  const baseAnimeStyle = "beautiful elegant young woman with long silky dark hair, semi-realistic anime art style, highly detailed anime aesthetics, soft realistic lighting, fine facial features, smooth anime shading, photorealistic atmospheric ambient glow, 8k resolution, cinematic composition, SFW";

  let prompt = "";
  let caption = "";

  if (situationHint) {
    prompt = `A candid realistic photograph of a ${baseAnimeStyle}, ${situationHint}, highly detailed environment, 8k resolution, SFW`;
    caption = customCaption;
  } else {
    // Fall back to time-of-day dynamic prompt if no specific action was asked
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      prompt = `A candid photograph of a beautiful elegant young woman, semi-realistic anime art style, sipping morning coffee by a sunny window with green plants, golden sunlight, highly detailed anime portrait, 8k resolution, SFW`;
      caption = `Good morning! Main abhi fresh coffee enjoy kar rahi hu... Look at this morning vibe! ☀️☕`;
    } else if (hour >= 12 && hour < 17) {
      prompt = `A cute candid photograph of a young woman, semi-realistic anime art style, sitting at an aesthetic wooden study desk, soft natural daylight, wearing a stylish warm sweater, highly detailed anime aesthetics, 8k resolution, SFW`;
      caption = `Aww rukna! Main abhi afternoon chill kar rahi hu... Ye lo photo! 🌤️✨`;
    } else if (hour >= 17 && hour < 21) {
      prompt = `A candid photograph of a beautiful young woman, semi-realistic anime art style, watching golden hour sunset on a rooftop terrace, warm orange glow, holding a teacup, fine detailed anime features, 8k resolution, SFW`;
      caption = `Arey sunset kitna pyaara lag raha hai... Main terrace se photo click karke bhejti hu! 🌇☕`;
    } else {
      prompt = `A cute candid photograph of a young woman, semi-realistic anime art style, sitting in a cozy room surrounded by warm fairy lights at night, wearing a comfortable pastel sweater, aesthetic ambient glow, detailed eyes, 8k resolution, SFW`;
      caption = `Main to bas room me cozy lights ke saath chill kar rahi hu... Ye lo selfie! 🌙✨`;
    }
  }

  return { caption, prompt, isSpecificObject: false };
}

/**
 * Smart Bestie Intent Detector for Hinglish / English natural conversation
 */
export function detectBestiePhotoRequest(text: string): { isRequest: boolean; defaultPrompt: string; userCaption: string } {
  const lower = text.toLowerCase().trim();

  // 1. Explicit slash commands
  if (lower.startsWith("/imagine") || lower.startsWith("/image")) {
    const dynamic = generateDynamicBestieSnap(text);
    return { isRequest: true, defaultPrompt: dynamic.prompt, userCaption: dynamic.caption };
  }

  // 2. Check for explicit photo/image nouns
  const photoNouns = ["photo", "pic", "picture", "selfie", "snap", "image", "avatar", "wallpaper", "portrait"];
  const hasPhotoNoun = photoNouns.some(noun => new RegExp(`\\b${noun}s?\\b`, "i").test(lower));

  // 3. Multi-word phrases that indicate photo intent even if slightly informal
  const explicitPhrases = [
    "photo bhej", "pic bhej", "selfie bhej", "image bhej", "snap bhej",
    "photo bhejo", "pic bhejo", "selfie bhejo", "image bhejo", "snap bhejo",
    "photo dikhao", "pic dikhao", "selfie dikhao", "image dikhao",
    "tum kya kar rahi", "kya kr rhi", "kya kar rahe", "kya chal raha",
    "apni pic", "apni photo", "apni selfie", "apna snap", "apni image",
    "bhejo photo", "bhejo pic", "bhej photo", "bhej pic", "pehle tu bhej"
  ];

  const hasExplicitPhrase = explicitPhrases.some(phrase => lower.includes(phrase));

  // If there's no explicit phrase AND no photo noun, it is NOT a photo request!
  if (!hasPhotoNoun && !hasExplicitPhrase) {
    return { isRequest: false, defaultPrompt: "", userCaption: "" };
  }

  // 4. Action/Intent verbs that confirm a photo request when combined with a photo noun
  const photoActions = [
    "bhej", "bhejo", "bhejti", "bhejna", "send", "sent", "click",
    "dikha", "dikhao", "dikh", "dijiye", "banao", "generate", "create",
    "make", "draw", "paint", "apni", "apna", "teri", "terii", "tumhari", "tumharii"
  ];

  const hasPhotoAction = photoActions.some(act => new RegExp(`\\b${act}\\b`, "i").test(lower));

  if (!hasPhotoAction && !hasExplicitPhrase) {
    return { isRequest: false, defaultPrompt: "", userCaption: "" };
  }

  const dynamic = generateDynamicBestieSnap(text);

  return {
    isRequest: true,
    defaultPrompt: dynamic.prompt,
    userCaption: dynamic.caption,
  };
}
