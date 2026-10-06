import { brand } from "@/config/brand";

/** Footer carries the cultural-framework + not-a-guarantee disclaimer. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface-2">
      <div className="container-page py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="font-display text-base font-semibold text-ink">{brand.name}</p>
            <p className="mt-1 text-sm text-ink-2">{brand.tagline}</p>
            <p className="mt-1 text-xs text-muted">Currently serving {brand.market}.</p>
          </div>
          <div className="text-xs leading-relaxed text-muted sm:max-w-sm">
            <p className="font-semibold text-ink-2">About these insights</p>
            <p className="mt-1">
              Vastu is a traditional architectural and cultural framework. Vastu Ready&apos;s scores reflect
              alignment with those principles and your stated preferences — they are not a prediction of
              financial, health, or life outcomes. Inferred details are labeled and should be independently
              verified before you make an offer.
            </p>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted">
          © {new Date().getFullYear()} {brand.legalName}. Demo build — all properties shown are fictional.
        </p>
      </div>
    </footer>
  );
}
