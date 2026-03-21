import { useEffect, useRef, useState } from "react";

interface Heart {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

const MAX_HEARTS = 8;
const HEART_LIFETIME = 1200; // ms

export default function HeartEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const heartsRef = useRef<Heart[]>([]);
  const nextIdRef = useRef(0);
  const lastHeartTimeRef = useRef(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();

      // Throttle heart generation (avoid spam)
      if (now - lastHeartTimeRef.current < 100) return;

      if (heartsRef.current.length >= MAX_HEARTS) {
        heartsRef.current.shift();
      }

      const newHeart: Heart = {
        id: nextIdRef.current++,
        x: e.clientX,
        y: e.clientY,
        createdAt: now,
      };

      heartsRef.current.push(newHeart);
      lastHeartTimeRef.current = now;
      setHearts([...heartsRef.current]);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Clean up expired hearts
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const stillValid = heartsRef.current.filter(
        (h) => now - h.createdAt < HEART_LIFETIME
      );

      if (stillValid.length !== heartsRef.current.length) {
        heartsRef.current = stillValid;
        setHearts([...stillValid]);
      }
    }, 300);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <div
      ref={containerRef}
      className="heart-container fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {hearts.map((heart) => {
        const elapsed = Date.now() - heart.createdAt;
        const progress = elapsed / HEART_LIFETIME;

        return (
          <div
            key={heart.id}
            className="heart-element"
            style={{
              left: heart.x,
              top: heart.y,
              "--heart-progress": progress,
            } as React.CSSProperties & Record<string, number>}
          >
            ❤️
          </div>
        );
      })}
    </div>
  );
}
