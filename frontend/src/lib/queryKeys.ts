import type { CategoryStatus } from "../types/inventory.types";
import type { VendorStatus } from "../types/vendor.types";

export const queryKeys = {
  categories: {
    all: ["categories"] as const,
    list: (status: CategoryStatus, page: number, pageSize: number, q: string) =>
      ["categories", "list", status, page, pageSize, q] as const,
    count: (status: CategoryStatus, q: string) => ["categories", "count", status, q] as const,
  },
  vendors: {
    all: ["vendors"] as const,
    list: (status: VendorStatus, page: number, pageSize: number, q: string) =>
      ["vendors", "list", status, page, pageSize, q] as const,
    count: (status: VendorStatus, q: string) => ["vendors", "count", status, q] as const,
    activeLookup: ["vendors", "active-lookup"] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    list: (page: number, pageSize: number, q: string, categoryId: string, status: string) =>
      ["inventory", "list", page, pageSize, q, categoryId, status] as const,
    search: (q: string, pageSize: number) => ["inventory", "search", q, pageSize] as const,
    categoriesLookup: ["inventory", "categories-lookup"] as const,
    movements: (itemId: string, page: number, pageSize: number) =>
      ["inventory", "movements", itemId, page, pageSize] as const,
  },
  sales: {
    all: ["sales"] as const,
    list: (page: number, pageSize: number, search: string) =>
      ["sales", "list", page, pageSize, search] as const,
    detail: (saleId: string) => ["sales", "detail", saleId] as const,
    registerSession: ["sales", "register-session"] as const,
  },
};
