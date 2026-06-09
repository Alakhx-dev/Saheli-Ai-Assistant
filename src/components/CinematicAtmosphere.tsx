import { memo, type CSSProperties } from "react";
import "@/styles/cinematicAtmosphere.css";

type AtmosphereLayer = "ambient" | "characterBack" | "foreground";

interface CinematicAtmosphereProps {
  layer?: AtmosphereLayer;
}

type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const ambientParticles = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  x: `${seeded(index, 1) * 100}%`,
  y: `${seeded(index, 2) * 100}%`,
  size: `${1 + seeded(index, 3) * 2.4}px`,
  drift: `${-7 + seeded(index, 4) * 14}vw`,
  duration: `${18 + seeded(index, 5) * 18}s`,
  delay: `-${seeded(index, 6) * 30}s`,
  opacity: 0.08 + seeded(index, 7) * 0.16,
  blur: `${0.5 + seeded(index, 8) * 1.6}px`,
}));

const petals = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  layer: index % 3 === 0 ? "back" : "front",
  x: `${seeded(index, 11) * 100}%`,
  size: `${7 + seeded(index, 12) * 11}px`,
  drift: `${-18 + seeded(index, 13) * 36}vw`,
  duration: `${22 + seeded(index, 14) * 18}s`,
  delay: `-${seeded(index, 15) * 34}s`,
  rotate: `${seeded(index, 16) * 360}deg`,
  opacity: 0.18 + seeded(index, 17) * 0.26,
  blur: `${seeded(index, 18) * 1.8}px`,
  tone: index % 2 === 0 ? "pink" : "peach",
}));

const dressParticles = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  x: `${40 + seeded(index, 21) * 20}%`,
  y: `${32 + seeded(index, 22) * 34}%`,
  size: `${1.5 + seeded(index, 23) * 2.5}px`,
  duration: `${6 + seeded(index, 24) * 7}s`,
  delay: `-${seeded(index, 25) * 10}s`,
  opacity: 0.1 + seeded(index, 26) * 0.2,
}));

const butterflyImageVars = {
  "--butterfly-pink": "url('/butterflies/pink-transparent.png')",
  "--butterfly-lavender": "url('/butterflies/lavender-transparent.png')",
  "--butterfly-cyan": "url('/butterflies/cyan-transparent.png')",
  "--butterfly-gold": "url('/butterflies/gold-transparent.png')",
  "--butterfly-emerald": "url('/butterflies/emerald-transparent.png')",
} satisfies StyleVars;

// Static flying butterflies config - looping infinitely inside the screen (no appearing/disappearing)
const flyingButterflies = [
  {
    id: "fly-1",
    tone: "pink",
    loopClass: "cinematic-hero-butterfly--loop3",
    size: "clamp(22px, 3.0vw, 34px)",
    duration: "80s",
    delay: "-20s",
    flapDuration: "2.4s",
    opacity: 0.58
  },
  {
    id: "fly-2",
    tone: "lavender",
    loopClass: "cinematic-hero-butterfly--loop2",
    size: "clamp(20px, 2.8vw, 30px)",
    duration: "104s",
    delay: "-1.5s",
    flapDuration: "3.0s",
    opacity: 0.54
  },
  {
    id: "fly-3",
    tone: "cyan",
    loopClass: "cinematic-hero-butterfly--loop4",
    size: "clamp(22px, 3.0vw, 32px)",
    duration: "92s",
    delay: "-10s",
    flapDuration: "2.1s",
    opacity: 0.52
  },
  {
    id: "fly-4",
    tone: "gold",
    loopClass: "cinematic-hero-butterfly--loop7",
    size: "clamp(24px, 3.2vw, 36px)",
    duration: "90s",
    delay: "-23s",
    flapDuration: "2.6s",
    opacity: 0.56
  },
  {
    id: "fly-5",
    tone: "emerald",
    loopClass: "cinematic-hero-butterfly--loop8",
    size: "clamp(20px, 2.8vw, 30px)",
    duration: "100s",
    delay: "-45s",
    flapDuration: "2.8s",
    opacity: 0.5
  },
  {
    id: "fly-6",
    tone: "cyan",
    loopClass: "cinematic-hero-butterfly--loop9",
    size: "clamp(18px, 2.4vw, 28px)",
    duration: "84s",
    delay: "-0.8s",
    flapDuration: "2.2s",
    opacity: 0.48
  },
  {
    id: "fly-7",
    tone: "gold",
    loopClass: "cinematic-hero-butterfly--loop5",
    size: "clamp(21px, 2.9vw, 31px)",
    duration: "96s",
    delay: "-15s",
    flapDuration: "2.5s",
    opacity: 0.52
  },
  {
    id: "fly-8",
    tone: "lavender",
    loopClass: "cinematic-hero-butterfly--loop6",
    size: "clamp(19px, 2.6vw, 29px)",
    duration: "76s",
    delay: "-30s",
    flapDuration: "2.8s",
    opacity: 0.5
  },
  {
    id: "fly-9",
    tone: "gold",
    loopClass: "cinematic-hero-butterfly--loop13",
    size: "clamp(18px, 2.5vw, 28px)",
    duration: "84s",
    delay: "-12s",
    flapDuration: "2.3s",
    opacity: 0.6
  },
  {
    id: "fly-10",
    tone: "emerald",
    loopClass: "cinematic-hero-butterfly--loop14",
    size: "clamp(18px, 2.5vw, 28px)",
    duration: "88s",
    delay: "-24s",
    flapDuration: "2.5s",
    opacity: 0.58
  },
  {
    id: "fly-11",
    tone: "pink",
    loopClass: "cinematic-hero-butterfly--loop15",
    size: "clamp(20px, 2.8vw, 30px)",
    duration: "80s",
    delay: "-6s",
    flapDuration: "2.1s",
    opacity: 0.62
  }
] as const;

