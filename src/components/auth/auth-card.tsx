"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Demo auth form. Real authentication is wired to Supabase in production
 * (email magic link / OAuth). Here it validates shape and continues to the
 * experience without creating a real account.
 */
export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const signUp = mode === "sign-up";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setNote("Enter a valid email address.");
      return;
    }
    router.push(signUp ? "/onboarding" : "/feed");
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {signUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-ink-2">
        {signUp
          ? "Set up a profile so every home is scored for you."
          : "Sign in to pick up where you left off."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline-none"
          />
        </label>
        {note ? <p className="text-sm text-concern">{note}</p> : null}
        <Button type="submit" size="md" className="w-full">
          {signUp ? "Continue" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 rounded-md border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        Demo mode — no real account is created and no password is collected. Authentication connects to
        Supabase in production.
      </div>

      <p className="mt-6 text-center text-sm text-ink-2">
        {signUp ? "Already have an account?" : "New here?"}{" "}
        <Link href={signUp ? "/sign-in" : "/sign-up"} className="font-medium text-forest hover:underline">
          {signUp ? "Sign in" : "Create one"}
        </Link>
      </p>

      <div className="mt-4 text-center">
        <ButtonLink href="/feed" variant="ghost" size="sm">
          Skip — just explore the demo
        </ButtonLink>
      </div>
    </div>
  );
}
