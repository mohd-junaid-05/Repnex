import "dotenv/config";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  summaryTool,
  searchFilesTool,
  listFilesByRoleTool,
  fileNeighborsTool,
  transitiveWalkTool,
  routeTableTool,
  allTools,
  setCachedAnalysisData,
} from "./tools/index";
import type { ParseResult } from "../parser/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log("=== Testing 6 Tools Directly ===");

  // 1. Load test sample fixture into cache
  const samplePath = path.join(__dirname, "test-sample.json");
  const sampleData: ParseResult = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
  setCachedAnalysisData(sampleData);
  process.env.REPNEX_DATA_FILE = samplePath;

  // Test Tool 1: summary
  const summaryResult = await summaryTool.invoke({});
  const summaryJson = JSON.parse(summaryResult);
  console.log("1. Summary tool passed:", {
    framework: summaryJson.framework,
    totalFiles: summaryJson.totalFiles,
    totalEdges: summaryJson.totalEdges,
    totalRoutes: summaryJson.totalRoutes,
  });

  // Test Tool 2: search_files
  const searchResult = await searchFilesTool.invoke({ query: "auth" });
  const searchJson = JSON.parse(searchResult);
  console.log("2. Search files passed:", {
    query: searchJson.query,
    totalMatches: searchJson.totalMatches,
    matches: searchJson.results.map((r: { path: string }) => r.path),
  });

  // Test Tool 3: list_files_by_role
  const rolesResult = await listFilesByRoleTool.invoke({ role: "Page routes" });
  const rolesJson = JSON.parse(rolesResult);
  console.log("3. List files by role passed:", {
    role: rolesJson.role,
    files: rolesJson.files.map((f: { path: string }) => f.path),
  });

  // Test Tool 4: file_neighbors
  const neighborsResult = await fileNeighborsTool.invoke({ filePath: "lib/auth.ts" });
  const neighborsJson = JSON.parse(neighborsResult);
  console.log("4. File neighbors passed:", {
    file: neighborsJson.filePath,
    fanIn: neighborsJson.fanIn,
    fanOut: neighborsJson.fanOut,
    dependents: neighborsJson.dependents.map((d: { sourcePath: string }) => d.sourcePath),
    dependencies: neighborsJson.dependencies.map((d: { targetPath: string }) => d.targetPath),
  });

  // Test Tool 5: transitive_walk (blast radius)
  const walkResult = await transitiveWalkTool.invoke({
    filePath: "lib/auth.ts",
    direction: "blast-radius",
    maxDepth: 2,
  });
  const walkJson = JSON.parse(walkResult);
  console.log("5. Transitive walk passed:", {
    start: walkJson.startPath,
    direction: walkJson.direction,
    reachableCount: walkJson.totalReachableFiles,
    levels: walkJson.levels,
  });

  // Test Tool 6: route_table
  const routesResult = await routeTableTool.invoke({});
  const routesJson = JSON.parse(routesResult);
  console.log("6. Route table passed:", {
    totalRoutes: routesJson.totalRoutes,
    routes: routesJson.routes,
  });

  console.log("\n=== Testing Agent Execution with Model and Tools ===");

  const instructions = fs.readFileSync(path.join(__dirname, "instructions.md"), "utf-8");
  const apiKey = (
    process.env.OPENROUTER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();

  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not set; skipping live agent call.");
    return;
  }

  const modelName =
    process.env.OPENROUTER_MODEL ||
    process.env.GEMINI_MODEL ||
    "nvidia/nemotron-3-ultra-550b-a55b:free";

  const model = new ChatOpenAI({
    model: modelName,
    apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://cartograph.local",
        "X-Title": "Cartograph Repnex Agent Tests",
      },
    },
    temperature: 0,
  });

  const agent = createReactAgent({
    llm: model,
    tools: allTools,
    prompt: instructions,
  });

  // Acceptance Check 1: "where is authentication handled?"
  console.log("\n[Test 1] User: 'where is authentication handled?'");
  const turn1 = await agent.invoke({
    messages: [{ role: "user", content: "where is authentication handled?" }],
  });
  const response1 = turn1.messages[turn1.messages.length - 1];
  console.log("Agent response:\n", response1.content);

  // Acceptance Check 2: Follow up "what breaks if I change that?"
  console.log("\n[Test 2] User: 'what breaks if I change that?'");
  const turn2 = await agent.invoke({
    messages: [
      ...turn1.messages,
      { role: "user", content: "what breaks if I change that?" },
    ],
  });
  const response2 = turn2.messages[turn2.messages.length - 1];
  console.log("Agent response:\n", response2.content);

  // Acceptance Check 3: Refusal "is this code any good?"
  console.log("\n[Test 3] User: 'is this code any good?'");
  const turn3 = await agent.invoke({
    messages: [{ role: "user", content: "is this code any good?" }],
  });
  const response3 = turn3.messages[turn3.messages.length - 1];
  console.log("Agent response:\n", response3.content);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});

