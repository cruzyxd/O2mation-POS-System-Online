import { memo, useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus as LuPlus, Minus as LuMinus, Search as LuSearch, Filter as LuFilter, Download as LuDownload, Pencil as LuPencil, Trash2 as LuTrash2, X as LuX } from "lucide-react";

import { AddStockDrawer } from "../components/inventory/AddStockDrawer";
import { RemoveStockDrawer } from "../components/inventory/RemoveStockDrawer";
import { AddProductDrawer } from "../components/inventory/AddProductDrawer";
import { InputGroup } from "../components/ui/input-group";
import { Checkbox } from "../components/ui/checkbox";
import { PaginationItems, PaginationNextTrigger, PaginationPageText, PaginationPrevTrigger, PaginationRoot } from "../components/ui/pagination";
import { Status } from "../components/ui/status";
import { toaster } from "../components/ui/toaster";
import { PAGINATION_DEFAULTS } from "../lib/constants";
import { queryKeys } from "../lib/queryKeys";
import { fetchActiveCategories } from "../services/categories.service";
import { addInventoryStock, bulkDeleteInventoryItems, createInventoryItem, fetchInventoryItems, removeInventoryStock, updateInventoryItem, type AddInventoryStockInput, type CreateInventoryItemInput, type RemoveInventoryStockInput, type UpdateInventoryItemInput } from "../services/inventory.service";
import type { InventoryItem, InventoryStatus } from "../types/inventory.types";
import { cn } from "@/lib/cn";

