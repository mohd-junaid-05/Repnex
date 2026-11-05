import type { ParseResult } from "../../parser/types";
import type { RunnableConfig } from "@langchain/core/runnables";
import * as fs from "node:fs";

let cachedData: ParseResult | null = null;
const tokenCache = new Map<string, { data: ParseResult; timestamp: number }>();

export function setCachedAnalysisData(data: ParseResult | null): void {
  cachedData = data;
}

/**
 * Retrieves the parsed repository analysis.
 * Uses cached data if already loaded for the current token or environment.
 */
export async function getAnalysisData(config?: RunnableConfig): Promise<ParseResult> {
  const rawToken =
    config?.configurable?.analysis_token ||
    process.env.REPNEX_ANALYSIS_TOKEN;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (token && tokenCache.has(token)) {
    return tokenCache.get(token)!.data;
  }

  if (cachedData && !token) {
    return cachedData;
  }

  // 1. File override (useful for testing, evaluation, and offline development)
  const localFilePath = process.env.REPNEX_DATA_FILE;
  if (localFilePath && fs.existsSync(localFilePath)) {
    const raw = fs.readFileSync(localFilePath, "utf-8");
    const data = JSON.parse(raw) as ParseResult;
    if (token) tokenCache.set(token, { data, timestamp: Date.now() });
    cachedData = data;
    return data;
  }

  // 2. Fetch from the read-only HTTP surface
  const apiUrl = (
    (config?.configurable?.api_url as string | undefined) ||
    process.env.REPNEX_API_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const endpoint = `${apiUrl}/api/analysis-data`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Analysis data request failed (${res.status} ${res.statusText}): ${errText}`);
    }

    const data = (await res.json()) as ParseResult;
    if (token) {
      tokenCache.set(token, { data, timestamp: Date.now() });
    }
    cachedData = data;
    return data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to access analysis data from ${endpoint}. Ensure the application server is running and the analysis credential is valid. (${msg})`
    );
  }
}
