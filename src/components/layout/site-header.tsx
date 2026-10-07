"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompare, Settings } from "lucide-react";
import { brand } from "@/config/brand";
import { useUserState } from "@/components/providers/user-state";
import { cn } from "@/lib/cn";

const BUYER_NAV = [
  { href: "/feed", label: "Discover" },
  { href: "/analyze", label: "Analyze a listing" },
  { href: "/saved", label: "Saved" },
  { href: "/searches", label: "Searches" },
  { href: "/preferences", label: "Preferences" },
];

const REALTOR_NAV = [
  { href: "/clients", label: "Clients" },
  { href: "/hot-sheet", label: "Hot Sheet" },
  { href: "/tours", label: "Tours" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { compare, role } = useUserState();
  const isRealtor = role === "realtor";
  const nav = isRealtor ? REALTOR_NAV : BUYER_NAV;
  const home = isRealtor ? "/clients" : "/feed";

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return cn(
      "rounded-pill px-3.5 py-2 text-sm font-medium transition-colors",
      active ? "bg-sage-soft text-forest" : "text-ink-2 hover:bg-surface-2",
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href={home} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-forest text-sm font-bold text-white">V</span>
          <span className="font-display text-lg font-semibold text-ink">{brand.name}</span>
          {isRealtor ? (
            <span className="rounded-pill border border-line px-2 py-0.5 text-[0.65rem] font-medium text-muted">Realtor</span>
          ) : null}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!isRealtor ? (
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
          ) : null}
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
            aria-label="Settings"
          >
            <Settings size={15} aria-hidden />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-line-2 px-3 py-2 md:hidden">
        {nav.map((item) => {
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
