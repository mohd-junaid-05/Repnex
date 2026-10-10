"use client";

// Status badge colours — colour carries meaning, nothing else does.
const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  running:  "bg-blue-50  text-blue-600  dark:bg-blue-950  dark:text-blue-400",
  complete: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  failed:   "bg-red-50   text-red-700   dark:bg-red-950   dark:text-red-400",
};

type Project = {
  name: string;
  repo_url: string;
};

type Analysis = {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  // Supabase returns a joined relation as an array even for a many-to-one FK.
  projects: Project | Project[] | null;
};

/** Normalize a joined project relation to its first project, or null if absent. */
function firstProject(p: Project | Project[] | null): Project | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

/** Format a creation timestamp as elapsed minutes, hours, or days from now. */
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Render project names, analysis ages, and statuses, or an empty workspace hint. */
export function AnalysesList({ analyses }: { analyses: Analysis[] }) {
  if (analyses.length === 0) {
    return (
      <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md px-6 py-12 text-center">
        <p className="text-sm text-zinc-400 dark:text-zinc-600 font-mono">
          No analyses yet for this organization.
        </p>
        <p className="text-xs text-zinc-300 dark:text-zinc-700 font-mono mt-1">
          Analyses will appear here once a repository is submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-900">
      {analyses.map((analysis) => {
        const project = firstProject(analysis.projects);
        return (
          <div
            key={analysis.id}
            className="flex items-center justify-between px-4 py-3 gap-4"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium text-black dark:text-white truncate">
                {project?.name ?? "Unknown project"}
              </span>
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600 truncate">
                {project?.repo_url ?? ""}
              </span>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
                {formatRelative(analysis.created_at)}
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  STATUS_STYLES[analysis.status] ?? STATUS_STYLES.pending
                }`}
              >
                {analysis.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
