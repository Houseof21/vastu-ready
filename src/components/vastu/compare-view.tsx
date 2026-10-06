"use client";

import * as React from "react";
import { CompareTable } from "./compare-table";
import { Card, CardBody, Eyebrow } from "@/components/ui/primitives";
import { ButtonLink, Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { compareResult } from "@/ai";
import { useScoredForIds, usePreferences } from "@/lib/use-scored";

export function CompareView() {
  const { compare, clearCompare } = useUserState();
  const prefs = usePreferences();
  const rows = useScoredForIds(compare);

  // Comparison is deterministic — derive it synchronously, no effect needed.
  const ai = React.useMemo(
    () =>
      rows.length >= 2
        ? compareResult({
            items: rows.map((r) => ({ property: r.property, analysis: r.analysis })),
            prefs,
          })
        : null,
    [rows, prefs],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">No homes to compare</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
          Add up to four homes to compare from your feed or any property page.
        </p>
        <div className="mt-4">
          <ButtonLink href="/feed" variant="primary" size="sm">
            Browse homes
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ai && rows.length >= 2 ? (
        <Card>
          <CardBody>
            <Eyebrow>Advisor recommendation</Eyebrow>
            <div className="mt-2 space-y-2">
              {ai.reasoning.map((p, i) => (
                <p key={i} className="text-[0.95rem] leading-relaxed text-ink-2">
                  {p}
                </p>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : rows.length === 1 ? (
        <p className="text-sm text-muted">Add one more home to get a side-by-side recommendation.</p>
      ) : null}

      <Card>
        <CardBody className="p-0 sm:p-0">
          <div className="p-4">
            <CompareTable rows={rows} pickId={ai?.pickPropertyId} />
          </div>
        </CardBody>
      </Card>

      <div>
        <Button variant="ghost" size="sm" onClick={clearCompare}>
          Clear comparison
        </Button>
      </div>
    </div>
  );
}
