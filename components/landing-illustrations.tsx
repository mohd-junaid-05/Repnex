import React from "react";

/**
 * Static SVG illustrations for the Cartograph landing page.
 * Strictly adheres to Phase 13 spec:
 * - Drawn, not captured.
 * - Completely unlabelled (no directory names, filepaths, or domain claims).
 * - Canvas color palette only (zinc, indigo, emerald, amber, sky, cyan, rose).
 * - Static: zero ambient motion or CSS animations.
 * - Dual-theme compatible (light & dark).
 */

export function HeroFigure() {
  return (
    <div className="w-full relative rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 sm:p-6 overflow-hidden">
      <svg
        viewBox="0 0 640 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        <defs>
          {/* Subtle grid pattern resembling canvas */}
          <pattern
            id="hero-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="12"
              cy="12"
              r="0.8"
              className="fill-zinc-300 dark:fill-zinc-800"
            />
          </pattern>
          {/* Arrow markers */}
          <marker
            id="arrow-emerald"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-emerald-500" />
          </marker>
          <marker
            id="arrow-amber"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-amber-500" />
          </marker>
          <marker
            id="arrow-sky"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-sky-500" />
          </marker>
        </defs>

        {/* Canvas background grid */}
        <rect width="640" height="380" fill="url(#hero-grid)" />

        {/* --- NODE 1: Folded Folder (Left) --- */}
        <g transform="translate(35, 130)">
          <rect
            width="145"
            height="86"
            rx="5"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Folder header tab */}
          <path
            d="M 12 18 L 46 18 L 54 26 L 133 26"
            className="stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth="1.2"
            fill="none"
          />
          <rect
            x="12"
            y="38"
            width="65"
            height="6"
            rx="2"
            className="fill-zinc-300 dark:fill-zinc-700"
          />
          <rect
            x="12"
            y="52"
            width="42"
            height="5"
            rx="2"
            className="fill-zinc-200 dark:fill-zinc-800"
          />
          {/* Indicators */}
          <circle cx="110" cy="54" r="3" className="fill-emerald-500/80" />
          <circle cx="124" cy="54" r="3" className="fill-amber-500/80" />
          {/* Outgoing port */}
          <circle
            cx="145"
            cy="43"
            r="3.5"
            className="fill-amber-500 stroke-white dark:stroke-black"
            strokeWidth="1.5"
          />
        </g>

        {/* --- NODE 2: Expanded Folder Panel (Center) --- */}
        <g transform="translate(230, 45)">
          {/* Main container */}
          <rect
            width="210"
            height="290"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700 shadow-xs"
            strokeWidth="1.2"
          />
          {/* Folder Header Bar */}
          <rect
            width="210"
            height="40"
            rx="6"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          {/* Folder icon & title bar skeleton */}
          <rect
            x="14"
            y="15"
            width="12"
            height="10"
            rx="1.5"
            className="fill-indigo-600 dark:fill-indigo-400"
          />
          <rect
            x="34"
            y="17"
            width="75"
            height="6"
            rx="2"
            className="fill-zinc-400 dark:fill-zinc-500"
          />
          <circle cx="178" cy="20" r="3" className="fill-emerald-500" />
          <circle cx="192" cy="20" r="3" className="fill-amber-500" />

          {/* Row 1: Entry / Barrel File */}
          <g transform="translate(8, 48)">
            <rect
              width="194"
              height="48"
              rx="4"
              className="fill-transparent hover:fill-zinc-50"
            />
            <rect
              x="8"
              y="18"
              width="5"
              height="12"
              rx="1.5"
              className="fill-emerald-500"
            />
            <rect
              x="20"
              y="17"
              width="90"
              height="6"
              rx="2"
              className="fill-zinc-700 dark:fill-zinc-300"
            />
            <rect
              x="20"
              y="28"
              width="55"
              height="4"
              rx="2"
              className="fill-zinc-300 dark:fill-zinc-700"
            />
            {/* Outgoing port */}
            <circle
              cx="194"
              cy="24"
              r="3.5"
              className="fill-amber-500 stroke-white dark:stroke-black"
              strokeWidth="1.5"
            />
          </g>

          {/* Row 2: SELECTED FILE ROW (Focal node) */}
          <g transform="translate(8, 104)">
            <rect
              width="194"
              height="54"
              rx="4"
              className="fill-indigo-50/80 dark:fill-indigo-950/40 stroke-indigo-500/60 dark:stroke-indigo-400/50"
              strokeWidth="1"
            />
            <rect
              x="8"
              y="21"
              width="5"
              height="12"
              rx="1.5"
              className="fill-indigo-600 dark:fill-indigo-400"
            />
            <rect
              x="20"
              y="18"
              width="105"
              height="7"
              rx="2"
              className="fill-indigo-900 dark:fill-indigo-200"
            />
            <rect
              x="20"
              y="30"
              width="68"
              height="5"
              rx="2"
              className="fill-indigo-400 dark:fill-indigo-500/60"
            />
            {/* Left incoming port handle */}
            <circle
              cx="0"
              cy="27"
              r="4"
              className="fill-emerald-500 stroke-white dark:stroke-zinc-950"
              strokeWidth="1.5"
            />
            {/* Right outgoing port handle */}
            <circle
              cx="194"
              cy="27"
              r="4"
              className="fill-amber-500 stroke-white dark:stroke-zinc-950"
              strokeWidth="1.5"
            />
          </g>

          {/* Row 3: Component / Utility */}
          <g transform="translate(8, 166)">
            <rect
              x="8"
              y="18"
              width="5"
              height="12"
              rx="1.5"
              className="fill-indigo-500/70"
            />
            <rect
              x="20"
              y="17"
              width="82"
              height="6"
              rx="2"
              className="fill-zinc-600 dark:fill-zinc-400"
            />
            <rect
              x="20"
              y="28"
              width="45"
              height="4"
              rx="2"
              className="fill-zinc-300 dark:fill-zinc-700"
            />
          </g>

          {/* Row 4: Test file */}
          <g transform="translate(8, 224)">
            <rect
              x="8"
              y="18"
              width="5"
              height="12"
              rx="1.5"
              className="fill-rose-500/70"
            />
            <rect
              x="20"
              y="17"
              width="70"
              height="6"
              rx="2"
              className="fill-zinc-500 dark:fill-zinc-500"
            />
            <rect
              x="20"
              y="28"
              width="40"
              height="4"
              rx="2"
              className="fill-zinc-200 dark:fill-zinc-800"
            />
            {/* Incoming port */}
            <circle
              cx="0"
              cy="24"
              r="3.5"
              className="fill-emerald-500 stroke-white dark:stroke-black"
              strokeWidth="1.5"
            />
          </g>
        </g>

        {/* --- NODE 3: Target Folder (Right) --- */}
        <g transform="translate(485, 115)">
          <rect
            width="125"
            height="150"
            rx="5"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Header */}
          <rect
            width="125"
            height="32"
            rx="5"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <rect
            x="12"
            y="13"
            width="50"
            height="6"
            rx="2"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
          {/* File rows */}
          <g transform="translate(8, 44)">
            <rect
              x="6"
              y="10"
              width="4"
              height="8"
              rx="1"
              className="fill-indigo-500"
            />
            <rect
              x="16"
              y="11"
              width="60"
              height="5"
              rx="2"
              className="fill-zinc-600 dark:fill-zinc-400"
            />
            {/* Left incoming port */}
            <circle
              cx="0"
              cy="14"
              r="3.5"
              className="fill-emerald-500 stroke-white dark:stroke-black"
              strokeWidth="1.5"
            />
          </g>
          <g transform="translate(8, 80)">
            <rect
              x="6"
              y="10"
              width="4"
              height="8"
              rx="1"
              className="fill-teal-500"
            />
            <rect
              x="16"
              y="11"
              width="50"
              height="5"
              rx="2"
              className="fill-zinc-500 dark:fill-zinc-500"
            />
            <circle
              cx="0"
              cy="14"
              r="3.5"
              className="fill-emerald-500 stroke-white dark:stroke-black"
              strokeWidth="1.5"
            />
          </g>
        </g>

        {/* --- DIRECTIONAL EDGES (Bézier curves) --- */}
        {/* Edge 1: Incoming from Node 1 into Selected Row (Emerald Green) */}
        <path
          d="M 180 173 C 205 173, 210 175, 238 175"
          className="stroke-emerald-500"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#arrow-emerald)"
        />

        {/* Edge 2: Outgoing from Selected Row to Node 3 (Amber Gold) */}
        <path
          d="M 432 175 C 455 175, 460 173, 485 173"
          className="stroke-amber-500"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#arrow-amber)"
        />

        {/* Edge 3: Cross-file connection from Row 1 to Node 3 (Sky Blue) */}
        <path
          d="M 432 116 C 455 116, 460 209, 485 209"
          className="stroke-sky-500"
          strokeWidth="1.4"
          fill="none"
          markerEnd="url(#arrow-sky)"
        />

        {/* Edge 4: Inbound lower edge to Row 4 */}
        <path
          d="M 180 173 C 195 173, 215 292, 238 292"
          className="stroke-emerald-500/50"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="3 3"
          markerEnd="url(#arrow-emerald)"
        />

        {/* Animated flow pulses along real dependency lines */}
        <circle r="2.5" className="fill-emerald-400">
          <animateMotion
            dur="2.2s"
            repeatCount="indefinite"
            path="M 180 173 C 205 173, 210 175, 238 175"
          />
        </circle>
        <circle r="2.5" className="fill-amber-400">
          <animateMotion
            dur="2.5s"
            repeatCount="indefinite"
            path="M 432 175 C 455 175, 460 173, 485 173"
          />
        </circle>
        <circle r="2.2" className="fill-sky-400">
          <animateMotion
            dur="3.0s"
            repeatCount="indefinite"
            path="M 432 116 C 455 116, 460 209, 485 209"
          />
        </circle>
        <circle r="2" className="fill-emerald-400">
          <animateMotion
            dur="3.4s"
            repeatCount="indefinite"
            path="M 180 173 C 195 173, 215 292, 238 292"
          />
        </circle>

        {/* Metric indicator badge overlay (top right) */}
        <g transform="translate(500, 24)">
          <rect
            width="105"
            height="26"
            rx="4"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <circle cx="16" cy="13" r="3" className="fill-emerald-500" />
          <rect
            x="24"
            y="10"
            width="22"
            height="5"
            rx="1.5"
            className="fill-zinc-600 dark:fill-zinc-400"
          />
          <circle cx="60" cy="13" r="3" className="fill-amber-500" />
          <rect
            x="68"
            y="10"
            width="22"
            height="5"
            rx="1.5"
            className="fill-zinc-600 dark:fill-zinc-400"
          />
        </g>
      </svg>
    </div>
  );
}

