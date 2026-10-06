import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ShieldCheck, Scale, Wrench, Sparkles, Map } from "lucide-react";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
};

const FEATURES = [
  {
    Icon: Sparkles,
    title: "A verdict, not a spreadsheet",
    body: "Every home gets a clear recommendation — tour it, or pass — with conversational reasoning behind it, not just raw numbers.",
  },
  {
    Icon: Compass,
    title: "Real Vastu intelligence",
    body: "Entrance, orientation, kitchen, bedrooms, Brahmasthan, and more — each analyzed, scored, and explained in plain language.",
  },
  {
    Icon: ShieldCheck,
    title: "Never guesses as fact",
    body: "Inferred details are labeled Needs Verification. We tell you how confident we are so you can trust what you act on.",
  },
  {
    Icon: Wrench,
    title: "Correctability built in",
    body: "A concern that's an easy, low-cost fix is very different from one that needs structural work. We score the difference.",
  },
  {
    Icon: Scale,
    title: "Weighted to your priorities",
    body: "Your overall match isn't an average — it's weighted by what you care about most and capped by your dealbreakers.",
  },
  {
    Icon: Map,
    title: "Lot & compass view",
    body: "See orientation and zone placement at a glance, clearly marked approximate until verified against a plan.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="border-b border-line">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-forest text-sm font-bold text-white">V</span>
            <span className="font-display text-lg font-semibold text-ink">{brand.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-pill px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2">
              Sign in
            </Link>
            <ButtonLink href="/feed" variant="primary" size="sm">
              Explore demo
            </ButtonLink>
          </div>
        </Container>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <Container className="py-20 text-center sm:py-28">
          <Badge tone="gold" className="mx-auto">
            Now in {brand.market}
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
            Find a home that feels right — and know <span className="text-forest">why</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            {brand.name} is an AI real-estate advisor that reads every listing through your priorities and
            Vastu principles, then tells you plainly whether it&apos;s worth your time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/feed" variant="primary" size="lg">
              Explore the demo feed
            </ButtonLink>
            <ButtonLink href="/onboarding" variant="secondary" size="lg">
              Set up your profile
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">No account needed to explore. All demo homes are fictional.</p>
        </Container>
      </section>

      {/* Features */}
      <section className="border-t border-line bg-surface-2">
        <Container className="py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Why {brand.name}</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
              Zillow shows you listings. We tell you which ones to trust.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardBody>
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-sage-soft text-forest">
                    <f.Icon size={18} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{f.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Honesty band */}
      <section className="border-t border-line">
        <Container className="py-16">
          <div className="mx-auto max-w-3xl rounded-xl border border-line bg-surface p-8 text-center">
            <Eyebrow>A note on how we talk about Vastu</Eyebrow>
            <p className="mt-3 text-lg leading-relaxed text-ink-2">
              Vastu is a traditional architectural and cultural framework. Our scores reflect alignment with
              those principles and your preferences — they are not a prediction of financial, health, or life
              outcomes. We&apos;d rather tell you what we don&apos;t know than pretend to certainty.
            </p>
            <div className="mt-6">
              <ButtonLink href="/feed" variant="primary">
                See it in action
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-line bg-surface-2">
        <Container className="py-8 text-sm text-muted">
          © {new Date().getFullYear()} {brand.legalName}. {brand.tagline}
        </Container>
      </footer>
    </div>
  );
}
