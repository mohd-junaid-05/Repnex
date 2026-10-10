import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

/** Extract a null-terminated ASCII string from a buffer slice. */
function readNullTerminatedString(buf: Buffer, start: number, end: number): string {
  const slice = buf.subarray(start, end);
  const nullIndex = slice.indexOf(0);
  const strBuf = nullIndex === -1 ? slice : slice.subarray(0, nullIndex);
  return strBuf.toString("utf8").trim();
}

/** Parse an octal number string from a tar header field. */
function parseOctal(buf: Buffer, start: number, end: number): number {
  const str = readNullTerminatedString(buf, start, end);
  if (!str) return 0;
  return parseInt(str, 8) || 0;
}

/**
 * Extract a .tar.gz (or uncompressed .tar) buffer safely into destination directory.
 * Automatically strips the single top-level directory common in GitHub archive tarballs.
 */
export async function extractTarGz(
  archiveBuffer: Buffer,
  destDir: string
): Promise<void> {
  // 1. Decompress gzip if gzipped
  let tarBuffer: Buffer;
  if (
    archiveBuffer.length >= 2 &&
    archiveBuffer[0] === 0x1f &&
    archiveBuffer[1] === 0x8b
  ) {
    tarBuffer = zlib.gunzipSync(archiveBuffer);
  } else {
    tarBuffer = archiveBuffer;
  }

  await fs.promises.mkdir(destDir, { recursive: true });

  let offset = 0;
  let nextLongPath: string | null = null;
  let topLevelPrefix: string | null = null;

  // First pass / streaming pass: collect entries
  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);

    // Check for end of archive (all zeros block)
    const isZero = header.every((b) => b === 0);
    if (isZero) {
      // Check if next 512 is also zero (EOF marker)
      offset += 512;
      continue;
    }

    let name = readNullTerminatedString(header, 0, 100);
    const size = parseOctal(header, 124, 136);
    const typeflag = String.fromCharCode(header[156] || 48); // '0' default
    const magic = readNullTerminatedString(header, 257, 263);
    const prefix =
      magic.startsWith("ustar") ? readNullTerminatedString(header, 345, 500) : "";

    offset += 512;

    if (prefix && !nextLongPath) {
      name = `${prefix}/${name}`;
    }

    if (nextLongPath) {
      name = nextLongPath;
      nextLongPath = null;
    }

    // GNU long filename header
    if (typeflag === "L") {
      const data = tarBuffer.subarray(offset, offset + size);
      nextLongPath = readNullTerminatedString(data, 0, size);
      const blocks = Math.ceil(size / 512);
      offset += blocks * 512;
      continue;
    }

    // PAX extended header: parse path if present
    if (typeflag === "x" || typeflag === "g") {
      const data = tarBuffer.subarray(offset, offset + size).toString("utf8");
      const lines = data.split("\n");
      for (const line of lines) {
        const match = /^\d+\s+path=(.+)$/.exec(line);
        if (match) {
          nextLongPath = match[1];
        }
      }
      const blocks = Math.ceil(size / 512);
      offset += blocks * 512;
      continue;
    }

    // Determine top-level prefix to strip (GitHub archives wrap everything in repo-commit/)
    if (topLevelPrefix === null) {
      const slashIndex = name.indexOf("/");
      if (slashIndex !== -1) {
        topLevelPrefix = name.slice(0, slashIndex + 1);
      }
    }

    let relativePath = name;
    if (topLevelPrefix && relativePath.startsWith(topLevelPrefix)) {
      relativePath = relativePath.slice(topLevelPrefix.length);
    }

    // Normalise and guard against path traversal
    relativePath = relativePath.replace(/\\/g, "/");
    if (!relativePath || relativePath === "." || relativePath === "./") {
      const blocks = Math.ceil(size / 512);
      offset += blocks * 512;
      continue;
    }

    const targetPath = path.resolve(destDir, relativePath);
    if (!targetPath.startsWith(destDir)) {
      throw new Error(`Path traversal detected in archive: ${name}`);
    }

    // Handle directory ('5') vs file ('0' or '\0')
    if (typeflag === "5" || name.endsWith("/")) {
      await fs.promises.mkdir(targetPath, { recursive: true });
    } else if (typeflag === "0" || typeflag === "\0" || typeflag === "") {
      const fileData = tarBuffer.subarray(offset, offset + size);
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, fileData);
    }

    const blocks = Math.ceil(size / 512);
    offset += blocks * 512;
  }
}
