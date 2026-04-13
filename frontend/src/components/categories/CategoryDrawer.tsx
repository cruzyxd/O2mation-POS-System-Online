import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Folder as LuFolder, Hash as LuHash, Palette, ImageIcon } from "lucide-react";
import { DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerFooter, DrawerHeader, DrawerRoot, DrawerTitle } from "../ui/drawer";
import { Field } from "../ui/field";
import { InputGroup } from "../ui/input-group";
import { SelectRoot, SelectTrigger } from "../ui/select";
import type { Category } from "../../types/inventory.types";
import { IconPicker } from "./IconPicker";
import { ColorPicker } from "./ColorPicker";
import { CATEGORY_CONSTANTS } from "../../lib/constants";
import { cn } from "../../lib/cn";

interface CategoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Category>) => Promise<void>;
  initialData: Category | null;
  activeCategories: Category[];
}

interface DrawerFormState {
  name: string;
  code: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
}

const inputCls = "w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-2 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)] transition-colors";
const sectionLabelCls = "flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[var(--fg-subtle)] mb-2";

export const CategoryDrawer = memo(function CategoryDrawer({ open, onOpenChange, onSubmit, initialData, activeCategories }: CategoryDrawerProps) {
  const { t } = useTranslation("inventory");
  const [form, setForm] = useState<DrawerFormState>({ name: "", code: "", parentId: null, icon: null, color: null });
  const [errors, setErrors] = useState<Partial<Record<"name" | "code", string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSystemCategory = initialData?.id === CATEGORY_CONSTANTS.UNASSIGNED_ID;

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? {
            name: initialData.name,
            code: initialData.code,
            parentId: initialData.parentId || null,
            icon: initialData.icon || null,
            color: initialData.color || null,
          }
          : { name: "", code: "", parentId: null, icon: null, color: null }
      );
      setErrors({});
    }
  }, [open, initialData]);

  const parentCollection = useMemo(() => ({
    items: [
      { label: t("categories.drawer.fields.none"), value: "" },
      ...activeCategories.filter(c => !c.parentId && c.id !== initialData?.id).map(c => ({
        label: c.productCount > 0 ? `${c.name} (Contains Products)` : c.name,
        value: c.id,
        disabled: c.productCount > 0
      })),
    ],
  }), [activeCategories, initialData, t]);

  const validate = () => {
    const next: Partial<Record<"name" | "code", string>> = {};
    if (!form.name.trim()) next.name = t("categories.drawer.validation.nameRequired");
    if (!form.code.trim()) next.code = t("categories.drawer.validation.codeRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try { await onSubmit(form); onOpenChange(false); } catch (_) { /* handled by parent */ } finally { setIsSubmitting(false); }
  };

  return (
    <DrawerRoot open={open} onOpenChange={(d) => onOpenChange(d.open)} size="md">
      <DrawerContent>
        <DrawerCloseTrigger />
        <DrawerHeader>
          <DrawerTitle>{initialData ? t("categories.drawer.editTitle") : t("categories.drawer.addTitle")}</DrawerTitle>
          <p className="text-sm text-[var(--fg-muted)] mt-1">{t("categories.drawer.description")}</p>
        </DrawerHeader>
        <form onSubmit={submitForm} className="flex flex-col flex-1 overflow-hidden">
          <DrawerBody>
            <div className="flex flex-col gap-6">
              <Field label={t("categories.drawer.fields.name")} required invalid={!!errors.name} errorText={errors.name}>
                <InputGroup startElement={<LuFolder size={16} className="text-[var(--fg-muted)]" />}>
                  <input
                    className={cn(inputCls, isSystemCategory && "opacity-50 cursor-not-allowed")}
                    value={form.name}
                    onChange={e => !isSystemCategory && setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t("categories.drawer.fields.name")}
                    readOnly={isSystemCategory}
                  />
                </InputGroup>
              </Field>

              <Field label={t("categories.drawer.fields.code")} required invalid={!!errors.code} errorText={errors.code}>
                <InputGroup startElement={<LuHash size={16} className="text-[var(--fg-muted)]" />}>
                  <input
                    className={cn(inputCls, isSystemCategory && "opacity-50 cursor-not-allowed")}
                    value={form.code}
                    onChange={e => !isSystemCategory && setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder={t("categories.drawer.placeholders.code")}
                    readOnly={isSystemCategory}
                  />
                </InputGroup>
              </Field>

              <Field
                label={t("categories.drawer.fields.parent")}
                helperText={!isSystemCategory && initialData && initialData.productCount > 0 ? "Categories with products cannot have a parent." : undefined}
              >
                <SelectRoot
                  collection={parentCollection}
                  value={form.parentId ? [form.parentId] : [""]}
                  onValueChange={(e) => !isSystemCategory && setForm(f => ({ ...f, parentId: e.value[0] || null }))}
                  disabled={isSystemCategory || (!!initialData && initialData.productCount > 0)}
                >
                  <SelectTrigger />
                </SelectRoot>
              </Field>

              {/* Color picker — only for main categories */}
              {!form.parentId && (
                <>
                  <div>
                    <div className={sectionLabelCls}>
                      <Palette size={12} />
                      <span>{t("categories.drawer.sections.color")}</span>
                    </div>
                    <ColorPicker value={form.color} onChange={(c) => setForm(f => ({ ...f, color: c }))} />
                  </div>

                  <div>
                    <div className={sectionLabelCls}>
                      <ImageIcon size={12} />
                      <span>{t("categories.drawer.sections.icon")}</span>
                    </div>
                    <IconPicker value={form.icon} onChange={(i) => setForm(f => ({ ...f, icon: i }))} />
                  </div>
                </>
              )}
            </div>
          </DrawerBody>
          <DrawerFooter>
            <button type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50">
              {t("categories.drawer.cancel")}
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[var(--color-oxygen-500)] text-white text-sm font-semibold hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {t("categories.drawer.save")}
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </DrawerRoot>
  );
});
