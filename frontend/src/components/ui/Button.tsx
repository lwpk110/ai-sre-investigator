import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "icon";
type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost:
    "bg-white/[0.04] text-text-secondary border border-border-standard hover:bg-white/[0.08] hover:text-text-primary",
  icon: "bg-transparent text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-small gap-1.5",
  sm: "px-3 py-1.5 text-caption gap-1",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className, children, ...props }, ref) => {
    const isIcon = variant === "icon";

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-sm font-medium cursor-pointer border-none transition-colors",
          variantClasses[variant],
          isIcon ? "w-8 h-8" : sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
