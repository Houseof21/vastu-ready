import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { ManualEntryForm } from "@/components/analyze/manual-form";

export const metadata: Metadata = { title: "Analyze a home — manual entry" };

export default function ManualAnalyzePage() {
  return (
    <Container className="py-8">
      <div className="mx-auto max-w-3xl">
        <Eyebrow>Manual entry</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Analyze a home</h1>
        <p className="mt-2 text-ink-2">
          Enter what you know. Anything you leave as &ldquo;Unknown&rdquo; is flagged to verify — never guessed.
          Your report is built entirely from these details and saved so you can reopen, edit, and compare it.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="py-24 text-center text-muted">Loading…</div>}>
            <ManualEntryForm />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
