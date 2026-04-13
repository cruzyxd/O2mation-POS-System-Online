import { PAGINATION_DEFAULTS } from "../lib/constants";
import { ArchivedProductSet, Category, CategoryOperationResult } from "../types/inventory.types";
import type { PaginatedMeta } from "../types/pagination.types";

import { authedFetch, readJson } from "../lib/api";

type CategoryResponse = { category: Category };

export interface CategoryListQuery {
  status: "Active" | "Archived";
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface PaginatedCategoryResponse extends PaginatedMeta {
  categories: Category[];
}

export interface ArchivedSetsQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedArchivedSetsResponse extends PaginatedMeta {
  archivedSets: ArchivedProductSet[];
}

async function fetchCategoriesPage(query: CategoryListQuery): Promise<PaginatedCategoryResponse> {
  const params = new URLSearchParams();
  params.set("status", query.status);
  params.set("page", String(query.page ?? PAGINATION_DEFAULTS.page));
  params.set("pageSize", String(query.pageSize ?? PAGINATION_DEFAULTS.pageSize));
  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }

  const response = await authedFetch(`/categories?${params.toString()}`);
  return readJson<PaginatedCategoryResponse>(response);
}

async function fetchCategoryLookup(status: "Active" | "Archived"): Promise<Category[]> {
  const params = new URLSearchParams();
  params.set("status", status);

  const response = await authedFetch(`/categories/lookup?${params.toString()}`);
  const body = await readJson<{ categories: Category[] }>(response);
  return body.categories;
}

export async function fetchActiveCategories(): Promise<Category[]> {
  return fetchCategoryLookup("Active");
}

export async function fetchArchivedCategories(): Promise<Category[]> {
  return fetchCategoryLookup("Archived");
}

export async function fetchCategories(query: CategoryListQuery): Promise<PaginatedCategoryResponse> {
  return fetchCategoriesPage(query);
}

export async function fetchArchivedSets(query: ArchivedSetsQuery = {}): Promise<PaginatedArchivedSetsResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? PAGINATION_DEFAULTS.page));
  params.set("pageSize", String(query.pageSize ?? PAGINATION_DEFAULTS.pageSize));
  const response = await authedFetch(`/archived-sets?${params.toString()}`);
  return readJson<PaginatedArchivedSetsResponse>(response);
}

export async function createCategory(data: Partial<Category>): Promise<CategoryOperationResult<Category>> {
  try {
    const response = await authedFetch("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        code: data.code,
        parentId: data.parentId ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
      }),
    });
    const body = await readJson<CategoryResponse>(response);
    return { success: true, data: body.category };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to create category" };
  }
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<CategoryOperationResult<Category>> {
  try {
    const response = await authedFetch(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.name,
        code: data.code,
        parentId: data.parentId ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
      }),
    });
    const body = await readJson<CategoryResponse>(response);
    return { success: true, data: body.category };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to update category" };
  }
}

export async function archiveCategory(
  id: string,
  option: "MOVE_TO_UNASSIGNED" | "ARCHIVE_WITH_PRODUCTS"
): Promise<CategoryOperationResult> {
  try {
    const response = await authedFetch(`/categories/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ option }),
    });
    await readJson<{ success: boolean }>(response);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to archive category" };
  }
}

export async function restoreCategory(id: string): Promise<CategoryOperationResult> {
  try {
    const response = await authedFetch(`/categories/${id}/restore`, {
      method: "POST",
    });
    await readJson<{ success: boolean }>(response);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to restore category" };
  }
}
