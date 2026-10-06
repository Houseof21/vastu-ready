import type { Metadata } from "next";
import { DEMO_PROPERTIES, getDemoProperty } from "@/data/demo";
import { PropertyReportView } from "@/components/vastu/property-report-view";

// Pre-render the demo catalog; buyer-entered homes render on demand (client).
export const dynamicParams = true;

export function generateStaticParams() {
  return DEMO_PROPERTIES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = getDemoProperty(id);
  return { title: p ? `${p.address.line1} · Analysis` : "Property analysis" };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyReportView id={id} />;
}
