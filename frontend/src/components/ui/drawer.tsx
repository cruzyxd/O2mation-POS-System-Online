import { type ReactNode, useEffect, useRef } from "react";
import { CloseButton } from "./close-button";
import { cn } from "@/lib/cn";

// Keeps the same API as the Chakra drawer snippets.
// DrawerRoot controls open/close via CSS transitions — zero JS state machines.

interface DrawerRootProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  placement?: unknown; // ignored — always end (right)
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: ReactNode;
}

const sizeWidth: Record<string, string> = {
  sm: "w-80",
  md: "w-[420px]",
  lg: "w-[560px]",
  xl: "w-[720px]",
  full: "w-full",
};

export function DrawerRoot({ open, onOpenChange, size = "md", children }: DrawerRootProps) {
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <DrawerContext value={{ open, onOpenChange, size }}>
      {children}
    </DrawerContext>
  );
}

import { createContext, useContext } from "react";

const DrawerContext = createContext<{
  open: boolean;
  onOpenChange: (d: { open: boolean }) => void;
  size: string;
}>({ open: false, onOpenChange: () => { }, size: "md" });

interface DrawerContentProps {
  children: ReactNode;
  bg?: string;
  className?: string;
}

export function DrawerContent({ children, className }: DrawerContentProps) {
  const { open, onOpenChange, size } = useContext(DrawerContext);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange({ open: false });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={() => onOpenChange({ open: false })}
      />
      {/* Panel */}
      <div
        ref={contentRef}
        className={cn(
          "relative flex flex-col h-full shadow-2xl animate-slide-in-right",
          "bg-[var(--bg-surface)]",
          sizeWidth[size] ?? sizeWidth.md,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 px-6 py-5 border-b border-[var(--border-default)]", className)}>
      {children}
    </div>
  );
}

export function DrawerTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-lg font-semibold text-[var(--fg-heading)]", className)}>
      {children}
    </h2>
  );
}

export function DrawerBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-6", className)}>
      {children}
    </div>
  );
}

export function DrawerFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)]", className)}>
      {children}
    </div>
  );
}

export function DrawerCloseTrigger({ className }: { className?: string }) {
  const { onOpenChange } = useContext(DrawerContext);
  return (
    <div className={cn("absolute top-3 right-3", className)}>
      <CloseButton size="sm" onClick={() => onOpenChange({ open: false })} />
    </div>
  );
}

// Stubs for unused exports to keep API compatibility
export const DrawerTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DrawerBackdrop = () => null;
export const DrawerDescription = ({ children }: { children: ReactNode }) => <p className="text-sm text-[var(--fg-muted)]">{children}</p>;
export const DrawerActionTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
