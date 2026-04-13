import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface CheckboxProps {
  checked: boolean | "indeterminate";
  onCheckedChange: (details: { checked: boolean | "indeterminate" }) => void;
  colorPalette?: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, children, className, disabled }: CheckboxProps) {
  const isIndeterminate = checked === "indeterminate";
  const isChecked = checked === true;

  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer select-none", disabled && "opacity-50 cursor-not-allowed", className)}>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={isChecked || isIndeterminate}
          ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
          onChange={(e) => onCheckedChange({ checked: e.target.checked })}
          disabled={disabled}
          className="sr-only"
        />
        <span
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
            (isChecked || isIndeterminate)
              ? "bg-[var(--color-oxygen-500)] border-[var(--color-oxygen-500)]"
              : "bg-[var(--input-bg)] border-[var(--input-border)]"
          )}
        >
          {isIndeterminate && (
            <span className="w-2 h-0.5 bg-white rounded-full block" />
          )}
          {isChecked && !isIndeterminate && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </span>
      {children}
    </label>
  );
}
