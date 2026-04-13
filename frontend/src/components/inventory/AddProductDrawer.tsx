import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryKeys";
import {
  BadgeDollarSign as LuBadgeDollarSign,
  Barcode as LuBarcode,
  Box as LuBox,
  Package as LuPackage,
  Percent as LuPercent,
  ScanLine as LuScanLine,
  Shapes as LuShapes,
  Tag as LuTag,
} from "lucide-react";

import {
  CATEGORY_CONSTANTS,
  INVENTORY_FORM_DEFAULTS,
  INVENTORY_FORM_LIMITS,
  INVENTORY_SKU_PREFIX,
  INVENTORY_UNIT_VALUES,
} from "../../lib/constants";
import type { InventoryItem, InventoryUnit } from "../../types/inventory.types";
import type { CreateInventoryItemInput, UpdateInventoryItemInput } from "../../services/inventory.service";
import { fetchActiveCategories } from "../../services/categories.service";
import { fetchVendors, createVendor } from "../../services/vendor.service";
import type { CreateVendorParams, Vendor } from "../../types/vendor.types";
import { VendorDrawer } from "../vendors/VendorDrawer";
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
import { SelectRoot, SelectTrigger } from "../ui/select";
import { Switch } from "../ui/switch";

interface AddProductDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialItem?: InventoryItem | null;
  onCreate: (payload: CreateInventoryItemInput) => Promise<void>;
  onEdit?: (id: string, payload: UpdateInventoryItemInput) => Promise<void>;
}

interface AddProductFormState {
  name: string;
  categoryId: string;
  vendorId: string;
  barcode: string;
  sku: string;
  startingAmount: number;
  unit: InventoryUnit;
  costPrice: number;
  sellingPrice: number;
  taxEnabled: boolean;
  taxPercentage: number;
}

type AddProductField = keyof AddProductFormState;
type AddProductErrors = Partial<Record<AddProductField, string>>;

const unitLabelKeys: Record<InventoryUnit, string> = {
  UNITS: "units",
  LBS: "lbs",
  KGS: "kgs",
  LITERS: "liters",
};

