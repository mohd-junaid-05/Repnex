/**
 * Fallback adapter: no framework knowledge.
 * Assigns generic roles and emits an empty route table.
 */

import type { FrameworkAdapter, ParsedFile, ExtractedRoute } from '../types';

export const fallbackAdapter: FrameworkAdapter = {
  id: 'generic',
  name: 'TypeScript',

  detect(): boolean {
    return true;
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
        name.startsWith('index.') ||
        name.startsWith('main.') ||
        name.startsWith('mod.')
      ) {
        roles[file.path] = 'Entry';
      } else if (
        name.includes('.test.') ||
        name.includes('.spec.') ||
        p.includes('/__tests__/') ||
        p.startsWith('__tests__/')
      ) {
        roles[file.path] = 'Tests';
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
