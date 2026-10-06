"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Upload, Compass, Info, X } from "lucide-react";
import { Card, CardBody, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState, useHydrated } from "@/components/providers/user-state";
import { getPropertyProvider } from "@/providers/property";
import type { ManualPropertyInput } from "@/providers/property";
import type { Property, HomeType, GarageType, PrivacyLevel } from "@/domain/property";
import type {
  Cardinal8,
  Zone,
  LotShape,
  RoadPosition,
  Quality,
  BrahmasthanCondition,
  VastuAttribute,
  PropertyVastu,
  WaterFeature,
} from "@/domain/types";
import { CARDINALS } from "@/domain/types";
import { DIRECTION_LABEL, zoneLabel } from "@/domain/directions";
import { HOME_TYPE_LABEL, GARAGE_TYPE_LABEL, PRIVACY_LABEL } from "@/domain/labels";
import { cn } from "@/lib/cn";

const ZONES: Zone[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "CENTER"];
const STEPS = ["Home details", "Orientation", "Floor plan", "Rooms & lot", "Review"] as const;

// Draft uses "" to mean Unknown for every optional field (never inferred).
type Draft = {
  id?: string;
  line1: string; city: string; state: string; zip: string; neighborhood: string;
  price: string; estimatedValue: string;
  beds: string; baths: string; sqft: string; lotAcres: string; yearBuilt: string;
  homeType: HomeType; style: string; newConstruction: boolean; pool: boolean;
  garageSpaces: string; garageType: GarageType; privacy: PrivacyLevel;
  listingUrl: string; driveMinutes: string;
  northConfirmed: boolean;
  facing: Cardinal8 | ""; entrance: Cardinal8 | "";
  lotShape: LotShape | ""; roadPosition: RoadPosition | ""; openSpaceNE: Quality | "";
  kitchen: Zone | ""; primaryBedroom: Zone | ""; staircase: Zone | ""; garageZone: Zone | "";
  bathrooms: Zone[]; bathroomsUnknown: boolean;
  brahmasthan: BrahmasthanCondition | "";
  waterDirs: Cardinal8[]; waterUnknown: boolean;
  floorPlanDataUrl: string | null; floorPlanName: string;
};

const EMPTY_DRAFT: Draft = {
  line1: "", city: "Raleigh", state: "NC", zip: "", neighborhood: "",
  price: "", estimatedValue: "", beds: "", baths: "", sqft: "", lotAcres: "", yearBuilt: "",
  homeType: "single_family", style: "", newConstruction: false, pool: false,
  garageSpaces: "", garageType: "none", privacy: "moderate",
  listingUrl: "", driveMinutes: "",
  northConfirmed: false, facing: "", entrance: "",
  lotShape: "", roadPosition: "", openSpaceNE: "",
  kitchen: "", primaryBedroom: "", staircase: "", garageZone: "",
  bathrooms: [], bathroomsUnknown: true,
  brahmasthan: "",
  waterDirs: [], waterUnknown: true,
  floorPlanDataUrl: null, floorPlanName: "",
};

function draftFromProperty(p: Property): Draft {
  const v = p.vastu;
  const val = <T,>(a: VastuAttribute<T>): T | "" => (a.value == null ? "" : (a.value as T));
  return {
    id: p.id,
    line1: p.address.line1, city: p.address.city, state: p.address.state, zip: p.address.zip,
    neighborhood: p.address.neighborhood,
    price: String(p.price || ""), estimatedValue: p.estimatedValue ? String(p.estimatedValue) : "",
    beds: String(p.beds || ""), baths: String(p.baths || ""), sqft: String(p.sqft || ""),
    lotAcres: String(p.lotAcres || ""), yearBuilt: p.yearBuilt ? String(p.yearBuilt) : "",
    homeType: p.homeType, style: p.style === "unknown" ? "" : p.style,
    newConstruction: p.newConstruction, pool: p.pool,
    garageSpaces: String(p.garageSpaces || ""), garageType: p.garageType, privacy: p.privacy,
    listingUrl: p.listingUrl ?? "", driveMinutes: p.driveMinutes != null ? String(p.driveMinutes) : "",
    northConfirmed: v.facingDirection.confidence >= 0.8 || v.entranceDirection.confidence >= 0.8,
    facing: val(v.facingDirection) as Cardinal8 | "",
    entrance: val(v.entranceDirection) as Cardinal8 | "",
    lotShape: val(v.lotShape) as LotShape | "",
    roadPosition: val(v.roadPosition) as RoadPosition | "",
    openSpaceNE: val(v.openSpaceNE) as Quality | "",
    kitchen: val(v.kitchenZone) as Zone | "",
    primaryBedroom: val(v.primaryBedroomZone) as Zone | "",
    staircase: val(v.staircaseZone) as Zone | "",
    garageZone: val(v.garageZone) as Zone | "",
    bathrooms: v.bathroomZones.value ?? [],
    bathroomsUnknown: v.bathroomZones.value == null,
    brahmasthan: val(v.brahmasthan) as BrahmasthanCondition | "",
    waterDirs: (v.waterFeatures.value ?? []).map((w) => w.direction).filter((d): d is Cardinal8 => d != null),
    waterUnknown: v.waterFeatures.value == null,
    floorPlanDataUrl: p.floorPlanDataUrl ?? null, floorPlanName: p.floorPlanDataUrl ? "floor-plan" : "",
  };
}

