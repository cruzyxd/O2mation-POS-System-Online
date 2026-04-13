import { authedFetch, readJson } from "../lib/api";
import type {
  CheckoutRequest,
  CheckoutResponse,
  RegisterSession,
  SaleDetailResponse,
  SalesListResponse,
} from "../types/sales.types";

interface RegisterSessionResponse {
  session: RegisterSession;
}

export interface OpenRegisterResult {
  session: RegisterSession;
  alreadyOpen: boolean;
}

export interface SalesListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function openRegisterSession(openingCash: number): Promise<OpenRegisterResult> {
  const response = await authedFetch("/sales/register/open", {
    method: "POST",
    body: JSON.stringify({ openingCash }),
  });

  if (response.status === 409) {
    const body = await response.json().catch(() => ({} as RegisterSessionResponse));
    if (!body?.session) {
      throw new Error("Register session already open but server returned no session payload");
    }
    return { session: body.session, alreadyOpen: true };
  }

  const body = await readJson<RegisterSessionResponse>(response);
  return { session: body.session, alreadyOpen: false };
}

export async function closeRegisterSession(sessionId: string, countedCash: number): Promise<RegisterSession> {
  const response = await authedFetch("/sales/register/close", {
    method: "POST",
    body: JSON.stringify({ sessionId, countedCash }),
  });

  const body = await readJson<RegisterSessionResponse>(response);
  return body.session;
}

export async function checkoutSale(payload: CheckoutRequest): Promise<CheckoutResponse> {
  const response = await authedFetch("/sales/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return readJson<CheckoutResponse>(response);
}

export async function fetchSalesPage(query: SalesListQuery = {}): Promise<SalesListResponse> {
  const params = new URLSearchParams();
  if (query.page) {
    params.set("page", String(query.page));
  }
  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await authedFetch(`/sales${suffix}`);
  return readJson<SalesListResponse>(response);
}

export async function fetchSaleDetail(saleId: string): Promise<SaleDetailResponse> {
  const response = await authedFetch(`/sales/${saleId}`);
  return readJson<SaleDetailResponse>(response);
}
