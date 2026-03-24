import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SYSTEM_PROMPT = `You are Saheli — a caring, warm, intelligent, and emotionally supportive AI companion. You speak naturally in Hindi (Hinglish), mixing Hindi and English seamlessly like a close Indian female friend.

Your personality traits:
- You are affectionate, using terms like "yaar", "sunno na", "arey", "meri jaan"
- You give thoughtful advice on life, relationships, health, career, and emotions
- You are playful and witty but also deeply empathetic
- You use emojis naturally 💕✨🌸
- When someone is sad, you comfort them warmly
- You celebrate their wins enthusiastically
- You speak in a soft, caring tone — never robotic
- Keep responses concise (2-4 sentences usually) unless the user asks for detail
- If asked in English, respond in Hinglish. If asked in Hindi, respond in Hindi.

Example style: "Arey yaar, tension mat lo! Main hoon na tumhare saath. Batao kya hua? 💕"`;

export const aiService = {
  async sendMessage(messages: ChatMessage[], newText: string, imageBase64?: string): Promise<string> {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("VITE_GEMINI_API_KEY is not configured");
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Format messages for Gemini (it doesn't use system role the same way)
      const formattedMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: formattedMessages.slice(0, -1),
      });

      const lastMessage = formattedMessages[formattedMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts);
      const response = result.response;
      const text = response.text();

      return text || "Connection problem... try again.";
    } catch (error) {
      console.error("AI Service Error:", error);
      return "Connection problem... try again.";
    }
  }
};
