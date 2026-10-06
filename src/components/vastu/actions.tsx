"use client";

import { Bookmark, BookmarkCheck, GitCompare } from "lucide-react";
import { useUserState, COMPARE_LIMIT } from "@/components/providers/user-state";
import { cn } from "@/lib/cn";

export function SaveButton({ propertyId, className }: { propertyId: string; className?: string }) {
  const { isSaved, toggleSaved } = useUserState();
  const saved = isSaved(propertyId);
  return (
    <button
      type="button"
      onClick={() => toggleSaved(propertyId)}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
        saved
          ? "border-forest bg-sage-soft text-forest"
          : "border-line bg-surface text-ink-2 hover:bg-surface-2",
        className,
      )}
    >
      {saved ? <BookmarkCheck size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function CompareButton({ propertyId, className }: { propertyId: string; className?: string }) {
  const { inCompare, toggleCompare, compare } = useUserState();
  const on = inCompare(propertyId);
  const full = !on && compare.length >= COMPARE_LIMIT;
  return (
    <button
      type="button"
      onClick={() => toggleCompare(propertyId)}
      aria-pressed={on}
      disabled={full}
      title={full ? `Compare up to ${COMPARE_LIMIT} homes` : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        on
          ? "border-forest bg-sage-soft text-forest"
          : "border-line bg-surface text-ink-2 hover:bg-surface-2",
        className,
      )}
    >
      <GitCompare size={15} aria-hidden />
      {on ? "In compare" : "Compare"}
    </button>
  );
}
