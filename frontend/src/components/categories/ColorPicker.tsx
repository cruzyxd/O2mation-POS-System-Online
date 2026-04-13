import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Each entry maps a display name to a Tailwind bg/text color pair.
 * The `value` stored is the key (e.g. "emerald").
 * These map to:
 *   bg{color}BgClass  → icon/card background  (light shade)
 *   iconColorClass    → icon foreground color  (darker shade)
 */
export interface CategoryColor {
    label: string;
    bgLight: string;    // e.g. "bg-emerald-100"
    bgStrong: string;   // e.g. "bg-emerald-500" – for the swatch itself
    textColor: string;  // e.g. "text-emerald-700"
}

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
    emerald: { label: "Green", bgLight: "bg-emerald-100", bgStrong: "bg-emerald-500", textColor: "text-emerald-700" },
    sky: { label: "Sky", bgLight: "bg-sky-100", bgStrong: "bg-sky-500", textColor: "text-sky-700" },
    violet: { label: "Violet", bgLight: "bg-violet-100", bgStrong: "bg-violet-500", textColor: "text-violet-700" },
    rose: { label: "Rose", bgLight: "bg-rose-100", bgStrong: "bg-rose-500", textColor: "text-rose-700" },
    orange: { label: "Orange", bgLight: "bg-orange-100", bgStrong: "bg-orange-500", textColor: "text-orange-700" },
    amber: { label: "Amber", bgLight: "bg-amber-100", bgStrong: "bg-amber-500", textColor: "text-amber-700" },
    teal: { label: "Teal", bgLight: "bg-teal-100", bgStrong: "bg-teal-500", textColor: "text-teal-700" },
    cyan: { label: "Cyan", bgLight: "bg-cyan-100", bgStrong: "bg-cyan-500", textColor: "text-cyan-700" },
    blue: { label: "Blue", bgLight: "bg-blue-100", bgStrong: "bg-blue-500", textColor: "text-blue-700" },
    indigo: { label: "Indigo", bgLight: "bg-indigo-100", bgStrong: "bg-indigo-500", textColor: "text-indigo-700" },
    fuchsia: { label: "Fuchsia", bgLight: "bg-fuchsia-100", bgStrong: "bg-fuchsia-500", textColor: "text-fuchsia-700" },
    pink: { label: "Pink", bgLight: "bg-pink-100", bgStrong: "bg-pink-500", textColor: "text-pink-700" },
    lime: { label: "Lime", bgLight: "bg-lime-100", bgStrong: "bg-lime-500", textColor: "text-lime-700" },
    red: { label: "Red", bgLight: "bg-red-100", bgStrong: "bg-red-500", textColor: "text-red-700" },
    slate: { label: "Slate", bgLight: "bg-slate-100", bgStrong: "bg-slate-500", textColor: "text-slate-700" },
};

interface ColorPickerProps {
    value: string | null | undefined;
    onChange: (color: string) => void;
}

export const ColorPicker = memo(function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)]">
            {Object.entries(CATEGORY_COLORS).map(([key, cfg]) => (
                <button
                    key={key}
                    type="button"
                    title={cfg.label}
                    onClick={() => onChange(key)}
                    className={cn(
                        "relative w-7 h-7 rounded-full transition-all duration-150 ring-offset-1 hover:scale-110",
                        cfg.bgStrong,
                        value === key ? "ring-2 ring-[var(--fg-default)]" : "ring-0"
                    )}
                >
                    {value === key && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <Check size={13} className="text-white stroke-[3]" />
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
});
