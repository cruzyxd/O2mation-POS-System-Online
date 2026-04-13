export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type InventoryUnit = "UNITS" | "LBS" | "KGS" | "LITERS";
export type InventoryMovementType = "STOCK_ADD" | "STOCK_REMOVE";

// --- Category System Types ---
export type CategoryStatus = "Active" | "Archived";

export interface Category {
  id: string;
  name: string;
  code: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  status: CategoryStatus;
  productCount: number;
  subcategoryCount?: number;
  totalItems?: number;
  updatedAt: string;
  archivedAt?: string;
  archivedProductSetId?: string | null;
}

export interface ArchivedProductSet {
  id: string;
  categoryId: string;
  productIds: string[];
  archivedAt: string;
}

export interface CategoryOperationResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// --- Product Types ---
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  batch?: string;
  categoryId: string;
  vendorId?: string | null;
  startingAmount?: number;
  stockQuantity: number;
  unit: InventoryUnit;
  status: InventoryStatus;
  sellingPrice?: number;
  costPrice?: number;
  taxEnabled?: boolean;
  taxPercentage?: number;
  totalSellingPriceEstimate?: number;
  price: number;
  cost: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  movementType: InventoryMovementType;
  quantityDelta: number;
  priorQuantity: number;
  newQuantity: number;
  purchasePrice: number;
  reason: string;
  actorUserId: number;
  actorUsername?: string | null;
  createdAt: string;
}
