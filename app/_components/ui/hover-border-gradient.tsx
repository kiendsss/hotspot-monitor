"use client";

import { cn } from "@/lib/utils";

type HoverBorderGradientProps = {
  children?: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: string;
  duration?: number;
  clockwise?: boolean;
} & Record<string, unknown>;

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as,
  duration: _duration,
  clockwise: _clockwise,
  ...props
}: HoverBorderGradientProps) {
  const Tag = (as ?? "button") as React.ElementType;

  return (
    <Tag
      className={cn(
        "relative inline-flex h-auto items-center justify-center overflow-hidden rounded-full p-[1.5px] focus:outline-none",
        containerClassName,
      )}
      {...props}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--red)_0%,var(--paper)_50%,var(--red)_100%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <span
        className={cn(
          "relative inline-flex h-full w-full items-center justify-center rounded-full bg-[var(--red)] px-6 py-2.5 text-sm font-medium tracking-widest text-[var(--paper)] backdrop-blur-3xl",
          className,
        )}
      >
        {children}
      </span>
    </Tag>
  );
}
