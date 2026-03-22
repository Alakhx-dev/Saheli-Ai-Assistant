export function SaheliLogo({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id="saheliGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#f97316", stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Heart shape */}
      <path
        d="M50 90 C25 75, 10 60, 10 45 C10 30, 20 20, 30 20 C40 20, 50 30, 50 30 C50 30, 60 20, 70 20 C80 20, 90 30, 90 45 C90 60, 75 75, 50 90 Z"
        fill="url(#saheliGradient)"
      />

      {/* Sparkle accents */}
      <circle cx="35" cy="25" r="3" fill="white" opacity="0.8" />
      <circle cx="65" cy="35" r="2" fill="white" opacity="0.6" />

      {/* Center glow */}
      <circle cx="50" cy="50" r="8" fill="white" opacity="0.15" />
    </svg>
  );
}
