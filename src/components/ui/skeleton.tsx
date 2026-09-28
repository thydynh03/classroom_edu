import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-control bg-surface-2 animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
