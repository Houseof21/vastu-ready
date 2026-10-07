import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CatalogProvider } from "@/components/providers/catalog";
import { DEMO_PROPERTIES } from "@/data/demo";
import { getPropertyProvider } from "@/providers/property";
import type { Property } from "@/domain/property";

/**
 * The catalog is resolved on the server by the active provider (real RentCast
 * listings when configured, else the demo set) and handed to the client feed via
 * context. If a live fetch fails or returns nothing, we fall back to the demo set
 * so the app always has homes to show — and the UI shows the sample-data notice.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const provider = getPropertyProvider();
  let fetched: Property[] = [];
  try {
    fetched = await provider.list();
  } catch {
    fetched = [];
  }
  const live = !provider.isMock && fetched.length > 0;
  const catalog = fetched.length ? fetched : DEMO_PROPERTIES;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <CatalogProvider catalog={catalog} live={live}>
          {children}
        </CatalogProvider>
      </main>
      <SiteFooter />
    </div>
  );
}
