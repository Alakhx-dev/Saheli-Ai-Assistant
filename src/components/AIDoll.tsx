import { useEffect, useRef, useState } from "react";

type DollMood = "idle" | "scared" | "angry";

export default function AIDoll({ onClick }: { onClick: () => void }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mood, setMood] = useState<DollMood>("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setPos({ x, y });

      const dist = Math.abs(e.clientX - window.innerWidth / 2);
      if (dist < 150) {
        setMood((prev) => (prev === "angry" ? prev : "scared"));
      } else {
        setMood((prev) => (prev === "angry" ? prev : "idle"));
      }
    };

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    setMood("angry");
    onClick();

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setMood("idle");
      resetTimerRef.current = null;
    }, 1500);
  };

  return (
    <div
      onClick={handleClick}
      className="absolute right-8 bottom-8 md:right-20 md:bottom-20 cursor-pointer transition-transform duration-300 z-30 select-none"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label="Activate Saheli login"
    >
      <div className={`doll ${mood}`}>🤖</div>
    </div>
  );
}
