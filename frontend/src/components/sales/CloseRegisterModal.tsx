import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { centsToMoney, moneyToCents, roundMoney } from "../../lib/money";
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../ui/dialog";

interface CloseRegisterModalProps {
  open: boolean;
  expectedCash: number;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (countedCash: number) => Promise<void>;
}

export function CloseRegisterModal({
  open,
  expectedCash,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: CloseRegisterModalProps) {
  const { t } = useTranslation("sales");
  const [countedCash, setCountedCash] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCountedCash(roundMoney(expectedCash));
  }, [open, expectedCash]);

  const variance = useMemo(() => {
    const countedCents = moneyToCents(countedCash);
    const expectedCents = moneyToCents(expectedCash);
    return centsToMoney(countedCents - expectedCents);
  }, [countedCash, expectedCash]);

  const variancePrefix = variance > 0 ? "+" : variance < 0 ? "-" : "";
  const canSubmit = countedCash >= 0;

  async function submit() {
    if (!canSubmit) {
      return;
    }
    await onConfirm(roundMoney(countedCash));
  }

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>{t("closeModal.title")}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-[var(--fg-muted)] mb-5">{t("closeModal.description")}</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-[var(--fg-muted)]">
              <span>{t("closeModal.expectedCash")}</span>
              <span className="font-semibold text-[var(--fg-default)]">${roundMoney(expectedCash).toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--fg-subtle)] mb-2">
                {t("closeModal.countedCash")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={countedCash || ""}
                onChange={(event) => setCountedCash(parseFloat(event.target.value) || 0)}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--fg-default)] py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-500)]"
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm">
              <span className="text-[var(--fg-muted)]">{t("closeModal.variance")}</span>
              <span className="font-semibold text-[var(--fg-default)]">{variancePrefix}${Math.abs(variance).toFixed(2)}</span>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
          >
            {t("closeModal.cancel")}
          </button>
          <button
            onClick={() => void submit()}
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {t("closeModal.confirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
