const SHAPES = [
  {
    left: "5%",
    top: "8%",
    width: "280px",
    height: "280px",
    color: "hsla(270, 80%, 55%, 0.18)",
    duration: "18s",
    delay: "-2s",
  },
  {
    left: "70%",
    top: "5%",
    width: "320px",
    height: "320px",
    color: "hsla(300, 60%, 50%, 0.12)",
    duration: "22s",
    delay: "-5s",
  },
  {
    left: "15%",
    top: "65%",
    width: "240px",
    height: "240px",
    color: "hsla(330, 70%, 55%, 0.1)",
    duration: "20s",
    delay: "-7s",
  },
  {
    left: "80%",
    top: "70%",
    width: "200px",
    height: "200px",
    color: "hsla(250, 60%, 55%, 0.12)",
    duration: "16s",
    delay: "-4s",
  },
  {
    left: "40%",
    top: "20%",
    width: "180px",
    height: "180px",
    color: "hsla(280, 70%, 50%, 0.1)",
    duration: "14s",
    delay: "-1s",
  },
  {
    left: "55%",
    top: "82%",
    width: "260px",
    height: "260px",
    color: "hsla(260, 65%, 50%, 0.1)",
    duration: "24s",
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
            ["--duration" as string]: shape.duration,
            ["--delay" as string]: shape.delay,
          }}
        />
      ))}
    </div>
  );
}
