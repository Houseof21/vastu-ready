import { scoreColor } from "./status";
import { cn } from "@/lib/cn";

type ScoreRingProps = {
  score: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/**
 * Circular score indicator. Color encodes the band but the numeral is always
 * shown, so meaning never depends on color alone.
 */
export function ScoreRing({
  score,
  label,
  size = 72,
  strokeWidth = 7,
  className,
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (clamped / 100) * circumference;
  const color = scoreColor(clamped);

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display font-semibold leading-none text-ink"
            style={{ fontSize: size * 0.3 }}
          >
            {clamped}
          </span>
        </div>
      </div>
      {label ? (
        <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** Compact horizontal score bar for dense lists. */
export function ScoreBar({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs font-medium text-ink-2">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-2">
        <div
          className="h-full rounded-pill"
          style={{ width: `${clamped}%`, backgroundColor: scoreColor(clamped) }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">
        {clamped}
      </span>
    </div>
  );
}
