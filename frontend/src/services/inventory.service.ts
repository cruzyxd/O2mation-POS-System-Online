import type { InventoryItem, InventoryMovement, InventoryStatus, InventoryUnit } from "../types/inventory.types";
import { authedFetch, readJson } from "../lib/api";
import type { PaginatedMeta } from "../types/pagination.types";

export interface InventoryQuery {
  categoryId?: string;
  status?: InventoryStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface InventoryListSummary {
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface CreateInventoryItemInput {
  name: string;
  categoryId: string;
  barcode?: string;
  sku?: string;
  vendorId?: string;
  startingAmount: number;
  unit: InventoryUnit;
  costPrice: number;
  sellingPrice: number;
  taxEnabled: boolean;
  taxPercentage: number;
}

export interface UpdateInventoryItemInput {
  name?: string;
  categoryId?: string;
  barcode?: string;
  batch?: string;
  sku?: string;
  vendorId?: string;
  stockQuantity?: number;
  unit?: InventoryUnit;
  costPrice?: number;
  sellingPrice?: number;
  taxEnabled?: boolean;
  taxPercentage?: number;
}

export interface AddInventoryStockInput {
  quantityAdded: number;
  purchasePrice: number;
}

export interface RemoveInventoryStockInput {
  quantityRemoved: number;
}

type InventoryItemResponse = { item: InventoryItem };
type InventoryMovementResponse = { item: InventoryItem; movement: InventoryMovement };

export interface PaginatedInventoryResponse extends PaginatedMeta {
  items: InventoryItem[];
  summary: InventoryListSummary;
}

export interface PaginatedInventoryMovementsResponse extends PaginatedMeta {
  movements: InventoryMovement[];
}

export async function fetchInventoryItems(query: InventoryQuery = {}): Promise<PaginatedInventoryResponse> {
  const params = new URLSearchParams();
  if (query.categoryId) {
    params.set("categoryId", query.categoryId);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.page) {
    params.set("page", String(query.page));
  }
  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await authedFetch(`/inventory/items${suffix}`);
  return readJson<PaginatedInventoryResponse>(response);
}

export async function createInventoryItem(payload: CreateInventoryItemInput): Promise<InventoryItem> {
  const response = await authedFetch("/inventory/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const body = await readJson<InventoryItemResponse>(response);
  return body.item;
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryItemInput): Promise<InventoryItem> {
  const response = await authedFetch(`/inventory/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const body = await readJson<InventoryItemResponse>(response);
  return body.item;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const response = await authedFetch(`/inventory/items/${id}`, {
    method: "DELETE",
  });
  await readJson<{ success: boolean }>(response);
}

export async function bulkDeleteInventoryItems(ids: string[]): Promise<number> {
  const response = await authedFetch("/inventory/items/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  const body = await readJson<{ success: boolean; deletedCount: number }>(response);
  return body.deletedCount;
}

export async function lookupInventoryItem(scanValue: string): Promise<InventoryItem> {
  const normalized = scanValue.trim();
  const response = await authedFetch(`/inventory/items/lookup?barcode=${encodeURIComponent(normalized)}`);
  const body = await readJson<InventoryItemResponse>(response);
  return body.item;
}

export async function addInventoryStock(id: string, payload: AddInventoryStockInput): Promise<InventoryMovementResponse> {
  const response = await authedFetch(`/inventory/items/${id}/add-stock`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return readJson<InventoryMovementResponse>(response);
}

export async function removeInventoryStock(id: string, payload: RemoveInventoryStockInput): Promise<InventoryMovementResponse> {
  const response = await authedFetch(`/inventory/items/${id}/remove-stock`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return readJson<InventoryMovementResponse>(response);
}

export async function fetchInventoryItemMovements(id: string, page = 1, pageSize = 25): Promise<PaginatedInventoryMovementsResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const response = await authedFetch(`/inventory/items/${id}/movements?${params.toString()}`);
  return readJson<PaginatedInventoryMovementsResponse>(response);
}
