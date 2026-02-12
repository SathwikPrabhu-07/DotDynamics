import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-energy",
        secondary: "btn-lavender",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "btn-outline-gold",
        "outline-lavender": "btn-outline-lavender",
        ghost: "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-[8px] px-4 text-xs",
        lg: "h-12 rounded-[12px] px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/** Variants that get the click-position burst/ripple effect */
const BURST_VARIANTS = new Set(["default", "secondary", undefined]);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const hasBurst = BURST_VARIANTS.has(variant as string | undefined);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hasBurst) {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        btn.style.setProperty("--ripple-x", `${x}%`);
        btn.style.setProperty("--ripple-y", `${y}%`);
        btn.classList.remove("burst");
        void btn.offsetWidth; // force reflow
        btn.classList.add("burst");
        setTimeout(() => btn.classList.remove("burst"), 400);
      }
      props.onClick?.(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        onClick={handleClick}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
