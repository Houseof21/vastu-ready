import type { Metadata } from "next";
import { Container, Card, CardBody, Eyebrow, Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { AnalyzeForm } from "@/components/vastu/analyze-form";

export const metadata: Metadata = { title: "Analyze a home" };

export default function AnalyzePage() {
  return (
    <Container className="py-8">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Analyze a home</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Analyze any home</h1>
        <p className="mt-2 text-ink-2">
          Enter a home&apos;s details yourself for a full, trustworthy report — or paste a listing link to
          start.
        </p>

        {/* Direct manual entry — the primary path, no URL required */}
        <Card className="mt-6">
          <CardBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Enter details manually</h2>
              <p className="mt-0.5 text-sm text-ink-2">
                Address, price, orientation, and room locations — with &ldquo;Unknown&rdquo; allowed anywhere.
              </p>
            </div>
            <ButtonLink href="/analyze/manual" variant="primary" size="md" className="shrink-0">
              Start manual entry
            </ButtonLink>
          </CardBody>
        </Card>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" /> or paste a listing link <span className="h-px flex-1 bg-line" />
        </div>

        <Card>
          <CardBody>
            <AnalyzeForm />
          </CardBody>
        </Card>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[color:var(--color-caution-soft)] bg-caution-soft/50 p-4">
          <Badge tone="caution">How this works</Badge>
          <p className="text-sm leading-relaxed text-ink-2">
            We don&apos;t scrape listing sites — that&apos;s unreliable and against their terms. In production,
            analysis runs on a licensed MLS or data-provider feed. For now, pasting a link hands off to manual
            entry so nothing is ever assumed or fabricated about a real home.
          </p>
        </div>
      </div>
    </Container>
  );
}
