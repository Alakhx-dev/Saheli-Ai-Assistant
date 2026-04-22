import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./App.css";

console.log("APP VERSION:", Date.now());

createRoot(document.getElementById("root")!).render(<App />);
