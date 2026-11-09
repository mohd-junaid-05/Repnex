import OpenAI from "openai";
import { traceable } from "langsmith/traceable";

/**
 * The single place in the codebase that constructs the AI client, wrapped so
 * every call through it is traced. Nothing else imports the model SDK directly.
 */

/** Pinned model version. Never a moving alias; changing this invalidates only its own cache. */
export const MODEL_NAME =
  process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const rawKey = process.env.OPENROUTER_API_KEY;
    const apiKey = rawKey ? rawKey.trim() : "";
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }
    client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://repnex.local",
        "X-Title": "Repnex",
      },
    });
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
 * Generate text through OpenRouter, traced. The cache read lives in a higher-level
 * traced function (lib/ai/explain.ts), so a cache hit records a run with no
 * model call in it. If tracing is unconfigured, this still succeeds — just
 * without a trace.
 */
export const generateText = traceable(
  async ({ system, prompt }: GenerateTextInput): Promise<GenerateTextResult> => {
    const response = await getClient().chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const choice = response.choices[0];
    const usage = response.usage;
    return {
      text: choice?.message?.content ?? "",
      promptTokens: usage?.prompt_tokens ?? 0,
      candidatesTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    };
  },
  {
    name: "generate_text",
    run_type: "llm",
    metadata: { provider: "openrouter", model: MODEL_NAME },
  }
);

/** True when tracing is configured; otherwise calls still succeed, just untraced. */
export function isTracingConfigured(): boolean {
  const tracingOn = process.env.LANGSMITH_TRACING === "true";
  const apiKey = process.env.LANGSMITH_API_KEY?.trim();
  return tracingOn && Boolean(apiKey && apiKey !== "your_langsmith_key");
}