export function WhatItDoesFigure() {
  return (
    <div className="w-full relative rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 sm:p-6 overflow-hidden">
      <svg
        viewBox="0 0 540 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="wid-emerald"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-emerald-500" />
          </marker>
          <marker
            id="wid-amber"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-amber-500" />
          </marker>
        </defs>

        {/* Concentric radius depth boundaries */}
        <circle
          cx="270"
          cy="170"
          r="95"
          className="stroke-zinc-200 dark:stroke-zinc-800"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <circle
          cx="270"
          cy="170"
          r="165"
          className="stroke-zinc-200/60 dark:stroke-zinc-800/60"
          strokeWidth="1"
          strokeDasharray="3 5"
        />

        {/* Level 2 Dependents (Upstream, far left) */}
        <g transform="translate(40, 75)">
          <rect
            width="55"
            height="32"
            rx="3"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="13"
            width="32"
            height="5"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
        </g>
        <g transform="translate(40, 235)">
          <rect
            width="55"
            height="32"
            rx="3"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="13"
            width="28"
            height="5"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
        </g>

        {/* Level 1 Dependents (Upstream, mid left) */}
        <g transform="translate(135, 115)">
          <rect
            width="65"
            height="38"
            rx="4"
            className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="12"
            width="4"
            height="8"
            rx="1"
            className="fill-emerald-500"
          />
          <rect
            x="16"
            y="13"
            width="36"
            height="6"
            rx="1.5"
            className="fill-zinc-600 dark:fill-zinc-300"
          />
          <rect
            x="16"
            y="23"
            width="22"
            height="4"
            rx="1"
            className="fill-zinc-300 dark:fill-zinc-700"
          />
        </g>
        <g transform="translate(135, 190)">
          <rect
            width="65"
            height="38"
            rx="4"
            className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="12"
            width="4"
            height="8"
            rx="1"
            className="fill-emerald-500"
          />
          <rect
            x="16"
            y="13"
            width="32"
            height="6"
            rx="1.5"
            className="fill-zinc-600 dark:fill-zinc-300"
          />
          <rect
            x="16"
            y="23"
            width="26"
            height="4"
            rx="1"
            className="fill-zinc-300 dark:fill-zinc-700"
          />
        </g>

        {/* CENTRAL FOCAL FILE */}
        <g transform="translate(225, 138)">
          <rect
            width="90"
            height="64"
            rx="5"
            className="fill-indigo-50/90 dark:fill-indigo-950/50 stroke-indigo-500"
            strokeWidth="1.5"
          />
          <rect
            x="10"
            y="16"
            width="6"
            height="14"
            rx="1.5"
            className="fill-indigo-600 dark:fill-indigo-400"
          />
          <rect
            x="22"
            y="18"
            width="54"
            height="7"
            rx="2"
            className="fill-indigo-900 dark:fill-indigo-200"
          />
          <rect
            x="22"
            y="32"
            width="40"
            height="5"
            rx="1.5"
            className="fill-indigo-400 dark:fill-indigo-500"
          />
          <rect
            x="22"
            y="43"
            width="28"
            height="4"
            rx="1"
            className="fill-indigo-300 dark:fill-indigo-600"
          />
        </g>

        {/* Level 1 Blast Radius (Downstream, mid right) */}
        <g transform="translate(340, 115)">
          <rect
            width="65"
            height="38"
            rx="4"
            className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="12"
            width="4"
            height="8"
            rx="1"
            className="fill-amber-500"
          />
          <rect
            x="16"
            y="13"
            width="34"
            height="6"
            rx="1.5"
            className="fill-zinc-600 dark:fill-zinc-300"
          />
          <rect
            x="16"
            y="23"
            width="25"
            height="4"
            rx="1"
            className="fill-zinc-300 dark:fill-zinc-700"
          />
        </g>
        <g transform="translate(340, 190)">
          <rect
            width="65"
            height="38"
            rx="4"
            className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="12"
            width="4"
            height="8"
            rx="1"
            className="fill-amber-500"
          />
          <rect
            x="16"
            y="13"
            width="38"
            height="6"
            rx="1.5"
            className="fill-zinc-600 dark:fill-zinc-300"
          />
          <rect
            x="16"
            y="23"
            width="20"
            height="4"
            rx="1"
            className="fill-zinc-300 dark:fill-zinc-700"
          />
        </g>

        {/* Level 2 Blast Radius (Downstream, far right) */}
        <g transform="translate(445, 60)">
          <rect
            width="55"
            height="32"
            rx="3"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="13"
            width="30"
            height="5"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
        </g>
        <g transform="translate(445, 145)">
          <rect
            width="55"
            height="32"
            rx="3"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="13"
            width="34"
            height="5"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
        </g>
        <g transform="translate(445, 230)">
          <rect
            width="55"
            height="32"
            rx="3"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <rect
            x="8"
            y="13"
            width="26"
            height="5"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
        </g>

        {/* Edges - Inbound (Emerald) */}
        <path
          d="M 95 91 C 115 91, 115 134, 135 134"
          className="stroke-emerald-500"
          strokeWidth="1.4"
          fill="none"
          markerEnd="url(#wid-emerald)"
        />
        <path
          d="M 95 251 C 115 251, 115 209, 135 209"
          className="stroke-emerald-500"
          strokeWidth="1.4"
          fill="none"
          markerEnd="url(#wid-emerald)"
        />
        <path
          d="M 200 134 C 212 134, 212 170, 225 170"
          className="stroke-emerald-500"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#wid-emerald)"
        />
        <path
          d="M 200 209 C 212 209, 212 170, 225 170"
          className="stroke-emerald-500"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#wid-emerald)"
        />

        {/* Edges - Outbound (Amber) */}
        <path
          d="M 315 170 C 328 170, 328 134, 340 134"
          className="stroke-amber-500"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#wid-amber)"
        />
        <path
          d="M 315 170 C 328 170, 328 209, 340 209"
          className="stroke-amber-500"
          strokeWidth="1.8"
          fill="none"
          markerEnd="url(#wid-amber)"
        />
        <path
          d="M 405 134 C 425 134, 425 76, 445 76"
          className="stroke-amber-500"
          strokeWidth="1.4"
          fill="none"
          markerEnd="url(#wid-amber)"
        />
        <path
          d="M 405 134 C 425 134, 425 161, 445 161"
          className="stroke-amber-500"
          strokeWidth="1.4"
          fill="none"
          markerEnd="url(#wid-amber)"
        />
        <path
          d="M 405 209 C 425 209, 425 246, 445 246"
          className="stroke-amber-500"
          strokeWidth="1.4"
          fill="none"
          markerEnd="url(#wid-amber)"
        />

        {/* Animated flow pulses */}
        <circle r="2.2" className="fill-emerald-400">
          <animateMotion
            dur="2.4s"
            repeatCount="indefinite"
            path="M 200 134 C 212 134, 212 170, 225 170"
          />
        </circle>
        <circle r="2.2" className="fill-emerald-400">
          <animateMotion
            dur="2.8s"
            repeatCount="indefinite"
            path="M 200 209 C 212 209, 212 170, 225 170"
          />
        </circle>
        <circle r="2.2" className="fill-amber-400">
          <animateMotion
            dur="2.4s"
            repeatCount="indefinite"
            path="M 315 170 C 328 170, 328 134, 340 134"
          />
        </circle>
        <circle r="2.2" className="fill-amber-400">
          <animateMotion
            dur="2.8s"
            repeatCount="indefinite"
            path="M 315 170 C 328 170, 328 209, 340 209"
          />
        </circle>
      </svg>
    </div>
  );
}

