"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Container, Card, CardBody, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useUserState } from "@/components/providers/user-state";
import { RealtorProfileForm } from "@/components/mls/realtor-profile-form";
import { ConnectMlsWizard } from "@/components/mls/connect-wizard";
import { ConnectionDashboard } from "@/components/mls/connection-dashboard";
import { emptyRealtorProfile, type MlsConnection } from "@/domain/realtor";

export default function SettingsPage() {
  const { role, setRole, realtorProfile, mlsConnections, upsertConnection } = useUserState();
  const [showWizard, setShowWizard] = React.useState(false);

  const profile = realtorProfile ?? emptyRealtorProfile();

  function onDone(c: MlsConnection) {
    upsertConnection(c);
    setShowWizard(false);
  }
  function onDisconnect(c: MlsConnection) {
    upsertConnection({
      ...c,
      state: "disconnected",
      approvalStatus: "Disconnected — synchronization stopped",
      sync: { ...c.sync, cadenceLabel: "—", stale: false, lastError: null },
    });
  }

  return (
    <Container className="py-8">
      <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
      <p className="mt-1 text-ink-2">Your realtor profile and MLS data connections.</p>

      {/* Demo role switch (no auth in the demo) */}
      <Card className="mt-5">
        <CardBody>
          <Eyebrow>Mode</Eyebrow>
          <p className="mt-1 text-sm text-ink-2">
            This demo has no sign-in, so you can switch roles to preview each experience. In production this
            comes from your account.
          </p>
          <div className="mt-3 flex gap-2">
            {(["buyer", "realtor"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium capitalize ${
                  role === r ? "border-forest bg-sage-soft text-forest" : "border-line bg-surface text-ink-2 hover:bg-surface-2"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 space-y-6">
        <RealtorProfileForm />

        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">MLS connections</h2>
            {!showWizard ? (
              <Button variant="primary" size="sm" onClick={() => setShowWizard(true)}>
                <Plus size={14} /> Connect your MLS
              </Button>
            ) : null}
          </div>

          {showWizard ? (
            <div className="mt-4">
              <ConnectMlsWizard profile={profile} onDone={onDone} onCancel={() => setShowWizard(false)} />
            </div>
          ) : (
            <div className="mt-4">
              <ConnectionDashboard
                connections={mlsConnections}
                onReconnect={() => setShowWizard(true)}
                onDisconnect={onDisconnect}
              />
            </div>
          )}
        </div>

        <Card>
          <CardBody>
            <Eyebrow>Activating a live feed</Eyebrow>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
              <li>Apply to your MLS (e.g., Doorify MLS) for third-party data access and confirm their current data provider.</li>
              <li>E-sign the provider data license agreement (Trestle/CoreLogic for Doorify, pending confirmation).</li>
              <li>Receive your approved application&apos;s OAuth client ID &amp; secret.</li>
              <li>Enter them in the Connect flow (stored encrypted server-side) and run Test connection.</li>
            </ol>
            <p className="mt-2 text-xs text-muted">
              Until a real grant exists, connections stay pending and the hot sheet shows only clearly-labeled
              demo inventory — never a simulated live feed.
            </p>
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
