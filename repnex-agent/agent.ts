import "dotenv/config";
import { defineDeepAgent } from "managed-deepagents";
import { allTools } from "./tools/index";

if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}

export const agent = defineDeepAgent({
  name: "repnex-agent",
  model: "google-genai:gemini-3.5-flash",
  tools: allTools,
});

