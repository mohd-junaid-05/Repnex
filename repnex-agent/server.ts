import "dotenv/config";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { allTools } from "./tools/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.AGENT_PORT || process.env.PORT || "3001", 10);
const instructionsPath = path.join(__dirname, "instructions.md");
const instructions = fs.existsSync(instructionsPath)
  ? fs.readFileSync(instructionsPath, "utf-8")
  : "You are the Repnex repository assistant. Always look up answers using tools.";

const apiKey = (
  process.env.OPENROUTER_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  ""
).trim();

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
      "HTTP-Referer": "https://repnex.local",
      "X-Title": "Repnex Agent",
    },
  },
  temperature: 0,
});

const agent = createReactAgent({
  llm: model,
  tools: allTools,
  prompt: instructions,
});

interface ChatPayload {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  credential?: string;
  apiUrl?: string;
  selectedContext?: { file?: string; folder?: string };
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", agent: "repnex-agent", model: modelName }));
    return;
  }

  // Chat endpoint with SSE streaming
  if (req.method === "POST" && (req.url === "/chat" || req.url === "/stream")) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
        const sendEvent = (event: string, data: unknown) => {
          if (!res.headersSent) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            });
          }
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
          const payload: ChatPayload = JSON.parse(body || "{}");
          const { messages, credential, apiUrl, selectedContext } = payload;

          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing or invalid 'messages' array." }));
            return;
          }

        // Convert messages to LangChain BaseMessage objects
        const lcMessages: BaseMessage[] = [];
        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          const isLastUser = i === messages.length - 1 && m.role === "user";

          let content = m.content;
          // Inject selected file/folder context into current prompt if present
          if (isLastUser && selectedContext) {
            const contextNotes: string[] = [];
            if (selectedContext.file) {
              contextNotes.push(`Focused file in map: "${selectedContext.file}"`);
            } else if (selectedContext.folder) {
              contextNotes.push(`Focused folder in map: "${selectedContext.folder}"`);
            }
            if (contextNotes.length > 0) {
              content = `[Context: ${contextNotes.join(", ")}]\n${content}`;
            }
          }

          if (m.role === "user") {
            lcMessages.push(new HumanMessage(content));
          } else {
            lcMessages.push(new AIMessage(content));
          }
        }

        // Stream LangGraph events
        const eventStream = agent.streamEvents(
          { messages: lcMessages },
          {
            version: "v2",
            configurable: {
              analysis_token: credential,
              api_url: apiUrl || "http://localhost:3000",
            },
          }
        );

        for await (const event of eventStream) {
          if (event.event === "on_tool_start") {
            sendEvent("tool_start", {
              tool: event.name,
              input: event.data?.input,
            });
          } else if (event.event === "on_tool_end") {
            // Trim large outputs for the client event preview
            let rawOutput = event.data?.output;
            let outputPreview = "";
            try {
              if (typeof rawOutput === "string") {
                outputPreview = rawOutput;
              } else if (rawOutput && typeof rawOutput.content === "string") {
                outputPreview = rawOutput.content;
              } else {
                outputPreview = JSON.stringify(rawOutput);
              }
            } catch {
              outputPreview = String(rawOutput);
            }

            sendEvent("tool_end", {
              tool: event.name,
              output: outputPreview,
            });
          } else if (event.event === "on_chat_model_stream") {
            const chunk = event.data?.chunk;
            if (chunk && chunk.content) {
              sendEvent("chunk", {
                text: typeof chunk.content === "string" ? chunk.content : JSON.stringify(chunk.content),
              });
            }
          }
        }

        sendEvent("done", { status: "ok" });
        res.end();
      } catch (err: unknown) {
        const error = err as { message?: string; status?: number; statusText?: string };
        const msg = error.message || String(err);
        sendEvent("error", { message: msg });
        res.end();
      }
    });

    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found." }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Repnex Agent Service listening on http://localhost:${PORT}`);
  console.log(`Model: ${modelName}`);
  console.log(`Tools: ${allTools.map((t) => t.name).join(", ")}`);
});
