import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Plus as LuPlus,
  Search as LuSearch,
  Archive as LuArchive,
  ArchiveRestore as LuArchiveRestore,
  LayoutGrid as LuLayoutGrid,
  ArrowLeft as LuArrowLeft,
  ChevronRight as LuChevronRight,
} from "lucide-react";
import { PAGINATION_DEFAULTS, CATEGORY_CONSTANTS } from "../lib/constants";
import { queryKeys } from "../lib/queryKeys";
import {
  fetchActiveCategories,
  fetchCategories,
  archiveCategory,
  restoreCategory,
  createCategory,
  updateCategory,
} from "../services/categories.service";
import type { Category } from "../types/inventory.types";
import { InputGroup } from "../components/ui/input-group";
import { PaginationItems, PaginationNextTrigger, PaginationPageText, PaginationPrevTrigger, PaginationRoot } from "../components/ui/pagination";
import { toaster } from "../components/ui/toaster";
import { CategoryDrawer } from "../components/categories/CategoryDrawer";
import { ArchiveCategoryModal } from "../components/categories/ArchiveCategoryModal";
import { RestoreCategoryModal } from "../components/categories/RestoreCategoryModal";
import { CategoryCard } from "../components/categories/CategoryCard";
import { CATEGORY_ICONS } from "../components/categories/IconPicker";
import { CATEGORY_COLORS } from "../components/categories/ColorPicker";
import { cn } from "@/lib/cn";
import { Package } from "lucide-react";
import { useAuth } from "../store/auth.store";

type TabState = "active" | "archived";

