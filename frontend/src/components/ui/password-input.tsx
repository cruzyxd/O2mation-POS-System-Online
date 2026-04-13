import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  bg?: string;
  borderColor?: string;
}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full">
      <input
        type={show ? "text" : "password"}
        className={cn(
          "w-full rounded-lg border py-2 pl-3 pr-10 text-sm transition-colors",
          "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--fg-default)]",
          "placeholder:text-[var(--fg-subtle)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)]",
          className
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg-default)] transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
