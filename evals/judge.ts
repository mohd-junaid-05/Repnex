import "./env";
import { generateText } from "../lib/ai/client";
import { checkInventedPaths, type InventedPathCheckResult } from "../lib/ai/invented-paths";

export interface JudgeScores {
  /** 1 to 5: Does it stick strictly to real neighbours without invented facts? */
  grounding: number;
  /** 1 to 5: Is it formatted cleanly for a narrow pane (inline code, bold, bullets; no headings)? */
  utility: number;
  /** 1 to 5: Does it clearly explain the architectural role in relation to neighbours? */
  clarity: number;
  /** Average of the three dimensions (1 to 5) */
  overallScore: number;
  reasoning: string;
  inventedPathCheck: InventedPathCheckResult;
}

/**
 * Model-as-Judge evaluator.
 *
 * NOTE (as mandated by Phase 11 spec):
 * "The prompt-version comparison does need a model as judge, unavoidably —
 * 'is this specific enough to be useful' has no exact answer. Say that out
 * loud rather than presenting the number as harder than it is."
 */
export async function judgeExplanation(params: {
  filePath: string;
  repoName: string;
  shownNeighbours: string[];
  explanation: string;
}): Promise<JudgeScores> {
  const { filePath, repoName, shownNeighbours, explanation } = params;

  // 1. Run deterministic invented-path check first
  const inventedCheck = checkInventedPaths(explanation, [filePath, ...shownNeighbours]);

  // 2. Run model-as-judge for qualitative criteria
  const system =
    "You are an expert software architect judging the quality of an explanation generated for a developer " +
    "inspecting a codebase in a narrow side-pane of a dependency tool.\n\n" +
    "Rate the explanation on a scale of 1 to 5 across three criteria:\n" +
    "1. Grounding & Specificity: Does it focus strictly on the provided real neighbours without hand-waving or inventing unverified details?\n" +
    "2. Narrow-Pane Utility & Formatting: Is it compact and formatted strictly using `inline code`, **bold**, or bullets? Penalize heavily if it uses headings (#, ##), numbered lists, tables, or noisy markdown that breaks in narrow panes.\n" +
    "3. Architectural Clarity: Does it clearly convey what this file does in the system?\n\n" +
    "Respond ONLY with valid JSON in this exact structure:\n" +
    "{\n" +
    '  "grounding": <1-5>,\n' +
    '  "utility": <1-5>,\n' +
    '  "clarity": <1-5>,\n' +
    '  "reasoning": "<short explanation>"\n' +
    "}";

  const userPrompt =
    `Repository: ${repoName}\n` +
    `Target file: ${filePath}\n` +
    `Shown neighbours: ${shownNeighbours.length > 0 ? shownNeighbours.join(", ") : "none"}\n\n` +
    `Candidate explanation:\n"""\n${explanation}\n"""\n\n` +
    "Return the JSON evaluation.";

  try {
    const { text } = await generateText({ system, prompt: userPrompt });

    // Clean JSON code blocks if present
    const cleaned = text.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const grounding = clampScore(parsed.grounding);
    const utility = clampScore(parsed.utility);
    const clarity = clampScore(parsed.clarity);
    const overallScore = Number(((grounding + utility + clarity) / 3).toFixed(2));

    return {
      grounding,
      utility,
      clarity,
      overallScore,
      reasoning: String(parsed.reasoning || ""),
      inventedPathCheck: inventedCheck,
    };
  } catch {
    // If JSON parse failed, compute deterministic score from format and invented paths
    const hasHeadings = /^(?:#{1,6}\s|\*\*.*\*\*:\s*$)/m.test(explanation);
    const utilityScore = hasHeadings ? 2 : 4;
    const groundingScore = inventedCheck.passed ? 4 : 2;
    const clarityScore = 3.5;
    const overallScore = Number(((groundingScore + utilityScore + clarityScore) / 3).toFixed(2));

    return {
      grounding: groundingScore,
      utility: utilityScore,
      clarity: clarityScore,
      overallScore,
      reasoning: "Heuristic evaluation (fallback).",
      inventedPathCheck: inventedCheck,
    };
  }
}

function clampScore(val: unknown): number {
  const num = Number(val);
  if (isNaN(num)) return 3;
  return Math.max(1, Math.min(5, Math.round(num * 10) / 10));
}
