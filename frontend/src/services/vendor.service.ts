import { PAGINATION_DEFAULTS } from "../lib/constants";
import { authedFetch, readJson } from "../lib/api";
import type { PaginatedMeta } from "../types/pagination.types";
import { CreateVendorParams, UpdateVendorParams, Vendor, VendorOperationResult } from "../types/vendor.types";

type VendorResponse = { vendor: Vendor };

export interface VendorListQuery {
    status?: "Active" | "Archived";
    q?: string;
    page?: number;
    pageSize?: number;
}

export interface PaginatedVendorResponse extends PaginatedMeta {
    vendors: Vendor[];
}

export async function fetchVendorsPage(query: VendorListQuery = {}): Promise<PaginatedVendorResponse> {
    const params = new URLSearchParams();
    if (query.status) params.append("status", query.status);
    if (query.q?.trim()) params.append("q", query.q.trim());
    params.append("page", String(query.page ?? PAGINATION_DEFAULTS.page));
    params.append("pageSize", String(query.pageSize ?? PAGINATION_DEFAULTS.pageSize));

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await authedFetch(`/vendors${queryString}`);
    return readJson<PaginatedVendorResponse>(response);
}

async function fetchVendorsLookup(status: "Active" | "Archived"): Promise<Vendor[]> {
    const params = new URLSearchParams();
    params.append("status", status);

    const response = await authedFetch(`/vendors/lookup?${params.toString()}`);
    const body = await readJson<{ vendors: Vendor[] }>(response);
    return body.vendors;
}

export async function fetchVendors(status?: "Active" | "Archived", q?: string): Promise<Vendor[]> {
    if (status && !q?.trim()) {
        return fetchVendorsLookup(status);
    }

    const vendors: Vendor[] = [];
    let page = PAGINATION_DEFAULTS.page;

    while (true) {
        const body = await fetchVendorsPage({
            status,
            q,
            page,
            pageSize: PAGINATION_DEFAULTS.maxPageSize,
        });
        vendors.push(...body.vendors);
        if (!body.hasMore) {
            break;
        }
        page += 1;
    }

    return vendors;
}

export async function createVendor(data: CreateVendorParams): Promise<VendorOperationResult<Vendor>> {
    try {
        const response = await authedFetch("/vendors", {
            method: "POST",
            body: JSON.stringify(data),
        });
        const body = await readJson<VendorResponse>(response);
        return { success: true, data: body.vendor };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Failed to create vendor" };
    }
}

export async function updateVendor(id: string, data: UpdateVendorParams): Promise<VendorOperationResult<Vendor>> {
    try {
        const response = await authedFetch(`/vendors/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        const body = await readJson<VendorResponse>(response);
        return { success: true, data: body.vendor };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Failed to update vendor" };
    }
}

export async function archiveVendor(id: string): Promise<VendorOperationResult> {
    try {
        const response = await authedFetch(`/vendors/${id}/archive`, {
            method: "POST",
        });
        await readJson<{ success: boolean }>(response);
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Failed to archive vendor" };
    }
}

export async function restoreVendor(id: string): Promise<VendorOperationResult> {
    try {
        const response = await authedFetch(`/vendors/${id}/restore`, {
            method: "POST",
        });
        await readJson<{ success: boolean }>(response);
        return { success: true };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Failed to restore vendor" };
    }
}
