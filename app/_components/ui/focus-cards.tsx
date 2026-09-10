"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export function FocusCards({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const items = React.Children.toArray(children);

  return (
    <div className={cn("grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((child, i) => (
        <div
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-6 shadow-[3px_3px_0_rgba(42,37,29,0.16)] transition-all duration-300",
            hovered !== null && hovered !== i
              ? "blur-[0.8px] opacity-70 scale-[0.98]"
              : "blur-0 opacity-100 scale-100",
            hovered === i ? "shadow-[4px_4px_0_rgba(42,37,29,0.26)] -translate-y-0.5" : ""
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export function FocusCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex h-full flex-col gap-3", className)}>{children}</div>;
}
