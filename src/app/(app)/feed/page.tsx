import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { FeedGrid } from "@/components/vastu/feed-grid";
import { FeedHeader } from "@/components/vastu/feed-header";
import { FictionalBanner, RealListingBanner } from "@/components/vastu/disclosure-banner";
import { getPropertyProvider } from "@/providers/property";

export const metadata: Metadata = { title: "Discover homes" };

export default async function FeedPage() {
  const provider = getPropertyProvider();
  let live = false;
  if (!provider.isMock) {
    try {
      live = (await provider.list()).length > 0;
    } catch {
      live = false;
    }
  }

  return (
    <Container className="py-8">
      <FeedHeader />
      {live ? <RealListingBanner className="mt-5" /> : <FictionalBanner className="mt-5" />}
      <div className="mt-8">
        <FeedGrid />
      </div>
    </Container>
  );
}
