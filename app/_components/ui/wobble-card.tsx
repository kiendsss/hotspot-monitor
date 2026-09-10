"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const WobbleCard = ({
  children,
  containerClassName,
  className,
}: {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
}) => {
  return (
    <section
      className={cn(
        "mx-auto w-full relative rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--paper)] shadow-[2px_2px_0_rgba(42,37,29,0.12)]",
        containerClassName
      )}
    >
      <div className="relative h-full rounded-2xl">
        <div className={cn("h-full px-7 py-6 sm:px-8 sm:py-7", className)}>{children}</div>
      </div>
    </section>
  );
};
