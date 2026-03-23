const SaheliLogo = ({ size = 36 }: { size?: number }) => (
  <div
    className="flex items-center justify-center rounded-xl saheli-glow-sm"
    style={{
      width: size,
      height: size,
      background: "linear-gradient(135deg, hsl(340,72%,62%), hsl(280,50%,60%))",
    }}
  >
    <span
      className="font-display font-bold leading-none"
      style={{ fontSize: size * 0.5, color: "white" }}
    >
      S
    </span>
  </div>
);

export default SaheliLogo;