export function ManualEntryForm() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const editId = params.get("id");
  const { properties } = useUserState();

  if (!hydrated && editId) return <div className="py-24 text-center text-muted">Loading…</div>;
  const initial = editId && properties[editId] ? draftFromProperty(properties[editId]) : EMPTY_DRAFT;
  return <Wizard key={editId ?? "new"} initial={initial} editing={Boolean(editId)} />;
}

function Wizard({ initial, editing }: { initial: Draft; editing: boolean }) {
  const router = useRouter();
  const { upsertProperty } = useUserState();
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState<Draft>(initial);
  const [busy, setBusy] = React.useState(false);
  const set = (patch: Partial<Draft>) => setD((s) => ({ ...s, ...patch }));

  const stepErrors = validateStep(step, d);
  const canNext = Object.keys(stepErrors).length === 0;

  async function onFile(file: File | null) {
    if (!file) return set({ floorPlanDataUrl: null, floorPlanName: "" });
    if (!/^image\/|application\/pdf/.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => set({ floorPlanDataUrl: String(reader.result), floorPlanName: file.name });
    reader.readAsDataURL(file);
  }

  async function generate() {
    setBusy(true);
    const conf = d.northConfirmed ? 0.9 : 0.5; // honest: unconfirmed north ⇒ lower confidence
    const m = <T,>(value: T | ""): VastuAttribute<T> =>
      value === "" ? { value: null, confidence: 0, source: "unknown" } : { value: value as T, confidence: 0.9, source: "manual" };
    const dir = (value: Cardinal8 | ""): VastuAttribute<Cardinal8> =>
      value === "" ? { value: null, confidence: 0, source: "unknown" } : { value, confidence: conf, source: "manual" };

    const vastu: PropertyVastu = {
      facingDirection: dir(d.facing),
      entranceDirection: dir(d.entrance),
      lotShape: m<LotShape>(d.lotShape),
      roadPosition: m<RoadPosition>(d.roadPosition),
      openSpaceNE: m<Quality>(d.openSpaceNE),
      kitchenZone: m<Zone>(d.kitchen),
      primaryBedroomZone: m<Zone>(d.primaryBedroom),
      bathroomZones: d.bathroomsUnknown
        ? { value: null, confidence: 0, source: "unknown" }
        : { value: d.bathrooms, confidence: 0.9, source: "manual" },
      staircaseZone: m<Zone>(d.staircase),
      brahmasthan: m<BrahmasthanCondition>(d.brahmasthan),
      garageZone: m<Zone>(d.garageZone),
      waterFeatures: d.waterUnknown
        ? { value: null, confidence: 0, source: "unknown" }
        : {
            value: d.waterDirs.map<WaterFeature>((dirc) => ({ kind: "pond", direction: dirc })),
            confidence: 0.9,
            source: "manual",
          },
    };

    const input: ManualPropertyInput = {
      id: d.id,
      address: { line1: d.line1, city: d.city, state: d.state, zip: d.zip, neighborhood: d.neighborhood || d.city },
      price: num(d.price),
      estimatedValue: d.estimatedValue ? num(d.estimatedValue) : num(d.price),
      beds: num(d.beds), baths: num(d.baths), sqft: num(d.sqft), lotAcres: num(d.lotAcres),
      yearBuilt: d.yearBuilt ? num(d.yearBuilt) : 0,
      homeType: d.homeType, style: d.style || "unknown",
      newConstruction: d.newConstruction, pool: d.pool,
      garageSpaces: d.garageSpaces ? num(d.garageSpaces) : 0, garageType: d.garageType, privacy: d.privacy,
      listingUrl: d.listingUrl || null,
      driveMinutes: d.driveMinutes ? num(d.driveMinutes) : null,
      floorPlanDataUrl: d.floorPlanDataUrl,
      vastu,
    };

    const property = await getPropertyProvider().fromManualEntry(input);
    upsertProperty(property);
    setBusy(false);
    router.push(`/property/${property.id}`);
  }

  return (
    <div className="pb-10">
      <Stepper step={step} />

      <div className="mt-6">
        {step === 0 && <StepBasics d={d} set={set} errors={stepErrors} />}
        {step === 1 && <StepOrientation d={d} set={set} />}
        {step === 2 && <StepFloorPlan d={d} onFile={onFile} />}
        {step === 3 && <StepRooms d={d} set={set} />}
        {step === 4 && <StepReview d={d} />}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <div className="flex flex-col items-end gap-1">
            <Button size="md" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue
            </Button>
            {!canNext ? <span className="text-xs text-concern">{Object.values(stepErrors)[0]}</span> : null}
          </div>
        ) : (
          <Button size="md" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : editing ? "Recalculate report" : "Generate report"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- Steps ------------------------------------------------------------------

function StepBasics({ d, set, errors }: { d: Draft; set: (p: Partial<Draft>) => void; errors: Record<string, string> }) {
  return (
    <Card>
      <CardBody className="space-y-5">
        <h2 className="font-display text-xl font-semibold text-ink">Home details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <T label="Street address" v={d.line1} set={(x) => set({ line1: x })} err={errors.line1} />
          <T label="Neighborhood (optional)" v={d.neighborhood} set={(x) => set({ neighborhood: x })} />
          <T label="City" v={d.city} set={(x) => set({ city: x })} err={errors.city} />
          <div className="grid grid-cols-2 gap-3">
            <T label="State" v={d.state} set={(x) => set({ state: x })} />
            <T label="ZIP" v={d.zip} set={(x) => set({ zip: x })} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <N label="Price ($)" v={d.price} set={(x) => set({ price: x })} err={errors.price} />
          <N label="Est. fair value ($, optional)" v={d.estimatedValue} set={(x) => set({ estimatedValue: x })} />
          <N label="Year built (optional)" v={d.yearBuilt} set={(x) => set({ yearBuilt: x })} />
          <N label="Beds" v={d.beds} set={(x) => set({ beds: x })} err={errors.beds} />
          <N label="Baths" v={d.baths} set={(x) => set({ baths: x })} err={errors.baths} step="0.5" />
          <N label="Square footage" v={d.sqft} set={(x) => set({ sqft: x })} err={errors.sqft} />
          <N label="Lot size (acres)" v={d.lotAcres} set={(x) => set({ lotAcres: x })} err={errors.lotAcres} step="0.01" />
          <N label="Garage spaces (optional)" v={d.garageSpaces} set={(x) => set({ garageSpaces: x })} />
          <N label="Commute minutes (optional)" v={d.driveMinutes} set={(x) => set({ driveMinutes: x })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Sel label="Home type" v={d.homeType} opts={HOME_TYPE_LABEL} set={(x) => set({ homeType: x as HomeType })} />
          <T label="Style (optional)" v={d.style} set={(x) => set({ style: x })} />
          <Sel label="Garage type" v={d.garageType} opts={GARAGE_TYPE_LABEL} set={(x) => set({ garageType: x as GarageType })} />
          <Sel label="Privacy" v={d.privacy} opts={PRIVACY_LABEL} set={(x) => set({ privacy: x as PrivacyLevel })} />
        </div>
        <div className="flex flex-wrap gap-5">
          <Checkbox label="New construction" checked={d.newConstruction} onChange={(b) => set({ newConstruction: b })} />
          <Checkbox label="Has a pool" checked={d.pool} onChange={(b) => set({ pool: b })} />
        </div>
        <T label="Listing URL (optional)" v={d.listingUrl} set={(x) => set({ listingUrl: x })} />
        <p className="text-xs text-muted">
          A listing URL is stored for reference only. We don&apos;t scrape listing sites — enter the facts
          you want analyzed directly here.
        </p>
      </CardBody>
    </Card>
  );
}

function StepOrientation({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <Card>
      <CardBody className="space-y-5">
        <h2 className="font-display text-xl font-semibold text-ink">Orientation</h2>
        <div className="flex items-start gap-2.5 rounded-lg border border-[color:var(--color-info-soft)] bg-info-soft/50 p-3 text-sm text-ink-2">
          <Compass size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
          <div>
            <p className="font-medium text-ink">Confirm which way is North first.</p>
            <p className="mt-1">
              Orientation is only meaningful once you know North. Use a compass app standing at the front
              door, or check the plat/listing map. Then set the directions below.
            </p>
            <label className="mt-2 flex items-center gap-2 font-medium text-ink">
              <input
                type="checkbox"
                checked={d.northConfirmed}
                onChange={(e) => set({ northConfirmed: e.target.checked })}
                className="h-4 w-4 accent-[color:var(--color-forest)]"
              />
              I&apos;ve confirmed which direction is North.
            </label>
            {!d.northConfirmed ? (
              <p className="mt-1 text-xs text-caution">
                Until confirmed, orientation is treated as &ldquo;needs verification&rdquo; rather than confirmed.
              </p>
            ) : null}
          </div>
        </div>

        <DirSelect
          label="Building facing direction"
          help="The direction the front of the home points toward."
          v={d.facing}
          set={(x) => set({ facing: x })}
        />
        <DirSelect
          label="Entrance direction"
          help="The direction you face when standing inside, looking out through the main entrance. This can differ from the way the building faces."
          v={d.entrance}
          set={(x) => set({ entrance: x })}
        />
      </CardBody>
    </Card>
  );
}

function StepFloorPlan({ d, onFile }: { d: Draft; onFile: (f: File | null) => void }) {
  const isPdf = d.floorPlanDataUrl?.startsWith("data:application/pdf");
  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Floor plan (optional)</h2>
        <div className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          <Info size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <p>
            Automated floor-plan reading isn&apos;t available yet, so we won&apos;t auto-detect rooms — you&apos;ll
            confirm each room&apos;s location yourself on the next step. Uploading a plan just gives you a
            reference while you do. Supported: images (PNG/JPG) and PDF.
          </p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface p-8 text-center hover:bg-surface-2">
          <Upload size={22} className="text-muted" aria-hidden />
          <span className="text-sm font-medium text-ink">Choose a floor-plan file</span>
          <span className="text-xs text-muted">PNG, JPG, or PDF</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {d.floorPlanDataUrl ? (
          <div className="rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{d.floorPlanName || "Attached plan"}</span>
              <button type="button" onClick={() => onFile(null)} className="inline-flex items-center gap-1 text-xs text-concern hover:underline">
                <X size={13} /> Remove
              </button>
            </div>
            {isPdf ? (
              <object data={d.floorPlanDataUrl} type="application/pdf" className="h-96 w-full rounded-md">
                <p className="p-4 text-sm text-muted">PDF attached (preview not shown).</p>
              </object>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.floorPlanDataUrl} alt="Floor plan preview" className="max-h-96 w-full rounded-md object-contain" />
            )}
            <p className="mt-2 text-xs text-muted">Preview only — you confirm room locations on the next step.</p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function StepRooms({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <Card>
      <CardBody className="space-y-5">
        <h2 className="font-display text-xl font-semibold text-ink">Rooms &amp; lot</h2>
        <p className="text-sm text-muted">
          Pick a direction for each. Choose <span className="font-medium text-ink-2">Unknown</span> for anything
          you&apos;re not sure of — we won&apos;t guess, and unknowns are flagged to verify in the report.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <ZoneSelect label="Kitchen" v={d.kitchen} set={(x) => set({ kitchen: x })} />
          <ZoneSelect label="Primary bedroom" v={d.primaryBedroom} set={(x) => set({ primaryBedroom: x })} />
          <ZoneSelect label="Staircase" v={d.staircase} set={(x) => set({ staircase: x })} />
          <ZoneSelect label="Garage" v={d.garageZone} set={(x) => set({ garageZone: x })} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Bathrooms</span>
            <Checkbox label="Unknown" checked={d.bathroomsUnknown} onChange={(b) => set({ bathroomsUnknown: b })} />
          </div>
          {!d.bathroomsUnknown ? (
            <div className="flex flex-wrap gap-2">
              {ZONES.map((z) => (
                <ChipBtn
                  key={z}
                  active={d.bathrooms.includes(z)}
                  onClick={() =>
                    set({ bathrooms: d.bathrooms.includes(z) ? d.bathrooms.filter((x) => x !== z) : [...d.bathrooms, z] })
                  }
                >
                  {zoneLabel(z)}
                </ChipBtn>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Bathroom locations will be flagged as needing verification.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Sel
            label="Center of home (Brahmasthan)"
            v={d.brahmasthan}
            opts={{ "": "Unknown", open: "Open / unobstructed", partial: "Partially obstructed", obstructed: "Obstructed" }}
            set={(x) => set({ brahmasthan: x as BrahmasthanCondition | "" })}
          />
          <Sel
            label="Lot shape"
            v={d.lotShape}
            opts={{ "": "Unknown", regular: "Regular", slightly_irregular: "Slightly irregular", irregular: "Irregular", triangular: "Triangular" }}
            set={(x) => set({ lotShape: x as LotShape | "" })}
          />
          <Sel
            label="Road position"
            v={d.roadPosition}
            opts={{ "": "Unknown", mid_block: "Mid-block", cul_de_sac: "Cul-de-sac", corner: "Corner", t_junction: "T-junction", dead_end: "Dead-end" }}
            set={(x) => set({ roadPosition: x as RoadPosition | "" })}
          />
          <Sel
            label="North-east open space"
            v={d.openSpaceNE}
            opts={{ "": "Unknown", open: "Open", moderate: "Moderate", obstructed: "Obstructed" }}
            set={(x) => set({ openSpaceNE: x as Quality | "" })}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Water features</span>
            <Checkbox label="Unknown" checked={d.waterUnknown} onChange={(b) => set({ waterUnknown: b })} />
          </div>
          {!d.waterUnknown ? (
            <div className="flex flex-wrap gap-2">
              {CARDINALS.map((dir) => (
                <ChipBtn
                  key={dir}
                  active={d.waterDirs.includes(dir)}
                  onClick={() =>
                    set({ waterDirs: d.waterDirs.includes(dir) ? d.waterDirs.filter((x) => x !== dir) : [...d.waterDirs, dir] })
                  }
                >
                  {DIRECTION_LABEL[dir]}
                </ChipBtn>
              ))}
              {d.waterDirs.length === 0 ? (
                <span className="self-center text-xs text-muted">None selected = no water features.</span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted">Water features will be flagged as needing verification.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function StepReview({ d }: { d: Draft }) {
  const rows: [string, string][] = [
    ["Address", [d.line1, d.city, d.state, d.zip].filter(Boolean).join(", ")],
    ["Price", d.price ? `$${Number(d.price).toLocaleString()}` : "—"],
    ["Beds / Baths", `${d.beds || "—"} / ${d.baths || "—"}`],
    ["Size / Lot", `${d.sqft || "—"} sq ft · ${d.lotAcres || "—"} ac`],
    ["Commute", d.driveMinutes ? `${d.driveMinutes} min` : "—"],
    ["North confirmed", d.northConfirmed ? "Yes" : "No — will need verification"],
    ["Facing", d.facing ? DIRECTION_LABEL[d.facing] : "Unknown"],
    ["Entrance", d.entrance ? DIRECTION_LABEL[d.entrance] : "Unknown"],
    ["Kitchen", d.kitchen ? zoneLabel(d.kitchen) : "Unknown"],
    ["Primary bedroom", d.primaryBedroom ? zoneLabel(d.primaryBedroom) : "Unknown"],
    ["Bathrooms", d.bathroomsUnknown ? "Unknown" : d.bathrooms.map(zoneLabel).join(", ") || "None"],
    ["Staircase", d.staircase ? zoneLabel(d.staircase) : "Unknown"],
    ["Garage", d.garageZone ? zoneLabel(d.garageZone) : "Unknown"],
    ["Center", d.brahmasthan || "Unknown"],
    ["Lot shape", d.lotShape ? d.lotShape.replace(/_/g, " ") : "Unknown"],
    ["Road", d.roadPosition ? d.roadPosition.replace(/_/g, " ") : "Unknown"],
    ["NE open space", d.openSpaceNE || "Unknown"],
    ["Water", d.waterUnknown ? "Unknown" : d.waterDirs.map((x) => DIRECTION_LABEL[x]).join(", ") || "None"],
    ["Floor plan", d.floorPlanDataUrl ? d.floorPlanName || "Attached" : "Not attached"],
  ];
  const unknowns = rows.filter(([, v]) => v.startsWith("Unknown")).length;
  return (
    <Card>
      <CardBody>
        <h2 className="font-display text-xl font-semibold text-ink">Review before generating</h2>
        <p className="mt-1 text-sm text-ink-2">
          Check everything below — you can go back and correct anything. {unknowns > 0 ? (
            <>
              <Badge tone="caution">{unknowns} unknown</Badge> field{unknowns === 1 ? "" : "s"} will be flagged
              to verify, not guessed.
            </>
          ) : "Everything is filled in."}
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line-2 py-1.5">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className={cn("text-right text-sm font-medium", v.startsWith("Unknown") ? "text-caution" : "text-ink")}>{v}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

// ---- Validation -------------------------------------------------------------

function validateStep(step: number, d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!d.line1.trim()) e.line1 = "Street address is required.";
    if (!d.city.trim()) e.city = "City is required.";
    if (!(num(d.price) > 0)) e.price = "Enter a price above 0.";
    if (!(num(d.beds) > 0)) e.beds = "Enter beds.";
    if (!(num(d.baths) > 0)) e.baths = "Enter baths.";
    if (!(num(d.sqft) > 0)) e.sqft = "Enter square footage.";
    if (!(num(d.lotAcres) > 0)) e.lotAcres = "Enter lot size.";
  }
  return e;
}

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// ---- Primitives -------------------------------------------------------------

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
              i <= step ? "bg-forest text-white" : "bg-surface-2 text-muted",
            )}
          >
            {i < step ? <Check size={13} /> : i + 1}
          </span>
          <span className={cn("whitespace-nowrap text-xs font-medium", i === step ? "text-ink" : "text-muted")}>{label}</span>
          {i < STEPS.length - 1 ? <span className="mx-1 h-px w-4 bg-line sm:w-8" /> : null}
        </li>
      ))}
    </ol>
  );
}

function T({ label, v, set, err }: { label: string; v: string; set: (x: string) => void; err?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input value={v} onChange={(e) => set(e.target.value)} className={cn("mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none", err ? "border-concern" : "border-line")} />
      {err ? <span className="mt-1 block text-xs text-concern">{err}</span> : null}
    </label>
  );
}

function N({ label, v, set, err, step }: { label: string; v: string; set: (x: string) => void; err?: string; step?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input type="number" inputMode="decimal" step={step} value={v} onChange={(e) => set(e.target.value)} className={cn("mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none", err ? "border-concern" : "border-line")} />
      {err ? <span className="mt-1 block text-xs text-concern">{err}</span> : null}
    </label>
  );
}

function Sel({ label, v, opts, set }: { label: string; v: string; opts: Record<string, string>; set: (x: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select value={v} onChange={(e) => set(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none">
        {Object.entries(opts).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function DirSelect({ label, help, v, set }: { label: string; help: string; v: Cardinal8 | ""; set: (x: Cardinal8 | "") => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{help}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <ChipBtn active={v === ""} onClick={() => set("")}>Unknown</ChipBtn>
        {CARDINALS.map((dir) => (
          <ChipBtn key={dir} active={v === dir} onClick={() => set(dir)}>{DIRECTION_LABEL[dir]}</ChipBtn>
        ))}
      </div>
    </div>
  );
}

function ZoneSelect({ label, v, set }: { label: string; v: Zone | ""; set: (x: Zone | "") => void }) {
  return (
    <Sel
      label={label}
      v={v}
      opts={{ "": "Unknown", ...Object.fromEntries(ZONES.map((z) => [z, zoneLabel(z)])) }}
      set={(x) => set(x as Zone | "")}
    />
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[color:var(--color-forest)]" />
      {label}
    </label>
  );
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
