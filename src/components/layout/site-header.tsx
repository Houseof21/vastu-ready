"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompare, Bookmark } from "lucide-react";
import { brand } from "@/config/brand";
import { useUserState } from "@/components/providers/user-state";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/feed", label: "Discover" },
  { href: "/analyze", label: "Analyze a listing" },
  { href: "/saved", label: "Saved" },
  { href: "/searches", label: "Searches" },
  { href: "/preferences", label: "Preferences" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { saved, compare } = useUserState();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-forest text-sm font-bold text-white">V</span>
          <span className="font-display text-lg font-semibold text-ink">{brand.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-pill px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-sage-soft text-forest" : "text-ink-2 hover:bg-surface-2",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/compare"
            className="relative inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
            aria-label={`Compare (${compare.length})`}
          >
            <GitCompare size={15} aria-hidden />
            <span className="hidden sm:inline">Compare</span>
            {compare.length > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[0.65rem] font-bold text-white">
                {compare.length}
              </span>
            ) : null}
          </Link>
          <Link
            href="/saved"
            className="relative inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 sm:hidden"
            aria-label={`Saved (${saved.length})`}
          >
            <Bookmark size={15} aria-hidden />
            {saved.length > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[0.65rem] font-bold text-white">
                {saved.length}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-line-2 px-3 py-2 md:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-sage-soft text-forest" : "text-ink-2",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
