"use client";

import { Heart, ThumbsUp, ThumbsDown, Ban } from "lucide-react";
import { useUserState, type Feedback } from "@/components/providers/user-state";
import { cn } from "@/lib/cn";

const OPTIONS: { key: Feedback; label: string; Icon: typeof Heart; tone: string }[] = [
  { key: "love", label: "Love", Icon: Heart, tone: "data-[on=true]:border-forest data-[on=true]:bg-sage-soft data-[on=true]:text-forest" },
  { key: "consider", label: "Consider", Icon: ThumbsUp, tone: "data-[on=true]:border-info data-[on=true]:bg-info-soft data-[on=true]:text-info" },
  { key: "pass", label: "Pass", Icon: ThumbsDown, tone: "data-[on=true]:border-caution data-[on=true]:bg-caution-soft data-[on=true]:text-caution" },
  { key: "dealbreaker", label: "Dealbreaker", Icon: Ban, tone: "data-[on=true]:border-concern data-[on=true]:bg-concern-soft data-[on=true]:text-concern" },
];

/**
 * Love / Consider / Pass / Dealbreaker. The app learns from these to tune what
 * it surfaces. Toggling the active one off clears the feedback.
 */
export function FeedbackButtons({ propertyId, size = "md" }: { propertyId: string; size?: "sm" | "md" }) {
  const { feedback, setFeedback, clearFeedback } = useUserState();
  const current = feedback[propertyId];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Your feedback on this home">
      {OPTIONS.map(({ key, label, Icon, tone }) => {
        const on = current === key;
        return (
          <button
            key={key}
            type="button"
            data-on={on}
            onClick={() => (on ? clearFeedback(propertyId) : setFeedback(propertyId, key))}
            aria-pressed={on}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface font-medium text-ink-2 transition-colors hover:bg-surface-2",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              tone,
            )}
          >
            <Icon size={size === "sm" ? 13 : 15} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
