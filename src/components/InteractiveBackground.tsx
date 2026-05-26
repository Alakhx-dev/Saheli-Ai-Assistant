import { useEffect, useRef } from "react";
import Spline from "@splinetool/react-spline";

export default function InteractiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isMobile = /iPhone|Android/i.test(navigator.userAgent);
    if (isMobile) {
      return;
    }

    let rafId = 0;

    const handleMove = (event: MouseEvent) => {
      if (!containerRef.current) return;

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 20;
        const y = (event.clientY / window.innerHeight - 0.5) * 20;
        if (containerRef.current) {
          containerRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.02)`;
        }
      });
    };

    window.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const isMobile = /iPhone|Android/i.test(navigator.userAgent);
  if (isMobile) return null;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        ref={containerRef}
        className="animate-pulse-slow absolute inset-0 opacity-30 transition-transform duration-300 ease-out"
      >
        <Spline scene="https://prod.spline.design/HkCXeW8RCSFI52gC/scene.splinecode" />
      </div>

      <div className="bg-gradient-themed absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-blue-500/20 blur-3xl" />

      <div className="particles absolute inset-0 pointer-events-none" />
    </div>
  );
}
