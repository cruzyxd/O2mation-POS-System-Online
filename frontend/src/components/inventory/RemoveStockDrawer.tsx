import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus as LuMinus } from "lucide-react";

import type { RemoveInventoryStockInput } from "../../services/inventory.service";
import type { InventoryItem } from "../../types/inventory.types";
import {
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
} from "../ui/drawer";
import { Field } from "../ui/field";
import { NumberInputField, NumberInputRoot } from "../ui/number-input";

interface RemoveStockDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (itemId: string, payload: RemoveInventoryStockInput) => Promise<void>;
}

interface RemoveStockFormState {
  quantityRemoved: number;
}

interface RemoveStockErrors {
  quantityRemoved?: string;
}

function createInitialState(): RemoveStockFormState {
  return {
    quantityRemoved: 0,
  };
}

function parseNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const RemoveStockDrawer = memo(function RemoveStockDrawer({ open, item, onOpenChange, onSubmit }: RemoveStockDrawerProps) {
  const { t } = useTranslation("inventory");
  const [form, setForm] = useState<RemoveStockFormState>(() => createInitialState());
  const [errors, setErrors] = useState<RemoveStockErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialState());
    setErrors({});
    setIsSubmitting(false);
  }, [open, item]);

  function validate() {
    const next: RemoveStockErrors = {};
    if (form.quantityRemoved <= 0) {
      next.quantityRemoved = t("removeStock.validation.quantityRequired");
    } else if (item && form.quantityRemoved > item.stockQuantity) {
      next.quantityRemoved = t("removeStock.validation.quantityExceedsStock");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(item.id, {
        quantityRemoved: Math.floor(form.quantityRemoved),
      });
      onOpenChange(false);
    } catch {
      // Parent page surfaces API errors through toast.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DrawerRoot open={open} onOpenChange={(details) => onOpenChange(details.open)} size="md">
      <DrawerContent>
        <DrawerCloseTrigger />
        <DrawerHeader>
          <DrawerTitle>{t("removeStock.title")}</DrawerTitle>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{t("removeStock.description")}</p>
        </DrawerHeader>

        <form onSubmit={(event) => void submit(event)} className="flex flex-col flex-1 overflow-hidden">
          <DrawerBody>
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-muted)]">
                <p className="text-sm font-semibold text-[var(--fg-default)]">{item?.name ?? t("removeStock.noSelection")}</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  {item ? `${t("table.sku")}: ${item.sku} • ${t("removeStock.currentStock")}: ${item.stockQuantity}` : t("removeStock.noSelection")}
                </p>
              </div>

              <Field label={t("removeStock.fields.quantityRemoved.label")} required invalid={!!errors.quantityRemoved} errorText={errors.quantityRemoved}>
                <NumberInputRoot
                  value={String(form.quantityRemoved)}
                  min={0}
                  onValueChange={(details) => setForm((prev) => ({ ...prev, quantityRemoved: parseNumericValue(details.value) }))}
                >
                  <NumberInputField placeholder={t("removeStock.fields.quantityRemoved.placeholder")} />
                </NumberInputRoot>
              </Field>
            </div>
          </DrawerBody>

          <DrawerFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              {t("removeStock.actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !item}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <LuMinus size={16} />
              {t("removeStock.actions.submit")}
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </DrawerRoot>
  );
});
