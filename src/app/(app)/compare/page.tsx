import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { CompareView } from "@/components/vastu/compare-view";

export const metadata: Metadata = { title: "Compare homes" };

export default function ComparePage() {
  return (
    <Container className="py-8">
      <Eyebrow>Side by side</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Compare homes</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Put your shortlist head to head. The advisor weighs each home against your priorities and flags
        the one it would choose.
      </p>
      <div className="mt-8">
        <CompareView />
      </div>
    </Container>
  );
}
