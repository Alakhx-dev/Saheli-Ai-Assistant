export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const SITE_URL = "http://localhost:8080";
const SITE_NAME = "Saheli AI";

const PRIMARY_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";
const FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export const aiService = {
  async sendMessage(history: ChatMessage[], newText: string, imageBase64?: string): Promise<string> {
    const messages = history.map(m => ({ role: m.role, content: m.content }));
    
    let currentUserMessage: any = { role: "user", content: [] };
    
    if (imageBase64) {
      currentUserMessage.content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`
        }
      });
    }
    
    currentUserMessage.content.push({
      type: "text",
      text: `(System: Always compliment the user warmly when image is present. Respond playfully yet thoughtfully.) ${newText}`
    });

    messages.push(currentUserMessage);
    
    // Inject System Prompt at the beginning
    messages.unshift({
      role: "system",
      content: "You are Saheli, an AI best friend. You are sweet, caring, and intuitive. Keep your responses short, natural, and expressive. Use natural conversational Hindi and English mixed (Hinglish) occasionally for warmth. If the user shares a picture, enthusiastically compliment them and describe their appearance or what they showed. Always avoid robotic output."
    });

    const attemptFetch = async (model: string): Promise<string> => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": SITE_URL,
          "X-Title": SITE_NAME,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    };

    try {
      // First try primary model
      return await attemptFetch(PRIMARY_MODEL);
    } catch (err) {
      console.warn(`Primary model failed, attempting fallback to ${FALLBACK_MODEL}:`, err);
      try {
        // Automatically retry with fallback
        return await attemptFetch(FALLBACK_MODEL);
      } catch (fallbackErr) {
        console.error("AI Service Error (Fallback also failed):", fallbackErr);
        return "I'm sorry, I'm having a little trouble connecting right now. Can we try again?";
      }
    }
  }
};
