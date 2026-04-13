import { type ReactNode, useEffect } from "react";
import { createContext, useContext } from "react";
import { CloseButton } from "./close-button";
import { cn } from "@/lib/cn";

// Lightweight modal dialog — keeps the same Chakra DialogRoot/DialogContent/etc. API

interface DialogRootProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  children: ReactNode;
}

const DialogContext = createContext<{ open: boolean; onOpenChange: (d: { open: boolean }) => void }>({
  open: false,
  onOpenChange: () => { },
});

export function DialogRoot({ open, onOpenChange, children }: DialogRootProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <DialogContext value={{ open, onOpenChange }}>
      {children}
    </DialogContext>
  );
}

export function DialogContent({ children, maxW = "md", className }: { children: ReactNode; maxW?: string; className?: string }) {
  const { open, onOpenChange } = useContext(DialogContext);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange({ open: false });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={() => onOpenChange({ open: false })}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-in",
          "bg-[var(--bg-surface)]",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 pt-6 pb-4", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-semibold text-[var(--fg-heading)]", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-sm text-[var(--fg-muted)]", className)}>{children}</p>;
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 pb-4", className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)]", className)}>
      {children}
    </div>
  );
}

export function DialogCloseTrigger({ className }: { className?: string }) {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <div className={cn("absolute top-3 right-3", className)}>
      <CloseButton size="sm" onClick={() => onOpenChange({ open: false })} />
    </div>
  );
}

export const DialogTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DialogBackdrop = () => null;
export const DialogActionTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
