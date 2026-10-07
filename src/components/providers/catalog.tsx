"use client";

import * as React from "react";
import type { Property } from "@/domain/property";
import { DEMO_PROPERTIES } from "@/data/demo";

/**
 * Server-seeded property catalog. The feed and reports run client-side, but the
 * catalog they browse is resolved on the server by the active PropertyDataProvider
 * (mock demo set, or real RentCast listings when a key is configured) and handed
 * down through this context. Buyer-entered homes are merged on top in use-scored.
 *
 * `live` is true only when the catalog came from a real provider with results,
 * so the UI can show the correct disclosure (real listings vs. sample data).
 */

export type CatalogValue = { catalog: Property[]; live: boolean };

const DEFAULT: CatalogValue = { catalog: DEMO_PROPERTIES, live: false };

const CatalogContext = React.createContext<CatalogValue>(DEFAULT);

export function CatalogProvider({
  catalog,
  live,
  children,
}: {
  catalog: Property[];
  live: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo<CatalogValue>(
    () => ({ catalog: catalog.length ? catalog : DEMO_PROPERTIES, live }),
    [catalog, live],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  return React.useContext(CatalogContext);
}
