import { memo } from "react";
import { Package, MoreVertical, Archive, Edit2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { Category } from "@/types/inventory.types";
import { CATEGORY_COLORS } from "./ColorPicker";
import { CATEGORY_ICONS } from "./IconPicker";

// Dropdown/Popover for the actions menu (simplified CSS version using group-hover)
function ActionsMenu({
    onEdit,
    onArchive,
    t,
}: {
    onEdit: () => void;
    onArchive: () => void;
    t: (key: string) => string;
}) {
    return (
        <div className="relative group/menu inline-block z-10">
            <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-transparent text-black hover:bg-black/5 transition-colors"
            >
                <MoreVertical size={18} />
            </button>

            {/* Dropdown menu */}
            <div className="absolute end-0 top-full mt-1 w-36 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 origin-top-right">
                <div className="p-1 flex flex-col">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors text-start"
                    >
                        <Edit2 size={14} className="text-[var(--fg-muted)] dark:text-gray-400" />
                        {t("categories.card.edit")}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-start"
                    >
                        <Archive size={14} className="text-red-500" />
                        {t("categories.card.archive")}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface CategoryCardProps {
    category: Category;
    subcategories: Category[];
    canMutate: boolean;
    onClick: (category: Category) => void;
    onEdit: (category: Category) => void;
    onArchive: (category: Category) => void;
}

const MAX_PILLS = 3;

export const CategoryCard = memo(function CategoryCard({
    category,
    subcategories,
    canMutate,
    onClick,
    onEdit,
    onArchive,
}: CategoryCardProps) {
    const { t } = useTranslation("inventory");
    const colorKey = category.color ?? "slate";
    const colorCfg = CATEGORY_COLORS[colorKey] ?? CATEGORY_COLORS["slate"];
    const IconComponent = category.icon ? (CATEGORY_ICONS[category.icon] ?? Package) : Package;

    const visibleSubs = subcategories.slice(0, MAX_PILLS);
    const extraCount = Math.max(0, subcategories.length - MAX_PILLS);
    const totalItems = category.totalItems ?? category.productCount;
    const subCount = category.subcategoryCount ?? 0;

    // We determine if this card is spanning 2 columns by inspecting its parent layout if needed.
    // Since we don't have direct access here, we can rely on standard CSS container queries or just make the design responsive.
    // The right blob will be a generic shape that looks good on both, but expands automatically based on container width.

    return (
        <div
            className={cn(
                "group relative bg-[var(--bg-surface)] rounded-[1.5rem] border border-[var(--border-default)] shadow-sm",
                "hover:shadow-md hover:border-[var(--border-muted)] transition-all duration-300 cursor-pointer overflow-hidden p-6 h-[220px] flex flex-col justify-between"
            )}
            onClick={() => onClick(category)}
        >
            {/* Background Top-Right Blob (Notch) */}
            <div
                className={cn(
                    "absolute top-[-5%] end-[-5%] w-[45%] h-[75%] ltr:rounded-bl-[100px] rtl:rounded-br-[100px] opacity-80 transition-transform duration-500 group-hover:scale-105 pointer-events-none",
                    colorCfg.bgLight
                )}
            />

            {/* Large Watermark Icon (visible only on wider cards, achieved via CSS sizing) */}
            <div className="absolute top-[30%] end-[5%] opacity-[0.08] pointer-events-none hidden sm:block ltr:rotate-[-15deg] rtl:rotate-[15deg] transition-transform duration-500 group-hover:rotate-0">
                <IconComponent size={120} className={colorCfg.textColor} />
            </div>

            <div className="relative z-10 h-full flex flex-col">
                {/* Header row: Icon + Actions */}
                <div className="flex items-start justify-between mb-6">
                    {/* Main Icon */}
                    <div
                        className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            colorCfg.bgLight
                        )}
                    >
                        <IconComponent size={24} className={colorCfg.textColor} strokeWidth={2.5} />
                    </div>

                    {/* Action Menu */}
                    {canMutate && (
                        <ActionsMenu
                            onEdit={() => onEdit(category)}
                            onArchive={() => onArchive(category)}
                            t={t}
                        />
                    )}
                </div>

                {/* Title and Stats */}
                <div className="mb-auto">
                    <h3 className="text-xl font-bold text-[var(--fg-heading)] font-[var(--font-heading)] mb-1.5 tracking-tight truncate">
                        {category.name}
                    </h3>
                    <p className="text-xs text-[var(--fg-subtle)] dark:text-gray-400 font-medium truncate">
                        {t("categories.card.items", { count: totalItems })} &middot;{" "}
                        {t("categories.card.subcategories", { count: subCount })}
                    </p>
                </div>

                {/* Subcategory Pills */}
                <div className="flex flex-wrap gap-2 mt-4 overflow-hidden h-[24px]">
                    {visibleSubs.map((sub) => (
                        <span
                            key={sub.id}
                            className={cn(
                                "inline-flex items-center px-3 h-[24px] rounded-full text-[11px] font-bold tracking-wide truncate max-w-[100px]",
                                "bg-black text-white"
                            )}
                        >
                            <span className="truncate">{sub.name}</span>
                        </span>
                    ))}
                    {extraCount > 0 && (
                        <span
                            className={cn(
                                "inline-flex items-center px-3 h-[24px] rounded-full text-[11px] font-bold tracking-wide shrink-0",
                                "bg-black text-white"
                            )}
                        >
                            {t("categories.card.more", { count: extraCount })}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});
