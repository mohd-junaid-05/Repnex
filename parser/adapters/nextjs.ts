/**
 * Next.js adapter: roles from path conventions and directives,
 * routes derived from App Router and Pages Router conventions.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project } from 'ts-morph';
import type { FrameworkAdapter, ParsedFile, ExtractedRoute } from '../types';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export const nextjsAdapter: FrameworkAdapter = {
  id: 'nextjs',
  name: 'Next.js',

  detect(repoRoot: string, files: ParsedFile[]): boolean {
    const pkgPath = path.join(repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.next) return true;
      } catch {
        // Fall back to config/file checks
      }
    }

    const configCandidates = [
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      'next.config.cjs',
    ];
    for (const conf of configCandidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ repoRoot, conf))) return true;
    }

    for (const f of files) {
      const p = f.path.replace(/\\/g, '/').toLowerCase();
      if (
        p.startsWith('app/') ||
        p.startsWith('src/app/') ||
        p.startsWith('pages/') ||
        p.startsWith('src/pages/')
      ) {
        if (
          p.includes('/page.') ||
          p.includes('/route.') ||
          p.includes('/layout.') ||
          p.includes('_app.')
        ) {
          return true;
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

  assignRoles(repoRoot: string, files: ParsedFile[]): Record<string, string> {
    const roles: Record<string, string> = {};

    for (const file of files) {
      const p = file.path.replace(/\\/g, '/').toLowerCase();
      const name = (file.path.split(/[/\\]/).pop() || file.path).toLowerCase();

      // Check for Server Actions
      let isServerAction = false;
      if (
        name.includes('.action.') ||
        name.includes('.actions.') ||
        name === 'actions.ts' ||
        name === 'actions.js'
      ) {
        isServerAction = true;
      } else if (file.language === 'typescript' || file.language === 'javascript') {
        // Inspect top of file for 'use server' directive
        try {
          const absPath = path.join(repoRoot, file.path);
          const head = fs.readFileSync(absPath, 'utf-8').slice(0, 300);
          if (head.includes("'use server'") || head.includes('"use server"')) {
            isServerAction = true;
          }
        } catch {
          // ignore read error
        }
      }

      if (isServerAction) {
        roles[file.path] = 'Server actions';
        continue;
      }

      // Tests
      if (
        name.includes('.test.') ||
        name.includes('.spec.') ||
        p.includes('/__tests__/') ||
        p.startsWith('__tests__/')
      ) {
        roles[file.path] = 'Tests';
        continue;
      }

      // Page routes
      const isAppPage =
        (p.startsWith('app/') || p.startsWith('src/app/')) &&
        (name.startsWith('page.ts') ||
          name.startsWith('page.tsx') ||
          name.startsWith('page.js') ||
          name.startsWith('page.jsx'));

      const isPagesPage =
        (p.startsWith('pages/') || p.startsWith('src/pages/')) &&
        !p.includes('/api/') &&
        !name.startsWith('_') &&
        (name.endsWith('.tsx') ||
          name.endsWith('.jsx') ||
          name.endsWith('.ts') ||
          name.endsWith('.js'));

      if (isAppPage || isPagesPage) {
        roles[file.path] = 'Page routes';
        continue;
      }

      // API endpoints
      const isAppRoute =
        (p.startsWith('app/') || p.startsWith('src/app/')) &&
        (name.startsWith('route.ts') || name.startsWith('route.js'));

      const isPagesApi =
        (p.startsWith('pages/api/') || p.startsWith('src/pages/api/')) &&
        (name.endsWith('.ts') || name.endsWith('.js'));

      if (isAppRoute || isPagesApi) {
        roles[file.path] = 'API endpoints';
        continue;
      }

      // Layouts and routing UI
      if (
        name.startsWith('layout.') ||
        name.startsWith('template.') ||
        name.startsWith('loading.') ||
        name.startsWith('error.') ||
        name.startsWith('not-found.') ||
        name.startsWith('default.')
      ) {
        roles[file.path] = 'Layouts';
        continue;
      }

      // Hooks
      if (name.startsWith('use-') || /^use[a-z0-9]/.test(name)) {
        roles[file.path] = 'Hooks';
        continue;
      }

      // UI Components
      if (
        file.language === 'typescriptreact' ||
        file.language === 'javascriptreact' ||
        p.includes('/components/') ||
        p.startsWith('components/') ||
        p.includes('/ui/') ||
        p.startsWith('ui/') ||
        name.endsWith('.tsx') ||
        name.endsWith('.jsx')
      ) {
        roles[file.path] = 'Components';
        continue;
      }

      // Configuration
      if (
        name.startsWith('middleware.') ||
        name.includes('.config.') ||
        name.startsWith('tsconfig') ||
        name.startsWith('.env')
      ) {
        roles[file.path] = 'Configuration';
        continue;
      }

      // Types
      if (
        name.endsWith('.d.ts') ||
        name === 'types.ts' ||
        name.endsWith('.types.ts') ||
        p.includes('/types/') ||
        p.startsWith('types/')
      ) {
        roles[file.path] = 'Types';
        continue;
      }

      // Utilities
      if (
        p.includes('/utils/') ||
        p.startsWith('utils/') ||
        p.includes('/lib/') ||
        p.startsWith('lib/') ||
        p.includes('/helpers/') ||
        p.startsWith('helpers/') ||
        name.endsWith('.util.ts') ||
        name.endsWith('.utils.ts')
      ) {
        roles[file.path] = 'Utilities';
        continue;
      }

      roles[file.path] = 'Modules';
    }

    return roles;
  },

  extractRoutes(repoRoot: string, files: ParsedFile[]): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];

    // Helper to derive clean App Router URL path from file path
    function deriveAppRoutePath(filePath: string, filename: string): string {
      let rel = filePath.replace(/\\/g, '/');
      if (rel.startsWith('src/app/')) {
        rel = rel.slice('src/app/'.length);
      } else if (rel.startsWith('app/')) {
        rel = rel.slice('app/'.length);
      }

      // Strip filename from end
      if (rel.endsWith('/' + filename)) {
        rel = rel.slice(0, -(filename.length + 1));
      } else if (rel === filename) {
        rel = '';
      }

      if (!rel) return '/';

      // Split segments and filter route groups like (marketing) and slots like @modal
      const segments = rel
        .split('/')
        .filter((seg) => seg && !seg.startsWith('(') && !seg.startsWith('@'));

      return segments.length === 0 ? '/' : `/${segments.join('/')}`;
    }

    // 1. App Router Pages
    const pageFiles = files.filter((f) => {
      const p = f.path.replace(/\\/g, '/').toLowerCase();
      const name = (f.path.split(/[/\\]/).pop() || '').toLowerCase();
      return (
        (p.startsWith('app/') || p.startsWith('src/app/')) &&
        (name === 'page.tsx' || name === 'page.jsx' || name === 'page.js' || name === 'page.ts')
      );
    });

    for (const pf of pageFiles) {
      const name = pf.path.split(/[/\\]/).pop() || '';
      const routePath = deriveAppRoutePath(pf.path, name);
      routes.push({
        filePath: pf.path,
        routePath,
        httpMethods: ['GET'],
      });
    }

    // 2. App Router API Route Handlers
    const routeHandlerFiles = files.filter((f) => {
      const p = f.path.replace(/\\/g, '/').toLowerCase();
      const name = (f.path.split(/[/\\]/).pop() || '').toLowerCase();
      return (
        (p.startsWith('app/') || p.startsWith('src/app/')) &&
        (name === 'route.ts' || name === 'route.js')
      );
    });

    if (routeHandlerFiles.length > 0) {
      const project = new Project({
        compilerOptions: { allowJs: true },
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
      });

      for (const rf of routeHandlerFiles) {
        const absPath = path.join(repoRoot, rf.path);
        let sourceFile;
        try {
          const content = fs.readFileSync(absPath, 'utf-8');
          sourceFile = project.createSourceFile(rf.path, content, { overwrite: true });
        } catch {
          continue;
        }

        const methods: string[] = [];

        // Check exported functions
        for (const fn of sourceFile.getFunctions()) {
          if (fn.isExported()) {
            const name = fn.getName()?.toUpperCase();
            if (name && HTTP_METHODS.has(name) && !methods.includes(name)) {
              methods.push(name);
            }
          }
        }

        // Check exported variables (e.g. export const GET = ...)
        for (const stmt of sourceFile.getVariableStatements()) {
          if (stmt.isExported()) {
            for (const decl of stmt.getDeclarations()) {
              const name = decl.getName().toUpperCase();
              if (name && HTTP_METHODS.has(name) && !methods.includes(name)) {
                methods.push(name);
              }
            }
          }
        }

        // Exact or absent constraint: only emit if methods are recovered
        if (methods.length > 0) {
          const name = rf.path.split(/[/\\]/).pop() || '';
          const routePath = deriveAppRoutePath(rf.path, name);
          routes.push({
            filePath: rf.path,
            routePath,
            httpMethods: methods,
          });
        }
      }
    }

    // 3. Pages Router Pages
    const pagesRouterFiles = files.filter((f) => {
      const p = f.path.replace(/\\/g, '/').toLowerCase();
      const name = (f.path.split(/[/\\]/).pop() || '').toLowerCase();
      return (
        (p.startsWith('pages/') || p.startsWith('src/pages/')) &&
        !p.includes('/api/') &&
        !name.startsWith('_') &&
        (name.endsWith('.tsx') ||
          name.endsWith('.jsx') ||
          name.endsWith('.ts') ||
          name.endsWith('.js'))
      );
    });

    for (const pf of pagesRouterFiles) {
      let rel = pf.path.replace(/\\/g, '/');
      if (rel.startsWith('src/pages/')) {
        rel = rel.slice('src/pages/'.length);
      } else if (rel.startsWith('pages/')) {
        rel = rel.slice('pages/'.length);
      }

      // Remove extension
      const ext = path.extname(rel);
      rel = rel.slice(0, -ext.length);

      if (rel === 'index') {
        rel = '';
      } else if (rel.endsWith('/index')) {
        rel = rel.slice(0, -'/index'.length);
      }

      const routePath = rel ? `/${rel}` : '/';
      routes.push({
        filePath: pf.path,
        routePath,
        httpMethods: ['GET'],
      });
    }

    return routes;
  },
};
