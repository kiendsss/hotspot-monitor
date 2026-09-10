"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function FocusCards({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const items = React.Children.toArray(children);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch",
        className,
      )}
    >
      {items.map((child, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-7 py-6 sm:px-8 sm:py-7 shadow-[2px_2px_0_rgba(42,37,29,0.12)] min-h-[150px] h-full overflow-hidden",
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
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-3.5 self-stretch",
        className,
      )}
    >
      {children}
    </div>
  );
}
