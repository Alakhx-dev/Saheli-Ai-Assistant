import { useEffect, useRef, useState } from "react";

const THEME_BLOBS: Record<string, number[][]> = {
  pink: [
    [340, 70, 60], // pink
    [280, 60, 55], // purple/lavender
    [320, 65, 50], // rose
    [260, 55, 45], // indigo
  ],
  yellow: [
    [48, 85, 55],  // warm gold/yellow
    [36, 75, 50],  // amber
    [60, 80, 50],  // yellow
    [24, 70, 45],  // light orange
  ],
  blue: [
    [195, 85, 55], // sky blue
    [210, 75, 50], // deep sky blue
    [180, 80, 45], // cyan
    [230, 65, 45], // light blue-purple
  ],
  orchid: [
    [300, 85, 60], // orchid magenta
    [320, 80, 55], // cyber magenta
    [280, 75, 55], // deep violet
    [340, 70, 50], // bright pinkish purple
  ],
  peach: [
    [18, 85, 60], // soft peach orange
    [10, 80, 58], // light coral peach
    [25, 75, 55], // light amber peach
    [350, 80, 56], // warm pinkish peach
  ],
  beige: [
    [34, 45, 75], // rich dark cream
    [40, 42, 80], // warm gold cream
    [30, 38, 70], // tan/beige accent
    [45, 32, 68], // dusty cream/sand
  ],
  maroon: [
    [349, 95, 48],  // glow crimson
    [347, 95, 38],  // ruby burgundy
    [352, 95, 42],  // vibrant wine
    [340, 85, 28],  // base maroon
  ],
  gemini: [
    [217, 100, 50], // Gemini Cosmic Blue
    [280, 80, 45],  // Gemini Purple
    [325, 90, 48],  // Gemini Magenta/Pink
    [190, 95, 48],  // Gemini Light Azure
  ],
};

const getThemeBlobs = (theme: string) => {
  if (theme === "custom" && typeof window !== "undefined") {
    const customHex = window.localStorage.getItem("saheli_custom_theme_color") || "#ff0078";
    let r = parseInt(customHex.slice(1, 3), 16) / 255;
    let g = parseInt(customHex.slice(3, 5), 16) / 255;
    let b = parseInt(customHex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    return [
      [hDeg, sPct, lPct],
      [(hDeg + 30) % 360, Math.max(10, sPct - 10), Math.max(10, lPct - 5)],
      [(hDeg + 330) % 360, Math.max(10, sPct - 5), Math.max(10, lPct - 10)],
      [(hDeg + 60) % 360, Math.max(10, sPct - 15), Math.max(10, lPct - 15)],
    ];
  }
  return THEME_BLOBS[theme] || THEME_BLOBS.pink;
};

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("saheli_theme_color") || "maroon";
    }
    return "maroon";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const color = window.localStorage.getItem("saheli_theme_color") || "maroon";
      setActiveTheme(color);
    };
    window.addEventListener("saheli_theme_color_changed", handleThemeChange);
    return () => {
      window.removeEventListener("saheli_theme_color_changed", handleThemeChange);
    };
  }, []);

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

    // Initial HSL colors from the starting theme
    const initialColors = getThemeBlobs(activeTheme);
    const blobs = [
      { x: 0.3, y: 0.3, r: 350, color: [...initialColors[0]] },
      { x: 0.7, y: 0.6, r: 300, color: [...initialColors[1]] },
      { x: 0.5, y: 0.8, r: 280, color: [...initialColors[2]] },
      { x: 0.2, y: 0.7, r: 260, color: [...initialColors[3]] },
    ];

    const draw = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "hsl(230, 25%, 7%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Access latest target colors ref or active state value inside draw loop
      const currentTheme = window.localStorage.getItem("saheli_theme_color") || "maroon";
      const targetColors = getThemeBlobs(currentTheme);

      blobs.forEach((b, i) => {
        const target = targetColors[i] || targetColors[0];
        // Smoothly interpolate (lerp) current HSL values to target HSL values over frames
        b.color[0] += (target[0] - b.color[0]) * 0.035;
        b.color[1] += (target[1] - b.color[1]) * 0.035;
        b.color[2] += (target[2] - b.color[2]) * 0.035;

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
  }, [activeTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: "none" }}
    />
  );
};

export default AnimatedBackground;
