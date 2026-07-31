"use client";

/**
 * CoverageRing — a compact circular progress indicator for data-quality /
 * coverage metrics. Pure SVG (no chart dependency), animated stroke sweep,
 * accessible (role="img" + aria-label).
 *
 * Usage: <CoverageRing value={17.9} label="DUN coverage" sub="5 / 28 verified" />
 */

interface Props {
  value: number; // 0–100
  label: string;
  sub?: string;
  size?: number; // px (default 96)
  stroke?: number; // px (default 8)
  color?: string; // arc color (default MLK amber)
  trackColor?: string; // background track (defaults to a muted value)
  tier?: "good" | "warn" | "bad"; // overrides color by threshold
  delayMs?: number; // entrance animation delay
}

export function CoverageRing({
  value,
  label,
  sub,
  size = 96,
  stroke = 8,
  color,
  trackColor = "rgba(148, 163, 184, 0.22)",
  tier,
  delayMs = 0,
}: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  // Tier-based color when explicitly requested.
  const tierColor =
    tier === "good" ? "#10B981" : tier === "warn" ? "#F59E0B" : tier === "bad" ? "#EF4444" : null;
  const arc = color ?? tierColor ?? "#C77B2C";

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      role="img"
      aria-label={`${label}: ${v.toFixed(0)} percent${sub ? `, ${sub}` : ""}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={arc}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
              animation: `ring-sweep-in 0.5s ease-out ${delayMs}ms both`,
              filter: `drop-shadow(0 0 4px ${arc}55)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold tabular leading-none" style={{ color: arc }}>
            {v.toFixed(v < 10 ? 1 : 0)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] font-semibold leading-tight">{label}</div>
        {sub && <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">{sub}</div>}
      </div>
      <style>{`@keyframes ring-sweep-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}
