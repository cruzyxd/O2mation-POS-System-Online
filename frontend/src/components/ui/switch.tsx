import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (details: { checked: boolean }) => void;
  colorPalette?: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, children, className, disabled }: SwitchProps) {
  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", disabled && "opacity-50 cursor-not-allowed", className)}>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange({ checked: e.target.checked })}
          disabled={disabled}
          className="sr-only"
        />
        <span
          className={cn(
            "w-10 h-6 rounded-full transition-colors duration-200",
            checked ? "bg-[var(--color-oxygen-500)]" : "bg-[var(--border-default)]"
          )}
        />
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </span>
      {children}
    </label>
  );
}
