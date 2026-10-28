import type { SupabaseClient } from "@supabase/supabase-js";
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { Client } from "langsmith";
import { generateText, MODEL_NAME, isTracingConfigured } from "./client";
import { checkInventedPaths, type InventedPathCheckResult } from "./invented-paths";

/**
 * Explanation and role-assignment operations.
 * Each function is traced as its own run, and the cache read happens *inside*
 * that run. A cache hit therefore records a run that contains no model call.
 * Database access happens in server code; these functions take a client.
 */

export interface NeighbourInfo {
  path: string;
  role?: string;
  fanIn?: number;
  fanOut?: number;
}

export interface ExplainFileParams {
  analysisId: string;
  orgId: string;
  commitSha: string;
  fileId: string | null;
  filePath: string;
  /** SHA-256 of the file contents at analysis time. Part of the cache key. */
  digest: string;
  repoName: string;
  fileRole?: string;
  imports: NeighbourInfo[];
  dependents: NeighbourInfo[];
  /** Server Supabase client used only to read/write the cache. */
  supabase: SupabaseClient;
}

export interface ExplainFolderParams {
  analysisId: string;
  orgId: string;
  commitSha: string;
  fileId: string | null;
  /** Folder path, '' for the repository root. */
  folderPath: string;
  /** Digest of the folder's files (paths + hashes). Part of the cache key. */
  digest: string;
  repoName: string;
  files: NeighbourInfo[];
  incomingFrom: string[];
  outgoingTo: string[];
  supabase: SupabaseClient;
}

export interface ExplainResult {
  content: string;
  cacheHit: boolean;
  model: string;
  digest: string;
  tokens: { prompt: number; candidates: number; total: number };
  inventedPathCheck?: InventedPathCheckResult;
}

const ZERO_TOKENS = { prompt: 0, candidates: 0, total: 0 };


/** A local, redacted view of a traced function's inputs for LangSmith. */
function summarize(
  p: { analysisId: string; kind: string; digest: string; key: string }
): Record<string, string> {
  return { analysisId: p.analysisId, kind: p.kind, digest: p.digest, target: p.key };
}
/**
 * Explain a single file from its real neighbours.
 * The model may only speak about the files it was handed; it never walks the
 * graph and never decides two files are connected.
 */
export const explainFile = traceable(
  async (params: ExplainFileParams): Promise<ExplainResult> => {
    const { supabase } = params;

    // Cache read happens inside the traced call.
    const { data: existing } = await supabase
      .from("explanations")
      .select("content, content_hash")
      .eq("analysis_id", params.analysisId)
      .eq("target_type", "file")
      .eq("target_key", params.filePath)
      .eq("model", MODEL_NAME)
      .maybeSingle();

    const shownPaths = [
      params.filePath,
      ...params.imports.map((i) => i.path),
      ...params.dependents.map((d) => d.path),
    ];

    if (existing && existing.content_hash === params.digest) {
      return {
        content: existing.content,
        cacheHit: true,
        model: MODEL_NAME,
        digest: params.digest,
        tokens: ZERO_TOKENS,
        inventedPathCheck: checkInventedPaths(existing.content, shownPaths),
      };
    }

    const { text, promptTokens, candidatesTokens, totalTokens } = await generateText({
      system:
        "You are explaining one file in a real repository to a developer who is trying to understand its shape. " +
        "Only describe relationships you were given. Never invent a file, an import, or a connection between two files. " +
        "Your response renders in a narrow pane. Use exactly three kinds of formatting: `inline code`, **bold**, and " +
        "bullet points that start with '- '. Do not use headings, numbered lists, tables, or any other markdown. " +
        "Keep it to a few short paragraphs. Name the real files you were given; never name a file you were not given.",
      prompt: buildFilePrompt(params),
    });

    const inventedPathCheck = checkInventedPaths(text, shownPaths);

    // Live evaluator: attach feedback directly to the LangSmith trace run
    const runTree = getCurrentRunTree();
    if (runTree && isTracingConfigured()) {
      try {
        const client = new Client();
        await client.createFeedback(runTree.id, "invented_path", {
          score: inventedPathCheck.score,
          comment: inventedPathCheck.passed
            ? "All paths verified against shown neighbours"
            : `Invented: ${inventedPathCheck.inventedPaths.join(", ")}`,
        });
      } catch {
        // Non-fatal if feedback write fails
      }
    }

    const { error } = await supabase.from("explanations").insert({
      org_id: params.orgId,
      analysis_id: params.analysisId,
      file_id: params.fileId,
      target_type: "file",
      target_key: params.filePath,
      model: MODEL_NAME,
      content_hash: params.digest,
      commit_sha: params.commitSha,
      content: text,
    });

    if (error) {
      console.error(`[ai] Failed to cache explanation for ${params.filePath}:`, error.message);
    }

    return {
      content: text,
      cacheHit: false,
      model: MODEL_NAME,
      digest: params.digest,
      tokens: { prompt: promptTokens, candidates: candidatesTokens, total: totalTokens },
      inventedPathCheck,
    };
  },
  {
    name: "explain_file",
    run_type: "chain",
    processInputs: (inputs) => {
      const p = inputs as unknown as ExplainFileParams;
      return summarize({ analysisId: p.analysisId, kind: "file", digest: p.digest, key: p.filePath });
    },
  }
);

