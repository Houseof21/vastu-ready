import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-forest text-sm font-bold text-white">V</span>
            <span className="font-display text-lg font-semibold text-ink">{brand.name}</span>
          </Link>
        </Container>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <OnboardingWizard />
      </main>
    </div>
  );
}
