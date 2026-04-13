import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { computeLineSubtotal, roundMoney } from "@/lib/money";
import type { CheckoutCartItem } from "../../types/sales.types";

interface CartTableProps {
    items: CheckoutCartItem[];
    selectedItemId: string | null;
    onSelectItem: (id: string) => void;
    onUpdateQuantity: (inventoryItemId: string, delta: number) => void;
    onRemoveItem: (inventoryItemId: string) => void;
}

export function CartTable({ items, selectedItemId, onSelectItem, onUpdateQuantity, onRemoveItem }: CartTableProps) {
    const { t } = useTranslation("sales");

    if (items.length === 0) {
        return (
            <div className="px-6 py-12 text-center text-slate-500">
                {t("checkout.table.empty")}
            </div>
        );
    }

    return (
        <div className="divide-y divide-[var(--border-default)]">
            {items.map((item) => (
                <div
                    key={item.inventoryItemId}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectItem(item.inventoryItemId)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            onSelectItem(item.inventoryItemId);
                        }
                    }}
                    className={cn(
                        "grid grid-cols-12 gap-3 px-6 py-1.5 items-center transition-colors",
                        selectedItemId === item.inventoryItemId
                            ? "bg-[var(--table-row-selected)] ring-1 ring-inset ring-[var(--color-oxygen-400)] dark:ring-[var(--color-oxygen-700)]"
                            : "bg-[var(--bg-surface)] group hover:bg-[var(--table-row-hover)]"
                    )}
                >
                    {/* Item Name */}
                    <div className="col-span-5">
                        <p className="text-[15px] font-semibold text-[var(--fg-heading)]">{item.name}</p>
                        <p className="text-[13px] text-[var(--fg-subtle)] mt-0.5">
                            {item.sku}
                        </p>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 text-center">
                        <span className="text-[15px] font-medium text-[var(--fg-default)]">
                            ${roundMoney(item.unitPrice).toFixed(2)}
                        </span>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex justify-center">
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-[var(--bg-subtle)] rounded-lg">
                            <button
                                onClick={() => onUpdateQuantity(item.inventoryItemId, -1)}
                                className="text-[var(--fg-subtle)] hover:text-[var(--fg-default)] focus:outline-none disabled:opacity-50"
                                disabled={item.quantity <= 1}
                            >
                                <span className="text-lg leading-none font-medium">−</span>
                            </button>
                            <span className="text-[15px] font-bold text-[var(--fg-heading)] w-4 text-center">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => onUpdateQuantity(item.inventoryItemId, 1)}
                                className="text-[var(--fg-subtle)] hover:text-[var(--fg-default)] focus:outline-none"
                            >
                                <span className="text-lg leading-none font-medium">+</span>
                            </button>
                        </div>
                    </div>

                    {/* Subtotal */}
                    <div className="col-span-2 text-right">
                        <span className="text-[15px] font-bold text-[var(--fg-heading)]">
                            ${computeLineSubtotal(item.unitPrice, item.quantity).toFixed(2)}
                        </span>
                    </div>

                    {/* Action */}
                    <div className="col-span-1 flex justify-center">
                        <button
                            onClick={() => onRemoveItem(item.inventoryItemId)}
                            className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                            title={t("checkout.table.action")}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
