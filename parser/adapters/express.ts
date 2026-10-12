/**
 * Express adapter: roles from directory convention, accepting both singular
 * and plural folder names.
 *
 * Express routes are assembled at runtime from routers, variables and middleware
 * chains, so routes are not extracted (emits an empty route table per spec).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FrameworkAdapter, ParsedFile, ExtractedRoute } from '../types';

export const expressAdapter: FrameworkAdapter = {
  id: 'express',
  name: 'Express',

  detect(repoRoot: string, files: ParsedFile[]): boolean {
    // 1. Check package.json for express dependency
    const pkgPath = path.join(repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.express) return true;
      } catch {
        // Fall back to file pattern check
      }
    }

    // 2. Check files for express require or import
    for (const f of files) {
      const p = f.path.replace(/\\/g, '/').toLowerCase();
      if (
        p.endsWith('app.js') ||
        p.endsWith('app.ts') ||
        p.endsWith('server.js') ||
        p.endsWith('server.ts') ||
        p.endsWith('index.js') ||
        p.endsWith('index.ts')
      ) {
        try {
          const content = fs.readFileSync(path.join(repoRoot, f.path), 'utf-8');
          if (
            content.includes("require('express')") ||
            content.includes('require("express")') ||
            content.includes("from 'express'") ||
            content.includes('from "express"')
          ) {
            return true;
          }
        } catch {
          // Ignore read error
        }
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
      const segments = p.split('/');
      const fileName = segments[segments.length - 1];

      // Folder matching helper: matches singular or plural segment in any parent folder
      const hasFolder = (...names: string[]) =>
        segments.slice(0, -1).some((s) => names.includes(s));

      // 1. Tests
      if (
        fileName.includes('.test.') ||
        fileName.includes('.spec.') ||
        hasFolder('__tests__', 'test', 'tests')
      ) {
        roles[file.path] = 'Tests';
      }
      // 2. Routes (singular and plural)
      else if (
        hasFolder('route', 'routes') ||
        fileName.endsWith('.route.js') ||
        fileName.endsWith('.routes.js') ||
        fileName.endsWith('.route.ts') ||
        fileName.endsWith('.routes.ts')
      ) {
        roles[file.path] = 'Routes';
      }
      // 3. Controllers (singular and plural)
      else if (
        hasFolder('controller', 'controllers') ||
        fileName.endsWith('.controller.js') ||
        fileName.endsWith('.controller.ts')
      ) {
        roles[file.path] = 'Controllers';
      }
      // 4. Middleware (singular and plural)
      else if (
        hasFolder('middleware', 'middlewares') ||
        fileName.endsWith('.middleware.js') ||
        fileName.endsWith('.middleware.ts')
      ) {
        roles[file.path] = 'Middleware';
      }
      // 5. Services (singular and plural)
      else if (
        hasFolder('service', 'services') ||
        fileName.endsWith('.service.js') ||
        fileName.endsWith('.service.ts')
      ) {
        roles[file.path] = 'Services';
      }
      // 6. Models (singular and plural)
      else if (
        hasFolder('model', 'models') ||
        fileName.endsWith('.model.js') ||
        fileName.endsWith('.model.ts')
      ) {
        roles[file.path] = 'Models';
      }
      // 7. Views (singular and plural)
      else if (hasFolder('view', 'views')) {
        roles[file.path] = 'Views';
      }
      // 8. Configuration (singular and plural)
      else if (
        hasFolder('config', 'configs', 'configuration', 'configurations') ||
        fileName.includes('.config.') ||
        fileName.startsWith('tsconfig') ||
        fileName.startsWith('.env')
      ) {
        roles[file.path] = 'Configuration';
      }
      // 9. Types
      else if (
        fileName.endsWith('.d.ts') ||
        fileName === 'types.ts' ||
        fileName.endsWith('.types.ts') ||
        hasFolder('type', 'types', '@types')
      ) {
        roles[file.path] = 'Types';
      }
      // 10. Utilities (singular and plural)
      else if (
        hasFolder('util', 'utils', 'helper', 'helpers', 'lib', 'libs') ||
        fileName.endsWith('.util.js') ||
        fileName.endsWith('.utils.js') ||
        fileName.endsWith('.util.ts') ||
        fileName.endsWith('.utils.ts')
      ) {
        roles[file.path] = 'Utilities';
      }
      // 11. Entry files (server.js, app.js, index.js, bin/www in root or top-level)
      else if (
        fileName === 'server.js' ||
        fileName === 'server.ts' ||
        fileName === 'app.js' ||
        fileName === 'app.ts' ||
        fileName === 'main.js' ||
        fileName === 'main.ts' ||
        fileName === 'index.js' ||
        fileName === 'index.ts' ||
        p.startsWith('bin/') ||
        fileName === 'www'
      ) {
        roles[file.path] = 'Entry';
      }
      // 12. Fallback
      else {
        roles[file.path] = 'Modules';
      }
    }

    return roles;
  },

  extractRoutes(): ExtractedRoute[] {
    // Express routes are assembled at runtime from routers, variables and middleware chains.
    // Per Phase 9 spec: "Express routes are not extracted... An Express repository gets roles and an empty route table."
    return [];
  },
};
