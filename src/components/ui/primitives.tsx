import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** Layout container. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("container-page", className)} {...props} />;
}

/** Card surface — border + subtle elevation, not heavy shadow. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-surface shadow-sm", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.16em] text-jade",
        className,
      )}
      {...props}
    />
  );
}

const badge = cva(
  "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-ink-2",
        forest: "border-sage bg-sage-soft text-forest",
        sage: "border-sage bg-sage text-forest",
        gold: "border-[color:var(--color-gold)] bg-gold-soft text-gold",
        strong: "border-[color:var(--color-strong-soft)] bg-strong-soft text-strong",
        good: "border-[color:var(--color-good-soft)] bg-good-soft text-good",
        caution: "border-[color:var(--color-caution-soft)] bg-caution-soft text-caution",
        concern: "border-[color:var(--color-concern-soft)] bg-concern-soft text-concern",
        info: "border-[color:var(--color-info-soft)] bg-info-soft text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>;

/** Status pill — always paired with a text label (meaning never by color alone). */
export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

export { badge };