function renderPetals(targetLayer: "back" | "front") {
  return petals
    .filter((petal) => petal.layer === targetLayer)
    .map((petal) => (
      <span
        key={petal.id}
        className={`cinematic-petal cinematic-petal--${petal.tone}`}
        style={
          {
            "--petal-x": petal.x,
            "--petal-size": petal.size,
            "--petal-drift": petal.drift,
            "--petal-duration": petal.duration,
            "--petal-delay": petal.delay,
            "--petal-rotate": petal.rotate,
            "--petal-opacity": petal.opacity,
            "--petal-blur": petal.blur,
          } as StyleVars
        }
      />
    ));
}

const CinematicAtmosphere = memo(function CinematicAtmosphere({
  layer = "ambient",
}: CinematicAtmosphereProps) {
  if (layer === "characterBack") {
    return (
      <div className="cinematic-character-atmosphere" aria-hidden="true">
        <div className="cinematic-character-bloom" />
        <div className="cinematic-character-haze" />
        <div className="cinematic-petal-field cinematic-petal-field--back">
          {renderPetals("back")}
        </div>
      </div>
    );
  }

  if (layer === "foreground") {
    return (
      <div className="cinematic-foreground-atmosphere" aria-hidden="true">
        <div className="cinematic-dress-particles">
          {dressParticles.map((particle) => (
            <span
              key={particle.id}
              className="cinematic-dress-particle"
              style={
                {
                  "--spark-x": particle.x,
                  "--spark-y": particle.y,
                  "--spark-size": particle.size,
                  "--spark-duration": particle.duration,
                  "--spark-delay": particle.delay,
                  "--spark-opacity": particle.opacity,
                } as StyleVars
              }
            />
          ))}
        </div>

        <div className="cinematic-petal-field cinematic-petal-field--front">
          {renderPetals("front")}
        </div>

        {/* Dynamic closed-loop flying butterflies (always visible, slowly floating on screen) */}
        {flyingButterflies.map((butterfly) => (
          <div
            key={butterfly.id}
            className={`cinematic-hero-butterfly ${butterfly.loopClass} cinematic-hero-butterfly--${butterfly.tone}`}
            style={
              {
                "--butterfly-size": butterfly.size,
                "--flight-duration": butterfly.duration,
                "--flight-delay": butterfly.delay,
                "--wing-flap-duration": butterfly.flapDuration,
                "--path-opacity": butterfly.opacity,
                ...butterflyImageVars,
              } as StyleVars
            }
          >
            <div className={`cinematic-hero-butterfly__form cinematic-hero-butterfly__form--${butterfly.tone}`}>
              <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
              <span className="cinematic-hero-butterfly__body" />
              <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cinematic-atmosphere-root" aria-hidden="true">
      <div className="cinematic-depth-vignette" />
      <div className="cinematic-particle-field">
        {ambientParticles.map((particle) => (
          <span
            key={particle.id}
            className="cinematic-particle"
            style={
              {
                "--particle-x": particle.x,
                "--particle-y": particle.y,
                "--particle-size": particle.size,
                "--particle-drift": particle.drift,
                "--particle-duration": particle.duration,
                "--particle-delay": particle.delay,
                "--particle-opacity": particle.opacity,
                "--particle-blur": particle.blur,
              } as StyleVars
            }
          />
        ))}
      </div>
    </div>
  );
});

export default CinematicAtmosphere;
