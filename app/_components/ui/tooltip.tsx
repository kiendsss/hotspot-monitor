"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children, delayDuration: _delay }: { children: React.ReactNode; delayDuration?: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <>{children}</>;
}

export function TooltipContent({
  children,
  className,
  sideOffset = 6,
}: {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}) {
  const ctx = React.useContext(TooltipContext);
  if (!ctx?.open) return null;
  return (
    <span
      role="tooltip"
      style={{ bottom: `calc(100% + ${sideOffset}px)` }}
      className={cn(
        "absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--line)] bg-[var(--ink)] px-3 py-1.5 text-xs tracking-wide text-[var(--paper)] shadow-lg",
        "pointer-events-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
