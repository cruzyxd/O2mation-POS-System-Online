import { DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerFooter, DrawerHeader, DrawerRoot, DrawerTitle } from "../ui/drawer";
import { Field } from "../ui/field";
import type { Vendor, CreateVendorParams } from "../../types/vendor.types";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface VendorDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateVendorParams) => Promise<void>;
    initialData?: Vendor | null;
}

const inputCls = "w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)] transition-colors";

export function VendorDrawer({ open, onOpenChange, onSubmit, initialData }: VendorDrawerProps) {
    const { t } = useTranslation("vendors");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) { setName(initialData?.name || ""); setPhone(initialData?.phone || ""); setNotes(initialData?.notes || ""); }
    }, [open, initialData]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        try { await onSubmit({ name, phone, notes }); onOpenChange(false); } catch (_) { /* handled by parent */ } finally { setIsSubmitting(false); }
    };

    return (
        <DrawerRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} size="sm">
            <DrawerContent>
                <DrawerCloseTrigger />
                <DrawerHeader>
                    <DrawerTitle>{initialData ? t("editDialog.title") : t("createDialog.title")}</DrawerTitle>
                </DrawerHeader>
                <form
                    onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
                    className="flex flex-col flex-1 overflow-hidden"
                >
                    <DrawerBody>
                        <div className="flex flex-col gap-6">
                            <Field label={t("createDialog.name")} required>
                                <input className={inputCls} placeholder={t("createDialog.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
                            </Field>
                            <Field label={t("createDialog.phone")}>
                                <input className={inputCls} placeholder={t("createDialog.phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </Field>
                            <Field label={t("createDialog.notes")}>
                                <textarea className={inputCls + " resize-none"} rows={4} placeholder={t("createDialog.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </Field>
                        </div>
                    </DrawerBody>
                    <DrawerFooter>
                        <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors">
                            {t("createDialog.cancel")}
                        </button>
                        <button type="submit" disabled={isSubmitting || !name.trim()} className="px-4 py-2 rounded-lg bg-[var(--color-oxygen-500)] text-white text-sm font-semibold hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-50 flex items-center gap-2">
                            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {initialData ? t("editDialog.save") : t("createDialog.save")}
                        </button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </DrawerRoot>
    );
}
