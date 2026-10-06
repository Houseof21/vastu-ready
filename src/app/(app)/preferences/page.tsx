import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { PreferencesForm } from "@/components/preferences/preferences-form";

export const metadata: Metadata = { title: "Your preferences" };

export default function PreferencesPage() {
  return (
    <Container className="py-8">
      <Eyebrow>Your profile</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Preferences</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        These drive every score and recommendation. Edit them here and save — your feed re-ranks and every
        report recalculates against the changes immediately.
      </p>
      <div className="mt-8">
        <PreferencesForm />
      </div>
    </Container>
  );
}
