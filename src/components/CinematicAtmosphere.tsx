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
} satisfies StyleVars;

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
        {/* Studio Aura Layers */}
        <div className="cinematic-studio-aura-left" />
        <div className="cinematic-studio-aura-right" />
        
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

        <div
          className="cinematic-hero-butterfly cinematic-hero-butterfly--primary"
          style={butterflyImageVars}
        >
          <div className="cinematic-hero-butterfly__form cinematic-hero-butterfly__form--pink">
            <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
            <span className="cinematic-hero-butterfly__body" />
            <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
          </div>
        </div>

        <div
          className="cinematic-hero-butterfly cinematic-hero-butterfly--secondary"
          style={butterflyImageVars}
        >
          <div className="cinematic-hero-butterfly__form cinematic-hero-butterfly__form--lavender">
            <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--left" />
            <span className="cinematic-hero-butterfly__body" />
            <span className="cinematic-hero-butterfly__wing cinematic-hero-butterfly__wing--right" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cinematic-atmosphere-root" aria-hidden="true">
      <div className="cinematic-fog cinematic-fog--violet" />
      <div className="cinematic-fog cinematic-fog--rose" />
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
