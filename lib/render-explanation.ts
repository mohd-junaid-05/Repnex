/**
 * Parse a model explanation into a tiny, renderable AST.
 *
 * The model is allowed exactly three kinds of formatting — `inline code`,
 * **bold**, and bullet points starting with '- '. No headings. We render those
 * three and turn every real repository path in the prose into a link that moves
 * the map. Everything else (e.g. stray '#', numbered lists) is coerced so no raw
 * markdown characters leak into the pane.
 */

export type ExplanationInline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "bold"; children: ExplanationInline[] }
  | { type: "link"; path: string };

export type ExplanationBlock =
  | { type: "paragraph"; children: ExplanationInline[] }
  | { type: "bullet"; children: ExplanationInline[] };

/**
 * Parse explanation text into blocks. `fileSet` is the set of real repository
 * file paths; a path that is actually in the repository becomes a link, and a
 * path that is not matches nothing (stays plain text or code).
 */
export function parseExplanation(text: string, fileSet: Set<string>): ExplanationBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: ExplanationBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/[\t ]+$/g, "");
    if (!line.trim()) continue;

    let content = line;
    let bullet = false;

    // Headings are not allowed. Strip leading '#' symbols so headings become plain paragraphs.
    const heading = /^#{1,6}\s*/.exec(content);
    if (heading) {
      content = content.slice(heading[0].length);
    } else {
      // Bullets starting with '-', '*', or '•'
      const bulletMatch = /^[-*•]\s+/.exec(content);
      if (bulletMatch) {
        bullet = true;
        content = content.slice(bulletMatch[0].length);
      }
    }

    if (!content.trim()) continue;

    const children = parseInline(content, fileSet);
    blocks.push(
      bullet
        ? { type: "bullet", children }
        : { type: "paragraph", children }
    );
  }

  return blocks;
}

/** Clean any stray markdown characters from plain text nodes so none leak into output. */
function cleanText(raw: string): string {
  return raw.replace(/[`*#]/g, "");
}

/**
 * Parses inline content. Creates fresh local regular expressions for every invocation
 * to avoid shared state or infinite loops on nested / repeated calls.
 */
export function parseInline(text: string, fileSet: Set<string>): ExplanationInline[] {
  const inlineRe =
    /\*\*([^*]+)\*\*|`([^`]+)`|((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)/g;

  const nodes: ExplanationInline[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRe.exec(text)) !== null) {
    // Avoid infinite loop if regex matches empty string
    if (match.index === inlineRe.lastIndex) {
      inlineRe.lastIndex++;
    }

    if (match.index > lastIndex) {
      const rawPiece = cleanText(text.slice(lastIndex, match.index));
      if (rawPiece) {
        nodes.push({ type: "text", text: rawPiece });
      }
    }

    if (match[1] !== undefined) {
      // Bold text - parse inner code or links non-recursively (bold inside bold is not permitted)
      nodes.push({ type: "bold", children: parseBoldInner(match[1], fileSet) });
    } else if (match[2] !== undefined) {
      // Inside backticks: could be a repo file path or genuine code
      const candidate = match[2].trim().replace(/[.,;:!?]+$/, "");
      const resolved = resolvePath(candidate, fileSet);
      if (resolved) {
        nodes.push({ type: "link", path: resolved });
      } else {
        nodes.push({ type: "code", text: cleanText(match[2]) });
      }
    } else if (match[3] !== undefined) {
      // Bare path candidate
      const candidate = match[3].replace(/[.,;:!?]+$/, "");
      const resolved = resolvePath(candidate, fileSet);
      if (resolved) {
        nodes.push({ type: "link", path: resolved });
      } else {
        const rawPiece = cleanText(match[3]);
        if (rawPiece) {
          nodes.push({ type: "text", text: rawPiece });
        }
      }
    }

    lastIndex = inlineRe.lastIndex;
  }

  if (lastIndex < text.length) {
    const rawPiece = cleanText(text.slice(lastIndex));
    if (rawPiece) {
      nodes.push({ type: "text", text: rawPiece });
    }
  }

  return nodes;
}

/** Parse code or link candidates inside bold text without bold recursion. */
function parseBoldInner(boldText: string, fileSet: Set<string>): ExplanationInline[] {
  const innerRe = /`([^`]+)`|((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)/g;
  const nodes: ExplanationInline[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = innerRe.exec(boldText)) !== null) {
    if (match.index === innerRe.lastIndex) {
      innerRe.lastIndex++;
    }

    if (match.index > lastIndex) {
      const piece = cleanText(boldText.slice(lastIndex, match.index));
      if (piece) nodes.push({ type: "text", text: piece });
    }

    if (match[1] !== undefined) {
      const candidate = match[1].trim().replace(/[.,;:!?]+$/, "");
      const resolved = resolvePath(candidate, fileSet);
      if (resolved) {
        nodes.push({ type: "link", path: resolved });
      } else {
        nodes.push({ type: "code", text: cleanText(match[1]) });
      }
    } else if (match[2] !== undefined) {
      const candidate = match[2].replace(/[.,;:!?]+$/, "");
      const resolved = resolvePath(candidate, fileSet);
      if (resolved) {
        nodes.push({ type: "link", path: resolved });
      } else {
        const piece = cleanText(match[2]);
        if (piece) nodes.push({ type: "text", text: piece });
      }
    }

    lastIndex = innerRe.lastIndex;
  }

  if (lastIndex < boldText.length) {
    const piece = cleanText(boldText.slice(lastIndex));
    if (piece) nodes.push({ type: "text", text: piece });
  }

  return nodes;
}

export function resolvePath(candidate: string, fileSet: Set<string>): string | null {
  if (!candidate) return null;
  const normalized = candidate.replace(/\\/g, "/").replace(/^\.\//, "");
  if (fileSet.has(normalized)) return normalized;

  // Check if candidate matches any file ending with /candidate (e.g. "navbar.tsx" -> "app/components/navbar.tsx")
  const targetSuffix = `/${normalized}`;
  for (const file of Array.from(fileSet)) {
    if (file.endsWith(targetSuffix)) {
      return file;
    }
  }

  // Exact suffix match if candidate had leading path segments (e.g. "project/app/components/navbar.tsx")
  const parts = normalized.split("/");
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join("/");
    if (fileSet.has(suffix)) return suffix;
  }

  return null;
}
