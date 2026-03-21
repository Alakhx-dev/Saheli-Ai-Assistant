import { useEffect, useRef } from "react";

interface Petal {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

export default function PetalEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const petalElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // Initialize petals
  useEffect(() => {
    petalsRef.current = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 6 + Math.random() * 8,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 2,
    }));
  }, []);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      // Update petal positions based on mouse proximity
      petalsRef.current.forEach((petal) => {
        const el = petalElementsRef.current.get(petal.id);
        if (!el || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const petalX =
          rect.left + (petal.left / 100) * rect.width;
        const petalY =
          rect.top + (petal.top / 100) * rect.height;

        const dx = mouseRef.current.x - petalX;
        const dy = mouseRef.current.y - petalY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 150;

        if (distance < repelRadius) {
          const strength = (1 - distance / repelRadius) * 30;
          const angle = Math.atan2(dy, dx);
          const offsetX = Math.cos(angle) * strength;
          const offsetY = Math.sin(angle) * strength;

          el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        } else {
          el.style.transform = "translate(0, 0)";
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="petal-container fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {petalsRef.current.map((petal) => (
        <div
          key={petal.id}
          ref={(el) => {
            if (el) petalElementsRef.current.set(petal.id, el);
          }}
          className="petal"
          style={{
            "--petal-duration": `${petal.duration}s`,
            "--petal-delay": `${petal.delay}s`,
            "--petal-size": `${petal.size}px`,
            "--petal-start-left": `${petal.left}%`,
            "--petal-start-top": `${petal.top}%`,
          } as React.CSSProperties & Record<string, string>}
        />
      ))}
    </div>
  );
}
