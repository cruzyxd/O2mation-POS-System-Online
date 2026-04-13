import { cn } from "@/lib/cn";

type StatusValue = "success" | "warning" | "error" | "info";

interface StatusProps {
  value: StatusValue;
  size?: "sm" | "md";
  children?: React.ReactNode;
  className?: string;
  display?: string;
}

const dotColor: Record<StatusValue, string> = {
  success: "bg-[var(--color-oxygen-500)]",
  warning: "bg-amber-400",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export function Status({ value, size = "md", children, className }: StatusProps) {
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("rounded-full flex-shrink-0", dotSize, dotColor[value])} />
      {children}
    </span>
  );
}
