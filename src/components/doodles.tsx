/**
 * Hand-drawn doodle illustrations as inline SVG. Themed via the CSS
 * variables in globals.css (`--accent-cedi`, `--accent-stefi`,
 * `--doodle-rose`, `--paper-line`) so dark mode + future palette tweaks
 * recolour them automatically.
 *
 * Style notes:
 *  - stroke-width 2.5, round caps + joins for the marker feel
 *  - fills are translucent so the cream paper shows through
 *  - paths are deliberately slightly wobbly (control points off-axis) so
 *    they read as hand-drawn rather than precise
 */

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// HeroDoodle — landing-page illustration.
// Two stylised figures racing toward a fluttering ribbon, decorated with
// sparkles + a dashed track line.
// ---------------------------------------------------------------------------

export function HeroDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label="Two figures racing toward a finish ribbon"
      className={cn("h-auto w-full", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* dashed track */}
      <path
        d="M 30 290 C 160 280, 320 320, 470 260 S 600 220, 620 230"
        stroke="var(--paper-line)"
        strokeWidth="2"
        strokeDasharray="6 9"
      />

      {/* sparkles + hearts */}
      <Sparkle x={90} y={70} color="var(--doodle-honey)" />
      <Sparkle x={550} y={90} color="var(--doodle-rose)" />
      <Sparkle x={310} y={50} color="var(--accent-cedi)" />
      <Heart x={500} y={45} color="var(--doodle-rose)" />
      <Heart x={150} y={130} color="var(--accent-stefi)" />

      {/* Cedi (left, royal blue) */}
      <g transform="translate(150 170)">
        {/* head */}
        <circle
          cx="0"
          cy="0"
          r="28"
          fill="var(--accent-cedi)"
          fillOpacity="0.15"
          stroke="var(--accent-cedi)"
          strokeWidth="2.5"
        />
        {/* smile */}
        <path
          d="M -10 6 Q 0 14, 10 5"
          stroke="var(--accent-cedi)"
          strokeWidth="2.2"
        />
        {/* eyes */}
        <circle cx="-9" cy="-4" r="1.8" fill="var(--accent-cedi)" />
        <circle cx="9" cy="-4" r="1.8" fill="var(--accent-cedi)" />
        {/* body */}
        <path
          d="M -18 25 Q -6 50, -2 95 M 18 28 Q 14 60, 12 95"
          stroke="var(--accent-cedi)"
          strokeWidth="2.5"
        />
        {/* arms — one back, one forward in running pose */}
        <path
          d="M -22 38 Q -50 50, -55 30"
          stroke="var(--accent-cedi)"
          strokeWidth="2.5"
        />
        <path
          d="M 22 38 Q 50 30, 56 50"
          stroke="var(--accent-cedi)"
          strokeWidth="2.5"
        />
        {/* legs */}
        <path
          d="M -2 95 Q -14 115, -22 130"
          stroke="var(--accent-cedi)"
          strokeWidth="2.5"
        />
        <path
          d="M 12 95 Q 20 115, 14 130"
          stroke="var(--accent-cedi)"
          strokeWidth="2.5"
        />
      </g>

      {/* Stefi (right, lilac) — slightly behind, leaning forward */}
      <g transform="translate(370 175)">
        <circle
          cx="0"
          cy="0"
          r="28"
          fill="var(--accent-stefi)"
          fillOpacity="0.2"
          stroke="var(--accent-stefi)"
          strokeWidth="2.5"
        />
        <path
          d="M -10 6 Q 0 14, 10 5"
          stroke="var(--accent-stefi)"
          strokeWidth="2.2"
        />
        <circle cx="-9" cy="-4" r="1.8" fill="var(--accent-stefi)" />
        <circle cx="9" cy="-4" r="1.8" fill="var(--accent-stefi)" />
        {/* tiny tied-back hair tuft */}
        <path
          d="M -28 -6 Q -34 -14, -30 -22"
          stroke="var(--accent-stefi)"
          strokeWidth="2.2"
        />
        <path
          d="M -18 25 Q -6 50, -2 95 M 18 28 Q 14 60, 12 95"
          stroke="var(--accent-stefi)"
          strokeWidth="2.5"
        />
        <path
          d="M -22 36 Q -50 32, -56 14"
          stroke="var(--accent-stefi)"
          strokeWidth="2.5"
        />
        <path
          d="M 22 36 Q 48 50, 60 38"
          stroke="var(--accent-stefi)"
          strokeWidth="2.5"
        />
        <path
          d="M -2 95 Q -16 115, -20 130"
          stroke="var(--accent-stefi)"
          strokeWidth="2.5"
        />
        <path
          d="M 12 95 Q 22 115, 18 130"
          stroke="var(--accent-stefi)"
          strokeWidth="2.5"
        />
      </g>

      {/* Finish ribbon */}
      <g transform="translate(560 200)">
        <path
          d="M 0 -60 L 0 90"
          stroke="var(--paper-line)"
          strokeWidth="2"
        />
        <path
          d="M 0 -60 Q 16 -55, 20 -45 Q 8 -42, 0 -38 Q -6 -50, 0 -60 Z"
          fill="var(--doodle-rose)"
          fillOpacity="0.85"
          stroke="var(--doodle-rose)"
          strokeWidth="2"
        />
        <path
          d="M 0 -38 Q 18 -28, 22 -16 Q 6 -16, 0 -10 Q -8 -28, 0 -38 Z"
          fill="var(--doodle-rose)"
          fillOpacity="0.6"
          stroke="var(--doodle-rose)"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// EmptyStateDoodle — variant-driven friendly placeholder for empty lists.
// ---------------------------------------------------------------------------

type EmptyVariant = "challenges" | "news" | "leaderboard" | "stats";

export function EmptyStateDoodle({
  variant,
  className,
}: {
  variant: EmptyVariant;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 160"
      role="img"
      aria-hidden
      className={cn("h-32 w-auto", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {variant === "challenges" && (
        <g>
          {/* empty trophy, awaiting a winner */}
          <path
            d="M 70 35 Q 70 28, 78 28 L 122 28 Q 130 28, 130 35 L 128 70 Q 126 95, 100 100 Q 74 95, 72 70 Z"
            fill="var(--accent-cedi)"
            fillOpacity="0.08"
            stroke="var(--accent-cedi)"
            strokeWidth="2.5"
          />
          <path
            d="M 70 38 Q 50 42, 50 60 Q 52 72, 68 72"
            stroke="var(--accent-cedi)"
            strokeWidth="2.5"
          />
          <path
            d="M 130 38 Q 150 42, 150 60 Q 148 72, 132 72"
            stroke="var(--accent-cedi)"
            strokeWidth="2.5"
          />
          <path
            d="M 90 100 Q 88 115, 80 120 L 120 120 Q 112 115, 110 100"
            stroke="var(--accent-cedi)"
            strokeWidth="2.5"
          />
          <path
            d="M 70 130 L 130 130"
            stroke="var(--accent-cedi)"
            strokeWidth="2.5"
          />
          <Sparkle x={45} y={20} color="var(--doodle-honey)" scale={0.7} />
          <Sparkle x={160} y={28} color="var(--doodle-rose)" scale={0.6} />
        </g>
      )}

      {variant === "news" && (
        <g>
          {/* empty envelope */}
          <path
            d="M 50 50 L 150 50 L 150 110 L 50 110 Z"
            fill="var(--accent-stefi)"
            fillOpacity="0.08"
            stroke="var(--accent-stefi)"
            strokeWidth="2.5"
          />
          <path
            d="M 50 50 L 100 85 L 150 50"
            stroke="var(--accent-stefi)"
            strokeWidth="2.5"
          />
          <Sparkle x={40} y={36} color="var(--doodle-honey)" scale={0.6} />
          <Heart x={160} y={40} color="var(--doodle-rose)" scale={0.7} />
        </g>
      )}

      {variant === "leaderboard" && (
        <g>
          {/* three little podium bars */}
          <path
            d="M 50 110 L 80 110 L 80 80 L 50 80 Z"
            fill="var(--accent-stefi)"
            fillOpacity="0.2"
            stroke="var(--accent-stefi)"
            strokeWidth="2.5"
          />
          <path
            d="M 85 110 L 115 110 L 115 50 L 85 50 Z"
            fill="var(--accent-cedi)"
            fillOpacity="0.2"
            stroke="var(--accent-cedi)"
            strokeWidth="2.5"
          />
          <path
            d="M 120 110 L 150 110 L 150 90 L 120 90 Z"
            fill="var(--doodle-honey)"
            fillOpacity="0.2"
            stroke="var(--doodle-honey)"
            strokeWidth="2.5"
          />
          <path d="M 40 120 L 160 120" stroke="var(--paper-line)" strokeWidth="2.5" />
          <Sparkle x={100} y={32} color="var(--doodle-rose)" scale={0.7} />
        </g>
      )}

      {variant === "stats" && (
        <g>
          {/* squiggly chart line */}
          <path
            d="M 30 100 Q 55 60, 75 85 T 120 70 T 170 50"
            stroke="var(--accent-cedi)"
            strokeWidth="3"
          />
          <path
            d="M 30 115 Q 55 95, 75 110 T 120 95 T 170 90"
            stroke="var(--accent-stefi)"
            strokeWidth="3"
          />
          <circle cx="30" cy="100" r="3.5" fill="var(--accent-cedi)" />
          <circle cx="170" cy="50" r="3.5" fill="var(--accent-cedi)" />
          <circle cx="30" cy="115" r="3.5" fill="var(--accent-stefi)" />
          <circle cx="170" cy="90" r="3.5" fill="var(--accent-stefi)" />
          <Sparkle x={155} y={35} color="var(--doodle-honey)" scale={0.6} />
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// WinnerRibbon — celebratory decoration above the Summary card on completed
// challenges. Trophy with a small dashed garland.
// ---------------------------------------------------------------------------

export function WinnerRibbon({
  color = "var(--doodle-honey)",
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 110"
      role="img"
      aria-hidden
      className={cn("h-20 w-auto", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* garland dashes */}
      <path
        d="M 20 50 Q 80 20, 140 50"
        stroke="var(--paper-line)"
        strokeWidth="2"
        strokeDasharray="4 6"
      />
      <path
        d="M 180 50 Q 240 20, 300 50"
        stroke="var(--paper-line)"
        strokeWidth="2"
        strokeDasharray="4 6"
      />

      {/* trophy */}
      <g transform="translate(160 60)">
        <path
          d="M -22 -28 Q -22 -32, -18 -32 L 18 -32 Q 22 -32, 22 -28 L 20 -8 Q 18 8, 0 12 Q -18 8, -20 -8 Z"
          fill={color}
          fillOpacity="0.25"
          stroke={color}
          strokeWidth="2.5"
        />
        <path
          d="M -22 -25 Q -36 -22, -36 -10 Q -34 -2, -22 -2"
          stroke={color}
          strokeWidth="2.5"
        />
        <path
          d="M 22 -25 Q 36 -22, 36 -10 Q 34 -2, 22 -2"
          stroke={color}
          strokeWidth="2.5"
        />
        <path
          d="M -10 12 Q -12 22, -18 26 L 18 26 Q 12 22, 10 12"
          stroke={color}
          strokeWidth="2.5"
        />
        <path d="M -22 32 L 22 32" stroke={color} strokeWidth="2.5" />
        <Sparkle x={-40} y={-44} color="var(--doodle-rose)" scale={0.7} />
        <Sparkle x={40} y={-44} color="var(--accent-cedi)" scale={0.7} />
        <Sparkle x={0} y={-48} color={color} scale={0.8} />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Logo + favicon. Tiny "C vs S" wordmark with hand-drawn underlines.
// ---------------------------------------------------------------------------

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 32"
      role="img"
      aria-label="Cedi vs Stefi"
      className={cn("h-6 w-auto", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* C */}
      <path
        d="M 18 6 Q 4 6, 4 16 Q 4 26, 18 26"
        stroke="var(--accent-cedi)"
        strokeWidth="3"
      />
      <path
        d="M 6 28 Q 12 30, 18 28"
        stroke="var(--accent-cedi)"
        strokeWidth="2"
      />

      {/* vs */}
      <text
        x="48"
        y="22"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontSize="11"
        fontStyle="italic"
        fill="var(--muted-foreground)"
      >
        vs
      </text>

      {/* S */}
      <path
        d="M 92 8 Q 84 4, 80 10 Q 78 16, 86 18 Q 94 20, 92 26 Q 88 30, 80 28"
        stroke="var(--accent-stefi)"
        strokeWidth="3"
      />
      <path
        d="M 80 30 Q 84 31, 90 30"
        stroke="var(--accent-stefi)"
        strokeWidth="2"
      />
    </svg>
  );
}

// Standalone icon used for the favicon (Next.js icon.tsx convention).
export function IconMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="32" height="32" rx="7" fill="oklch(0.98 0.015 80)" />
      {/* C and S interlocked */}
      <path
        d="M 14 9 Q 6 9, 6 16 Q 6 23, 14 23"
        stroke="#2563EB"
        strokeWidth="3"
      />
      <path
        d="M 26 11 Q 21 7, 18 12 Q 17 16, 23 17 Q 28 19, 27 23 Q 23 27, 18 24"
        stroke="#C084FC"
        strokeWidth="3"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tiny decorative helpers (sparkle + heart). Inline so paths render exactly
// where the parent illustration places them.
// ---------------------------------------------------------------------------

function Sparkle({
  x,
  y,
  color,
  scale = 1,
}: {
  x: number;
  y: number;
  color: string;
  scale?: number;
}) {
  const s = 6 * scale;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M 0 ${-s} L 0 ${s} M ${-s} 0 L ${s} 0 M ${-s * 0.6} ${-s * 0.6} L ${s * 0.6} ${s * 0.6} M ${-s * 0.6} ${s * 0.6} L ${s * 0.6} ${-s * 0.6}`}
        stroke={color}
        strokeWidth={2 * scale}
      />
    </g>
  );
}

function Heart({
  x,
  y,
  color,
  scale = 1,
}: {
  x: number;
  y: number;
  color: string;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M 0 -3 Q -8 -10, -10 -2 Q -10 6, 0 12 Q 10 6, 10 -2 Q 8 -10, 0 -3 Z"
        fill={color}
        fillOpacity="0.35"
        stroke={color}
        strokeWidth="1.8"
      />
    </g>
  );
}
