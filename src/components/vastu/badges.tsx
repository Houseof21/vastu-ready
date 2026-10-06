import { Badge } from "@/components/ui/primitives";
import { VERIFICATION_LABEL, SOURCE_LABEL } from "@/domain/directions";
import type { Correctability, DataSource, FindingStatus, VerificationStatus } from "@/domain/types";
import type { VerdictLevel } from "@/domain/scoring";
import {
  CORRECTABILITY_LABEL,
  CORRECTABILITY_TONE,
  FINDING_LABEL,
  FINDING_TONE,
  VERDICT_SHORT,
  VERDICT_TONE,
  VERIFICATION_TONE,
} from "./status";
import { CheckCircle2, CircleHelp, TriangleAlert, Wrench } from "lucide-react";

export function VerdictBadge({ level }: { level: VerdictLevel }) {
  return <Badge tone={VERDICT_TONE[level]}>{VERDICT_SHORT[level]}</Badge>;
}

/**
 * Verification pill — the heart of the trust model. Never says "verified"
 * unless the data source supports it. Pairs an icon with text (not color-only).
 */
export function VerificationBadge({
  status,
  source,
  showSource = false,
}: {
  status: VerificationStatus;
  source?: DataSource;
  showSource?: boolean;
}) {
  const Icon =
    status === "verified"
      ? CheckCircle2
      : status === "likely"
        ? CircleHelp
        : status === "needs_verification"
          ? CircleHelp
          : TriangleAlert;
  return (
    <Badge tone={VERIFICATION_TONE[status]} title={source ? `Source: ${SOURCE_LABEL[source]}` : undefined}>
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      {VERIFICATION_LABEL[status]}
      {showSource && source ? (
        <span className="font-normal opacity-80">· {SOURCE_LABEL[source]}</span>
      ) : null}
    </Badge>
  );
}

export function CorrectabilityBadge({ correctability }: { correctability: Correctability }) {
  return (
    <Badge tone={CORRECTABILITY_TONE[correctability]}>
      <Wrench size={12} strokeWidth={2.25} aria-hidden />
      {CORRECTABILITY_LABEL[correctability]}
    </Badge>
  );
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return <Badge tone={FINDING_TONE[status]}>{FINDING_LABEL[status]}</Badge>;
}