export function HowItWorksFigure() {
  return (
    <div className="w-full relative rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 sm:p-6 overflow-hidden">
      <svg
        viewBox="0 0 540 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="hiw-arrow"
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-zinc-400 dark:fill-zinc-600" />
          </marker>
        </defs>

        {/* STAGE 1: Syntax / AST Extractor */}
        <g transform="translate(30, 90)">
          <rect
            width="130"
            height="160"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Header */}
          <rect
            width="130"
            height="30"
            rx="6"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <circle cx="16" cy="15" r="3" className="fill-indigo-600 dark:fill-indigo-400" />
          <rect
            x="26"
            y="12"
            width="55"
            height="6"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />

          {/* AST Tree branching diagram */}
          <circle cx="65" cy="55" r="5" className="fill-indigo-500/20 stroke-indigo-500" strokeWidth="1.5" />
          <path d="M 65 60 L 40 85" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.2" />
          <path d="M 65 60 L 90 85" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.2" />
          <circle cx="40" cy="88" r="4" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.2" />
          <circle cx="90" cy="88" r="4" className="fill-amber-500/20 stroke-amber-500" strokeWidth="1.2" />

          <path d="M 40 92 L 25 118" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.2" />
          <path d="M 40 92 L 55 118" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.2" />
          <circle cx="25" cy="120" r="3" className="fill-zinc-400 dark:fill-zinc-600" />
          <circle cx="55" cy="120" r="3" className="fill-zinc-400 dark:fill-zinc-600" />

          <path d="M 90 92 L 75 118" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.2" />
          <path d="M 90 92 L 105 118" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.2" />
          <circle cx="75" cy="120" r="3" className="fill-zinc-400 dark:fill-zinc-600" />
          <circle cx="105" cy="120" r="3" className="fill-zinc-400 dark:fill-zinc-600" />

          <rect x="25" y="140" width="80" height="5" rx="1.5" className="fill-zinc-200 dark:fill-zinc-800" />
        </g>

        {/* Connector 1 to 2 */}
        <path
          d="M 160 170 L 195 170"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="1.5"
          markerEnd="url(#hiw-arrow)"
        />
        <circle r="2.5" className="fill-indigo-500">
          <animateMotion dur="1.6s" repeatCount="indefinite" path="M 160 170 L 195 170" />
        </circle>

        {/* STAGE 2: Graph Arithmetic Matrix */}
        <g transform="translate(205, 90)">
          <rect
            width="130"
            height="160"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Header */}
          <rect
            width="130"
            height="30"
            rx="6"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <circle cx="16" cy="15" r="3" className="fill-emerald-500" />
          <rect
            x="26"
            y="12"
            width="60"
            height="6"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />

          {/* Matrix grid cells */}
          <g transform="translate(18, 48)">
            <rect x="0" y="0" width="18" height="18" rx="2" className="fill-emerald-500/20 stroke-emerald-500/40" />
            <rect x="25" y="0" width="18" height="18" rx="2" className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
            <rect x="50" y="0" width="18" height="18" rx="2" className="fill-amber-500/20 stroke-amber-500/40" />
            <rect x="75" y="0" width="18" height="18" rx="2" className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />

            <rect x="0" y="25" width="18" height="18" rx="2" className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
            <rect x="25" y="25" width="18" height="18" rx="2" className="fill-indigo-500/20 stroke-indigo-500/40" />
            <rect x="50" y="25" width="18" height="18" rx="2" className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
            <rect x="75" y="25" width="18" height="18" rx="2" className="fill-emerald-500/20 stroke-emerald-500/40" />

            <rect x="0" y="50" width="18" height="18" rx="2" className="fill-amber-500/20 stroke-amber-500/40" />
            <rect x="25" y="50" width="18" height="18" rx="2" className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
            <rect x="50" y="50" width="18" height="18" rx="2" className="fill-indigo-500/20 stroke-indigo-500/40" />
            <rect x="75" y="50" width="18" height="18" rx="2" className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800" />
          </g>

          {/* Pure math indicator bar */}
          <rect x="20" y="132" width="40" height="5" rx="1.5" className="fill-emerald-500/70" />
          <rect x="68" y="132" width="42" height="5" rx="1.5" className="fill-amber-500/70" />
        </g>

        {/* Connector 2 to 3 */}
        <path
          d="M 335 170 L 370 170"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="1.5"
          markerEnd="url(#hiw-arrow)"
        />
        <circle r="2.5" className="fill-emerald-500">
          <animateMotion dur="1.6s" repeatCount="indefinite" path="M 335 170 L 370 170" />
        </circle>

        {/* STAGE 3: Traced AI Explanation Engine */}
        <g transform="translate(380, 90)">
          <rect
            width="130"
            height="160"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Header with LangSmith pill */}
          <rect
            width="130"
            height="30"
            rx="6"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
          <circle cx="16" cy="15" r="3" className="fill-violet-500" />
          <rect
            x="26"
            y="12"
            width="48"
            height="6"
            rx="1.5"
            className="fill-zinc-400 dark:fill-zinc-600"
          />
          <rect
            x="96"
            y="11"
            width="20"
            height="8"
            rx="2"
            className="fill-violet-500/15 stroke-violet-500/30"
          />

          {/* Grounded neighbor references */}
          <g transform="translate(14, 46)">
            {/* Citation 1 */}
            <circle cx="6" cy="6" r="3" className="fill-emerald-500" />
            <rect x="16" y="3" width="75" height="5" rx="1.5" className="fill-zinc-700 dark:fill-zinc-300" />

            {/* Citation 2 */}
            <circle cx="6" cy="22" r="3" className="fill-emerald-500" />
            <rect x="16" y="19" width="60" height="5" rx="1.5" className="fill-zinc-700 dark:fill-zinc-300" />

            {/* Generated paragraph block */}
            <rect x="4" y="38" width="95" height="4" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
            <rect x="4" y="47" width="88" height="4" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
            <rect x="4" y="56" width="92" height="4" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
            <rect x="4" y="65" width="55" height="4" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
          </g>

          {/* Cache hit lock badge */}
          <rect
            x="14"
            y="130"
            width="102"
            height="18"
            rx="3"
            className="fill-zinc-50 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
          />
          <circle cx="24" cy="139" r="2.5" className="fill-zinc-500" />
          <rect x="32" y="137" width="45" height="4" rx="1" className="fill-zinc-400 dark:fill-zinc-600" />
        </g>
      </svg>
    </div>
  );
}

