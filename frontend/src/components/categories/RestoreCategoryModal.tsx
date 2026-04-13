import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../ui/dialog";
import type { Category } from "../../types/inventory.types";

interface RestoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onConfirm: () => Promise<void>;
}

export const RestoreCategoryModal = memo(function RestoreCategoryModal({ open, onOpenChange, category, onConfirm }: RestoreModalProps) {
  const { t } = useTranslation("inventory");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    try { await onConfirm(); onOpenChange(false); } catch (_) { /* handled */ } finally { setIsSubmitting(false); }
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>{t("categories.modals.restoreTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-[var(--fg-muted)]">
            {t("categories.modals.restoreDesc")}
            {category && <strong className="block mt-2 text-[var(--fg-default)]">{category.name}</strong>}
          </p>
        </DialogBody>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50">
            {t("categories.modals.cancel")}
          </button>
          <button onClick={() => void submit()} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[var(--color-oxygen-500)] text-white text-sm font-semibold hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-50 flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {t("categories.modals.confirmRestore")}
          </button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
});
