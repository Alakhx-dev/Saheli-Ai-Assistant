import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { signup } from "./lib/auth";

// Initialize demo account if it doesn't exist
const demoEmail = "demo@saheli.com";
const users = JSON.parse(localStorage.getItem("saheli_users") || "[]");
if (!users.some((u: any) => u.email === demoEmail)) {
  signup("Demo User", demoEmail, "demo123", "female");
}

createRoot(document.getElementById("root")!).render(<App />);
