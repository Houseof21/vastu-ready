"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { DEMO_PREFERENCES } from "@/data/demo";
import { PRIORITY_LABEL, type Priority } from "@/domain/profile";
import { STRICTNESS_LABEL, STRICTNESS_DESC } from "@/domain/labels";
import { DIRECTION_LABEL } from "@/domain/directions";
import type { Cardinal8, Strictness } from "@/domain/types";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

const STEPS = ["Budget & home", "Location & priorities", "Vastu"] as const;
const ALL_PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[];
const FACINGS: Cardinal8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const STRICTNESS: Strictness[] = ["flexible", "balanced", "strict"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);

  // Seeded from the demo buyer so the flow is pre-filled and realistic.
  const [budget, setBudget] = React.useState(DEMO_PREFERENCES.profile.maxBudget);
  const [minBeds, setMinBeds] = React.useState(DEMO_PREFERENCES.profile.minBeds);
  const [minLot, setMinLot] = React.useState(DEMO_PREFERENCES.profile.minLotAcres);
  const [commute, setCommute] = React.useState(DEMO_PREFERENCES.profile.maxDriveMinutes);
  const [priorities, setPriorities] = React.useState<Priority[]>(DEMO_PREFERENCES.profile.priorities);
  const [facings, setFacings] = React.useState<Cardinal8[]>(DEMO_PREFERENCES.vastu.acceptableFacings);
  const [strictness, setStrictness] = React.useState<Strictness>(DEMO_PREFERENCES.vastu.strictness);

  const togglePriority = (p: Priority) =>
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleFacing = (f: Cardinal8) =>
    setFacings((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : router.push("/feed"));
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="w-full max-w-xl">
      {/* Progress */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                i < step
                  ? "bg-forest text-white"
                  : i === step
                    ? "bg-forest text-white"
                    : "bg-surface-2 text-muted",
              )}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-ink" : "text-muted")}>
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-ink">What are you looking for?</h2>
          <Field label="Maximum budget" value={formatUsd(budget)}>
            <input
              type="range"
              min={400_000}
              max={2_500_000}
              step={25_000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[color:var(--color-forest)]"
            />
          </Field>
          <Field label="Minimum bedrooms" value={`${minBeds}+`}>
            <input
              type="range"
              min={2}
              max={6}
              value={minBeds}
              onChange={(e) => setMinBeds(Number(e.target.value))}
              className="w-full accent-[color:var(--color-forest)]"
            />
          </Field>
          <Field label="Minimum lot size" value={`${minLot.toFixed(2)} ac`}>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.05}
              value={minLot}
              onChange={(e) => setMinLot(Number(e.target.value))}
              className="w-full accent-[color:var(--color-forest)]"
            />
          </Field>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Location &amp; what matters</h2>
          <Field label="Max commute" value={`${commute} min`}>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={commute}
              onChange={(e) => setCommute(Number(e.target.value))}
              className="w-full accent-[color:var(--color-forest)]"
            />
          </Field>
          <div>
            <p className="text-sm font-medium text-ink">Your top priorities</p>
            <p className="text-xs text-muted">These get extra weight in your overall match.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_PRIORITIES.map((p) => (
                <Chip key={p} active={priorities.includes(p)} onClick={() => togglePriority(p)}>
                  {PRIORITY_LABEL[p]}
                </Chip>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Vastu preferences</h2>
          <div>
            <p className="text-sm font-medium text-ink">Acceptable facing directions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {FACINGS.map((f) => (
                <Chip key={f} active={facings.includes(f)} onClick={() => toggleFacing(f)}>
                  {DIRECTION_LABEL[f]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">How strict should Vastu be?</p>
            <div className="mt-3 space-y-2">
              {STRICTNESS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrictness(s)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    strictness === s ? "border-forest bg-sage-soft" : "border-line bg-surface hover:bg-surface-2",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-ink">{STRICTNESS_LABEL[s]}</span>
                    {s === "balanced" ? <Badge tone="forest">Recommended</Badge> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-2">{STRICTNESS_DESC[s]}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}>
          Back
        </Button>
        <Button size="md" onClick={next}>
          {step === STEPS.length - 1 ? "See my matches" : "Continue"}
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Your selections personalize the demo feed. In production they&apos;re saved to your profile.
      </p>
    </div>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="font-display text-base font-semibold text-forest">{value}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active ? "border-forest bg-sage-soft text-forest" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
