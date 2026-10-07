import type { Property } from "@/domain/property";
import { compStats } from "@/domain/comps";
import { formatUsd, formatSqft, formatAcres } from "@/lib/format";
import { Eyebrow, Badge } from "@/components/ui/primitives";
import { DEMO_ANALYZED_AT } from "@/lib/demo-analysis";

/**
 * Comparable sales behind the Value score. Every statistic is computed from the
 * SAME eligible comps shown in the table, with the fair-value methodology stated
 * plainly. Fictional demo comps are labeled as samples. Real homes without
 * authorized comparable-sale data show "Value assessment unavailable" rather than
 * an invented estimate.
 */
export function CompsTable({ property: p }: { property: Property }) {
  const asOfMs = p.createdAt ?? Date.parse(DEMO_ANALYZED_AT);
  const stats = compStats(p.comps, p.sqft, asOfMs);

  // Real home (not a demo fixture) without usable authorized comps.
  if (!stats) {
    if (!p.isDemo) {
      return (
        <div>
          <Eyebrow>Comparable sales</Eyebrow>
          <p className="mt-2 text-sm font-medium text-ink">Value assessment unavailable.</p>
          <p className="mt-1 text-sm text-ink-2">
            No authorized comparable-sale data is available for this home, so we don&apos;t show a
            fair-value estimate. Any list or estimated price shown elsewhere is the source&apos;s figure,
            not an appraisal — confirm value with recent nearby sales before relying on it.
          </p>
        </div>
      );
    }
    return (
      <div>
        <Eyebrow>Comparable sales</Eyebrow>
        <p className="mt-2 text-sm text-ink-2">No comparable sales are attached to this home yet.</p>
      </div>
    );
  }

  const { eligible, count, medianSoldPrice, medianPsf, impliedValue } = stats;
  const list = p.price > 0 ? formatUsd(p.price) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Comparable sales</Eyebrow>
        {p.isDemo ? <Badge tone="caution">Sample data</Badge> : <Badge tone="info">Authorized comps</Badge>}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {p.isDemo ? (
          <>
            <span className="font-medium text-ink">Sample comparable sales</span> (fictional, for the demo).{" "}
          </>
        ) : null}
        {count === 1 ? "One eligible nearby sale." : `${count} eligible nearby sales.`} Median sold price{" "}
        <span className="font-medium text-ink">{formatUsd(medianSoldPrice)}</span> at a median of{" "}
        <span className="font-medium text-ink">{formatUsd(Math.round(medianPsf))}/sq ft</span>.
        {impliedValue != null ? (
          <>
            {" "}
            Applying that median $/sq ft to this home&apos;s {formatSqft(p.sqft)} gives an estimated fair
            value of <span className="font-medium text-ink">≈ {formatUsd(impliedValue)}</span>
            {list ? <> vs. a list price of {list}</> : null}. This is an estimate derived from these
            comparable sales — not an appraisal or an established market value.
          </>
        ) : null}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <caption className="sr-only">
            {p.isDemo ? "Sample comparable sales" : "Authorized comparable sales"} used for the value estimate
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Address</th>
              <th scope="col" className="py-2 pr-3 font-medium">Sold</th>
              <th scope="col" className="py-2 pr-3 font-medium text-right">Price</th>
              <th scope="col" className="py-2 pr-3 font-medium text-right">$/sq ft</th>
              <th scope="col" className="py-2 pr-3 font-medium text-right">Size</th>
              <th scope="col" className="py-2 pr-3 font-medium text-right">Lot</th>
              <th scope="col" className="py-2 font-medium text-right">Dist.</th>
            </tr>
          </thead>
          <tbody>
            {eligible.map((c, i) => (
              <tr key={i} className="border-b border-line-2 text-ink-2">
                <td className="py-2 pr-3 text-ink">{c.address}</td>
                <td className="py-2 pr-3 tabular-nums">{c.soldDate}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(c.soldPrice)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(Math.round(c.soldPrice / c.sqft))}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatSqft(c.sqft)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatAcres(c.lotAcres)}</td>
                <td className="py-2 text-right tabular-nums">{c.distanceMiles} mi</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
