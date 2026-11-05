import "dotenv/config";
import { defineDeepAgent } from "managed-deepagents";
import { allTools } from "./tools/index";

const modelName =
  process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export const agent = defineDeepAgent({
  name: "repnex-agent",
  model: modelName,
  tools: allTools,
});

