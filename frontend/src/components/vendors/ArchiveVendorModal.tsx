import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../ui/dialog";
import type { Vendor } from "../../types/vendor.types";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ArchiveVendorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendor: Vendor | null;
    onConfirm: () => Promise<void>;
}

export function ArchiveVendorModal({ open, onOpenChange, vendor, onConfirm }: ArchiveVendorModalProps) {
    const { t } = useTranslation("vendors");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try { await onConfirm(); onOpenChange(false); } finally { setIsSubmitting(false); }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <DialogContent>
                <DialogCloseTrigger />
                <DialogHeader>
                    <DialogTitle>{t("archiveDialog.title")}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <p className="text-sm text-[var(--fg-muted)]">{t("archiveDialog.description", { name: vendor?.name || "" })}</p>
                </DialogBody>
                <DialogFooter>
                    <button onClick={() => onOpenChange(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50">
                        {t("archiveDialog.cancel")}
                    </button>
                    <button onClick={() => void handleConfirm()} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {t("archiveDialog.confirm")}
                    </button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
}
