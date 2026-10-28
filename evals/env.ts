import { loadEnv } from "../lib/env";

// Load environment variables immediately on import
loadEnv();

// For evaluation scripts, default to pinned gemini-3.5-flash-lite to avoid 20 RPD free tier cap
if (!process.env.GEMINI_MODEL) {
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
}

