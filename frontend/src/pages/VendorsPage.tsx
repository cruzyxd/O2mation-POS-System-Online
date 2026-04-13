import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { Plus as LuPlus, Search as LuSearch, Archive as LuArchive, ArchiveRestore as LuArchiveRestore, Pen as LuPen, LayoutGrid as LuLayoutGrid } from "lucide-react";
import { PAGINATION_DEFAULTS } from "../lib/constants";
import { queryKeys } from "../lib/queryKeys";
import { fetchVendorsPage, archiveVendor, restoreVendor, createVendor, updateVendor } from "../services/vendor.service";
import type { Vendor, CreateVendorParams } from "../types/vendor.types";
import { InputGroup } from "../components/ui/input-group";
import { PaginationItems, PaginationNextTrigger, PaginationPageText, PaginationPrevTrigger, PaginationRoot } from "../components/ui/pagination";
import { toaster } from "../components/ui/toaster";
import { VendorDrawer } from "../components/vendors/VendorDrawer";
import { ArchiveVendorModal } from "../components/vendors/ArchiveVendorModal";
import { RestoreVendorModal } from "../components/vendors/RestoreVendorModal";
import { cn } from "@/lib/cn";
import { useAuth } from "../store/auth.store";

type TabState = "active" | "archived";

export function VendorsPage() {
    const { t } = useTranslation("vendors");
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const canMutate = user?.role === "owner_admin" || user?.role === "manager";

    const [tab, setTab] = useState<TabState>("active");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.page);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [vendorToArchive, setVendorToArchive] = useState<Vendor | null>(null);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [vendorToRestore, setVendorToRestore] = useState<Vendor | null>(null);

    useEffect(() => {
        const handle = window.setTimeout(() => { setSearchQuery(searchInput.trim()); setPage(PAGINATION_DEFAULTS.page); }, 250);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

    useEffect(() => { setPage(PAGINATION_DEFAULTS.page); }, [tab]);

    const status = tab === "active" ? "Active" : "Archived";

    const vendorsQuery = useQuery({
        queryKey: queryKeys.vendors.list(status, page, PAGINATION_DEFAULTS.pageSize, searchQuery),
        queryFn: () => fetchVendorsPage({ status, q: searchQuery || undefined, page, pageSize: PAGINATION_DEFAULTS.pageSize }),
        placeholderData: keepPreviousData,
    });

    const activeCountQuery = useQuery({
        queryKey: queryKeys.vendors.count("Active", searchQuery),
        queryFn: () => fetchVendorsPage({ status: "Active", q: searchQuery || undefined, page: 1, pageSize: 1 }),
        enabled: tab !== "active",
    });

    const archivedCountQuery = useQuery({
        queryKey: queryKeys.vendors.count("Archived", searchQuery),
        queryFn: () => fetchVendorsPage({ status: "Archived", q: searchQuery || undefined, page: 1, pageSize: 1 }),
        enabled: tab !== "archived",
    });

    useEffect(() => {
        if (!vendorsQuery.error) return;
        toaster.create({ title: vendorsQuery.error instanceof Error ? vendorsQuery.error.message : "Failed to fetch vendors", type: "error" });
    }, [vendorsQuery.error]);

    const vendors = vendorsQuery.data?.vendors ?? [];
    const activeCount = tab === "active" ? (vendorsQuery.data?.total ?? 0) : (activeCountQuery.data?.total ?? 0);
    const archivedCount = tab === "archived" ? (vendorsQuery.data?.total ?? 0) : (archivedCountQuery.data?.total ?? 0);
    const isInitialLoading = vendorsQuery.isLoading && !vendorsQuery.data;

    const showPermissionDenied = () => {
        toaster.create({ title: t("messages.permissionDenied"), type: "error" });
    };

    const openDrawerForNew = () => {
        if (!canMutate) {
            showPermissionDenied();
            return;
        }
        setEditingVendor(null);
        setDrawerOpen(true);
    };
    const openDrawerForEdit = (v: Vendor) => {
        if (!canMutate) {
            showPermissionDenied();
            return;
        }
        setEditingVendor(v);
        setDrawerOpen(true);
    };
    const openArchiveFor = (v: Vendor) => {
        if (!canMutate) {
            showPermissionDenied();
            return;
        }
        setVendorToArchive(v);
        setArchiveModalOpen(true);
    };
    const openRestoreFor = (v: Vendor) => {
        if (!canMutate) {
            showPermissionDenied();
            return;
        }
        setVendorToRestore(v);
        setRestoreModalOpen(true);
    };

    const handleSaveVendor = async (data: CreateVendorParams) => {
        if (!canMutate) {
            const message = t("messages.permissionDenied");
            toaster.create({ title: message, type: "error" });
            throw new Error(message);
        }

        const res = editingVendor ? await updateVendor(editingVendor.id, data) : await createVendor(data);
        if (res.success) {
            toaster.create({ title: editingVendor ? t("editDialog.success") : t("createDialog.success"), type: "success" });
            setPage(PAGINATION_DEFAULTS.page);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["vendors", "list"] }),
                queryClient.invalidateQueries({ queryKey: ["vendors", "count"] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.vendors.activeLookup, exact: true }),
            ]);
            return;
        }

        const message = (res.message ?? "").toLowerCase() === "forbidden"
            ? t("messages.permissionDenied")
            : (res.message || t("createDialog.error"));
        toaster.create({ title: message, type: "error" });
        throw new Error(message);
    };

    const handleArchiveConfirm = async () => {
        if (!canMutate) {
            showPermissionDenied();
            return;
        }

        if (!vendorToArchive) return;
        const res = await archiveVendor(vendorToArchive.id);
        if (res.success) {
            toaster.create({ title: t("archiveDialog.success"), type: "success" });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["vendors", "list"] }),
                queryClient.invalidateQueries({ queryKey: ["vendors", "count"] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.vendors.activeLookup, exact: true }),
            ]);
        } else {
            const message = (res.message ?? "").toLowerCase() === "forbidden"
                ? t("messages.permissionDenied")
                : (res.message || t("archiveDialog.error"));
            toaster.create({ title: message, type: "error" });
        }
    };

    const handleRestoreConfirm = async () => {
        if (!canMutate) {
            showPermissionDenied();
            return;
        }

        if (!vendorToRestore) return;
        const res = await restoreVendor(vendorToRestore.id);
        if (res.success) {
            toaster.create({ title: t("restoreDialog.success"), type: "success" });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["vendors", "list"] }),
                queryClient.invalidateQueries({ queryKey: ["vendors", "count"] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.vendors.activeLookup, exact: true }),
            ]);
        } else {
            const message = (res.message ?? "").toLowerCase() === "forbidden"
                ? t("messages.permissionDenied")
                : (res.message || t("restoreDialog.error"));
            toaster.create({ title: message, type: "error" });
        }
    };

    const tabBtnCls = (active: boolean) => cn(
        "flex items-center gap-2.5 px-4 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200 w-full",
        active
            ? "bg-[var(--bg-surface)] shadow-sm font-bold text-[var(--color-oxygen-700)] dark:text-[var(--color-oxygen-500)]"
            : "text-[var(--fg-muted)] font-medium hover:bg-[var(--nav-hover-bg)]"
    );

    return (
        <div className="bg-[var(--bg-page)] min-h-screen pb-10">
            {/* Header */}
            <div className="pt-10 pb-8 px-8 lg:px-16">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)] mb-2">{t("title")}</h1>
                        <p className="text-[var(--fg-muted)] text-base">{t("subtitle")}</p>
                    </div>
                    {canMutate && (
                        <button
                            onClick={openDrawerForNew}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] text-white rounded-lg font-bold text-sm shadow-lg shadow-[var(--color-oxygen-500)]/25 hover:shadow-xl hover:shadow-[var(--color-oxygen-500)]/40 hover:scale-105 transition-all duration-200"
                        >
                            <LuPlus size={18} strokeWidth={2.5} />
                            {t("actions.create")}
                        </button>
                    )}
                </div>
            </div>

            {/* Main */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 px-8 lg:px-16 max-w-[90rem]">
                {/* Sidebar */}
                <div className="pt-1">
                    <InputGroup startElement={<LuSearch size={16} />} className="w-full mb-6">
                        <input
                            type="text"
                            placeholder={t("search")}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-2 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] transition-colors"
                        />
                    </InputGroup>
                    <p className="text-xs font-bold text-[var(--fg-subtle)] mb-4 px-2 tracking-widest uppercase">VIEW</p>
                    <div className="flex flex-col gap-1 mb-8">
                        <button className={tabBtnCls(tab === "active")} onClick={() => setTab("active")}>
                            <LuLayoutGrid size={16} />
                            <span className="flex-1 text-start">{t("statusFilter.active")}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-oxygen-100)] text-[var(--color-oxygen-700)] font-bold">{activeCount}</span>
                        </button>
                        <button className={tabBtnCls(tab === "archived")} onClick={() => setTab("archived")}>
                            <LuArchive size={16} />
                            <span className="flex-1 text-start">{t("statusFilter.archived")}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--fg-muted)] font-bold">{archivedCount}</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div>
                    {isInitialLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <span className="w-10 h-10 rounded-full border-4 border-[var(--color-oxygen-500)] border-t-transparent animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="border border-[var(--border-default)]/40 rounded-xl overflow-x-auto bg-[var(--bg-surface)]/80 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.02)] native-table-container">
                                <table className="native-table">
                                    <thead>
                                        <tr>
                                            <th style={{ whiteSpace: "nowrap" }}>{t("table.name")}</th>
                                            <th style={{ whiteSpace: "nowrap" }}>{t("table.phone")}</th>
                                            <th style={{ whiteSpace: "nowrap" }}>{t("table.createdAt")}</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vendors.length === 0 && (
                                            <tr><td colSpan={4}>
                                                <div className="py-8 text-center">
                                                    <p className="text-[var(--fg-muted)]">{t("empty.title")}</p>
                                                    <p className="text-sm text-[var(--fg-subtle)]">{t("empty.description")}</p>
                                                </div>
                                            </td></tr>
                                        )}
                                        {vendors.map((item, index) => (
                                            <tr key={item.id} className={`native-tr ${index % 2 === 0 ? "row-even" : "row-odd"}`}>
                                                <td>
                                                    <p className="text-sm font-semibold text-[var(--fg-default)]">{item.name}</p>
                                                    {item.notes && <p className="text-xs text-[var(--fg-muted)] truncate max-w-[200px]">{item.notes}</p>}
                                                </td>
                                                <td className="text-sm text-[var(--fg-muted)]">{item.phone || "-"}</td>
                                                <td className="text-sm text-[var(--fg-muted)]">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                <td className="text-end">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        {!canMutate ? (
                                                            <span className="text-xs text-[var(--fg-subtle)]">-</span>
                                                        ) : item.status === "Active" ? (
                                                            <>
                                                                <button onClick={() => openDrawerForEdit(item)} className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--fg-default)] transition-colors">
                                                                    <LuPen size={12} /> {t("actions.edit")}
                                                                </button>
                                                                <button onClick={() => openArchiveFor(item)} className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-red-50 text-red-600 transition-colors">
                                                                    <LuArchive size={12} /> {t("actions.archive")}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => openRestoreFor(item)} className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-green-50 text-green-600 transition-colors">
                                                                <LuArchiveRestore size={12} /> {t("actions.restore")}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center mt-5 gap-3 flex-wrap">
                                <PaginationRoot count={vendorsQuery.data?.total ?? 0} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)} siblingCount={1}>
                                    <div className="flex items-center gap-1">
                                        <PaginationPrevTrigger />
                                        <PaginationItems />
                                        <PaginationNextTrigger />
                                    </div>
                                </PaginationRoot>
                                <PaginationRoot count={vendorsQuery.data?.total ?? 0} pageSize={PAGINATION_DEFAULTS.pageSize} page={page} onPageChange={(d) => setPage(d.page)}>
                                    <PaginationPageText format="long" />
                                </PaginationRoot>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <VendorDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={handleSaveVendor} initialData={editingVendor} />
            <ArchiveVendorModal open={archiveModalOpen} onOpenChange={setArchiveModalOpen} vendor={vendorToArchive} onConfirm={handleArchiveConfirm} />
            <RestoreVendorModal open={restoreModalOpen} onOpenChange={setRestoreModalOpen} vendor={vendorToRestore} onConfirm={handleRestoreConfirm} />
        </div>
    );
}
