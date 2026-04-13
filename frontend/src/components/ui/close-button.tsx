import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
}

export function CloseButton({ size = "md", className, ...props }: CloseButtonProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };
  return (
    <button
      type="button"
      aria-label="Close"
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        "text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-subtle)]",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <X size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
    </button>
  );
}
