import { useEffect, useRef } from "react";

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const blobs = [
      { x: 0.3, y: 0.3, r: 350, color: [220, 50, 80] },   // pink
      { x: 0.7, y: 0.6, r: 300, color: [270, 50, 55] },   // lavender
      { x: 0.5, y: 0.8, r: 280, color: [175, 45, 35] },   // teal
      { x: 0.2, y: 0.7, r: 260, color: [340, 60, 50] },   // rose
    ];

    const draw = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "hsl(230, 25%, 7%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((b, i) => {
        const cx = canvas.width * (b.x + Math.sin(t + i * 1.5) * 0.12);
        const cy = canvas.height * (b.y + Math.cos(t * 0.8 + i) * 0.1);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        grad.addColorStop(0, `hsla(${b.color[0]}, ${b.color[1]}%, ${b.color[2]}%, 0.25)`);
        grad.addColorStop(1, `hsla(${b.color[0]}, ${b.color[1]}%, ${b.color[2]}%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: "none" }}
    />
  );
};

export default AnimatedBackground;
