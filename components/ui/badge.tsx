import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-primary/10 text-primary border border-primary/30",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
  destructive: "bg-destructive/10 text-destructive border border-destructive/30",
};

type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