export function InventoryPage() {
  const { t } = useTranslation("inventory");
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.page);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [productDrawerMode, setProductDrawerMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddStockDrawerOpen, setIsAddStockDrawerOpen] = useState(false);
  const [addStockItem, setAddStockItem] = useState<InventoryItem | null>(null);
  const [isRemoveStockDrawerOpen, setIsRemoveStockDrawerOpen] = useState(false);
  const [removeStockItem, setRemoveStockItem] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(() => {
        setSearchQuery(searchInput.trim());
        setPage(PAGINATION_DEFAULTS.page);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const activeCategoriesQuery = useQuery({
    queryKey: queryKeys.inventory.categoriesLookup,
    queryFn: fetchActiveCategories,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const inventoryQuery = useQuery({
    queryKey: queryKeys.inventory.list(page, PAGINATION_DEFAULTS.pageSize, searchQuery, "", ""),
    queryFn: () => fetchInventoryItems({ page, pageSize: PAGINATION_DEFAULTS.pageSize, q: searchQuery || undefined }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!inventoryQuery.error) return;
    const message = inventoryQuery.error instanceof Error ? inventoryQuery.error.message : t("categories.messages.fetchError");
    toaster.create({ title: message, type: "error" });
  }, [inventoryQuery.error, t]);

  useEffect(() => {
    if (!activeCategoriesQuery.error) return;
    const message = activeCategoriesQuery.error instanceof Error ? activeCategoriesQuery.error.message : t("categories.messages.fetchError");
    toaster.create({ title: message, type: "error" });
  }, [activeCategoriesQuery.error, t]);

  useEffect(() => { setSelectedItems(new Set()); }, [page, searchQuery]);

  const activeCategories = activeCategoriesQuery.data ?? [];
  const inventoryData = inventoryQuery.data;
  const visibleItems = inventoryData?.items ?? [];

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    const byId = new Map(activeCategories.map((c) => [c.id, c]));
    for (const c of activeCategories) {
      if (c.parentId) {
        const parent = byId.get(c.parentId);
        map.set(c.id, parent ? `${parent.name} > ${c.name}` : c.name);
      } else {
        map.set(c.id, c.name);
      }
    }
    return map;
  }, [activeCategories]);

  const selectedVisibleCount = useMemo(
    () => visibleItems.filter((item) => selectedItems.has(item.id)).length,
    [selectedItems, visibleItems]
  );

  const selectedEditItem = useMemo(() => {
    if (selectedItems.size !== 1) return null;
    const selectedId = Array.from(selectedItems)[0];
    return visibleItems.find((item) => item.id === selectedId) ?? null;
  }, [selectedItems, visibleItems]);

  const canEditSelection = selectedEditItem !== null;

  const totalSkus = inventoryData?.total ?? 0;
  const totalValue = inventoryData?.summary.totalValue ?? 0;
  const lowStockCount = inventoryData?.summary.lowStockCount ?? 0;
  const outOfStockCount = inventoryData?.summary.outOfStockCount ?? 0;
  const isInitialLoading = (inventoryQuery.isLoading && !inventoryData) || (activeCategoriesQuery.isLoading && activeCategories.length === 0);

  const toggleSelectAll = useCallback(() => {
    setSelectedItems((prev) => {
      if (visibleItems.length === 0) return prev;
      const next = new Set(prev);
      const everySelected = visibleItems.every((item) => next.has(item.id));
      if (everySelected) visibleItems.forEach((item) => next.delete(item.id));
      else visibleItems.forEach((item) => next.add(item.id));
      return next;
    });
  }, [visibleItems]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAddProduct = useCallback(async (payload: CreateInventoryItemInput) => {
    await createInventoryItem(payload);
    setPage(PAGINATION_DEFAULTS.page);
    await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
    setSelectedItems(new Set());
    toaster.create({ title: t("addProduct.messages.createSuccessTitle"), description: t("addProduct.messages.createSuccessDescription"), type: "success" });
  }, [queryClient, t]);

  const handleEditProduct = useCallback(async (id: string, payload: UpdateInventoryItemInput) => {
    await updateInventoryItem(id, payload);
    await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
    setSelectedItems(new Set());
    setEditingItem(null);
    toaster.create({ title: t("addProduct.messages.updateSuccessTitle"), description: t("addProduct.messages.updateSuccessDescription"), type: "success" });
  }, [queryClient, t]);

  const handleAddStock = useCallback(async (id: string, payload: AddInventoryStockInput) => {
    await addInventoryStock(id, payload);
    await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
    setSelectedItems(new Set());
    setAddStockItem(null);
    toaster.create({ title: t("addStock.messages.successTitle"), description: t("addStock.messages.successDescription"), type: "success" });
  }, [queryClient, t]);

  const handleRemoveStock = useCallback(async (id: string, payload: RemoveInventoryStockInput) => {
    await removeInventoryStock(id, payload);
    await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
    setSelectedItems(new Set());
    setRemoveStockItem(null);
    toaster.create({ title: t("removeStock.messages.successTitle"), description: t("removeStock.messages.successDescription"), type: "success" });
  }, [queryClient, t]);

  const removeSelected = useCallback(async () => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const deletedCount = await bulkDeleteInventoryItems(ids);
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      setSelectedItems(new Set());
      toaster.create({ title: "Items removed", description: `${deletedCount} item(s) removed from inventory.`, type: "success" });
    } catch (error) {
      toaster.create({ title: error instanceof Error ? error.message : "Failed to remove items", type: "error" });
    } finally {
      setDeleting(false);
    }
  }, [queryClient, selectedItems]);

  const openAddProduct = useCallback(() => {
    setProductDrawerMode("create");
    setEditingItem(null);
    setIsProductDrawerOpen(true);
  }, []);

  const openEditProduct = useCallback(() => {
    if (!selectedEditItem) return;
    setProductDrawerMode("edit");
    setEditingItem(selectedEditItem);
    setIsProductDrawerOpen(true);
  }, [selectedEditItem]);

  const openAddStock = useCallback(() => {
    if (!selectedEditItem) return;
    setAddStockItem(selectedEditItem);
    setIsAddStockDrawerOpen(true);
  }, [selectedEditItem]);

  const openRemoveStock = useCallback(() => {
    if (!selectedEditItem) return;
    setRemoveStockItem(selectedEditItem);
    setIsRemoveStockDrawerOpen(true);
  }, [selectedEditItem]);

  const handleProductDrawerOpenChange = useCallback((open: boolean) => {
    setIsProductDrawerOpen(open);
    if (!open) {
      setProductDrawerMode("create");
      setEditingItem(null);
    }
  }, []);

  const handleAddStockDrawerOpenChange = useCallback((open: boolean) => {
    setIsAddStockDrawerOpen(open);
    if (!open) setAddStockItem(null);
  }, []);

  const handleRemoveStockDrawerOpenChange = useCallback((open: boolean) => {
    setIsRemoveStockDrawerOpen(open);
    if (!open) setRemoveStockItem(null);
  }, []);

  const clearSelection = useCallback(() => setSelectedItems(new Set()), []);

  return (
    <div className="p-8 pb-32">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-[var(--color-oxygen-700)] mb-1 uppercase">
            {t("header.section")}
          </p>
          <h1 className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">
            {t("header.title")}{" "}
            <span className="text-[var(--fg-muted)] font-light">{t("header.titleSuffix")}</span>
          </h1>
        </div>
        <button
          onClick={openAddProduct}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] text-white rounded-lg font-bold text-sm shadow-lg shadow-[var(--color-oxygen-500)]/25 hover:shadow-xl hover:shadow-[var(--color-oxygen-500)]/40 hover:scale-105 transition-all duration-200"
        >
          <LuPlus size={18} strokeWidth={2.5} />
          {t("header.addProduct")}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KPICard title={t("kpi.totalSkus")} value={String(totalSkus)} meta={inventoryQuery.isFetching ? "..." : `${visibleItems.length} visible`} />
        <KPICard title={t("kpi.totalValue")} value={`$${totalValue.toFixed(2)}`} meta={t("kpi.valueMeta")} />
        <KPICard title={t("kpi.lowStockAlerts")} value={String(lowStockCount)} meta={t("kpi.alertsMeta")} isAlert={lowStockCount > 0} />
        <KPICard title={t("kpi.outOfStock")} value={String(outOfStockCount)} meta={t("kpi.outOfStockMeta")} isAlert={outOfStockCount > 0} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <InputGroup startElement={<LuSearch size={16} />} className="w-full">
            <input
              type="text"
              placeholder={t("filters.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-2 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)] transition-colors"
            />
          </InputGroup>
        </div>
        {[t("filters.categoryAll"), t("filters.supplierAll"), t("filters.statusActive")].map((label) => (
          <button key={label} className="px-3 py-2 text-sm border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-lg hover:bg-[var(--bg-subtle)] transition-colors">
            {label}
          </button>
        ))}
        <button aria-label={t("filters.filterAria")} className="p-2 text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors">
          <LuFilter size={16} />
        </button>
        <button aria-label={t("filters.exportAria")} className="p-2 text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors">
          <LuDownload size={16} />
        </button>
      </div>

      {/* Top Pagination */}
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <PaginationRoot count={totalSkus} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)} siblingCount={1}>
          <div className="flex items-center gap-1">
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </div>
        </PaginationRoot>
        <PaginationRoot count={totalSkus} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)}>
          <PaginationPageText format="long" />
        </PaginationRoot>
      </div>

      {/* Table */}
      <div className="border border-[var(--border-default)]/40 rounded-xl bg-[var(--bg-surface)]/80 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.02)] native-table-container">
        <table className="native-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>
                <Checkbox
                  checked={selectedVisibleCount > 0 && selectedVisibleCount < visibleItems.length ? "indeterminate" : visibleItems.length > 0 && selectedVisibleCount === visibleItems.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th>{t("table.productSku")}</th>
              <th>{t("table.category")}</th>
              <th className="text-end">{t("table.stockQty")}</th>
              <th className="text-center">{t("table.status")}</th>
              <th className="text-end">{t("table.priceCost")}</th>
            </tr>
          </thead>
          <tbody>
            {isInitialLoading ? (
              <tr><td colSpan={6}><div className="flex justify-center p-10"><span className="w-6 h-6 rounded-full border-2 border-[var(--color-oxygen-500)] border-t-transparent animate-spin" /></div></td></tr>
            ) : visibleItems.length === 0 ? (
              <tr><td colSpan={6}><div className="flex justify-center p-10 text-[var(--fg-muted)] text-sm">No inventory items found.</div></td></tr>
            ) : (
              visibleItems.map((item, index) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  categoryName={categoryNameById.get(item.categoryId) || item.categoryId}
                  isSelected={selectedItems.has(item.id)}
                  isEven={index % 2 === 0}
                  isLast={index === visibleItems.length - 1}
                  onToggle={toggleSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-5 gap-3 flex-wrap">
        <PaginationRoot count={totalSkus} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)} siblingCount={1}>
          <div className="flex items-center gap-1">
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </div>
        </PaginationRoot>
        <PaginationRoot count={totalSkus} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)}>
          <PaginationPageText format="long" />
        </PaginationRoot>
      </div>

      {/* Bulk Action Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl border border-gray-700 flex items-center gap-6 z-[100] animate-slide-in-bottom">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-[var(--color-oxygen-500)] text-white text-xs font-bold flex items-center justify-center">{selectedItems.size}</span>
            <span className="text-sm font-medium">{t("bulk.itemsSelected")}</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-4">
            <button
              onClick={openAddStock}
              disabled={!canEditSelection}
              className={cn(
                "flex items-center gap-1.5 text-sm px-2 transition-colors",
                canEditSelection ? "text-white hover:text-gray-200" : "opacity-50 cursor-not-allowed"
              )}
            >
              <LuPlus size={14} /> {t("bulk.add")}
            </button>
            <button
              onClick={openRemoveStock}
              disabled={!canEditSelection}
              className={cn(
                "flex items-center gap-1.5 text-sm px-2 transition-colors",
                canEditSelection ? "text-white hover:text-gray-200" : "opacity-50 cursor-not-allowed"
              )}
            >
              <LuMinus size={14} /> {t("bulk.removeStock")}
            </button>
            <button
              onClick={openEditProduct}
              disabled={!canEditSelection}
              className={cn(
                "flex items-center gap-1.5 text-sm px-2 transition-colors",
                canEditSelection ? "text-white hover:text-gray-200" : "opacity-50 cursor-not-allowed"
              )}
            >
              <LuPencil size={14} /> {t("bulk.edit")}
            </button>
            <button
              onClick={() => void removeSelected()}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm px-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <LuTrash2 size={14} /> {t("bulk.delete")}{deleting ? "…" : ""}
            </button>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <button onClick={clearSelection} aria-label={t("bulk.closeAria")} className="text-gray-400 hover:text-white transition-colors">
            <LuX size={16} />
          </button>
        </div>
      )}

      <AddProductDrawer
        open={isProductDrawerOpen}
        onOpenChange={handleProductDrawerOpenChange}
        mode={productDrawerMode}
        initialItem={editingItem}
        onCreate={handleAddProduct}
        onEdit={handleEditProduct}
      />
      <AddStockDrawer
        open={isAddStockDrawerOpen}
        item={addStockItem}
        onOpenChange={handleAddStockDrawerOpenChange}
        onSubmit={handleAddStock}
      />
      <RemoveStockDrawer
        open={isRemoveStockDrawerOpen}
        item={removeStockItem}
        onOpenChange={handleRemoveStockDrawerOpenChange}
        onSubmit={handleRemoveStock}
      />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

interface InventoryRowProps {
  item: InventoryItem;
  categoryName: string;
  isSelected: boolean;
  isEven: boolean;
  isLast: boolean;
  onToggle: (id: string) => void;
}

const getStatusLabel = (status: InventoryStatus, t: TFunction) => {
  if (status === "In Stock") return t("statusValues.inStock");
  if (status === "Low Stock") return t("statusValues.lowStock");
  return t("statusValues.outOfStock");
};

const InventoryRow = memo(function InventoryRow({ item, categoryName, isSelected, isEven, isLast, onToggle }: InventoryRowProps) {
  const { t } = useTranslation("inventory");
  const handleRowClick = useCallback(() => onToggle(item.id), [onToggle, item.id]);
  const handleCheckboxChange = useCallback(() => onToggle(item.id), [onToggle, item.id]);

  return (
    <tr
      className={cn("native-tr", isSelected ? "row-selected" : isEven ? "row-even" : "row-odd")}
      onClick={handleRowClick}
      style={{ cursor: "pointer", borderBottom: isLast ? "none" : "1px solid var(--border-muted)" }}
    >
      <td onClick={(e) => e.stopPropagation()} style={{ width: "40px" }}>
        <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} />
      </td>
      <td>
        <span className="text-sm font-semibold text-[var(--fg-default)]">
          {item.name}{" "}
          <span className="text-[var(--fg-muted)] font-normal">• {t("table.sku")}: {item.sku}</span>
        </span>
      </td>
      <td>
        <span className="text-xs font-semibold text-[var(--fg-muted)] tracking-wide">{categoryName}</span>
      </td>
      <td className="text-end">
        <span className="text-sm font-semibold text-[var(--fg-default)]">
          {item.stockQuantity}{" "}
          <span className="text-xs text-[var(--fg-muted)] font-normal">{item.unit}</span>
        </span>
      </td>
      <td className="text-center">
        <Status value={item.status === "In Stock" ? "success" : item.status === "Low Stock" ? "warning" : "error"} size="sm" className="inline-flex">
          <span className="text-xs font-medium text-[var(--fg-default)]">{getStatusLabel(item.status, t)}</span>
        </Status>
      </td>
      <td className="text-end">
        <span className="text-sm font-semibold text-[var(--fg-default)]">${item.price.toFixed(2)}</span>
        <div className="text-xs text-[var(--fg-muted)]">{t("table.cost")}: ${item.cost.toFixed(2)}</div>
      </td>
    </tr>
  );
});

const KPICard = memo(function KPICard({ title, value, meta, isAlert }: { title: string; value: string; meta: string; isAlert?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border-muted)]/40 bg-[var(--bg-surface)]/80 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.02)] px-5 py-4">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm text-[var(--fg-muted)] font-medium flex-1">{title}</p>
        <span className={cn("text-xs font-bold", isAlert ? "text-red-600" : "text-[var(--color-oxygen-600)]")}>{meta}</span>
      </div>
      <p className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">{value}</p>
    </div>
  );
});