// -- Small subcategory card used in the drill-down view -----------------------
interface SubcardProps {
  sub: Category;
  canMutate: boolean;
  onEdit: (c: Category) => void;
  onArchive: (c: Category) => void;
}
function SubcategoryCard({ sub, canMutate, onEdit, onArchive }: SubcardProps) {
  return (
    <div className="group bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all duration-200">
      <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center flex-shrink-0">
        <Package size={16} className="text-[var(--fg-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--fg-default)] truncate">{sub.name}</p>
        <p className="text-xs text-[var(--fg-subtle)] dark:text-gray-400 font-mono">{sub.code}</p>
      </div>
      {canMutate && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(sub)}
            className="p-1.5 rounded-lg text-[var(--fg-muted)] dark:text-gray-300 hover:bg-[var(--bg-subtle)] dark:hover:bg-white/10 dark:hover:text-white hover:text-[var(--fg-default)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onArchive(sub)}
            className="p-1.5 rounded-lg text-[var(--fg-muted)] dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// -- ArchivedCategoryRow: simple table row for Archived tab ------------------
interface ArchivedRowProps {
  item: Category;
  canMutate: boolean;
  onRestore: (c: Category) => void;
}
function ArchivedCategoryRow({ item, canMutate, onRestore }: ArchivedRowProps) {
  const { t } = useTranslation("inventory");
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-4 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
      <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center flex-shrink-0">
        <LuArchive size={15} className="text-[var(--fg-subtle)] dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--fg-default)] line-through truncate">
          {item.name}
        </p>
        <p className="text-xs text-[var(--fg-subtle)] dark:text-gray-400 font-mono">{item.code}</p>
      </div>
      <p className="text-xs text-[var(--fg-subtle)] dark:text-gray-400">
        {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString() : "—"}
      </p>
      {canMutate && (
        <button
          type="button"
          onClick={() => onRestore(item)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors font-medium border border-green-200"
        >
          <LuArchiveRestore size={12} /> {t("categories.actions.restore")}
        </button>
      )}
    </div>
  );
}

// -- Main Page ----------------------------------------------------------------
export function CategoriesPage() {
  const { t } = useTranslation("inventory");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canMutate = user?.role === "owner_admin" || user?.role === "manager";

  const [tab, setTab] = useState<TabState>("active");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.page);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [categoryToRestore, setCategoryToRestore] = useState<Category | null>(null);

  /** When set, display the drill-down (subcategory) view for this parent category. */
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => { setSearchQuery(searchInput.trim()); setPage(PAGINATION_DEFAULTS.page); }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => { setPage(PAGINATION_DEFAULTS.page); }, [tab]);

  // Closing drill-down when switching tabs
  useEffect(() => { setSelectedParentId(null); }, [tab]);

  const status = tab === "active" ? "Active" : "Archived";

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list(status, page, PAGINATION_DEFAULTS.pageSize, searchQuery),
    queryFn: () => fetchCategories({ status, page, pageSize: PAGINATION_DEFAULTS.pageSize, q: searchQuery || undefined }),
    placeholderData: keepPreviousData,
  });

  const activeCountQuery = useQuery({
    queryKey: queryKeys.categories.count("Active", searchQuery),
    queryFn: () => fetchCategories({ status: "Active", page: 1, pageSize: 1, q: searchQuery || undefined }),
    enabled: tab !== "active",
  });

  const archivedCountQuery = useQuery({
    queryKey: queryKeys.categories.count("Archived", searchQuery),
    queryFn: () => fetchCategories({ status: "Archived", page: 1, pageSize: 1, q: searchQuery || undefined }),
    enabled: tab !== "archived",
  });

  const activeCategoriesLookupQuery = useQuery({
    queryKey: queryKeys.inventory.categoriesLookup,
    queryFn: fetchActiveCategories,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!categoriesQuery.error) return;
    const message = categoriesQuery.error instanceof Error ? categoriesQuery.error.message : t("categories.messages.fetchError");
    toaster.create({ title: message, type: "error" });
  }, [categoriesQuery.error, t]);

  const activeCategories = activeCategoriesLookupQuery.data ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const activeCount = tab === "active" ? (categoriesQuery.data?.total ?? 0) : (activeCountQuery.data?.total ?? 0);
  const archivedCount = tab === "archived" ? (categoriesQuery.data?.total ?? 0) : (archivedCountQuery.data?.total ?? 0);
  const isInitialLoading = categoriesQuery.isLoading && !categoriesQuery.data;

  /** Maps parent category id → its subcategories (from the paginated active list) */
  const subcategoriesByParentId = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? [];
        arr.push(c);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [categories]);

  /** All main categories (no parent) in the current page */
  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.id !== CATEGORY_CONSTANTS.UNASSIGNED_ID),
    [categories]
  );

  /** The currently selected parent category object for drill-down */
  const selectedParent = useMemo(
    () => (selectedParentId ? categories.find((c) => c.id === selectedParentId) ?? null : null),
    [selectedParentId, categories]
  );

  /** The default unassigned category */
  const unassignedCategory = useMemo(
    () => categories.find((c) => c.id === CATEGORY_CONSTANTS.UNASSIGNED_ID) ?? null,
    [categories]
  );

  const showPermissionDenied = () => {
    toaster.create({ title: t("categories.messages.permissionDenied"), type: "error" });
  };

  const openDrawerForNew = () => {
    if (!canMutate) {
      showPermissionDenied();
      return;
    }
    setEditingCategory(null);
    setDrawerOpen(true);
  };
  const openDrawerForEdit = (c: Category) => {
    if (!canMutate) {
      showPermissionDenied();
      return;
    }
    setEditingCategory(c);
    setDrawerOpen(true);
  };
  const openArchiveFor = (c: Category) => {
    if (!canMutate) {
      showPermissionDenied();
      return;
    }
    if (c.id === CATEGORY_CONSTANTS.UNASSIGNED_ID) return;
    setCategoryToArchive(c);
    setArchiveModalOpen(true);
  };
  const openRestoreFor = (c: Category) => {
    if (!canMutate) {
      showPermissionDenied();
      return;
    }
    setCategoryToRestore(c);
    setRestoreModalOpen(true);
  };

  const invalidateAll = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["categories", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["categories", "count"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.categoriesLookup, exact: true }),
  ]);

  const handleSaveCategory = async (data: Partial<Category>) => {
    if (!canMutate) {
      const message = t("categories.messages.permissionDenied");
      toaster.create({ title: message, type: "error" });
      throw new Error(message);
    }

    const res = editingCategory ? await updateCategory(editingCategory.id, data) : await createCategory(data);
    if (res.success) {
      toaster.create({ title: t("categories.messages.saveSuccess"), type: "success" });
      setPage(PAGINATION_DEFAULTS.page);
      await invalidateAll();
      return;
    }

    const message = res.message === "forbidden"
      ? t("categories.messages.permissionDenied")
      : (res.message || t("categories.messages.saveError"));
    toaster.create({ title: message, type: "error" });
    throw new Error(message);
  };

  const handleArchiveConfirm = async (option: "MOVE_TO_UNASSIGNED" | "ARCHIVE_WITH_PRODUCTS") => {
    if (!canMutate) {
      showPermissionDenied();
      return;
    }

    if (!categoryToArchive) return;
    const res = await archiveCategory(categoryToArchive.id, option);
    if (res.success) {
      toaster.create({ title: t("categories.messages.archiveSuccess"), type: "success" });
      if (selectedParentId === categoryToArchive.id) setSelectedParentId(null);
      await invalidateAll();
    } else {
      const blockedBySubcategories = (res.message ?? "").toLowerCase().includes("active subcategories");
      const forbidden = (res.message ?? "").toLowerCase() === "forbidden";
      toaster.create({
        title: forbidden
          ? t("categories.messages.permissionDenied")
          : blockedBySubcategories
            ? t("categories.messages.archiveBlockedBySubcategories")
            : res.message || t("categories.messages.archiveError"),
        type: "error",
      });
    }
  };

  const handleRestoreConfirm = async () => {
    if (!canMutate) {
      showPermissionDenied();
      return;
    }

    if (!categoryToRestore) return;
    const res = await restoreCategory(categoryToRestore.id);
    if (res.success) {
      toaster.create({ title: t("categories.messages.restoreSuccess"), type: "success" });
      await invalidateAll();
    } else {
      const message = (res.message ?? "").toLowerCase() === "forbidden"
        ? t("categories.messages.permissionDenied")
        : (res.message || t("categories.messages.restoreError"));
      toaster.create({ title: message, type: "error" });
    }
  };

  const tabBtnCls = (active: boolean) => cn(
    "flex items-center gap-2.5 px-4 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200 w-full",
    active
      ? "bg-[var(--bg-surface)] shadow-sm font-bold text-[var(--color-oxygen-700)] dark:text-[var(--color-oxygen-500)]"
      : "text-[var(--fg-muted)] font-medium hover:bg-[var(--nav-hover-bg)]"
  );

  // -- Drill-down (Subcategory) View -----------------------------------------
  const renderSubcategoryView = () => {
    if (!selectedParent) return null;
    const subs = subcategoriesByParentId.get(selectedParent.id) ?? [];
    const colorKey = selectedParent.color ?? "slate";
    const colorCfg = CATEGORY_COLORS[colorKey] ?? CATEGORY_COLORS["slate"];
    const IconComp = selectedParent.icon ? (CATEGORY_ICONS[selectedParent.icon] ?? Package) : Package;

    return (
      <div>
        {/* Back button + breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setSelectedParentId(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--fg-default)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <LuArrowLeft size={15} />
            {t("categories.tabs.active")}
          </button>
          <LuChevronRight size={14} className="text-[var(--fg-subtle)] dark:text-gray-400" />
          <span className="text-sm font-semibold text-[var(--fg-default)]">{selectedParent.name}</span>
        </div>

        {/* Parent category hero banner */}
        <div className={cn("relative rounded-2xl overflow-hidden mb-8 shadow-sm border border-[var(--border-default)]", colorCfg.bgLight, "p-6")}>
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", colorCfg.bgStrong)}>
              <IconComp size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--fg-heading)]">{selectedParent.name}</h2>
              <p className="text-sm font-mono text-[var(--fg-muted)] dark:text-gray-300 mt-0.5">{selectedParent.code}</p>
            </div>
            <div className="ms-auto flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold font-[var(--font-heading)] text-[var(--fg-heading)]">
                  {subs.length}
                </p>
                <p className="text-xs text-[var(--fg-muted)] dark:text-gray-300 mt-0.5">
                  {t("categories.drillDown.subcategories")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-[var(--font-heading)] text-[var(--fg-heading)]">
                  {selectedParent.totalItems ?? selectedParent.productCount}
                </p>
                <p className="text-xs text-[var(--fg-muted)] dark:text-gray-300 mt-0.5">
                  Cumulative Products
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-[var(--font-heading)] text-[var(--fg-heading)]">
                  {selectedParent.productCount}
                </p>
                <p className="text-xs text-[var(--fg-muted)] dark:text-gray-300 mt-0.5">
                  Direct Products
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subcategory grid */}
        {subs.length === 0 ? (
          <div className="text-center py-16 text-[var(--fg-subtle)] dark:text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("categories.drillDown.noSubs")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subs.map((sub) => (
              <SubcategoryCard
                key={sub.id}
                sub={sub}
                canMutate={canMutate}
                onEdit={openDrawerForEdit}
                onArchive={openArchiveFor}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // -- Main categories grid view ---------------------------------------------
  const renderMainGrid = () => (
    <>
      {mainCategories.length === 0 && !unassignedCategory && !isInitialLoading ? (
        <div className="text-center py-20 text-[var(--fg-subtle)] dark:text-gray-400">
          <Package size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">{t("categories.main.noCategories")}</p>
        </div>
      ) : (
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {/* Unassigned category - always spans full width in the first row */}
          {unassignedCategory && (
            <div className="col-span-full">
              <CategoryCard
                category={unassignedCategory}
                subcategories={subcategoriesByParentId.get(unassignedCategory.id) ?? []}
                canMutate={canMutate}
                onClick={(c) => setSelectedParentId(c.id)}
                onEdit={openDrawerForEdit}
                onArchive={openArchiveFor}
              />
            </div>
          )}

          {mainCategories.map((cat) => (
            <div
              key={cat.id}
              className="col-span-1"
            >
              <CategoryCard
                category={cat}
                subcategories={subcategoriesByParentId.get(cat.id) ?? []}
                canMutate={canMutate}
                onClick={(c) => setSelectedParentId(c.id)}
                onEdit={openDrawerForEdit}
                onArchive={openArchiveFor}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(categoriesQuery.data?.total ?? 0) > PAGINATION_DEFAULTS.pageSize && (
        <div className="flex justify-between items-center mt-8 gap-3 flex-wrap">
          <PaginationRoot count={categoriesQuery.data?.total ?? 0} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)} siblingCount={1}>
            <div className="flex items-center gap-1">
              <PaginationPrevTrigger />
              <PaginationItems />
              <PaginationNextTrigger />
            </div>
          </PaginationRoot>
          <PaginationRoot count={categoriesQuery.data?.total ?? 0} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)}>
            <PaginationPageText format="long" />
          </PaginationRoot>
        </div>
      )}
    </>
  );

  // -- Archived view ---------------------------------------------------------
  const renderArchivedView = () => (
    <div className="flex flex-col gap-3">
      {categories.length === 0 && !isInitialLoading ? (
        <div className="text-center py-20 text-[var(--fg-subtle)] dark:text-gray-400">
          <LuArchive size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">{t("categories.archived.noArchived")}</p>
        </div>
      ) : (
        categories.map((item) => (
          <ArchivedCategoryRow key={item.id} item={item} canMutate={canMutate} onRestore={openRestoreFor} />
        ))
      )}
      {(categoriesQuery.data?.total ?? 0) > PAGINATION_DEFAULTS.pageSize && (
        <div className="flex justify-between items-center mt-5 gap-3 flex-wrap">
          <PaginationRoot count={categoriesQuery.data?.total ?? 0} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)} siblingCount={1}>
            <div className="flex items-center gap-1">
              <PaginationPrevTrigger />
              <PaginationItems />
              <PaginationNextTrigger />
            </div>
          </PaginationRoot>
          <PaginationRoot count={categoriesQuery.data?.total ?? 0} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)}>
            <PaginationPageText format="long" />
          </PaginationRoot>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[var(--bg-page)] min-h-screen pb-10">
      {/* Header */}
      <div className="pt-10 pb-8 px-8 lg:px-16">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)] mb-2">
              {t("categories.header.title")}
            </h1>
            <p className="text-[var(--fg-muted)] dark:text-gray-300 text-base">{t("categories.header.subtitle")}</p>
          </div>
          {canMutate && (
            <button
              onClick={openDrawerForNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] text-white rounded-lg font-bold text-sm shadow-lg shadow-[var(--color-oxygen-500)]/25 hover:shadow-xl hover:shadow-[var(--color-oxygen-500)]/40 hover:scale-105 transition-all duration-200"
            >
              <LuPlus size={18} strokeWidth={2.5} />
              {t("categories.actions.addCategory")}
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 px-8 lg:px-16">
        {/* Sidebar nav */}
        <div className="pt-1">
          <InputGroup startElement={<LuSearch size={16} />} className="w-full mb-6">
            <input
              type="text"
              placeholder={t("categories.filters.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] transition-colors"
            />
          </InputGroup>
          <p className="text-xs font-bold text-[var(--fg-subtle)] dark:text-gray-400 mb-4 px-2 tracking-widest uppercase">
            {t("categories.sidebar.view")}
          </p>
          <div className="flex flex-col gap-1 mb-8">
            <button className={tabBtnCls(tab === "active")} onClick={() => setTab("active")}>
              <LuLayoutGrid size={16} />
              <span className="flex-1 text-start">{t("categories.tabs.active")}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-oxygen-100)] text-[var(--color-oxygen-700)] font-bold">{activeCount}</span>
            </button>
            <button className={tabBtnCls(tab === "archived")} onClick={() => setTab("archived")}>
              <LuArchive size={16} />
              <span className="flex-1 text-start">{t("categories.tabs.archived")}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] dark:bg-white/5 text-[var(--fg-muted)] dark:text-gray-300 font-bold">{archivedCount}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {isInitialLoading ? (
            <div className="flex justify-center items-center py-20">
              <span className="w-10 h-10 rounded-full border-4 border-[var(--color-oxygen-500)] border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              {tab === "active" && (selectedParentId ? renderSubcategoryView() : renderMainGrid())}
              {tab === "archived" && renderArchivedView()}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CategoryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={handleSaveCategory} initialData={editingCategory} activeCategories={activeCategories} />
      <ArchiveCategoryModal open={archiveModalOpen} onOpenChange={setArchiveModalOpen} category={categoryToArchive} onConfirm={handleArchiveConfirm} />
      <RestoreCategoryModal open={restoreModalOpen} onOpenChange={setRestoreModalOpen} category={categoryToRestore} onConfirm={handleRestoreConfirm} />
    </div>
  );
}
