export const STORAGE_KEYS = {
  accessToken: "o2_access",
  refreshToken: "o2_refresh",
  user: "o2_user",
  locale: "o2_locale",
  fontSize: "o2_font_size",
  checkoutCompletionKey: "o2_checkout_completion_key",
  checkoutRequireManualTendered: "o2_checkout_require_manual_tendered",
  checkoutRuntimeCartItemCount: "o2_checkout_runtime_cart_item_count",
  checkoutRuntimeRegisterSessionId: "o2_checkout_runtime_register_session_id",
  checkoutRuntimeRegisterExpectedCash: "o2_checkout_runtime_register_expected_cash",
  checkoutCartItems: "o2_checkout_cart_items",
  checkoutTenderAmount: "o2_checkout_tender_amount",
  checkoutSelectedIndex: "o2_checkout_selected_index",
} as const;

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_API_BASE = "http://127.0.0.1:5000";

// --- Category Constants ---
export const CATEGORY_CONSTANTS = {
  UNASSIGNED_ID: "system-unassigned",
  MAX_DEPTH: 1,
  ARCHIVE_OPTIONS: {
    MOVE_TO_UNASSIGNED: "MOVE_TO_UNASSIGNED",
    ARCHIVE_WITH_PRODUCTS: "ARCHIVE_WITH_PRODUCTS",
  },
} as const;

export const CATEGORY_FORM_DEFAULTS = {
  parentId: null as string | null,
};

export const INVENTORY_UNIT_VALUES = ["UNITS", "LBS", "KGS", "LITERS"] as const;


export const INVENTORY_SKU_PREFIX = "SKU";

export const INVENTORY_FORM_LIMITS = {
  minStockQuantity: 0,
  minPrice: 0,
  minTaxPercentage: 0,
  maxTaxPercentage: 100,
} as const;

export const INVENTORY_STOCK_THRESHOLDS = {
  lowStockMax: 50,
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 12,
  maxPageSize: 200,
} as const;

export const QUERY_CACHE_DEFAULTS = {
  staleTimeMs: 60_000,
  gcTimeMs: 10 * 60_000,
} as const;

export const INVENTORY_FORM_DEFAULTS = {
  unit: "UNITS",
  startingAmount: 0,
  costPrice: 0,
  sellingPrice: 0,
  taxEnabled: false,
  taxPercentage: 15,
} as const;

export const CHECKOUT_CONSTANTS = {
  scannerBufferTimeoutMs: 120,
  defaultCompletionKey: "Shift",
  defaultRequireManualTendered: false,
} as const;

