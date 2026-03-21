import React, { useEffect, useRef, useMemo } from 'react';

interface PetalProps {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  drift: string;
}

const Petal: React.FC<PetalProps> = ({ left, size, duration, delay, drift }) => (
  <div
    className="absolute animate-fall pointer-events-none"
    style={{
      left,
      width: size,
      height: size,
      animationDuration: duration,
      animationDelay: delay,
      '--drift': drift,
    } as any}
  >
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-40">
      <path
        d="M50 0C50 0 100 25 100 50C100 75 75 100 50 100C25 100 0 75 0 50C0 25 50 0 50 0Z"
        fill="url(#petal-gradient)"
        className="drop-shadow-[0_0_8px_rgba(255,194,209,0.3)]"
      />
      <defs>
        <radialGradient id="petal-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(50)">
          <stop stopColor="#ffc2d1" />
          <stop offset="1" stopColor="#ff8fa3" />
        </radialGradient>
      </defs>
    </svg>
  </div>
);

export const BackgroundEffects: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<{ x: number; y: number; age: number }[]>([]);

  const petals = useMemo(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 15 + Math.random() * 20,
      duration: `${15 + Math.random() * 10}s`,
      delay: `${Math.random() * -20}s`,
      drift: `${(Math.random() - 0.5) * 100}px`,
    })), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    let animationFrame: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new point
      pointsRef.current.push({ ...mouseRef.current, age: 0 });

      // Update and draw points
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < pointsRef.current.length; i++) {
        const p = pointsRef.current[i];
        p.age += 1;

        if (p.age > 40) {
          pointsRef.current.splice(i, 1);
          i--;
          continue;
        }

        const opacity = 1 - p.age / 40;
        ctx.strokeStyle = `rgba(255, 194, 209, ${opacity * 0.4})`;
        
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          const prev = pointsRef.current[i - 1];
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();

      // Add soft glow to the latest points
      if (pointsRef.current.length > 0) {
        const last = pointsRef.current[pointsRef.current.length - 1];
        const gradient = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 20);
        gradient.addColorStop(0, 'rgba(255, 194, 209, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 194, 209, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(last.x - 20, last.y - 20, 40, 40);
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {petals.map((p) => (
        <Petal key={p.id} {...p} />
      ))}
    </div>
  );
};
