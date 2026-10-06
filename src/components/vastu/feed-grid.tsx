"use client";

import * as React from "react";
import type { VerdictLevel } from "@/domain/scoring";
import { PropertyCard } from "./property-card";
import { useUserState } from "@/components/providers/user-state";
import { useScoredFeed } from "@/lib/use-scored";
import { cn } from "@/lib/cn";

type Sort = "match" | "price_low" | "price_high" | "vastu";

const SORTS: { key: Sort; label: string }[] = [
  { key: "match", label: "Best match" },
  { key: "vastu", label: "Vastu score" },
  { key: "price_low", label: "Price: low to high" },
  { key: "price_high", label: "Price: high to low" },
];

export function FeedGrid() {
  const items = useScoredFeed();
  const { feedback } = useUserState();
  const [sort, setSort] = React.useState<Sort>("match");
  const [hidePassed, setHidePassed] = React.useState(false);
  const [levels, setLevels] = React.useState<Set<VerdictLevel>>(new Set());

  const toggleLevel = (l: VerdictLevel) =>
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const filtered = React.useMemo(() => {
    let list = items.slice();
    if (hidePassed) list = list.filter((i) => feedback[i.property.id] !== "pass" && feedback[i.property.id] !== "dealbreaker");
    if (levels.size) list = list.filter((i) => levels.has(i.analysis.verdict.level));
    list.sort((a, b) => {
      switch (sort) {
        case "price_low":
          return a.property.price - b.property.price;
        case "price_high":
          return b.property.price - a.property.price;
        case "vastu":
          return b.analysis.scores.vastu - a.analysis.scores.vastu;
        default:
          return b.analysis.scores.overall - a.analysis.scores.overall;
      }
    });
    return list;
  }, [items, sort, hidePassed, levels, feedback]);

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-forest bg-sage-soft text-forest" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {chip("Strong", levels.has("strong_match"), () => toggleLevel("strong_match"))}
          {chip("Good", levels.has("good_with_concerns"), () => toggleLevel("good_with_concerns"))}
          {chip("Worth a look", levels.has("mixed"), () => toggleLevel("mixed"))}
          {chip("Hide passed", hidePassed, () => setHidePassed((v) => !v))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <span className="whitespace-nowrap">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus-visible:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-muted">
        {filtered.length} {filtered.length === 1 ? "home" : "homes"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center text-ink-2">
          No homes match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <PropertyCard key={i.property.id} property={i.property} analysis={i.analysis} />
          ))}
        </div>
      )}
    </div>
  );
}
