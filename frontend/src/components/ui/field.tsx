import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label?: ReactNode;
  helperText?: string;
  errorText?: string;
  invalid?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, helperText, errorText, invalid, required, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-[var(--fg-default)]">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {helperText && !invalid && (
        <p className="text-xs text-[var(--fg-muted)]">{helperText}</p>
      )}
      {invalid && errorText && (
        <p className="text-xs text-red-500">{errorText}</p>
      )}
    </div>
  );
}
