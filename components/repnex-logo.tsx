import React from "react";

export interface RepnexLogoProps {
  /** Size of the logo icon mark in pixels. Defaults to 18. */
  size?: number;
  /** Whether to render the application name "Repnex" on the right side. Defaults to false. */
  showText?: boolean;
  /** Extra class names applied to the container/svg mark. */
  className?: string;
  /** Extra class names applied to the "Repnex" text when showText is true. */
  textClassName?: string;
}

/**
 * Official Repnex AST Dependency Graph Logo component.
 * Features the signature 5-node AST graph mark with branching dependencies,
 * automatically themed to adapt to light and dark modes.
 */
export function RepnexLogo({
  size = 18,
  showText = false,
  className = "",
  textClassName = "font-semibold tracking-tight text-zinc-900 dark:text-zinc-100",
}: RepnexLogoProps) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden={showText ? "true" : undefined}
      aria-label={showText ? undefined : "Repnex Logo"}
      role={showText ? undefined : "img"}
    >
      {/* Dependency Connectors / Edges */}
      <path
        d="M21 20 H79"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 20 V56"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M79 20 V52"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 54 H70"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 54 Q 50 54 62 66 L 79 82"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* AST Graph Nodes */}
      {/* Top-Left */}
      <rect x="8" y="8" width="26" height="24" rx="6.5" fill="currentColor" />
      {/* Top-Right */}
      <rect x="66" y="8" width="26" height="24" rx="6.5" fill="currentColor" />
      {/* Middle-Left */}
      <rect x="8" y="44" width="26" height="24" rx="6.5" fill="currentColor" />
      {/* Middle-Right (Grey / muted accent node) */}
      <rect
        x="66"
        y="40"
        width="26"
        height="24"
        rx="6.5"
        fill="currentColor"
        opacity="0.6"
      />
      {/* Bottom-Right */}
      <rect x="66" y="70" width="26" height="24" rx="6.5" fill="currentColor" />
    </svg>
  );

  if (!showText) {
    return icon;
  }

  return (
    <div className="inline-flex items-center gap-2">
      {icon}
      <span className={textClassName}>Repnex</span>
    </div>
  );
}
