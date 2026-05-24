import React from "react";

interface SaheliLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

const SaheliLogo = ({ size = 28, showText = false, className = "" }: SaheliLogoProps) => {
  const heartColor = "#ff77a9";
  const heartSize = showText ? size * 0.85 : size;

  return (
    <div
      className={`saheli-logo-wrapper flex items-center select-none ${className}`}
      style={{
        gap: `${size * 0.28}px`,
        overflow: "visible",
      }}
    >
      {/* Solid Pink Heart Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={heartColor}
        className="saheli-logo-heart drop-shadow-[0_2px_4px_rgba(255,119,169,0.3)] shrink-0"
        style={{ width: `${heartSize}px`, height: `${heartSize}px` }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>

      {/* Bubbly Saheli AI Text */}
      {showText && (
        <span
          className="font-['Fredoka',_sans-serif] font-semibold text-[#ff77a9] tracking-wide whitespace-nowrap"
          style={{ fontSize: `${size * 0.65}px` }}
        >
          Saheli Ai
        </span>
      )}
    </div>
  );
};

export default SaheliLogo;
