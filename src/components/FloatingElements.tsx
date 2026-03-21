const SHAPES = [
  {
    left: "8%",
    top: "10%",
    width: "190px",
    height: "190px",
    color: "hsla(var(--saheli-pink), 0.32)",
    duration: "15s",
    delay: "-2s",
  },
  {
    left: "72%",
    top: "6%",
    width: "220px",
    height: "220px",
    color: "hsla(var(--saheli-lavender), 0.3)",
    duration: "18s",
    delay: "-5s",
  },
  {
    left: "20%",
    top: "68%",
    width: "170px",
    height: "170px",
    color: "hsla(var(--saheli-peach), 0.28)",
    duration: "20s",
    delay: "-7s",
  },
  {
    left: "78%",
    top: "70%",
    width: "150px",
    height: "150px",
    color: "hsla(var(--saheli-mint), 0.2)",
    duration: "16s",
    delay: "-4s",
  },
  {
    left: "45%",
    top: "24%",
    width: "130px",
    height: "130px",
    color: "hsla(var(--saheli-lavender), 0.24)",
    duration: "14s",
    delay: "-1s",
  },
  {
    left: "52%",
    top: "80%",
    width: "190px",
    height: "190px",
    color: "hsla(var(--saheli-pink), 0.24)",
    duration: "22s",
    delay: "-9s",
  },
];

export default function FloatingElements() {
  return (
    <div className="floating-shapes" aria-hidden="true">
      {SHAPES.map((shape, index) => (
        <span
          key={index}
          className="floating-shape"
          style={{
            left: shape.left,
            top: shape.top,
            width: shape.width,
            height: shape.height,
            background: shape.color,
            // CSS variables keep animation lightweight and declarative.
            ["--duration" as string]: shape.duration,
            ["--delay" as string]: shape.delay,
          }}
        />
      ))}
    </div>
  );
}
