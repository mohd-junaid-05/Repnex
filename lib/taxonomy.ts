/**
 * Framework category taxonomy and styling definitions.
 * Kept completely apart from the parser and adapters so browser components
 * can import it without pulling parser/filesystem libraries into the bundle.
 */

export interface TaxonomyCategory {
  id: string;
  label: string; // Concrete role name, e.g. "Page routes", "Controllers"
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
}

/** Fixed reading order: routable surfaces first, then layers behind them, then plumbing. */
export const TAXONOMY: Record<string, TaxonomyCategory[]> = {
  nextjs: [
    {
      id: "page-routes",
      label: "Page routes",
      colorClass: "bg-sky-400",
      badgeBg: "bg-sky-500/10 dark:bg-sky-500/15",
      badgeText: "text-sky-600 dark:text-sky-400",
      borderClass: "border-sky-500/20 dark:border-sky-500/30",
    },
    {
      id: "api-endpoints",
      label: "API endpoints",
      colorClass: "bg-cyan-400",
      badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      badgeText: "text-cyan-600 dark:text-cyan-400",
      borderClass: "border-cyan-500/20 dark:border-cyan-500/30",
    },
    {
      id: "server-actions",
      label: "Server actions",
      colorClass: "bg-violet-400",
      badgeBg: "bg-violet-500/10 dark:bg-violet-500/15",
      badgeText: "text-violet-600 dark:text-violet-400",
      borderClass: "border-violet-500/20 dark:border-violet-500/30",
    },
    {
      id: "components",
      label: "Components",
      colorClass: "bg-teal-400",
      badgeBg: "bg-teal-500/10 dark:bg-teal-500/15",
      badgeText: "text-teal-600 dark:text-teal-400",
      borderClass: "border-teal-500/20 dark:border-teal-500/30",
    },
    {
      id: "layouts",
      label: "Layouts",
      colorClass: "bg-indigo-400",
      badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      badgeText: "text-indigo-600 dark:text-indigo-400",
      borderClass: "border-indigo-500/20 dark:border-indigo-500/30",
    },
    {
      id: "hooks",
      label: "Hooks",
      colorClass: "bg-amber-400",
      badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
      badgeText: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-500/20 dark:border-amber-500/30",
    },
    {
      id: "utilities",
      label: "Utilities",
      colorClass: "bg-slate-400",
      badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
      badgeText: "text-slate-600 dark:text-slate-400",
      borderClass: "border-slate-500/20 dark:border-slate-500/30",
    },
    {
      id: "configuration",
      label: "Configuration",
      colorClass: "bg-yellow-400",
      badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
      badgeText: "text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20 dark:border-yellow-500/30",
    },
    {
      id: "types",
      label: "Types",
      colorClass: "bg-blue-400",
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
      badgeText: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/20 dark:border-blue-500/30",
    },
    {
      id: "modules",
      label: "Modules",
      colorClass: "bg-zinc-500",
      badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
      badgeText: "text-zinc-600 dark:text-zinc-400",
      borderClass: "border-zinc-500/20 dark:border-zinc-500/30",
    },
  ],

  nestjs: [
    {
      id: "controllers",
      label: "Controllers",
      colorClass: "bg-rose-400",
      badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
      badgeText: "text-rose-600 dark:text-rose-400",
      borderClass: "border-rose-500/20 dark:border-rose-500/30",
    },
    {
      id: "services",
      label: "Services",
      colorClass: "bg-emerald-400",
      badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-500/20 dark:border-emerald-500/30",
    },
    {
      id: "modules",
      label: "Modules",
      colorClass: "bg-indigo-400",
      badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      badgeText: "text-indigo-600 dark:text-indigo-400",
      borderClass: "border-indigo-500/20 dark:border-indigo-500/30",
    },
    {
      id: "entities",
      label: "Entities",
      colorClass: "bg-amber-400",
      badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
      badgeText: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-500/20 dark:border-amber-500/30",
    },
    {
      id: "dtos",
      label: "DTOs",
      colorClass: "bg-cyan-400",
      badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      badgeText: "text-cyan-600 dark:text-cyan-400",
      borderClass: "border-cyan-500/20 dark:border-cyan-500/30",
    },
    {
      id: "guards",
      label: "Guards",
      colorClass: "bg-purple-400",
      badgeBg: "bg-purple-500/10 dark:bg-purple-500/15",
      badgeText: "text-purple-600 dark:text-purple-400",
      borderClass: "border-purple-500/20 dark:border-purple-500/30",
    },
    {
      id: "utilities",
      label: "Utilities",
      colorClass: "bg-slate-400",
      badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
      badgeText: "text-slate-600 dark:text-slate-400",
      borderClass: "border-slate-500/20 dark:border-slate-500/30",
    },
    {
      id: "configuration",
      label: "Configuration",
      colorClass: "bg-yellow-400",
      badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
      badgeText: "text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20 dark:border-yellow-500/30",
    },
    {
      id: "types",
      label: "Types",
      colorClass: "bg-blue-400",
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
      badgeText: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/20 dark:border-blue-500/30",
    },
    {
      id: "tests",
      label: "Tests",
      colorClass: "bg-pink-400",
      badgeBg: "bg-pink-500/10 dark:bg-pink-500/15",
      badgeText: "text-pink-600 dark:text-pink-400",
      borderClass: "border-pink-500/20 dark:border-pink-500/30",
    },
    {
      id: "plumbing",
      label: "Plumbing",
      colorClass: "bg-zinc-500",
      badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
      badgeText: "text-zinc-600 dark:text-zinc-400",
      borderClass: "border-zinc-500/20 dark:border-zinc-500/30",
    },
  ],

  react: [
    {
      id: "views",
      label: "Views",
      colorClass: "bg-sky-400",
      badgeBg: "bg-sky-500/10 dark:bg-sky-500/15",
      badgeText: "text-sky-600 dark:text-sky-400",
      borderClass: "border-sky-500/20 dark:border-sky-500/30",
    },
    {
      id: "components",
      label: "Components",
      colorClass: "bg-teal-400",
      badgeBg: "bg-teal-500/10 dark:bg-teal-500/15",
      badgeText: "text-teal-600 dark:text-teal-400",
      borderClass: "border-teal-500/20 dark:border-teal-500/30",
    },
    {
      id: "hooks",
      label: "Hooks",
      colorClass: "bg-amber-400",
      badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
      badgeText: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-500/20 dark:border-amber-500/30",
    },
    {
      id: "contexts",
      label: "Contexts",
      colorClass: "bg-purple-400",
      badgeBg: "bg-purple-500/10 dark:bg-purple-500/15",
      badgeText: "text-purple-600 dark:text-purple-400",
      borderClass: "border-purple-500/20 dark:border-purple-500/30",
    },
    {
      id: "utilities",
      label: "Utilities",
      colorClass: "bg-slate-400",
      badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
      badgeText: "text-slate-600 dark:text-slate-400",
      borderClass: "border-slate-500/20 dark:border-slate-500/30",
    },
    {
      id: "configuration",
      label: "Configuration",
      colorClass: "bg-yellow-400",
      badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
      badgeText: "text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20 dark:border-yellow-500/30",
    },
    {
      id: "types",
      label: "Types",
      colorClass: "bg-blue-400",
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
      badgeText: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/20 dark:border-blue-500/30",
    },
    {
      id: "tests",
      label: "Tests",
      colorClass: "bg-rose-400",
      badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
      badgeText: "text-rose-600 dark:text-rose-400",
      borderClass: "border-rose-500/20 dark:border-rose-500/30",
    },
    {
      id: "modules",
      label: "Modules",
      colorClass: "bg-zinc-500",
      badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
      badgeText: "text-zinc-600 dark:text-zinc-400",
      borderClass: "border-zinc-500/20 dark:border-zinc-500/30",
    },
  ],

  generic: [
    {
      id: "entry",
      label: "Entry",
      colorClass: "bg-emerald-400",
      badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-500/20 dark:border-emerald-500/30",
    },
    {
      id: "modules",
      label: "Modules",
      colorClass: "bg-zinc-500",
      badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
      badgeText: "text-zinc-600 dark:text-zinc-400",
      borderClass: "border-zinc-500/20 dark:border-zinc-500/30",
    },
    {
      id: "utilities",
      label: "Utilities",
      colorClass: "bg-slate-400",
      badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
      badgeText: "text-slate-600 dark:text-slate-400",
      borderClass: "border-slate-500/20 dark:border-slate-500/30",
    },
    {
      id: "tests",
      label: "Tests",
      colorClass: "bg-rose-400",
      badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
      badgeText: "text-rose-600 dark:text-rose-400",
      borderClass: "border-rose-500/20 dark:border-rose-500/30",
    },
    {
      id: "configuration",
      label: "Configuration",
      colorClass: "bg-yellow-400",
      badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
      badgeText: "text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20 dark:border-yellow-500/30",
    },
    {
      id: "types",
      label: "Types",
      colorClass: "bg-blue-400",
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
      badgeText: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/20 dark:border-blue-500/30",
    },
  ],
};

