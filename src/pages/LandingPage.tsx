import Spline from "@splinetool/react-spline";
import type { Application, SPEObject } from "@splinetool/runtime";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

const HIDE_NAME_KEYWORDS = [
  "get in touch",
  "button",
  "contact",
  "cta",
  "built with spline",
  "watermark",
];

function hideUnwantedSceneObjects(objects: SPEObject[]) {
  objects.forEach((object) => {
    const objectName = object.name?.toLowerCase?.() ?? "";
    if (!objectName) {
      return;
    }

    if (HIDE_NAME_KEYWORDS.some((keyword) => objectName.includes(keyword))) {
      object.hide();
    }
  });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [isSplineLoaded, setIsSplineLoaded] = useState(false);

  const handleSplineLoad = useCallback((splineApp: Application) => {
    hideUnwantedSceneObjects(splineApp.getAllObjects());
    window.setTimeout(() => hideUnwantedSceneObjects(splineApp.getAllObjects()), 350);
    setIsSplineLoaded(true);
  }, []);

  return (
    <div className="landing-page relative h-screen w-full overflow-hidden bg-black">
      <div className="spline-stage absolute inset-0 z-0">
        <Spline
          scene="https://prod.spline.design/HkCXeW8RCSFI52gC/scene.splinecode"
          onLoad={handleSplineLoad}
        />
      </div>

      {!isSplineLoaded ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex flex-col items-center px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white opacity-90 sm:text-5xl">SAHELI AI</h1>
        <button
          type="button"
          onClick={() => navigate("/chat")}
          className="pointer-events-auto mt-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-semibold text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-transform hover:scale-105"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
