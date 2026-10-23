import "dotenv/config";
import { createDeepAgent } from "deepagents";

if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}
if (process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
}

// Google's built-in search tool
const internetSearch = { googleSearch: {} };

const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "google-genai:gemini-2.5-flash",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});

async function main() {
  console.log("Invoking Deep Agent research query: 'What is LangGraph?'...\n");

  const result = await agent.invoke({
    messages: [{ role: "user", content: "What is LangGraph?" }],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  console.log("\n--- Research Report ---");
  console.log(lastMessage.content);
}

main().catch((err) => {
  console.error("Error executing agent:", err);
  process.exit(1);
});
