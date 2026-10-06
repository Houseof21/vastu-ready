import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { FeedGrid } from "@/components/vastu/feed-grid";
import { FeedHeader } from "@/components/vastu/feed-header";
import { FictionalBanner } from "@/components/vastu/disclosure-banner";

export const metadata: Metadata = { title: "Discover homes" };

export default function FeedPage() {
  return (
    <Container className="py-8">
      <FeedHeader />
      <FictionalBanner className="mt-5" />
      <div className="mt-8">
        <FeedGrid />
      </div>
    </Container>
  );
}
