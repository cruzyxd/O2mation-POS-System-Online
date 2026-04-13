import { cn } from "@/lib/cn";
import { useState, useRef, useEffect, createContext, useContext, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// select.tsx — Custom styled select component that fulfills premium design requirements
// Rounded corners, green hover states, and custom chevron icon.

export interface SelectItem {
  value: string;
  label: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface ListCollection {
  items: SelectItem[];
}

interface SelectRootProps {
  collection: ListCollection;
  value: string[];
  onValueChange: (details: { value: string[] }) => void;
  disabled?: boolean;
  children: ReactNode;
}

interface SelectTriggerProps {
  children?: ReactNode;
  className?: string;
  placeholder?: string;
}

interface SelectContextValue {
  collection: ListCollection;
  value: string[];
  onValueChange: (details: { value: string[] }) => void;
  disabled: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | undefined>(undefined);

export function SelectRoot({ collection, value, onValueChange, disabled = false, children }: SelectRootProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ collection, value, onValueChange, disabled, open, setOpen }}>
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, placeholder = "Select option..." }: SelectTriggerProps) {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within SelectRoot");

  const { collection, value, onValueChange, disabled, open, setOpen } = context;
  const selectedItem = collection.items.find((item) => item.value === value[0]);

  const handleSelect = (itemValue: string) => {
    if (disabled) return;
    onValueChange({ value: [itemValue] });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-2 transition-all duration-200",
          "h-10 px-4 py-2 text-sm text-left font-medium",
          "rounded-xl border shadow-sm outline-none",
          "bg-[var(--input-bg)] text-[var(--fg-default)]",
          disabled && "cursor-not-allowed opacity-60",
          open
            ? "border-[var(--color-oxygen-500)] ring-2 ring-[var(--color-oxygen-400)]/20"
            : "border-[var(--input-border)] hover:border-[var(--color-oxygen-400)]",
          className
        )}
      >
        <span className={cn("truncate", !selectedItem && "text-[var(--fg-subtle)]")}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-[var(--fg-muted)] transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-0 right-0 z-50 mt-2 min-w-[8rem] overflow-hidden",
          "rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]",
          "shadow-xl animate-dropdown-in"
        )}>
          <ul className="max-h-[15rem] overflow-y-auto p-1.5">
            {collection.items.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[var(--fg-muted)] text-center italic">
                No options available
              </li>
            ) : (
              collection.items.map((item) => {
                const isSelected = item.value === value[0];
                return (
                  <li
                    key={item.value}
                    onClick={() => !item.disabled && handleSelect(item.value)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-[var(--color-oxygen-50)] text-[var(--color-oxygen-700)] font-bold"
                        : item.disabled
                          ? "text-[var(--fg-subtle)] opacity-50 cursor-not-allowed"
                          : "text-[var(--fg-default)] hover:bg-[var(--color-oxygen-50)] hover:text-[var(--color-oxygen-700)]"
                    )}
                  >
                    {item.label}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </>
  );
}

// Keeping these as no-ops to maintain compatibility with existing patterns if they are ever used
export function SelectValueText(_props: { placeholder?: string }) { return null; }
export function SelectContent(_props: { children: ReactNode }) { return null; }
export function SelectItem(_props: { item: SelectItem; children: ReactNode }) { return null; }

