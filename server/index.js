import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Backend server is no longer needed - Gemini API calls are handled directly from frontend
// All AI logic is processed via GoogleGenerativeAI on the client side

app.get("/health", (req, res) => {
  res.json({ status: "Server running (deprecated - use frontend Gemini API)" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Note: Backend is deprecated. AI calls are made directly from frontend.");
});
