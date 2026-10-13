import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { extractTarGz } from "./archive";

export interface ParsedRepoInfo {
  owner: string;
  repo: string;
  canonicalUrl: string;
}

/**
 * Parse a GitHub URL or "owner/repo" shorthand into owner and repository name.
 */
export function parseGitHubUrl(input: string): ParsedRepoInfo | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  // Handle https://github.com/owner/repo or http:// or git@github.com:owner/repo
  let match = /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/.*)?$/i.exec(
    trimmed
  );

  if (!match) {
    match = /^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/.*)?$/i.exec(
      trimmed
    );
  }

  if (!match) {
    // Shorthand owner/repo
    match = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/i.exec(trimmed);
  }

  if (!match) return null;

  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  return {
    owner,
    repo,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
  };
}

export interface FetchedRepoArchive {
  owner: string;
  repo: string;
  canonicalUrl: string;
  commitSha: string;
  destDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Fetch a public GitHub repository as a tar archive, extract it to a temporary directory,
 * and return the extracted directory path along with the commit SHA and cleanup handle.
 */
export async function fetchRepositoryArchive(
  repoInput: string
): Promise<FetchedRepoArchive> {
  const parsed = parseGitHubUrl(repoInput);
  if (!parsed) {
    throw new Error(`Invalid GitHub repository URL: "${repoInput}"`);
  }

  const { owner, repo, canonicalUrl } = parsed;
  const headers = {
    "User-Agent": "repnex-cartograph-analyzer",
    Accept: "application/vnd.github.v3+json",
  };

  // 1. Get repository metadata & latest commit SHA from HEAD
  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/HEAD`,
    { headers }
  );

  if (commitRes.status === 404) {
    throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
  }

  if (!commitRes.ok) {
    const errorBody = await commitRes.text();
    throw new Error(
      `Failed to fetch repository metadata (HTTP ${commitRes.status}): ${errorBody}`
    );
  }

  const commitData = (await commitRes.json()) as { sha?: string };
  const commitSha = commitData.sha;
  if (!commitSha) {
    throw new Error(`Could not determine commit SHA for repository "${owner}/${repo}".`);
  }

  // 2. Download the tarball archive for this commit
  const tarballRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/tarball/${commitSha}`,
    {
      headers: {
        "User-Agent": "repnex-cartograph-analyzer",
      },
      redirect: "follow",
    }
  );

  if (!tarballRes.ok) {
    throw new Error(
      `Failed to download repository archive (HTTP ${tarballRes.status})`
    );
  }

  const arrayBuffer = await tarballRes.arrayBuffer();
  const archiveBuffer = Buffer.from(arrayBuffer);

  // 3. Create a unique temporary directory
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const tempDirName = `repnex-${owner}-${repo}-${randomSuffix}`;
  const destDir = path.join(os.tmpdir(), tempDirName);

  // 4. Extract tarball
  await extractTarGz(archiveBuffer, destDir);

  // 5. Build cleanup function
  const cleanup = async () => {
    try {
      await fs.promises.rm(destDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[cleanup] Failed to delete temporary directory ${destDir}:`, err);
    }
  };

  return {
    owner,
    repo,
    canonicalUrl,
    commitSha,
    destDir,
    cleanup,
  };
}