function generateSku() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${INVENTORY_SKU_PREFIX}-${random}`;
}

function createInitialFormState(): AddProductFormState {
  return {
    name: "",
    categoryId: CATEGORY_CONSTANTS.UNASSIGNED_ID,
    vendorId: "",
    barcode: "",
    sku: generateSku(),
    startingAmount: INVENTORY_FORM_DEFAULTS.startingAmount,
    unit: INVENTORY_FORM_DEFAULTS.unit,
    costPrice: INVENTORY_FORM_DEFAULTS.costPrice,
    sellingPrice: INVENTORY_FORM_DEFAULTS.sellingPrice,
    taxEnabled: INVENTORY_FORM_DEFAULTS.taxEnabled,
    taxPercentage: INVENTORY_FORM_DEFAULTS.taxPercentage,
  };
}

function createFormStateFromItem(item: InventoryItem): AddProductFormState {
  const sellingPrice = typeof item.sellingPrice === "number" ? item.sellingPrice : item.price;
  const costPrice = typeof item.costPrice === "number" ? item.costPrice : item.cost;

  return {
    name: item.name || "",
    categoryId: item.categoryId || CATEGORY_CONSTANTS.UNASSIGNED_ID,
    vendorId: item.vendorId || "",
    barcode: item.barcode || "",
    sku: item.sku || generateSku(),
    startingAmount: item.stockQuantity,
    unit: item.unit,
    costPrice,
    sellingPrice,
    taxEnabled: item.taxEnabled ?? INVENTORY_FORM_DEFAULTS.taxEnabled,
    taxPercentage: item.taxPercentage ?? INVENTORY_FORM_DEFAULTS.taxPercentage,
  };
}

function parseNumericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const inputCls = "w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-2 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)] transition-colors";

const sectionTitle = "text-sm font-bold text-[var(--fg-heading)] mb-4";

export const AddProductDrawer = memo(function AddProductDrawer({
  open,
  onOpenChange,
  mode = "create",
  initialItem,
  onCreate,
  onEdit,
}: AddProductDrawerProps) {
  const { t, i18n } = useTranslation("inventory");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<AddProductFormState>(() => createInitialFormState());
  const [errors, setErrors] = useState<AddProductErrors>({});
  const [isFormReady, setIsFormReady] = useState(open);
  const [isVendorDrawerOpen, setIsVendorDrawerOpen] = useState(false);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (open) {
      setForm(isEditMode && initialItem ? createFormStateFromItem(initialItem) : createInitialFormState());
      setErrors({});
      const frame = requestAnimationFrame(() => setIsFormReady(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => {
      setForm(createInitialFormState());
      setErrors({});
      setIsFormReady(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, initialItem, isEditMode]);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.inventory.categoriesLookup,
    queryFn: fetchActiveCategories,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const vendorsQuery = useQuery({
    queryKey: queryKeys.vendors.activeLookup,
    queryFn: () => fetchVendors("Active"),
    enabled: open,
    staleTime: 0,
  });

  const activeCategories = categoriesQuery.data || [];
  const activeVendors = vendorsQuery.data || [];

  const categoryCollection = useMemo(() => ({
    items: activeCategories.map((c) => {
      const isParent = (c.subcategoryCount ?? 0) > 0;
      return {
        label: isParent ? `${c.name} (Parent Category)` : c.name,
        value: c.id,
        disabled: isParent
      };
    }),
  }), [activeCategories]);

  const vendorCollection = useMemo(() => ({
    items: activeVendors.map((v) => ({ label: v.name, value: v.id })),
  }), [activeVendors]);

  const unitLabels = useMemo(() => {
    return INVENTORY_UNIT_VALUES.reduce((labels, value) => {
      labels[value] = t(`addProduct.options.unit.${unitLabelKeys[value]}`);
      return labels;
    }, {} as Record<InventoryUnit, string>);
  }, [i18n.language, t]);

  const unitCollection = useMemo(() => ({
    items: INVENTORY_UNIT_VALUES.map((value) => ({ label: unitLabels[value], value })),
  }), [unitLabels]);

  const totalSellingPriceEstimate = useMemo(() => {
    if (!form.taxEnabled) return form.sellingPrice;
    return form.sellingPrice + (form.sellingPrice * form.taxPercentage) / 100;
  }, [form.sellingPrice, form.taxEnabled, form.taxPercentage]);

  const updateField = useCallback(<K extends AddProductField>(key: K, value: AddProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  function validate() {
    const next: AddProductErrors = {};
    if (!form.name.trim()) next.name = t("addProduct.validation.nameRequired");
    if (!form.categoryId) next.categoryId = t("addProduct.validation.categoryRequired");
    if (form.startingAmount < INVENTORY_FORM_LIMITS.minStockQuantity) next.startingAmount = t("addProduct.validation.startingAmountInvalid");
    if (form.costPrice < INVENTORY_FORM_LIMITS.minPrice) next.costPrice = t("addProduct.validation.costPriceInvalid");
    if (form.sellingPrice < INVENTORY_FORM_LIMITS.minPrice) next.sellingPrice = t("addProduct.validation.sellingPriceInvalid");
    if (form.taxEnabled && (form.taxPercentage < INVENTORY_FORM_LIMITS.minTaxPercentage || form.taxPercentage > INVENTORY_FORM_LIMITS.maxTaxPercentage)) {
      next.taxPercentage = t("addProduct.validation.taxPercentageInvalid");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreateInlineVendor(payload: CreateVendorParams) {
    const res = await createVendor(payload);
    if (res.success && res.data) {
      queryClient.setQueryData<Vendor[]>(queryKeys.vendors.activeLookup, (current) => {
        const next = current ?? [];
        if (next.some((vendor) => vendor.id === res.data!.id)) return next;
        return [...next, res.data!].sort((a, b) => a.name.localeCompare(b.name));
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.vendors.activeLookup, exact: true });
      updateField("vendorId", res.data.id);
      setIsVendorDrawerOpen(false);
    } else {
      throw new Error(res.message);
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const stockQuantity = Math.max(INVENTORY_FORM_LIMITS.minStockQuantity, Math.floor(form.startingAmount));
    try {
      if (isEditMode) {
        if (!initialItem || !onEdit) return;

        const payload: UpdateInventoryItemInput = {
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          categoryId: form.categoryId,
          vendorId: form.vendorId || undefined,
          stockQuantity,
          unit: form.unit,
          sellingPrice: form.sellingPrice,
          costPrice: form.costPrice,
          taxEnabled: form.taxEnabled,
          taxPercentage: form.taxEnabled ? form.taxPercentage : 0,
        };

        await onEdit(initialItem.id, payload);
      } else {
        const payload: CreateInventoryItemInput = {
          name: form.name.trim(),
          sku: form.sku.trim() || generateSku(),
          barcode: form.barcode.trim(),
          categoryId: form.categoryId,
          vendorId: form.vendorId || undefined,
          startingAmount: stockQuantity,
          unit: form.unit,
          sellingPrice: form.sellingPrice,
          costPrice: form.costPrice,
          taxEnabled: form.taxEnabled,
          taxPercentage: form.taxEnabled ? form.taxPercentage : 0,
        };

        await onCreate(payload);
      }

      onOpenChange(false);
    } catch {
      // Parent container surfaces mutation errors via toaster.
    }
  }

  return (
    <DrawerRoot open={open} onOpenChange={(d) => onOpenChange(d.open)} size="md">
      <DrawerContent>
        <DrawerCloseTrigger />
        <DrawerHeader>
          <DrawerTitle>{isEditMode ? t("addProduct.editTitle") : t("addProduct.title")}</DrawerTitle>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{isEditMode ? t("addProduct.editDescription") : t("addProduct.description")}</p>
        </DrawerHeader>

        <form onSubmit={(e) => void submitForm(e)} className="flex flex-col flex-1 overflow-hidden">
          <DrawerBody>
            {isFormReady ? (
              <div className="flex flex-col gap-6">
                {/* ── Basic Info ─────────────────────────────── */}
                <section>
                  <h3 className={sectionTitle}>{t("addProduct.sections.basic")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <Field label={t("addProduct.fields.name.label")} required invalid={!!errors.name} errorText={errors.name}>
                      <InputGroup startElement={<LuPackage size={16} className="text-[var(--fg-muted)]" />}>
                        <input className={inputCls} value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder={t("addProduct.fields.name.placeholder")} />
                      </InputGroup>
                    </Field>

                    {/* Category */}
                    <Field
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span>{t("addProduct.fields.category.label")}</span>
                          <button type="button" onClick={() => { onOpenChange(false); navigate("/categories"); }} className="text-xs text-[var(--color-oxygen-600)] hover:underline">Manage</button>
                        </div>
                      }
                      required invalid={!!errors.categoryId} errorText={errors.categoryId}
                    >
                      <SelectRoot collection={categoryCollection} value={form.categoryId ? [form.categoryId] : []} onValueChange={(e) => { const v = e.value[0]; if (v) updateField("categoryId", v); }}>
                        <SelectTrigger />
                      </SelectRoot>
                    </Field>

                    {/* Vendor */}
                    <Field
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span>{t("addProduct.fields.vendor.label", "Vendor")}</span>
                          <button type="button" onClick={() => setIsVendorDrawerOpen(true)} className="text-xs text-[var(--color-oxygen-600)] hover:underline">+ New</button>
                        </div>
                      }
                    >
                      <SelectRoot collection={vendorCollection} value={form.vendorId ? [form.vendorId] : []} onValueChange={(e) => updateField("vendorId", e.value[0] || "")}>
                        <SelectTrigger />
                      </SelectRoot>
                    </Field>

                    {/* Barcode */}
                    <Field label={t("addProduct.fields.barcode.label")}>
                      <InputGroup startElement={<LuBarcode size={16} className="text-[var(--fg-muted)]" />}>
                        <input className={inputCls} value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} placeholder={t("addProduct.fields.barcode.placeholder")} />
                      </InputGroup>
                    </Field>

                    {/* SKU */}
                    <Field label={t("addProduct.fields.sku.label")} helperText={t("addProduct.fields.sku.helper")}>
                      <InputGroup startElement={<LuTag size={16} className="text-[var(--fg-muted)]" />}>
                        <input className={inputCls} value={form.sku} onChange={(e) => updateField("sku", e.target.value)} placeholder={t("addProduct.fields.sku.placeholder")} />
                      </InputGroup>
                    </Field>
                  </div>
                </section>

                <hr className="border-[var(--border-muted)]" />

                {/* ── Inventory ────────────────────────────── */}
                <section>
                  <h3 className={sectionTitle}>{t("addProduct.sections.inventory")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label={t("addProduct.fields.startingAmount.label")} required invalid={!!errors.startingAmount} errorText={errors.startingAmount}>
                      <NumberInputRoot value={String(form.startingAmount)} min={INVENTORY_FORM_LIMITS.minStockQuantity} onValueChange={(d) => updateField("startingAmount", parseNumericValue(d.value))}>
                        <NumberInputField placeholder={t("addProduct.fields.startingAmount.placeholder")} />
                      </NumberInputRoot>
                    </Field>

                    <Field label={t("addProduct.fields.unit.label")} required>
                      <SelectRoot collection={unitCollection} value={[form.unit]} onValueChange={(e) => { const v = e.value[0] as InventoryUnit | undefined; if (v) updateField("unit", v); }}>
                        <SelectTrigger />
                      </SelectRoot>
                    </Field>
                  </div>
                </section>

                <hr className="border-[var(--border-muted)]" />

                {/* ── Pricing ──────────────────────────────── */}
                <section>
                  <h3 className={sectionTitle}>{t("addProduct.sections.pricing")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label={t("addProduct.fields.costPrice.label")} required invalid={!!errors.costPrice} errorText={errors.costPrice}>
                      <NumberInputRoot value={String(form.costPrice)} min={INVENTORY_FORM_LIMITS.minPrice} onValueChange={(d) => updateField("costPrice", parseNumericValue(d.value))}>
                        <InputGroup startElement={<LuBadgeDollarSign size={16} className="text-[var(--fg-muted)]" />}>
                          <NumberInputField placeholder={t("addProduct.fields.costPrice.placeholder")} />
                        </InputGroup>
                      </NumberInputRoot>
                    </Field>

                    <Field label={t("addProduct.fields.sellingPrice.label")} required invalid={!!errors.sellingPrice} errorText={errors.sellingPrice}>
                      <NumberInputRoot value={String(form.sellingPrice)} min={INVENTORY_FORM_LIMITS.minPrice} onValueChange={(d) => updateField("sellingPrice", parseNumericValue(d.value))}>
                        <InputGroup startElement={<LuBadgeDollarSign size={16} className="text-[var(--fg-muted)]" />}>
                          <NumberInputField placeholder={t("addProduct.fields.sellingPrice.placeholder")} />
                        </InputGroup>
                      </NumberInputRoot>
                    </Field>

                    <Field label={t("addProduct.fields.taxEnabled.label")} helperText={t("addProduct.fields.taxEnabled.helper")}>
                      <Switch checked={form.taxEnabled} onCheckedChange={(d) => updateField("taxEnabled", d.checked)}>
                        <span className="flex items-center gap-2 text-sm text-[var(--fg-default)]">
                          <LuShapes size={16} />
                          {t("addProduct.fields.taxEnabled.caption")}
                        </span>
                      </Switch>
                    </Field>

                    {form.taxEnabled && (
                      <Field label={t("addProduct.fields.taxPercentage.label")} required invalid={!!errors.taxPercentage} errorText={errors.taxPercentage}>
                        <NumberInputRoot value={String(form.taxPercentage)} min={INVENTORY_FORM_LIMITS.minTaxPercentage} max={INVENTORY_FORM_LIMITS.maxTaxPercentage} onValueChange={(d) => updateField("taxPercentage", parseNumericValue(d.value))}>
                          <InputGroup startElement={<LuPercent size={16} className="text-[var(--fg-muted)]" />}>
                            <NumberInputField placeholder={t("addProduct.fields.taxPercentage.placeholder")} />
                          </InputGroup>
                        </NumberInputRoot>
                      </Field>
                    )}
                  </div>

                  {/* Total estimate */}
                  <div className="mt-5 p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-muted)] flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2 text-[var(--fg-default)]">
                      <LuScanLine size={16} />
                      <span className="font-semibold text-sm">{t("addProduct.fields.totalSellingPrice.label")}</span>
                    </div>
                    <span className="text-lg font-bold text-[var(--color-oxygen-700)]">
                      ${totalSellingPriceEstimate.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] mt-1">{t("addProduct.fields.totalSellingPrice.estimateHint")}</p>
                </section>
              </div>
            ) : (
              <div className="min-h-[28rem]" />
            )}
          </DrawerBody>

          <DrawerFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors">
              {t("addProduct.actions.cancel")}
            </button>
            <button type="submit" disabled={!isFormReady || (isEditMode && (!initialItem || !onEdit))} className="px-4 py-2 rounded-lg bg-[var(--color-oxygen-500)] text-white text-sm font-semibold hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-50 flex items-center gap-2">
              <LuBox size={16} />
              {isEditMode ? t("addProduct.actions.update") : t("addProduct.actions.submit")}
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>

      <VendorDrawer open={isVendorDrawerOpen} onOpenChange={setIsVendorDrawerOpen} onSubmit={handleCreateInlineVendor} />
    </DrawerRoot>
  );
});
