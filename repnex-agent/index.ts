import "dotenv/config";
import { agent } from "./agent";
export { agent } from "./agent";
export * from "./tools/index";

if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}

async function main() {
  console.log("Repnex Cartograph Agent initialized.");
  console.log("Agent Name:", agent.config.name);
  console.log("Model:", agent.config.model);
  console.log("Registered Tools:", agent.config.tools?.map((t: { name: string }) => t.name).join(", "));
}

// Run if directly executed
if (process.argv[1]?.endsWith("index.ts")) {
  main().catch((err) => {
    console.error("Agent initialization error:", err);
    process.exit(1);
  });
}
