import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "Space Grotesk", "Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        saheli: {
          pink: "hsl(var(--saheli-pink))",
          rose: "hsl(var(--saheli-rose))",
          lavender: "hsl(var(--saheli-lavender))",
          teal: "hsl(var(--saheli-teal))",
          amber: "hsl(var(--saheli-amber))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0px)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "mesh-gradient": {
          "0%": { backgroundPosition: "0% 0%, 0% 50%, 0% 100%, 100% 0%, 100% 50%, 100% 100%" },
          "25%": { backgroundPosition: "100px 0%, -100px 50%, 200px 100%, 0% 100%, 100px 50%, -100px 0%" },
          "50%": { backgroundPosition: "200px 0%, 100px 50%, -100px 100%, 200px 100%, 0% 50%, 100px 0%" },
          "75%": { backgroundPosition: "100px 0%, 200px 50%, 0% 100%, 100px 100%, 200px 50%, -100px 0%" },
          "100%": { backgroundPosition: "0% 0%, 0% 50%, 0% 100%, 100% 0%, 100% 50%, 100% 100%" },
        },
        "neon-glow": {
          "0%": { 
            boxShadow: "0 0 5px hsla(var(--saheli-pink), 0.3), 0 0 10px hsla(var(--saheli-lavender), 0.2)" 
          },
          "50%": { 
            boxShadow: "0 0 20px hsla(var(--saheli-pink), 0.5), 0 0 40px hsla(var(--saheli-lavender), 0.3)" 
          },
          "100%": { 
            boxShadow: "0 0 5px hsla(var(--saheli-pink), 0.3), 0 0 10px hsla(var(--saheli-lavender), 0.2)" 
          },
        },
        "hover-scale": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.05)" },
        },
        "click-scale": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(0.95)" },
        },
        "mesh-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-scale": "fade-in-scale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-left": "slide-in-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "mesh-gradient": "mesh-gradient 20s ease-in-out infinite",
        "neon-glow": "neon-glow 2s ease-in-out infinite",
        "hover-scale": "hover-scale 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
        "click-scale": "click-scale 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "mesh-shift": "mesh-shift 15s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
