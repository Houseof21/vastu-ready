import Link from "next/link";
import type { Property } from "@/domain/property";
import type { PropertyAnalysis } from "@/domain/scoring";
import { formatUsd, formatSqft, formatAcres, formatBaths, formatDriveTime } from "@/lib/format";
import { zoneLabel } from "@/domain/directions";
import { scoreColor } from "./status";
import { VerdictBadge } from "./badges";
import { cn } from "@/lib/cn";

type Row = { property: Property; analysis: PropertyAnalysis };

function Num({ score }: { score: number }) {
  return (
    <span className="font-display text-lg font-semibold" style={{ color: scoreColor(score) }}>
      {Math.round(score)}
    </span>
  );
}

/** Side-by-side comparison. The recommended pick is highlighted. */
export function CompareTable({ rows, pickId }: { rows: Row[]; pickId?: string | null }) {
  const metrics: { label: string; render: (r: Row) => React.ReactNode }[] = [
    { label: "Overall match", render: (r) => <Num score={r.analysis.scores.overall} /> },
    { label: "Vastu", render: (r) => <Num score={r.analysis.scores.vastu} /> },
    { label: "Personal match", render: (r) => <Num score={r.analysis.scores.personalMatch} /> },
    { label: "Value", render: (r) => <Num score={r.analysis.scores.value} /> },
    { label: "Correctability", render: (r) => <Num score={r.analysis.correctabilityScore} /> },
    { label: "Verdict", render: (r) => <VerdictBadge level={r.analysis.verdict.level} /> },
    { label: "Price", render: (r) => formatUsd(r.property.price) },
    { label: "Facing", render: (r) => (r.property.vastu.facingDirection.value ? zoneLabel(r.property.vastu.facingDirection.value) : "Unverified") },
    { label: "Beds / Baths", render: (r) => `${r.property.beds} / ${formatBaths(r.property.baths)}` },
    { label: "Size", render: (r) => formatSqft(r.property.sqft) },
    { label: "Lot", render: (r) => formatAcres(r.property.lotAcres) },
    { label: "Drive", render: (r) => formatDriveTime(r.property.driveMinutes) },
    {
      label: "Dealbreakers",
      render: (r) =>
        r.analysis.violations.length ? (
          <span className="text-concern">{r.analysis.violations.length}</span>
        ) : (
          <span className="text-muted">None</span>
        ),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-canvas p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted" />
            {rows.map((r) => (
              <th
                key={r.property.id}
                className={cn(
                  "min-w-[150px] border-b border-line p-3 text-left align-bottom",
                  r.property.id === pickId && "bg-sage-soft",
                )}
              >
                <Link href={`/property/${r.property.id}`} className="block">
                  <span className="font-display text-base font-semibold text-ink hover:text-forest">
                    {r.property.address.line1}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{r.property.address.neighborhood}</span>
                  {r.property.id === pickId ? (
                    <span className="mt-1 inline-block rounded-pill bg-forest px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                      AI pick
                    </span>
                  ) : null}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label} className="border-b border-line-2">
              <td className="sticky left-0 z-10 bg-canvas p-3 text-xs font-medium text-ink-2">{m.label}</td>
              {rows.map((r) => (
                <td
                  key={r.property.id}
                  className={cn("p-3 text-ink", r.property.id === pickId && "bg-sage-soft/50")}
                >
                  {m.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
