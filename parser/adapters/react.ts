/**
 * React adapter: recognizes React components, hooks, views, contexts.
 * Route table is empty (SPA client routing has no exact HTTP endpoints).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FrameworkAdapter, ParsedFile, ExtractedRoute } from '../types';

export const reactAdapter: FrameworkAdapter = {
  id: 'react',
  name: 'React',

  detect(repoRoot: string, files: ParsedFile[]): boolean {
    const pkgPath = path.join(repoRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.react) return true;
      } catch {
        // Fall back to file pattern check
      }
    }

    for (const f of files) {
      if (f.language === 'typescriptreact' || f.language === 'javascriptreact') {
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
      } else if (
        p.includes('/views/') ||
        p.startsWith('views/') ||
        p.includes('/pages/') ||
        p.startsWith('pages/')
      ) {
        roles[file.path] = 'Views';
      } else if (name.startsWith('use-') || /^use[a-z0-9]/.test(name)) {
        roles[file.path] = 'Hooks';
      } else if (name.includes('context.') || p.includes('/contexts/')) {
        roles[file.path] = 'Contexts';
      } else if (
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
        p.includes('/types/') ||
        p.startsWith('types/')
      ) {
        roles[file.path] = 'Types';
      } else if (
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
      } else {
        roles[file.path] = 'Modules';
      }
    }

    return roles;
  },

  extractRoutes(): ExtractedRoute[] {
    return [];
  },
};
