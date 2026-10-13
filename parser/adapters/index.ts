/**
 * Framework adapter registry.
 * Detection runs in a fixed order and the first match wins.
 */

import type { FrameworkAdapter, ParsedFile } from '../types';
import { nextjsAdapter } from './nextjs';
import { nestjsAdapter } from './nestjs';
import { reactAdapter } from './react';
import { fallbackAdapter } from './fallback';

export { nextjsAdapter, nestjsAdapter, reactAdapter, fallbackAdapter };

/** Fixed detection order: Next.js -> NestJS -> React -> Generic */
export const ALL_ADAPTERS: FrameworkAdapter[] = [
  nextjsAdapter,
  nestjsAdapter,
  reactAdapter,
  fallbackAdapter,
];

/**
 * Detect which adapter matches the repository.
 * Evaluates adapters in fixed order; first match wins.
 */
export function detectAdapter(repoRoot: string, files: ParsedFile[]): FrameworkAdapter {
  for (const adapter of ALL_ADAPTERS) {
    if (adapter.detect(repoRoot, files)) {
      return adapter;
    }
  }
  return fallbackAdapter;
}