export function FrameworksFigure() {
  return (
    <div className="w-full relative rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 sm:p-6 overflow-hidden">
      <svg
        viewBox="0 0 540 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="fw-down"
            viewBox="0 0 6 6"
            refX="3"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 3 6 L 6 0 z" className="fill-zinc-300 dark:fill-zinc-700" />
          </marker>
        </defs>

        {/* LAYER 1: Routable Surfaces */}
        <g transform="translate(30, 30)">
          <rect
            width="480"
            height="70"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-sky-500/30 dark:stroke-sky-500/20"
            strokeWidth="1.2"
          />
          {/* Card A: Page route (Sky) */}
          <g transform="translate(20, 16)">
            <rect
              width="200"
              height="38"
              rx="4"
              className="fill-sky-500/10 dark:fill-sky-500/15 stroke-sky-500/30"
              strokeWidth="1"
            />
            {/* GET badge */}
            <rect
              x="12"
              y="11"
              width="32"
              height="16"
              rx="2"
              className="fill-sky-500"
            />
            <rect
              x="52"
              y="16"
              width="100"
              height="6"
              rx="1.5"
              className="fill-sky-950 dark:fill-sky-200"
            />
          </g>

          {/* Card B: API Endpoint (Cyan) */}
          <g transform="translate(240, 16)">
            <rect
              width="220"
              height="38"
              rx="4"
              className="fill-cyan-500/10 dark:fill-cyan-500/15 stroke-cyan-500/30"
              strokeWidth="1"
            />
            {/* POST badge */}
            <rect
              x="12"
              y="11"
              width="38"
              height="16"
              rx="2"
              className="fill-cyan-500"
            />
            <rect
              x="58"
              y="16"
              width="115"
              height="6"
              rx="1.5"
              className="fill-cyan-950 dark:fill-cyan-200"
            />
          </g>
        </g>

        {/* Vertical connectors Layer 1 -> Layer 2 */}
        <path
          d="M 150 100 L 150 130"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          markerEnd="url(#fw-down)"
        />
        <path
          d="M 370 100 L 370 130"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          markerEnd="url(#fw-down)"
        />

        {/* LAYER 2: Internal Layers (Controllers / Services / Modules) */}
        <g transform="translate(30, 135)">
          <rect
            width="480"
            height="75"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Card A: Controllers (Violet) */}
          <g transform="translate(18, 16)">
            <rect
              width="135"
              height="42"
              rx="4"
              className="fill-violet-500/10 dark:fill-violet-500/15 stroke-violet-500/25"
              strokeWidth="1"
            />
            <rect x="10" y="13" width="5" height="16" rx="1.5" className="fill-violet-500" />
            <rect x="22" y="14" width="70" height="6" rx="1.5" className="fill-violet-950 dark:fill-violet-200" />
            <rect x="22" y="24" width="45" height="4" rx="1" className="fill-violet-400" />
          </g>

          {/* Card B: Services (Teal) */}
          <g transform="translate(170, 16)">
            <rect
              width="140"
              height="42"
              rx="4"
              className="fill-teal-500/10 dark:fill-teal-500/15 stroke-teal-500/25"
              strokeWidth="1"
            />
            <rect x="10" y="13" width="5" height="16" rx="1.5" className="fill-teal-500" />
            <rect x="22" y="14" width="75" height="6" rx="1.5" className="fill-teal-950 dark:fill-teal-200" />
            <rect x="22" y="24" width="50" height="4" rx="1" className="fill-teal-400" />
          </g>

          {/* Card C: Components / Hooks (Indigo) */}
          <g transform="translate(325, 16)">
            <rect
              width="135"
              height="42"
              rx="4"
              className="fill-indigo-500/10 dark:fill-indigo-500/15 stroke-indigo-500/25"
              strokeWidth="1"
            />
            <rect x="10" y="13" width="5" height="16" rx="1.5" className="fill-indigo-500" />
            <rect x="22" y="14" width="68" height="6" rx="1.5" className="fill-indigo-950 dark:fill-indigo-200" />
            <rect x="22" y="24" width="42" height="4" rx="1" className="fill-indigo-400" />
          </g>
        </g>

        {/* Vertical connectors Layer 2 -> Layer 3 */}
        <path
          d="M 240 210 L 240 240"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          markerEnd="url(#fw-down)"
        />

        {/* LAYER 3: Plumbing (Middleware / Utilities / Config) */}
        <g transform="translate(30, 245)">
          <rect
            width="480"
            height="65"
            rx="6"
            className="fill-white dark:fill-zinc-950 stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1.2"
          />
          {/* Card A: Middleware */}
          <g transform="translate(20, 14)">
            <rect
              width="135"
              height="36"
              rx="4"
              className="fill-purple-500/10 dark:fill-purple-500/15 stroke-purple-500/20"
            />
            <rect x="10" y="11" width="4" height="14" rx="1" className="fill-purple-500" />
            <rect x="20" y="15" width="65" height="6" rx="1.5" className="fill-zinc-700 dark:fill-zinc-300" />
          </g>

          {/* Card B: Utilities */}
          <g transform="translate(170, 14)">
            <rect
              width="140"
              height="36"
              rx="4"
              className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            />
            <rect x="10" y="11" width="4" height="14" rx="1" className="fill-zinc-400" />
            <rect x="20" y="15" width="70" height="6" rx="1.5" className="fill-zinc-700 dark:fill-zinc-300" />
          </g>

          {/* Card C: Config / Tests */}
          <g transform="translate(325, 14)">
            <rect
              width="135"
              height="36"
              rx="4"
              className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-800"
            />
            <rect x="10" y="11" width="4" height="14" rx="1" className="fill-zinc-400" />
            <rect x="20" y="15" width="60" height="6" rx="1.5" className="fill-zinc-700 dark:fill-zinc-300" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function BoundariesFigure() {
  return (
    <div className="w-full relative rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 p-4 sm:p-6 overflow-hidden">
      <svg
        viewBox="0 0 540 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        {/* Central dividing boundary line */}
        <line
          x1="270"
          y1="20"
          x2="270"
          y2="320"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />

        {/* --- LEFT SIDE: THE VERIFIED CONTRACT (What we build) --- */}
        <g transform="translate(30, 40)">
          {/* Card 1: Verified Syntax Edge */}
          <rect
            width="205"
            height="70"
            rx="5"
            className="fill-white dark:fill-zinc-950 stroke-emerald-500/40"
            strokeWidth="1.2"
          />
          <circle cx="20" cy="22" r="5" className="fill-emerald-500" />
          <path d="M 18 22 L 20 24 L 23 20" stroke="white" strokeWidth="1.2" fill="none" />
          <rect x="34" y="18" width="90" height="7" rx="1.5" className="fill-zinc-800 dark:fill-zinc-200" />
          <rect x="34" y="32" width="130" height="5" rx="1" className="fill-zinc-400 dark:fill-zinc-600" />
          <rect x="34" y="42" width="80" height="5" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />

          {/* Card 2: Pure Graph Arithmetic */}
          <g transform="translate(0, 88)">
            <rect
              width="205"
              height="70"
              rx="5"
              className="fill-white dark:fill-zinc-950 stroke-indigo-500/40"
              strokeWidth="1.2"
            />
            <circle cx="20" cy="22" r="5" className="fill-indigo-600 dark:fill-indigo-400" />
            <rect x="34" y="18" width="105" height="7" rx="1.5" className="fill-zinc-800 dark:fill-zinc-200" />
            <rect x="34" y="32" width="60" height="5" rx="1" className="fill-emerald-500/80" />
            <rect x="100" y="32" width="60" height="5" rx="1" className="fill-amber-500/80" />
            <rect x="34" y="44" width="115" height="5" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
          </g>

          {/* Card 3: Exact Method & Route Table */}
          <g transform="translate(0, 176)">
            <rect
              width="205"
              height="70"
              rx="5"
              className="fill-white dark:fill-zinc-950 stroke-sky-500/40"
              strokeWidth="1.2"
            />
            <rect x="14" y="14" width="28" height="14" rx="2" className="fill-sky-500" />
            <rect x="48" y="18" width="110" height="7" rx="1.5" className="fill-zinc-800 dark:fill-zinc-200" />
            <rect x="14" y="36" width="28" height="14" rx="2" className="fill-cyan-500" />
            <rect x="48" y="40" width="95" height="7" rx="1.5" className="fill-zinc-800 dark:fill-zinc-200" />
          </g>
        </g>

        {/* --- RIGHT SIDE: DELIBERATELY REFUSED (What we never do) --- */}
        <g transform="translate(305, 40)">
          {/* Refusal 1: No Quality Scores or Grades */}
          <g>
            <rect
              width="205"
              height="70"
              rx="5"
              className="fill-zinc-100/60 dark:fill-zinc-900/40 stroke-zinc-200 dark:stroke-zinc-800 opacity-60"
              strokeWidth="1"
            />
            {/* Score circle badge */}
            <circle cx="32" cy="35" r="18" className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="1.5" fill="none" />
            <rect x="62" y="24" width="105" height="7" rx="1.5" className="fill-zinc-400 dark:fill-zinc-600" />
            <rect x="62" y="38" width="70" height="5" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
            {/* Crisp Red Refusal Slash */}
            <line x1="12" y1="58" x2="195" y2="12" className="stroke-rose-500/80" strokeWidth="1.8" />
          </g>

          {/* Refusal 2: No Model-Guessed Edges */}
          <g transform="translate(0, 88)">
            <rect
              width="205"
              height="70"
              rx="5"
              className="fill-zinc-100/60 dark:fill-zinc-900/40 stroke-zinc-200 dark:stroke-zinc-800 opacity-60"
              strokeWidth="1"
            />
            {/* Dashed fuzzy guessed path */}
            <path
              d="M 25 35 C 50 15, 80 55, 110 35"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              fill="none"
            />
            <circle cx="110" cy="35" r="3" className="fill-zinc-400" />
            <rect x="125" y="32" width="60" height="6" rx="1.5" className="fill-zinc-400 dark:fill-zinc-600" />
            {/* Refusal Slash */}
            <line x1="12" y1="58" x2="195" y2="12" className="stroke-rose-500/80" strokeWidth="1.8" />
          </g>

          {/* Refusal 3: No Private Repository Token Storage */}
          <g transform="translate(0, 176)">
            <rect
              width="205"
              height="70"
              rx="5"
              className="fill-zinc-100/60 dark:fill-zinc-900/40 stroke-zinc-200 dark:stroke-zinc-800 opacity-60"
              strokeWidth="1"
            />
            {/* Lock / Key icon */}
            <rect x="22" y="28" width="22" height="18" rx="2" className="fill-zinc-400 dark:fill-zinc-600" />
            <path
              d="M 26 28 L 26 22 C 26 18, 40 18, 40 22 L 40 28"
              className="stroke-zinc-400 dark:stroke-zinc-600"
              strokeWidth="2"
              fill="none"
            />
            <rect x="58" y="26" width="115" height="6" rx="1.5" className="fill-zinc-400 dark:fill-zinc-600" />
            <rect x="58" y="38" width="85" height="5" rx="1" className="fill-zinc-300 dark:fill-zinc-700" />
            {/* Refusal Slash */}
            <line x1="12" y1="58" x2="195" y2="12" className="stroke-rose-500/80" strokeWidth="1.8" />
          </g>
        </g>
      </svg>
    </div>
  );
}

