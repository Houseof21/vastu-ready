import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { SavedList } from "@/components/vastu/saved-list";

export const metadata: Metadata = { title: "Saved homes" };

export default function SavedPage() {
  return (
    <Container className="py-8">
      <Eyebrow>Your shortlist</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Saved homes</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Everything you&apos;ve saved or reacted to, in one place.
      </p>
      <div className="mt-8">
        <SavedList />
      </div>
    </Container>
  );
}
