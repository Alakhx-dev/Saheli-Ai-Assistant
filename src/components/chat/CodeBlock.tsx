import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard! 📋✨");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
      toast.error("Failed to copy code ❌");
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0f0f13]/90 shadow-2xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white/[0.03] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.05] select-none">
        <span className="font-mono text-pink-300/90">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      {/* Code body */}
      <div className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-100 bg-[#060608]/40 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
        <pre className="m-0 select-text"><code className="block select-text">{code}</code></pre>
      </div>
    </div>
  );
};

export function renderMessageContent(content: string) {
  if (!content) return null;

  // Split content by code blocks wrapped in triple backticks
  const parts = content.split(/(```[a-zA-Z0-9+#-]*\n[\s\S]*?(?:```|$))/g);

  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const firstLine = lines[0]; // e.g., "```c" or "```"
      const language = firstLine.replace("```", "").trim() || "code";

      let code = "";
      const lastLine = lines[lines.length - 1];

      if (lastLine.trim() === "```" && lines.length > 1) {
        code = lines.slice(1, -1).join("\n");
      } else {
        code = lines.slice(1).join("\n");
        if (code.endsWith("```")) {
          code = code.slice(0, -3);
        }
      }

      // Render custom CodeBlock
      return <CodeBlock key={index} language={language} code={code} />;
    } else {
      if (!part) return null;
      return (
        <span key={index} className="whitespace-pre-wrap select-text">
          {part}
        </span>
      );
    }
  });
}
