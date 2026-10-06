"use client";

import * as React from "react";
import { Check, RotateCcw } from "lucide-react";
import type { UserPreferences, Priority, Dealbreaker } from "@/domain/profile";
import { PRIORITY_LABEL, DEALBREAKER_LABEL } from "@/domain/profile";
import type { Cardinal8, Strictness } from "@/domain/types";
import { CARDINALS } from "@/domain/types";
import { DIRECTION_LABEL } from "@/domain/directions";
import {
  CONSTRUCTION_LABEL,
  RENOVATION_LABEL,
  POOL_LABEL,
  GARAGE_PREF_LABEL,
  IMPORTANCE_LABEL,
  STRICTNESS_LABEL,
} from "@/domain/labels";
import { usePreferences, useHasCustomPreferences } from "@/lib/use-scored";
import { useUserState, useHydrated } from "@/components/providers/user-state";
import { Card, CardBody } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function PreferencesForm() {
  const hydrated = useHydrated();
  const initial = usePreferences();
  if (!hydrated) return <div className="py-24 text-center text-muted">Loading your preferences…</div>;
  // Remount with a fresh draft whenever the stored baseline changes (e.g. reset).
  return <Editor key={JSON.stringify(initial)} initial={initial} />;
}

type Errors = Record<string, string>;

