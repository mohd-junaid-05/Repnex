import { GoogleGenAI } from "@google/genai";
import { traceable } from "langsmith/traceable";

/**
 * The single place in the codebase that constructs the AI client, wrapped so
 * every call through it is traced. Nothing else imports the model SDK directly.
 */

/** Pinned model version. Never a moving alias; changing this invalidates only its own cache. */
export const MODEL_NAME = "gemini-3.5-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const rawKey = process.env.GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : "";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface GenerateTextInput {
  /** System instruction for the model. */
  system: string;
  /** The user-facing prompt. */
  prompt: string;
}

export interface GenerateTextResult {
  text: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

/**
 * Generate text through Gemini, traced. The cache read lives in a higher-level
 * traced function (lib/ai/explain.ts), so a cache hit records a run with no
 * model call in it. If tracing is unconfigured, this still succeeds — just
 * without a trace.
 */
export const generateText = traceable(
  async ({ system, prompt }: GenerateTextInput): Promise<GenerateTextResult> => {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: system,
        temperature: 0.2,
      },
    });

    const usage = response.usageMetadata;
    return {
      text: response.text ?? "",
      promptTokens: usage?.promptTokenCount ?? 0,
      candidatesTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
    };
  },
  {
    name: "generate_text",
    run_type: "llm",
    metadata: { provider: "google", model: MODEL_NAME },
  }
);

/** True when tracing is configured; otherwise calls still succeed, just untraced. */
export function isTracingConfigured(): boolean {
  const tracingOn = process.env.LANGSMITH_TRACING === "true";
  const apiKey = process.env.LANGSMITH_API_KEY?.trim();
  return tracingOn && Boolean(apiKey && apiKey !== "your_langsmith_key");
}