/**
 * Explain a folded folder: what lives here and why so much of the repository
 * points at it. Different question from a file, so a different prompt.
 */
export const explainFolder = traceable(
  async (params: ExplainFolderParams): Promise<ExplainResult> => {
    const { supabase } = params;

    const { data: existing } = await supabase
      .from("explanations")
      .select("content, content_hash")
      .eq("analysis_id", params.analysisId)
      .eq("target_type", "folder")
      .eq("target_key", params.folderPath)
      .eq("model", MODEL_NAME)
      .maybeSingle();

    const folderShownPaths = [
      params.folderPath,
      ...params.files.map((f) => f.path),
      ...params.incomingFrom,
      ...params.outgoingTo,
    ];

    if (existing && existing.content_hash === params.digest) {
      return {
        content: existing.content,
        cacheHit: true,
        model: MODEL_NAME,
        digest: params.digest,
        tokens: ZERO_TOKENS,
        inventedPathCheck: checkInventedPaths(existing.content, folderShownPaths),
      };
    }

    const { text, promptTokens, candidatesTokens, totalTokens } = await generateText({
      system:
        "You are explaining a folder in a real repository to a developer scanning a dependency map. " +
        "Only describe files you were given. Never invent a file, an import, or a connection. " +
        "Use exactly three kinds of formatting: `inline code`, **bold**, and bullet points that start with '- '. " +
        "Do not use headings, numbered lists, tables, or any other markdown. " +
        "This is about the folder as a whole — what it holds and why it matters — not a summary of one file in it.",
      prompt: buildFolderPrompt(params),
    });

    const inventedPathCheck = checkInventedPaths(text, folderShownPaths);

    // Live evaluator: attach feedback directly to the LangSmith trace run
    const runTree = getCurrentRunTree();
    if (runTree && isTracingConfigured()) {
      try {
        const client = new Client();
        await client.createFeedback(runTree.id, "invented_path", {
          score: inventedPathCheck.score,
          comment: inventedPathCheck.passed
            ? "All paths verified against folder files"
            : `Invented: ${inventedPathCheck.inventedPaths.join(", ")}`,
        });
      } catch {
        // Non-fatal if feedback write fails
      }
    }

    const { error } = await supabase.from("explanations").insert({
      org_id: params.orgId,
      analysis_id: params.analysisId,
      file_id: params.fileId,
      target_type: "folder",
      target_key: params.folderPath,
      model: MODEL_NAME,
      content_hash: params.digest,
      commit_sha: params.commitSha,
      content: text,
    });

    if (error) {
      console.error(`[ai] Failed to cache folder explanation for ${params.folderPath}:`, error.message);
    }

    return {
      content: text,
      cacheHit: false,
      model: MODEL_NAME,
      digest: params.digest,
      tokens: { prompt: promptTokens, candidates: candidatesTokens, total: totalTokens },
      inventedPathCheck,
    };
  },
  {
    name: "explain_folder",
    run_type: "chain",
    processInputs: (inputs) => {
      const p = inputs as unknown as ExplainFolderParams;
      return summarize({ analysisId: p.analysisId, kind: "folder", digest: p.digest, key: p.folderPath });
    },
  }
);

/** Roles the model may assign. Structural roles (page, route, controller) are forbidden. */
export const ASSIGNABLE_ROLES = [
  "service",
  "repository",
  "model",
  "util",
  "config",
  "component",
  "hook",
] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface AssignRoleParams {
  analysisId: string;
  orgId: string;
  filePath: string;
  repoName: string;
  fileRole?: string;
  fileId: string | null;
  lineCount: number;
  imports: NeighbourInfo[];
  dependents: NeighbourInfo[];
  supabase: SupabaseClient;
}

export interface AssignRoleResult {
  role: AssignableRole;
  cacheHit: boolean;
  model: string;
}

/**
 * Assign a role to a file no adapter could identify. The model may only answer
 * with the non-structural roles in ASSIGNABLE_ROLES; a routable role is never a
 * valid answer.
 */
