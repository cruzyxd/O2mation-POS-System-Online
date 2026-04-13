import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputGroupProps {
  children: ReactNode;
  startElement?: ReactNode;
  endElement?: ReactNode;
  w?: string;
  className?: string;
}

export function InputGroup({ children, startElement, endElement, className }: InputGroupProps) {
  return (
    <div className={cn("relative flex w-full items-center", className)}>
      {startElement && (
        <div className="pointer-events-none absolute left-3 flex items-center text-[var(--fg-subtle)]">
          {startElement}
        </div>
      )}
      <div className={cn("w-full", startElement && "[&>input]:pl-9", endElement && "[&>input]:pr-9")}>
        {children}
      </div>
      {endElement && (
        <div className="absolute right-3 flex items-center">
          {endElement}
        </div>
      )}
    </div>
  );
}
