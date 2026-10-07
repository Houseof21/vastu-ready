"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { WorkspaceBoard } from "@/components/portal/workspace-board";
import { useUserState } from "@/components/providers/user-state";

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { role } = useUserState();
  const id = params.id;
  // Actor: realtors act as realtor; buyers act as client. ?view=client lets a
  // realtor preview exactly what the client sees (private notes stripped).
  const actor = search.get("view") === "client" ? "client" : role === "realtor" ? "realtor" : "client";

  return (
    <Container className="py-6">
      <Link href={role === "realtor" ? "/clients" : "/feed"} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-forest">
        <ArrowLeft size={15} /> Back
      </Link>
      <div className="mt-4">
        <WorkspaceBoard workspaceId={id} actor={actor} />
      </div>
    </Container>
  );
}
