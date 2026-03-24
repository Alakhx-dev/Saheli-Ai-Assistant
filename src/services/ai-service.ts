export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SUPABASE_URL = "https://qambjrhwfmjysfdaebxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWJqcmh3Zm1qeXNmZGFlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAzODAxMDMsImV4cCI6MTk5NTk1NjEwM30.f7LL03KYZ1HzWJVGUl5R4xK6W1_kCvIQ9ORLMz_A4BE";

export const aiService = {
  async sendMessage(messages: ChatMessage[], newText: string, imageBase64?: string): Promise<string> {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: messages,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Parse the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      let fullText = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                fullText += data.text;
              } else if (data.type === "done") {
                fullText += data.text;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullText || "Connection problem... try again.";
    } catch (error) {
      console.error("AI Service Error:", error);
      return "Connection problem... try again.";
    }
  }
};
