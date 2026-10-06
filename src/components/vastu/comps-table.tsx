import type { Comp, Property } from "@/domain/property";
import { formatUsd, formatSqft, formatAcres } from "@/lib/format";
import { Eyebrow } from "@/components/ui/primitives";

/**
 * Comparable sales behind the Value score. The estimate isn't a bare number —
 * it's bracketed by these sales, shown so the buyer can judge it themselves.
 */
export function CompsTable({ property }: { property: Property }) {
  const comps = property.comps ?? [];
  if (comps.length === 0) {
    return (
      <div>
        <Eyebrow>Comparable sales</Eyebrow>
        <p className="mt-2 text-sm text-ink-2">
          No comparable sales are attached to this home yet. The Value score uses your entered estimate
          and should be confirmed against recent nearby sales before you rely on it.
        </p>
      </div>
    );
  }

  const psf = (c: Comp) => c.soldPrice / c.sqft;
  const medianPsf = [...comps].map(psf).sort((a, b) => a - b)[Math.floor(comps.length / 2)]!;
  const impliedFromComps = Math.round((medianPsf * property.sqft) / 1000) * 1000;
  const list = formatUsd(property.price);
  const diff = property.price - property.estimatedValue;

  return (
    <div>
      <Eyebrow>Comparable sales</Eyebrow>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        List price {list} vs. an estimated fair value of {formatUsd(property.estimatedValue)} — a difference
        of {diff >= 0 ? "+" : ""}
        {formatUsd(diff)}. The estimate is bracketed by these recent, comparable nearby sales (median
        ≈ {formatUsd(impliedFromComps)} at {formatUsd(Math.round(medianPsf))}/sq ft).
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Address</th>
              <th className="py-2 pr-3 font-medium">Sold</th>
              <th className="py-2 pr-3 font-medium text-right">Price</th>
              <th className="py-2 pr-3 font-medium text-right">$/sq ft</th>
              <th className="py-2 pr-3 font-medium text-right">Size</th>
              <th className="py-2 pr-3 font-medium text-right">Lot</th>
              <th className="py-2 font-medium text-right">Dist.</th>
            </tr>
          </thead>
          <tbody>
            {comps.map((c, i) => (
              <tr key={i} className="border-b border-line-2 text-ink-2">
                <td className="py-2 pr-3 text-ink">{c.address}</td>
                <td className="py-2 pr-3">{c.soldDate}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(c.soldPrice)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(Math.round(psf(c)))}</td>
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
