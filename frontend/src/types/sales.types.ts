export interface CheckoutCartItem {
    inventoryItemId: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    taxEnabled: boolean;
    taxPercentage: number;
}

export interface CheckoutTransactionSummary {
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    total: number;
    amountTendered: number;
}

export interface RegisterSession {
    id: string;
    cashierUserId: number;
    openedAt: string;
    closedAt: string | null;
    openingCash: number;
    closingCash: number | null;
    expectedCash: number;
    variance: number | null;
    status: "OPEN" | "CLOSED";
    createdAt: string;
    updatedAt: string;
}

export interface Sale {
    id: string;
    receiptNumber: string;
    registerSessionId: string;
    cashierUserId: number;
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
    paymentStatus: "PAID" | "UNPAID" | "VOIDED";
    saleStatus: "COMPLETED" | "VOIDED";
    createdAt: string;
    updatedAt: string;
    voidedAt: string | null;
}

export interface SaleItem {
    id: string;
    saleId: string;
    inventoryItemId: string;
    skuSnapshot: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
    taxPercentage: number;
    lineTax: number;
    lineTotal: number;
    createdAt: string;
}

export interface SalePayment {
    id: string;
    saleId: string;
    method: "CASH";
    tenderedAmount: number;
    paidAmount: number;
    changeAmount: number;
    createdAt: string;
}

export interface CheckoutLineInput {
    inventoryItemId: string;
    quantity: number;
}

export interface CheckoutRequest {
    sessionId: string;
    items: CheckoutLineInput[];
    tenderedAmount: number;
}

export interface CheckoutResponse {
    sale: Sale;
    payment: SalePayment;
}

export interface SalesListResponse {
    sales: Sale[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface SaleDetailResponse {
    sale: Sale;
    items: SaleItem[];
    payments: SalePayment[];
}
