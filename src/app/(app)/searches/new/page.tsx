"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { SavedSearchForm } from "@/components/search/saved-search-form";

export default function NewSearchPage() {
  return (
    <Container className="py-6">
      <Link href="/searches" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-forest">
        <ArrowLeft size={15} /> Searches
      </Link>
      <div className="mt-4">
        <Eyebrow>New saved search</Eyebrow>
        <h1 className="mb-5 mt-1 font-display text-2xl font-semibold text-ink">Create a saved search</h1>
        <SavedSearchForm />
      </div>
    </Container>
  );
}
