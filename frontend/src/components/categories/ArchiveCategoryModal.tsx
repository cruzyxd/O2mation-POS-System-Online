import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive as LuArchive, Inbox as LuInbox } from "lucide-react";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../ui/dialog";
import type { Category } from "../../types/inventory.types";
import { cn } from "@/lib/cn";

interface ArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onConfirm: (option: "MOVE_TO_UNASSIGNED" | "ARCHIVE_WITH_PRODUCTS") => Promise<void>;
}

const optionCard = (selected: boolean) => cn(
  "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
  selected
    ? "border-[var(--color-oxygen-500)] bg-[var(--nav-active-bg)]"
    : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--fg-subtle)]"
);

export const ArchiveCategoryModal = memo(function ArchiveCategoryModal({ open, onOpenChange, category, onConfirm }: ArchiveModalProps) {
  const { t } = useTranslation("inventory");
  const [option, setOption] = useState<"MOVE_TO_UNASSIGNED" | "ARCHIVE_WITH_PRODUCTS">("MOVE_TO_UNASSIGNED");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    try { await onConfirm(option); onOpenChange(false); } catch (_) { /* handled */ } finally { setIsSubmitting(false); }
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>{t("categories.modals.archiveTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-[var(--fg-muted)] mb-6">
            {t("categories.modals.archiveDesc")}
            {category && <strong className="text-[var(--fg-default)]"> ({category.name})</strong>}
          </p>

          {(category?.subcategoryCount ?? 0) > 0 && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("categories.modals.parentBlockedHint", { count: category?.subcategoryCount ?? 0 })}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className={optionCard(option === "MOVE_TO_UNASSIGNED")} onClick={() => setOption("MOVE_TO_UNASSIGNED")}>
              <input type="radio" name="archive-option" value="MOVE_TO_UNASSIGNED" checked={option === "MOVE_TO_UNASSIGNED"} onChange={() => setOption("MOVE_TO_UNASSIGNED")} className="sr-only" />
              <LuInbox size={18} className="flex-shrink-0 text-[var(--fg-muted)] mt-0.5" />
              <span className="text-sm text-[var(--fg-default)]">{t("categories.modals.optUnassigned")}</span>
            </label>
            <label className={optionCard(option === "ARCHIVE_WITH_PRODUCTS")} onClick={() => setOption("ARCHIVE_WITH_PRODUCTS")}>
              <input type="radio" name="archive-option" value="ARCHIVE_WITH_PRODUCTS" checked={option === "ARCHIVE_WITH_PRODUCTS"} onChange={() => setOption("ARCHIVE_WITH_PRODUCTS")} className="sr-only" />
              <LuArchive size={18} className="flex-shrink-0 text-[var(--fg-muted)] mt-0.5" />
              <span className="text-sm text-[var(--fg-default)]">{t("categories.modals.optArchiveAll")}</span>
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50">
            {t("categories.modals.cancel")}
          </button>
          <button onClick={() => void submit()} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {t("categories.modals.confirmArchive")}
          </button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
});
