/**
 * Fallback adapter: no framework knowledge at all.
 * Includes all TS/JS files, excludes nothing framework-specific.
 */

import type { FrameworkAdapter } from '../types';

export const fallbackAdapter: FrameworkAdapter = {
  name: 'none',
  shouldInclude(_relativePath: string): boolean {
    return true;
  },
  excludeReason(_relativePath: string): string {
    return '';
  },
};
