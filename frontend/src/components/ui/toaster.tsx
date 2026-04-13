import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

// Lightweight toast system — replaces Chakra's toaster
// Same API: toaster.create({ title, description, type })

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  create: (opts: { title: string; description?: string; type: ToastType }) => void;
  dismiss: (id: string) => void;
}

let globalDispatch: ((action: { type: "add"; toast: Toast } | { type: "remove"; id: string }) => void) | null = null;

// Singleton toaster object — used as toaster.create(...)
export const toaster: Pick<ToastStore, "create" | "dismiss"> = {
  create({ title, description, type }) {
    const id = crypto.randomUUID();
    globalDispatch?.({ type: "add", toast: { id, title, description, type } });
    // Auto-dismiss after 4s
    setTimeout(() => globalDispatch?.({ type: "remove", id }), 4000);
  },
  dismiss(id) {
    globalDispatch?.({ type: "remove", id });
  },
};

const typeIcon: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-[var(--color-oxygen-700)] dark:text-[var(--color-oxygen-500)]" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  warning: <AlertCircle size={16} className="text-amber-500" />,
  info: <Info size={16} className="text-blue-500" />,
  loading: <span className="w-4 h-4 rounded-full border-2 border-[var(--color-oxygen-500)] border-t-transparent animate-spin" />,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 rounded-xl shadow-xl px-4 py-3 animate-toast-in",
        "bg-[var(--bg-surface)] border border-[var(--border-default)]"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{typeIcon[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--fg-default)] truncate">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-[var(--fg-muted)] mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-[var(--fg-subtle)] hover:text-[var(--fg-default)] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  globalDispatch = useCallback((action: { type: "add"; toast: Toast } | { type: "remove"; id: string }) => {
    if (action.type === "add") {
      setToasts((prev) => [...prev, action.toast]);
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== action.id));
    }
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => globalDispatch?.({ type: "remove", id: toast.id })}
        />
      ))}
    </div>,
    document.body
  );
}
