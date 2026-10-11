/**
 * NestJS adapter: roles from filename suffixes, routes assembled from
 * decorators on the controller and method together.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, SyntaxKind, type StringLiteral } from 'ts-morph';
import type { FrameworkAdapter, ParsedFile, ExtractedRoute } from '../types';

const HTTP_DECORATOR_MAP: Record<string, string> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
  Options: 'OPTIONS',
  Head: 'HEAD',
  All: 'ALL',
};

export const nestjsAdapter: FrameworkAdapter = {
  id: 'nestjs',
  name: 'NestJS',

  detect(repoRoot: string, files: ParsedFile[]): boolean {
    const pkgPath = path.join(repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['@nestjs/core'] || deps['@nestjs/common']) return true;
      } catch {
        // Fall back to filename convention
      }
    }

    if (fs.existsSync(path.join(repoRoot, 'nest-cli.json'))) {
      return true;
    }

    for (const f of files) {
      const p = f.path.toLowerCase();
      if (
        p.endsWith('.controller.ts') ||
        p.endsWith('.service.ts') ||
        p.endsWith('.module.ts')
      ) {
        return true;
      }
    }

    return false;
  },

  shouldInclude(): boolean {
    return true;
  },

  excludeReason(): string {
    return '';
  },

  assignRoles(_repoRoot: string, files: ParsedFile[]): Record<string, string> {
    const roles: Record<string, string> = {};

    for (const file of files) {
      const p = file.path.replace(/\\/g, '/').toLowerCase();
      const name = (file.path.split(/[/\\]/).pop() || file.path).toLowerCase();

      if (
        name.includes('.test.') ||
        name.includes('.spec.') ||
        p.includes('/__tests__/') ||
        p.startsWith('__tests__/')
      ) {
        roles[file.path] = 'Tests';
      } else if (name.endsWith('.controller.ts') || name.endsWith('.controller.js')) {
        roles[file.path] = 'Controllers';
      } else if (name.endsWith('.service.ts') || name.endsWith('.service.js')) {
        roles[file.path] = 'Services';
      } else if (name.endsWith('.module.ts') || name.endsWith('.module.js')) {
        roles[file.path] = 'Modules';
      } else if (name.endsWith('.entity.ts') || name.endsWith('.entity.js')) {
        roles[file.path] = 'Entities';
      } else if (name.endsWith('.dto.ts') || name.endsWith('.dto.js')) {
        roles[file.path] = 'DTOs';
      } else if (
        name.endsWith('.guard.ts') ||
        name.endsWith('.interceptor.ts') ||
        name.endsWith('.pipe.ts') ||
        name.endsWith('.filter.ts') ||
        name.endsWith('.middleware.ts')
      ) {
        roles[file.path] = 'Guards';
      } else if (
        name.includes('.config.') ||
        name.startsWith('tsconfig') ||
        name.startsWith('.env')
      ) {
        roles[file.path] = 'Configuration';
      } else if (
        name.endsWith('.d.ts') ||
        name === 'types.ts' ||
        name.endsWith('.types.ts') ||
        name.endsWith('.interface.ts') ||
        p.includes('/types/') ||
        p.startsWith('types/')
      ) {
        roles[file.path] = 'Types';
      } else if (
        p.includes('/utils/') ||
        p.startsWith('utils/') ||
        p.includes('/lib/') ||
        p.startsWith('lib/') ||
        p.includes('/common/') ||
        p.startsWith('common/') ||
        name.endsWith('.util.ts') ||
        name.endsWith('.utils.ts')
      ) {
        roles[file.path] = 'Utilities';
      } else {
        roles[file.path] = 'Plumbing';
      }
    }

    return roles;
  },

  extractRoutes(repoRoot: string, files: ParsedFile[]): ExtractedRoute[] {
    const controllerFiles = files.filter((f) => {
      const p = f.path.toLowerCase();
      return p.endsWith('.controller.ts') || p.endsWith('.controller.js');
    });

    if (controllerFiles.length === 0) return [];

    const project = new Project({
      compilerOptions: {
        experimentalDecorators: true,
        allowJs: true,
      },
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
    });

    const routes: ExtractedRoute[] = [];

    for (const cf of controllerFiles) {
      const absPath = path.join(repoRoot, cf.path);
      let sourceFile;
      try {
        const content = fs.readFileSync(absPath, 'utf-8');
        sourceFile = project.createSourceFile(cf.path, content, { overwrite: true });
      } catch {
        continue;
      }

      const classes = sourceFile.getClasses();
      for (const cls of classes) {
        // 1. Controller decorator
        const controllerDec = cls.getDecorator('Controller');
        if (!controllerDec) continue;

        let controllerPrefix = '';
        const decArgs = controllerDec.getArguments();

        if (decArgs.length > 0) {
          const firstArg = decArgs[0];
          if (firstArg.getKind() === SyntaxKind.StringLiteral || firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
            controllerPrefix = (firstArg as StringLiteral).getLiteralText();
          } else if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
            // e.g. @Controller({ path: 'users' })
            const obj = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
            const pathProp = obj?.getProperty('path');
            if (pathProp && pathProp.getKind() === SyntaxKind.PropertyAssignment) {
              const init = pathProp.asKind(SyntaxKind.PropertyAssignment)?.getInitializer();
              if (
                init &&
                (init.getKind() === SyntaxKind.StringLiteral ||
                  init.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)
              ) {
                controllerPrefix = (init as StringLiteral).getLiteralText();
              } else {
                // Non-literal path: cannot recover exact pattern without inference
                continue;
              }
            } else {
              continue;
            }
          } else {
            // Variable / dynamic expression: cannot recover exact prefix with no inference
            continue;
          }
        }

        // 2. Class methods with HTTP decorators
        for (const method of cls.getMethods()) {
          for (const dec of method.getDecorators()) {
            const decName = dec.getName();
            const httpMethod = HTTP_DECORATOR_MAP[decName];
            if (!httpMethod) continue;

            const mArgs = dec.getArguments();
            let methodSubpath = '';

            if (mArgs.length > 0) {
              const arg0 = mArgs[0];
              if (
                arg0.getKind() === SyntaxKind.StringLiteral ||
                arg0.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral
              ) {
                methodSubpath = (arg0 as StringLiteral).getLiteralText();
              } else {
                // Non-literal subpath argument: cannot recover exact pattern
                continue;
              }
            }

            // Assemble exact full pattern
            const p = controllerPrefix.replace(/^\/+|\/+$/g, '');
            const s = methodSubpath.replace(/^\/+|\/+$/g, '');

            let fullPattern = '/';
            if (p && s) {
              fullPattern = `/${p}/${s}`;
            } else if (p) {
              fullPattern = `/${p}`;
            } else if (s) {
              fullPattern = `/${s}`;
            }

            routes.push({
              filePath: cf.path,
              routePath: fullPattern,
              httpMethods: [httpMethod],
            });
          }
        }
      }
    }

    return routes;
  },
};
