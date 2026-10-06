import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Button system. Primary = deep forest. Gold is never a primary CTA.
 * Destructive reserved for truly destructive actions.
 */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-forest text-white hover:bg-forest-700",
        secondary: "border border-line bg-surface text-ink hover:bg-sage-soft",
        ghost: "text-forest hover:bg-sage-soft",
        gold: "bg-gold text-white hover:opacity-90",
        destructive: "bg-concern text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4 text-[0.82rem]",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[0.95rem]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & VariantProps<typeof button>;

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(button({ variant, size }), className)} {...props} />;
}

export { button };
