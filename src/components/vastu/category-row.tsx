import type { CategoryResult } from "@/domain/types";
import { ScoreRing } from "./score-ring";
import { CorrectabilityBadge, FindingStatusBadge, VerificationBadge } from "./badges";
import { SEVERITY_LABEL } from "./status";
import { SOURCE_LABEL } from "@/domain/directions";
import { ChevronDown } from "lucide-react";

/**
 * One Vastu category: score, finding status, verification, correctability, and
 * a plain-language explanation — plus an always-available evidence drawer
 * showing exactly what the finding is based on (source + confidence), the
 * scoring rule, and the ideal. Nothing is labeled "Verified" without the
 * supporting evidence shown right beside it.
 */
export function CategoryAnalysisRow({ category }: { category: CategoryResult }) {
  return (
    <div className="border-b border-line py-5 last:border-b-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <ScoreRing score={category.score} size={56} strokeWidth={6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display text-lg font-semibold text-ink">{category.label}</h4>
            <FindingStatusBadge status={category.findingStatus} />
            <VerificationBadge status={category.verification} />
            {category.correctable && category.correctability ? (
              <CorrectabilityBadge correctability={category.correctability} />
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{category.explanation}</p>
          {category.severity !== "none" ? (
            <p className="mt-1.5 text-xs text-muted">
              Severity: <span className="font-medium text-ink-2">{SEVERITY_LABEL[category.severity]}</span>
            </p>
          ) : null}

          <details className="group mt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-forest hover:underline">
              <ChevronDown size={13} className="transition-transform group-open:rotate-180" aria-hidden />
              Evidence &amp; scoring rule
            </summary>
            <div className="mt-3 space-y-3 rounded-md border border-line-2 bg-surface-2 p-3">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">What this is based on</p>
                <ul className="mt-1.5 space-y-1">
                  {category.sources.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                      <span className="text-ink-2">
                        {s.label}: <span className="font-medium text-ink">{s.value}</span>
                      </span>
                      <span className="text-muted">
                        {s.value === "Unknown" ? "not provided" : SOURCE_LABEL[s.source]}
                        {s.value !== "Unknown" ? ` · ${Math.round(s.confidence * 100)}% confidence` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Scoring rule</p>
                  <p className="mt-1 text-xs text-ink-2">{category.rule}</p>
                </div>
                {category.ideal ? (
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Vastu ideal</p>
                    <p className="mt-1 text-xs text-ink-2">{category.ideal}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