const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
  nextjs: "Next.js",
  nestjs: "NestJS",
  react: "React",
  generic: "TypeScript",
};

/** Get display name for a framework key. */
export function getFrameworkDisplayName(framework: string): string {
  const normalized = framework.toLowerCase().replace(/[^a-z0-9]/g, "");
  return FRAMEWORK_DISPLAY_NAMES[normalized] || FRAMEWORK_DISPLAY_NAMES.generic;
}

/** Get list of taxonomy categories in reading order for a given framework. */
export function getFrameworkCategories(framework: string): TaxonomyCategory[] {
  const normalized = framework.toLowerCase().replace(/[^a-z0-9]/g, "");
  return TAXONOMY[normalized] || TAXONOMY.generic;
}

/** Get style definition for a specific role in a framework. */
export function getCategoryStyle(framework: string, roleName: string): TaxonomyCategory {
  const categories = getFrameworkCategories(framework);
  const match = categories.find(
    (c) => c.label.toLowerCase() === roleName.toLowerCase() || c.id === roleName.toLowerCase()
  );
  if (match) return match;

  return {
    id: "module",
    label: roleName,
    colorClass: "bg-zinc-500",
    badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
    badgeText: "text-zinc-600 dark:text-zinc-400",
    borderClass: "border-zinc-500/20 dark:border-zinc-500/30",
  };
}

export interface RailCategoryItem {
  id: string;
  label: string;
  count: number;
  colorClass: string;
}

/**
 * Compute the left rail category list with counts.
 * Respects fixed reading order: routable surfaces first, then layers behind them, then plumbing.
 * Only returns categories that actually exist in the codebase.
 */
export function computeRailCategories(
  framework: string,
  fileRoles: Record<string, string>
): RailCategoryItem[] {
  const categories = getFrameworkCategories(framework);
  const countsByRole = new Map<string, number>();

  for (const role of Object.values(fileRoles)) {
    const key = role.toLowerCase();
    countsByRole.set(key, (countsByRole.get(key) || 0) + 1);
  }

  const result: RailCategoryItem[] = [];

  for (const cat of categories) {
    const count = countsByRole.get(cat.label.toLowerCase()) || 0;
    if (count > 0) {
      result.push({
        id: cat.id,
        label: cat.label,
        count,
        colorClass: cat.colorClass,
      });
    }
  }

  return result;
}
