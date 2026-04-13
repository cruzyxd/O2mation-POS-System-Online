import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeDollarSign as LuBadgeDollarSign, Plus as LuPlus } from "lucide-react";

import type { AddInventoryStockInput } from "../../services/inventory.service";
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
import { InputGroup } from "../ui/input-group";
import { NumberInputField, NumberInputRoot } from "../ui/number-input";

interface AddStockDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (itemId: string, payload: AddInventoryStockInput) => Promise<void>;
}

interface AddStockFormState {
  quantityAdded: number;
  purchasePrice: number;
}

interface AddStockErrors {
  quantityAdded?: string;
  purchasePrice?: string;
}

function createInitialState(item: InventoryItem | null): AddStockFormState {
  return {
    quantityAdded: 0,
    purchasePrice: Number(item?.costPrice ?? item?.cost ?? 0),
  };
}

function parseNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const AddStockDrawer = memo(function AddStockDrawer({ open, item, onOpenChange, onSubmit }: AddStockDrawerProps) {
  const { t } = useTranslation("inventory");
  const [form, setForm] = useState<AddStockFormState>(() => createInitialState(item));
  const [errors, setErrors] = useState<AddStockErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialState(item));
    setErrors({});
    setIsSubmitting(false);
  }, [open, item]);

  function validate() {
    const next: AddStockErrors = {};
    if (form.quantityAdded <= 0) {
      next.quantityAdded = t("addStock.validation.quantityRequired");
    }
    if (form.purchasePrice < 0) {
      next.purchasePrice = t("addStock.validation.purchasePriceInvalid");
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
        quantityAdded: Math.floor(form.quantityAdded),
        purchasePrice: form.purchasePrice,
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
          <DrawerTitle>{t("addStock.title")}</DrawerTitle>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{t("addStock.description")}</p>
        </DrawerHeader>

        <form onSubmit={(event) => void submit(event)} className="flex flex-col flex-1 overflow-hidden">
          <DrawerBody>
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-muted)]">
                <p className="text-sm font-semibold text-[var(--fg-default)]">{item?.name ?? t("addStock.noSelection")}</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">
                  {item ? `${t("table.sku")}: ${item.sku} • ${t("addStock.currentStock")}: ${item.stockQuantity}` : t("addStock.noSelection")}
                </p>
              </div>

              <Field label={t("addStock.fields.quantityAdded.label")} required invalid={!!errors.quantityAdded} errorText={errors.quantityAdded}>
                <NumberInputRoot
                  value={String(form.quantityAdded)}
                  min={0}
                  onValueChange={(details) => setForm((prev) => ({ ...prev, quantityAdded: parseNumericValue(details.value) }))}
                >
                  <NumberInputField placeholder={t("addStock.fields.quantityAdded.placeholder")} />
                </NumberInputRoot>
              </Field>

              <Field label={t("addStock.fields.purchasePrice.label")} required invalid={!!errors.purchasePrice} errorText={errors.purchasePrice}>
                <NumberInputRoot
                  value={String(form.purchasePrice)}
                  min={0}
                  step={0.01}
                  onValueChange={(details) => setForm((prev) => ({ ...prev, purchasePrice: parseNumericValue(details.value) }))}
                >
                  <InputGroup startElement={<LuBadgeDollarSign size={16} className="text-[var(--fg-muted)]" />}>
                    <NumberInputField placeholder={t("addStock.fields.purchasePrice.placeholder")} />
                  </InputGroup>
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
              {t("addStock.actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !item}
              className="px-4 py-2 rounded-lg bg-[var(--color-oxygen-500)] text-white text-sm font-semibold hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <LuPlus size={16} />
              {t("addStock.actions.submit")}
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </DrawerRoot>
  );
});
