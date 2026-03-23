import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Volume2, VolumeX, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Mujhe motivate karo 💪",
  "Aaj ka mood kya hai? 🌸",
  "Koi acchi advice do ✨",
  "Tell me a joke 😄",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Chat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_~`>]/g, "").replace(/\[.*?\]\(.*?\)/g, "");
    const utter = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(
      (v) => v.lang.startsWith("hi") && v.name.toLowerCase().includes("female")
    ) || voices.find((v) => v.lang.startsWith("hi")) || voices[0];
    if (hindiVoice) utter.voice = hindiVoice;
    utter.rate = 0.95;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (!audioUnlocked) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis?.speak(u);
      setAudioUnlocked(true);
    }

    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantText = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantText } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantText }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantText) speak(assistantText);
    } catch (e: any) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Oops! ${e.message || "Kuch gadbad ho gayi."} 😔` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)] glass-panel p-6 rounded-3xl mx-4 shadow-2xl saheli-glow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 glass-subtle rounded-full px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-primary animate-[pulse-glow_2s_infinite]" />
            <h1 className="font-display text-xl font-bold saheli-gradient-text drop-shadow-lg">Saheli Chat</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="glass-btn h-12 w-12 p-3 backdrop-blur-sm hover:scale-110 hover:saheli-glow-sm transition-all duration-300 text-muted-foreground hover:text-foreground shadow-lg"
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 glass-strong rounded-3xl p-6 mb-6 glass-scroll shadow-xl">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground text-sm">
                  Saheli se baat karo! Main tumhari dost hoon 💕
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="glass-btn rounded-full px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-none"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-6 py-4 text-sm leading-relaxed font-medium shadow-xl transform-gpu ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-[hsl(var(--saheli-pink)/0.3)] to-[hsl(var(--saheli-rose)/0.3)] text-foreground rounded-br-none backdrop-blur-xl border-r-4 border-[hsl(var(--saheli-pink))]"
                      : "glass-strong text-foreground rounded-bl-none backdrop-blur-2xl animate-[pulse-glow_4s_ease-in-out_infinite] border-l-4 border-[hsl(var(--saheli-lavender))]"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
            <div className="glass-strong rounded-3xl rounded-bl-none px-6 py-4 backdrop-blur-2xl animate-[pulse-glow_2s_ease-in-out_infinite] border-l-4 border-[hsl(var(--saheli-lavender))]">
                  <span className="inline-flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[hsl(var(--saheli-pink))] to-[hsl(var(--saheli-lavender))] animate-[pulse-glow_1.5s_infinite] shadow-lg" style={{ animationDelay: "0ms" }} />
                    <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[hsl(var(--saheli-pink))] to-[hsl(var(--saheli-lavender))] animate-[pulse-glow_1.5s_infinite] shadow-lg" style={{ animationDelay: "200ms" }} />
                    <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[hsl(var(--saheli-pink))] to-[hsl(var(--saheli-lavender))] animate-[pulse-glow_1.5s_infinite] shadow-lg" style={{ animationDelay: "400ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            disabled={isLoading}
            className="flex-1 glass-subtle h-14 text-lg placeholder:text-muted-foreground/80 backdrop-blur-sm border-white/20 focus:border-saheli-pink/50 focus:ring-2 focus:ring-saheli-pink/30 transition-all"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="glass-btn h-14 w-14 shrink-0 shadow-2xl hover:scale-110 active:scale-[0.97]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