function Editor({ initial }: { initial: UserPreferences }) {
  const { setPreferences, resetPreferences } = useUserState();
  const isCustom = useHasCustomPreferences();
  const [d, setD] = React.useState<UserPreferences>(() => structuredClone(initial));
  const [saved, setSaved] = React.useState(false);

  const p = d.profile;
  const v = d.vastu;
  const setProfile = (patch: Partial<typeof p>) => {
    setD((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
    setSaved(false);
  };
  const setVastu = (patch: Partial<typeof v>) => {
    setD((s) => ({ ...s, vastu: { ...s.vastu, ...patch } }));
    setSaved(false);
  };

  const errors = validate(d);
  const hasErrors = Object.keys(errors).length > 0;

  function save() {
    if (hasErrors) return;
    setPreferences(d);
    setSaved(true);
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Home & budget */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink">Home &amp; budget</h2>
            <Text label="Profile name" value={p.name} onChange={(x) => setProfile({ name: x })} />
            <NumberField label="Maximum budget ($)" value={p.maxBudget} min={0} step={25000} error={errors.maxBudget} onChange={(n) => setProfile({ maxBudget: n ?? 0 })} />
            <NumberField label="Minimum budget ($, optional)" value={p.minBudget ?? null} min={0} step={25000} error={errors.minBudget} onChange={(n) => setProfile({ minBudget: n })} allowEmpty />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Min beds" value={p.minBeds} min={0} step={1} error={errors.minBeds} onChange={(n) => setProfile({ minBeds: n ?? 0 })} />
              <NumberField label="Min baths" value={p.minBaths} min={0} step={0.5} error={errors.minBaths} onChange={(n) => setProfile({ minBaths: n ?? 0 })} />
            </div>
            <NumberField label="Min square footage" value={p.minSqft} min={0} step={100} error={errors.minSqft} onChange={(n) => setProfile({ minSqft: n ?? 0 })} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Min lot (acres)" value={p.minLotAcres} min={0} step={0.05} error={errors.minLotAcres} onChange={(n) => setProfile({ minLotAcres: n ?? 0 })} />
              <NumberField label="Preferred lot (acres)" value={p.preferredLotAcres ?? null} min={0} step={0.05} error={errors.preferredLotAcres} onChange={(n) => setProfile({ preferredLotAcres: n })} allowEmpty />
            </div>
          </CardBody>
        </Card>

        {/* Location & commute */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink">Location &amp; commute</h2>
            <ListField label="Preferred areas (comma-separated)" value={p.preferredAreas} onChange={(xs) => setProfile({ preferredAreas: xs })} />
            <Text label="Commute destination" value={p.destinationLabel} onChange={(x) => setProfile({ destinationLabel: x })} />
            <NumberField label="Maximum commute (minutes)" value={p.maxDriveMinutes} min={1} step={1} error={errors.maxDriveMinutes} onChange={(n) => setProfile({ maxDriveMinutes: n ?? 0 })} />
            <ListField label="Preferred styles (comma-separated)" value={p.preferredStyles} onChange={(xs) => setProfile({ preferredStyles: xs })} />
          </CardBody>
        </Card>

        {/* Lifestyle */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink">Lifestyle</h2>
            <Select label="Construction" value={p.constructionPref} options={CONSTRUCTION_LABEL} onChange={(x) => setProfile({ constructionPref: x as typeof p.constructionPref })} />
            <Select label="Renovation tolerance" value={p.renovationTolerance} options={RENOVATION_LABEL} onChange={(x) => setProfile({ renovationTolerance: x as typeof p.renovationTolerance })} />
            <Select label="Pool" value={p.poolPreference} options={POOL_LABEL} onChange={(x) => setProfile({ poolPreference: x as typeof p.poolPreference })} />
            <Select label="Privacy importance" value={p.privacyImportance} options={IMPORTANCE_LABEL} onChange={(x) => setProfile({ privacyImportance: x as typeof p.privacyImportance })} />
            <Select label="Garage" value={p.garagePref} options={GARAGE_PREF_LABEL} onChange={(x) => setProfile({ garagePref: x as typeof p.garagePref })} />
          </CardBody>
        </Card>

        {/* Priorities */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink">What matters most</h2>
            <p className="text-sm text-muted">These get extra weight in your overall match.</p>
            <ChipMulti
              options={Object.entries(PRIORITY_LABEL) as [Priority, string][]}
              selected={p.priorities}
              onToggle={(k) =>
                setProfile({
                  priorities: p.priorities.includes(k)
                    ? p.priorities.filter((x) => x !== k)
                    : [...p.priorities, k],
                })
              }
            />
          </CardBody>
        </Card>
      </div>

      {/* Vastu */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Vastu preferences</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">Strictness</p>
                <div className="flex flex-wrap gap-2">
                  {(["flexible", "balanced", "strict"] as Strictness[]).map((s) => (
                    <Chip key={s} active={v.strictness === s} onClick={() => setVastu({ strictness: s })}>
                      {STRICTNESS_LABEL[s]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">Acceptable facings {errors.acceptableFacings ? <span className="text-concern">— {errors.acceptableFacings}</span> : null}</p>
                <div className="flex flex-wrap gap-2">
                  {CARDINALS.map((f) => (
                    <Chip
                      key={f}
                      active={v.acceptableFacings.includes(f)}
                      onClick={() =>
                        setVastu({
                          acceptableFacings: v.acceptableFacings.includes(f)
                            ? v.acceptableFacings.filter((x) => x !== f)
                            : [...v.acceptableFacings, f],
                        })
                      }
                    >
                      {DIRECTION_LABEL[f]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">Preferred entrance</p>
                <select
                  value={v.preferredEntrance ?? ""}
                  onChange={(e) => setVastu({ preferredEntrance: (e.target.value || null) as Cardinal8 | null })}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none"
                >
                  <option value="">No preference</option>
                  {CARDINALS.map((f) => (
                    <option key={f} value={f}>{DIRECTION_LABEL[f]}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={v.openSpaceNEImportant}
                  onChange={(e) => setVastu({ openSpaceNEImportant: e.target.checked })}
                  className="h-4 w-4 accent-[color:var(--color-forest)]"
                />
                Open space to the north-east matters to me
              </label>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Hard dealbreakers</p>
              <p className="mb-2 text-xs text-muted">Any of these forces a &ldquo;Pass&rdquo; verdict.</p>
              <div className="flex flex-col gap-2">
                {(Object.entries(DEALBREAKER_LABEL) as [Dealbreaker, string][]).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={v.dealbreakers.includes(k)}
                      onChange={() =>
                        setVastu({
                          dealbreakers: v.dealbreakers.includes(k)
                            ? v.dealbreakers.filter((x) => x !== k)
                            : [...v.dealbreakers, k],
                        })
                      }
                      className="h-4 w-4 accent-[color:var(--color-forest)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <div className="text-sm">
            {hasErrors ? (
              <span className="text-concern">Fix {Object.keys(errors).length} field(s) to save.</span>
            ) : saved ? (
              <span className="inline-flex items-center gap-1.5 text-forest"><Check size={15} /> Saved — your feed and reports now use these.</span>
            ) : (
              <span className="text-muted">Changes apply to every score once you save.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCustom ? (
              <Button variant="ghost" size="sm" onClick={() => resetPreferences()}>
                <RotateCcw size={14} aria-hidden /> Reset to defaults
              </Button>
            ) : null}
            <Button size="md" onClick={save} disabled={hasErrors}>Save preferences</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function validate(d: UserPreferences): Errors {
  const e: Errors = {};
  const p = d.profile;
  if (!(p.maxBudget > 0)) e.maxBudget = "Enter a budget above 0.";
  if (p.minBudget != null && p.minBudget > p.maxBudget) e.minBudget = "Min budget can't exceed max.";
  if (p.minBeds < 0) e.minBeds = "Can't be negative.";
  if (p.minBaths < 0) e.minBaths = "Can't be negative.";
  if (p.minSqft < 0) e.minSqft = "Can't be negative.";
  if (p.minLotAcres < 0) e.minLotAcres = "Can't be negative.";
  if (p.preferredLotAcres != null && p.preferredLotAcres < p.minLotAcres) e.preferredLotAcres = "Should be ≥ minimum lot.";
  if (!(p.maxDriveMinutes > 0)) e.maxDriveMinutes = "Enter minutes above 0.";
  if (d.vastu.acceptableFacings.length === 0) e.acceptableFacings = "Pick at least one.";
  return e;
}

// --- Field primitives --------------------------------------------------------

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs text-concern">{error}</span> : null}
    </label>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none"
      />
    </Field>
  );
}

function NumberField({
  label, value, onChange, min, step, error, allowEmpty = false,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  min?: number; step?: number; error?: string; allowEmpty?: boolean;
}) {
  return (
    <Field label={label} error={error}>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={min}
        step={step}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(allowEmpty ? null : 0);
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className={cn(
          "w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none",
          error ? "border-concern" : "border-line",
        )}
      />
    </Field>
  );
}

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <input
        value={value.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none"
      />
    </Field>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none"
      >
        {Object.entries(options).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-forest bg-sage-soft text-forest" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function ChipMulti<T extends string>({ options, selected, onToggle }: { options: [T, string][]; selected: T[]; onToggle: (k: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([k, label]) => (
        <Chip key={k} active={selected.includes(k)} onClick={() => onToggle(k)}>
          {label}
        </Chip>
      ))}
    </div>
  );
}
