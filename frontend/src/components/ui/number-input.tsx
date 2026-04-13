import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

// Keeps NumberInputRoot + NumberInputField API
interface NumberInputRootProps {
  value: string;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (details: { value: string }) => void;
  children: React.ReactNode;
  className?: string;
}

import { createContext, useContext } from "react";

const NumberInputContext = createContext<{
  value: string;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (details: { value: string }) => void;
}>({ value: "", onValueChange: () => { } });

export function NumberInputRoot({ value, min, max, step, onValueChange, children }: NumberInputRootProps) {
  return (
    <NumberInputContext value={{ value, min, max, step, onValueChange }}>
      {children}
    </NumberInputContext>
  );
}

interface NumberInputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max" | "step"> {
  bg?: string;
  borderColor?: string;
}

export function NumberInputField({ className, ...props }: NumberInputFieldProps) {
  const { value, min, max, step, onValueChange } = useContext(NumberInputContext);
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onValueChange({ value: e.target.value })}
      className={cn(
        "w-full rounded-lg border py-2 px-3 text-sm transition-colors",
        "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--fg-default)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)]",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  );
}
