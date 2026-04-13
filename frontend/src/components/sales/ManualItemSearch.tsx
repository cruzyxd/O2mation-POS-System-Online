import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Search, Loader2 } from "lucide-react";
import { fetchInventoryItems } from "../../services/inventory.service";
import type { InventoryItem } from "../../types/inventory.types";
import { queryKeys } from "../../lib/queryKeys";

// Custom hook for debouncing input queries
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

interface ManualItemSearchProps {
    onSelect: (item: InventoryItem) => void;
}

export function ManualItemSearch({ onSelect }: ManualItemSearchProps) {
    const { t } = useTranslation("sales");
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const containerRef = useRef<HTMLDivElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const { data, isFetching } = useQuery({
        queryKey: queryKeys.inventory.search(debouncedQuery, 50),
        queryFn: () => fetchInventoryItems({ q: debouncedQuery, pageSize: 50 }),
        enabled: debouncedQuery.length > 0,
        staleTime: 5000,
    });

    const items = data?.items ?? [];

    // Manage clicks outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset list highlighting when matching entries change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [debouncedQuery, items.length]);

    const handleSelect = (item: InventoryItem) => {
        onSelect(item);
        setQuery("");
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Only prevent scan buffer from catching Enter if we are actively using the combobox
        e.stopPropagation();

        if (!isOpen || items.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && highlightedIndex >= 0) {
            e.preventDefault();
            handleSelect(items[highlightedIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative w-64" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] z-10" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("checkout.scan.manualSearch", "Search items...")}
                    className="w-full text-[13px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[10px] pl-[34px] pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-500)] focus:border-[var(--color-oxygen-500)] transition-all shadow-sm placeholder:text-[var(--fg-subtle)] font-medium text-[var(--fg-default)]"
                />
                {isFetching && query.length > 0 && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-oxygen-500)] animate-spin" />
                )}
            </div>

            {isOpen && query.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-[var(--bg-surface)] rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-[var(--border-default)] overflow-y-auto max-h-[400px] py-1">
                    {items.length === 0 && !isFetching ? (
                        <div className="px-4 py-3 text-[13px] text-[var(--fg-muted)] text-center">
                            {t("checkout.scan.noResults", "No matching items found")}
                        </div>
                    ) : items.map((item, index) => {
                        const isHighlighted = index === highlightedIndex;
                        const price = typeof item.sellingPrice !== 'undefined' ? item.sellingPrice : item.price;
                        return (
                            <button
                                key={item.id}
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${isHighlighted ? "bg-[var(--table-row-selected)]" : "hover:bg-[var(--table-row-hover)]"
                                    }`}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <div className="flex flex-col overflow-hidden pr-3">
                                    <span className={`text-[13px] truncate font-bold ${isHighlighted ? "text-[var(--color-oxygen-700)] dark:text-[var(--color-oxygen-400)]" : "text-[var(--fg-heading)]"}`}>
                                        {item.name}
                                    </span>
                                    {item.sku && (
                                        <span className={`text-[11px] font-mono mt-0.5 ${isHighlighted ? "text-[var(--color-oxygen-600)] dark:text-[var(--color-oxygen-500)]" : "text-[var(--fg-subtle)]"}`}>
                                            {item.sku}
                                        </span>
                                    )}
                                </div>
                                <span className={`font-mono text-[13px] whitespace-nowrap font-bold ${isHighlighted ? "text-[var(--color-oxygen-700)] dark:text-[var(--color-oxygen-400)]" : "text-[var(--fg-muted)]"}`}>
                                    ${Number(price ?? 0).toFixed(2)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
