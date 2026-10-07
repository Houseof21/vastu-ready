"use client";

import { Container } from "@/components/ui/primitives";
import { HotSheet } from "@/components/portal/hot-sheet";

export default function HotSheetPage() {
  return (
    <Container className="py-8">
      <HotSheet />
    </Container>
  );
}