export const assignRole = traceable(
  async (params: AssignRoleParams): Promise<AssignRoleResult> => {
    const { supabase } = params;

    // Cache read happens inside the traced call. If an acceptable role is
    // already stored, that is the hit; no model call happens.
    const { data: existing } = await supabase
      .from("file_roles")
      .select("role, id")
      .eq("analysis_id", params.analysisId)
      .eq("file_id", params.fileId ?? "")
      .maybeSingle();

    const existingRole = existing?.role as string | undefined;
    if (
      params.fileId &&
      existingRole &&
      ASSIGNABLE_ROLES.includes(existingRole as AssignableRole)
    ) {
      return { role: existingRole as AssignableRole, cacheHit: true, model: MODEL_NAME };
    }

    const { text } = await generateText({
      system:
        "You are assigning a role to a single file in a real repository. " +
        "Answer with exactly one of these words, nothing else: " +
        ASSIGNABLE_ROLES.join(", ") + ". " +
        "These are the only allowed answers. Never answer with a routable role such as page, route, or controller.",
      prompt: buildRolePrompt(params),
    });

    const role = parseAssignedRole(text, params.fileRole);

    if (existing && params.fileId) {
      await supabase.from("file_roles").update({ role }).eq("id", existing.id);
    } else if (params.fileId) {
      await supabase.from("file_roles").insert({
        org_id: params.orgId,
        analysis_id: params.analysisId,
        file_id: params.fileId,
        role,
      });
    }

    return { role, cacheHit: false, model: MODEL_NAME };
  },
  {
    name: "assign_role",
    run_type: "chain",
    processInputs: (inputs) => {
      const p = inputs as unknown as AssignRoleParams;
      return summarize({ analysisId: p.analysisId, kind: "role", digest: p.filePath, key: p.filePath });
    },
  }
);

function parseAssignedRole(text: string, fallbackRole?: string): AssignableRole {
  const lower = text.toLowerCase();
  for (const role of ASSIGNABLE_ROLES) {
    if (new RegExp(`\\b${role}\\b`).test(lower)) return role;
  }
  // A file with no match keeps a sensible default rather than an invalid one.
  if (fallbackRole && ASSIGNABLE_ROLES.includes(fallbackRole as AssignableRole)) {
    return fallbackRole as AssignableRole;
  }
  return "util";
}

function buildFilePrompt(p: ExplainFileParams): string {
  const lines: string[] = [];
  lines.push(`Explain the file \`${p.filePath}\`.`);
  lines.push("");
  lines.push(`Repository: ${p.repoName}`);
  lines.push(`Known role: ${p.fileRole ?? "none identified"}`);
  lines.push("");
  lines.push("It imports these files:");
  lines.push(...neighbourLines(p.imports));
  lines.push("");
  lines.push("These files import it:");
  lines.push(...neighbourLines(p.dependents));
  lines.push("");
  lines.push(
    `Describe what \`${p.filePath}\` does in the context of those neighbours. ` +
      "Name the real files listed above. Do not mention any file not listed."
  );
  return lines.join("\n");
}

function buildFolderPrompt(p: ExplainFolderParams): string {
  const lines: string[] = [];
  lines.push(`Explain the folder \`${p.folderPath || "."}\`.`);
  lines.push("");
  lines.push(`Repository: ${p.repoName}`);
  lines.push(`It contains these ${p.files.length} files:`);
  lines.push(...neighbourLines(p.files));
  if (p.incomingFrom.length > 0) {
    lines.push("");
    lines.push(`Files outside this folder that import into it: ${p.incomingFrom.join(", ")}`);
  }
  if (p.outgoingTo.length > 0) {
    lines.push("");
    lines.push(`Files in this folder that import from outside: ${p.outgoingTo.join(", ")}`);
  }
  lines.push("");
  lines.push(
    `Explain what lives in \`${p.folderPath || "."}\` and why so much of the repository points at it. ` +
      "Name the real files listed above. Do not mention a file not listed."
  );
  return lines.join("\n");
}

function buildRolePrompt(p: AssignRoleParams): string {
  const lines: string[] = [];
  lines.push(`Assign a role to the file \`${p.filePath}\`.`);
  lines.push(`Repository: ${p.repoName}`);
  lines.push(`Line count: ${p.lineCount}`);
  lines.push(`Current role: ${p.fileRole ?? "unidentified"}`);
  lines.push("");
  lines.push("It imports these files:");
  lines.push(...neighbourLines(p.imports));
  lines.push("");
  lines.push("These files import it:");
  lines.push(...neighbourLines(p.dependents));
  lines.push("");
  lines.push(`Choose exactly one of: ${ASSIGNABLE_ROLES.join(", ")}.`);
  return lines.join("\n");
}

function neighbourLines(items: NeighbourInfo[]): string[] {
  if (items.length === 0) return ["- none"];
  return items.map((n) => {
    const role = n.role ? ` (role: ${n.role})` : "";
    return `- \`${n.path}\`${role}`;
  });
}


