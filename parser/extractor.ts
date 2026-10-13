/**
 * Import extractor.
 * Uses ts-morph to read every import, re-export and dynamic import from a file,
 * then resolves each to a file inside the repository or marks it unresolved.
 *
 * No web framework, no UI, no database.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { Project, SyntaxKind, type SourceFile } from 'ts-morph';
import type {
  ParsedFile,
  ParsedEdge,
  UnresolvedImport,
  EdgeKind,
  UnresolvedReason,
} from './types';

/** Raw import extracted from source before resolution. */
interface RawImport {
  specifier: string;
  kind: EdgeKind;
}

/**
 * Given a set of parsed files, extract all import edges and unresolved imports.
 * Returns deduplicated edges (unique source+target+kind triples).
 */
export function extractImports(
  repoRoot: string,
  files: ParsedFile[],
  tsConfigPath: string | null,
): {
  edges: ParsedEdge[];
  unresolved: UnresolvedImport[];
  fileExports: Record<string, string[]>;
  fileFunctions: Record<string, string[]>;
} {
  const absoluteRoot = path.resolve(repoRoot);

  // Build a set of known file paths for fast lookup
  const knownPaths = new Set(files.map((f) => f.path));

  // Create a ts-morph project for parsing
  const project = new Project({
    // Use tsconfig if available, for path alias resolution
    tsConfigFilePath: tsConfigPath ?? undefined,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: tsConfigPath
      ? undefined
      : {
          // Defaults when no tsconfig
          allowJs: true,
          jsx: 2, // React
          moduleResolution: 99, // Bundler
          target: 99, // ESNext
          module: 99, // ESNext
        },
  });

  // Add all known files to the project
  for (const file of files) {
    const absPath = path.join(absoluteRoot, file.path);
    try {
      project.addSourceFileAtPath(absPath);
    } catch {
      // File can't be added — move on, it'll still be in the file list
    }
  }

  const edges: ParsedEdge[] = [];
  const unresolved: UnresolvedImport[] = [];
  const fileExports: Record<string, string[]> = {};
  const fileFunctions: Record<string, string[]> = {};
  const edgeKeys = new Set<string>();

  for (const file of files) {
    const absPath = path.join(absoluteRoot, file.path);
    const sourceFile = project.getSourceFile(absPath);
    if (!sourceFile) continue;

    // Read exported names
    const exportedNames = extractModuleExports(sourceFile);
    if (exportedNames.length > 0) {
      fileExports[file.path] = exportedNames;
    }

    // Read declared functions and major methods
    const declaredFunctions = extractFileFunctions(sourceFile);
    if (declaredFunctions.length > 0) {
      fileFunctions[file.path] = declaredFunctions;
    }

    const rawImports = extractRawImports(sourceFile);

    for (const raw of rawImports) {
      const resolved = resolveImport(
        absoluteRoot,
        file.path,
        raw.specifier,
        knownPaths,
      );

      if (resolved.type === 'resolved') {
        // Deduplicate: same source + target + kind = one edge
        const key = `${file.path}|${resolved.targetPath}|${raw.kind}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({
            sourcePath: file.path,
            targetPath: resolved.targetPath,
            importSpecifier: raw.specifier,
            kind: raw.kind,
          });
        }
      } else {
        unresolved.push({
          sourcePath: file.path,
          importSpecifier: raw.specifier,
          reason: resolved.reason,
          kind: raw.kind,
        });
      }
    }
  }

  return { edges, unresolved, fileExports, fileFunctions };
}

/** Extract all raw import specifiers from a source file. */
function extractRawImports(sourceFile: SourceFile): RawImport[] {
  const imports: RawImport[] = [];

  // 1. Plain imports: import X from 'x', import { X } from 'x', import 'x'
  for (const decl of sourceFile.getImportDeclarations()) {
    const specifier = decl.getModuleSpecifierValue();
    imports.push({ specifier, kind: 'import' });
  }

  // 2. Re-exports: export { X } from 'x', export * from 'x'
  for (const decl of sourceFile.getExportDeclarations()) {
    const specifier = decl.getModuleSpecifierValue();
    if (specifier) {
      imports.push({ specifier, kind: 're-export' });
    }
  }

  // 3. Dynamic imports: import('x') with a literal string
  // 4. CommonJS require: require('x') with a literal string
  const callExpressions = sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  );
  for (const call of callExpressions) {
    const expression = call.getExpression();
    // import() is parsed as a CallExpression with ImportKeyword
    if (expression.getKind() === SyntaxKind.ImportKeyword) {
      const args = call.getArguments();
      if (args.length > 0) {
        const firstArg = args[0];
        if (firstArg.getKind() === SyntaxKind.StringLiteral) {
          const specifier = firstArg.asKind(SyntaxKind.StringLiteral);
          if (specifier) {
            imports.push({
              specifier: specifier.getLiteralValue(),
              kind: 'dynamic-import',
            });
          }
        } else if (firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
          const tpl = firstArg.asKind(SyntaxKind.NoSubstitutionTemplateLiteral);
          if (tpl) {
            imports.push({
              specifier: tpl.getLiteralValue(),
              kind: 'dynamic-import',
            });
          }
        } else {
          // Non-literal dynamic import — report but don't guess
          imports.push({
            specifier: firstArg.getText(),
            kind: 'dynamic-import',
          });
        }
      }
    } else if (
      expression.getKind() === SyntaxKind.Identifier &&
      expression.getText() === 'require'
    ) {
      const args = call.getArguments();
      if (args.length > 0) {
        const firstArg = args[0];
        if (firstArg.getKind() === SyntaxKind.StringLiteral) {
          const specifier = firstArg.asKind(SyntaxKind.StringLiteral);
          if (specifier) {
            imports.push({
              specifier: specifier.getLiteralValue(),
              kind: 'require',
            });
          }
        } else if (firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
          const tpl = firstArg.asKind(SyntaxKind.NoSubstitutionTemplateLiteral);
          if (tpl) {
            imports.push({
              specifier: tpl.getLiteralValue(),
              kind: 'require',
            });
          }
        }
      }
    }
  }

  return imports;
}

/** Extract exported names from a source file (both CommonJS and ESM). */
export function extractModuleExports(sourceFile: SourceFile): string[] {
  const exportNames = new Set<string>();

  // 1. CommonJS exports: module.exports = ..., module.exports.foo = ..., exports.bar = ...
  const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  for (const bin of binaryExpressions) {
    if (bin.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
      const left = bin.getLeft();
      const leftText = left.getText();

      // module.exports.foo = ...
      if (leftText.startsWith('module.exports.') && leftText.length > 'module.exports.'.length) {
        const prop = leftText.slice('module.exports.'.length).trim();
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
          exportNames.add(prop);
        }
      }
      // exports.foo = ...
      else if (leftText.startsWith('exports.') && leftText.length > 'exports.'.length) {
        const prop = leftText.slice('exports.'.length).trim();
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
          exportNames.add(prop);
        }
      }
      // module.exports = ...
      else if (leftText === 'module.exports' || leftText === 'exports') {
        const right = bin.getRight();
        const rightKind = right.getKind();

        if (rightKind === SyntaxKind.ObjectLiteralExpression) {
          const obj = right.asKind(SyntaxKind.ObjectLiteralExpression);
          if (obj) {
            for (const prop of obj.getProperties()) {
              if ('getName' in prop && typeof prop.getName === 'function') {
                const name = prop.getName();
                if (name) exportNames.add(name);
              }
            }
          }
        } else if (
          rightKind === SyntaxKind.FunctionExpression ||
          rightKind === SyntaxKind.ClassExpression
        ) {
          const funcOrClass = right as { getName?: () => string | undefined };
          const name = typeof funcOrClass.getName === 'function' ? funcOrClass.getName() : undefined;
          exportNames.add(name || 'default');
        } else if (rightKind === SyntaxKind.Identifier) {
          exportNames.add(right.getText());
        } else {
          exportNames.add('default');
        }
      }
    }
  }

  // 2. ESM exports
  for (const decl of sourceFile.getExportDeclarations()) {
    for (const named of decl.getNamedExports()) {
      exportNames.add(named.getName());
    }
  }
  for (const fn of sourceFile.getFunctions()) {
    if (fn.isExported()) {
      exportNames.add(fn.getName() || 'default');
    }
  }
  for (const cls of sourceFile.getClasses()) {
    if (cls.isExported()) {
      exportNames.add(cls.getName() || 'default');
    }
  }
  for (const stmt of sourceFile.getVariableStatements()) {
    if (stmt.isExported()) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        exportNames.add(decl.getName());
      }
    }
  }
  if (sourceFile.getExportAssignments().length > 0) {
    exportNames.add('default');
  }

  return [...exportNames].sort();
}

/** Extract declared functions, arrow functions, and classes from a source file. */
export function extractFileFunctions(sourceFile: SourceFile): string[] {
  const functionNames = new Set<string>();

  // 1. Function declarations: function foo() {}
  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName();
    if (name) functionNames.add(name);
  }

  // 2. Variable declarations assigned to functions: const foo = () => {}, const bar = function() {}
  for (const stmt of sourceFile.getVariableStatements()) {
    for (const decl of stmt.getDeclarationList().getDeclarations()) {
      const init = decl.getInitializer();
      if (init) {
        const kind = init.getKind();
        if (
          kind === SyntaxKind.ArrowFunction ||
          kind === SyntaxKind.FunctionExpression
        ) {
          functionNames.add(decl.getName());
        }
      }
    }
  }

  // 3. Class declarations and their methods: class Foo { bar() {} }
  for (const cls of sourceFile.getClasses()) {
    const clsName = cls.getName();
    if (clsName) {
      functionNames.add(clsName);
    }
    for (const method of cls.getMethods()) {
      const methodName = method.getName();
      if (methodName) {
        functionNames.add(clsName ? `${clsName}.${methodName}` : methodName);
      }
    }
  }

  // 4. CommonJS function assignments: exports.foo = function() {}, module.exports.bar = () => {}
  const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  for (const bin of binaryExpressions) {
    if (bin.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
      const leftText = bin.getLeft().getText();
      const right = bin.getRight();
      const rightKind = right.getKind();
      const isFn =
        rightKind === SyntaxKind.ArrowFunction ||
        rightKind === SyntaxKind.FunctionExpression;

      if (isFn) {
        if (leftText.startsWith('module.exports.') && leftText.length > 'module.exports.'.length) {
          const prop = leftText.slice('module.exports.'.length).trim();
          if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
            functionNames.add(prop);
          }
        } else if (leftText.startsWith('exports.') && leftText.length > 'exports.'.length) {
          const prop = leftText.slice('exports.'.length).trim();
          if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
            functionNames.add(prop);
          }
        }
      }
    }
  }

  return [...functionNames].sort();
}

type ResolveResult =
  | { type: 'resolved'; targetPath: string }
  | { type: 'unresolved'; reason: UnresolvedReason };

/**
 * Resolve an import specifier to a file path within the repository.
 * Handles relative paths, index files, and extension resolution.
 * Does NOT handle node_modules lookups — those are reported as external.
 */
function resolveImport(
  absoluteRoot: string,
  sourcePath: string,
  specifier: string,
  knownPaths: Set<string>,
): ResolveResult {
  // Bare specifiers (no leading . or /) are external packages
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    // Check for path aliases (e.g. @/something)
    if (specifier.startsWith('@/')) {
      // Resolve @/ alias to repo root
      const aliasedPath = specifier.slice(2); // Remove '@/'
      return resolveRelativePath(absoluteRoot, '', aliasedPath, knownPaths);
    }
    return { type: 'unresolved', reason: 'node-module' };
  }

  // Relative import
  const sourceDir = path.dirname(sourcePath);
  return resolveRelativePath(absoluteRoot, sourceDir, specifier, knownPaths);
}

/**
 * Try to resolve a relative import to a known file path.
 * Tries: exact match, each extension, index files.
 */
function resolveRelativePath(
  absoluteRoot: string,
  fromDir: string,
  specifier: string,
  knownPaths: Set<string>,
): ResolveResult {
  // Normalise the candidate path
  const joined = path.posix.join(fromDir, specifier);
  const normalised = path.posix.normalize(joined);

  // If the normalised path goes above root, it's outside the repository
  if (normalised.startsWith('..')) {
    return { type: 'unresolved', reason: 'outside-repository' };
  }

  // Extensions to try, in order
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs'];

  // 1. Exact match (specifier already has an extension)
  if (knownPaths.has(normalised)) {
    return { type: 'resolved', targetPath: normalised };
  }

  // 1.5 Handle ESM TS imports where .js maps to .ts/.tsx
  const extMatch = normalised.match(/\.(js|jsx|mjs|cjs)$/);
  if (extMatch) {
    const base = normalised.slice(0, -extMatch[0].length);
    const tsExts = extMatch[1] === 'js' ? ['.ts', '.tsx'] : 
                   extMatch[1] === 'jsx' ? ['.tsx', '.ts'] :
                   extMatch[1] === 'mjs' ? ['.mts'] : ['.cts'];
    for (const ext of tsExts) {
      const candidate = base + ext;
      if (knownPaths.has(candidate)) {
        return { type: 'resolved', targetPath: candidate };
      }
    }
  }

  // 2. Try appending each extension
  for (const ext of extensions) {
    const candidate = normalised + ext;
    if (knownPaths.has(candidate)) {
      return { type: 'resolved', targetPath: candidate };
    }
  }

  // 3. Try as a directory with index file
  for (const ext of extensions) {
    const candidate = normalised + '/index' + ext;
    if (knownPaths.has(candidate)) {
      return { type: 'resolved', targetPath: candidate };
    }
  }

  // 4. Verify the target actually doesn't exist on disk either
  // This distinguishes between a file that was skipped vs one that's missing
  const absPath = path.join(absoluteRoot, normalised);
  for (const ext of extensions) {
    if (fs.existsSync(/*turbopackIgnore: true*/ absPath + ext) || fs.existsSync(/*turbopackIgnore: true*/ path.join(absPath, 'index' + ext))) {
      // The file exists but wasn't included in our walk — it was excluded
      return { type: 'unresolved', reason: 'file-not-found' };
    }
  }
  if (fs.existsSync(/*turbopackIgnore: true*/ absPath)) {
    return { type: 'unresolved', reason: 'file-not-found' };
  }

  return { type: 'unresolved', reason: 'file-not-found' };
}
