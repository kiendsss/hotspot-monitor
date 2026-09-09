"use client";

import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-7 gap-y-8 md:grid-cols-2 lg:grid-cols-3 md:auto-rows-[minmax(10rem,auto)]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "bento-card group/bento row-span-1 flex flex-col justify-between gap-3 p-5",
        className,
      )}
    >
      {children}
    </div>
  );
};
