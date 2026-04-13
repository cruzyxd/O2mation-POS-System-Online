import { DEFAULT_API_BASE, STORAGE_KEYS } from "./constants";
import { refresh } from "../services/auth.service";

const API_BASE = `${(import.meta.env.VITE_API_BASE as string | undefined) ?? DEFAULT_API_BASE}/api`;

function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

function clearAuthAndRedirect() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  // Force a hard navigation to the root (which will redirect to login if no token)
  window.location.href = "/";
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const getHeaders = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  // 1. Initial attempt
  const accessToken = getAccessToken();
  let response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: getHeaders(accessToken),
  });

  // 2. If 401, attempt refresh
  if (response.status === 401) {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      clearAuthAndRedirect();
      throw new Error("Session expired. Please log in again.");
    }

    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refresh(currentRefreshToken)
        .then((tokens) => {
          localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
          localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
          if (tokens.user) {
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(tokens.user));
          }
          return tokens.access_token;
        })
        .catch((error) => {
          clearAuthAndRedirect();
          throw error;
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    // Wait for the (potentially already in-flight) refresh to complete
    try {
      const newAccessToken = await refreshPromise;
      if (!newAccessToken) throw new Error("Could not refresh token");

      // 3. Retry the request with the new token
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: getHeaders(newAccessToken),
      });
      
      if (response.status === 401) {
         // Even after refresh, we got 401. Give up.
         clearAuthAndRedirect();
         throw new Error("Session expired. Please log in again.");
      }
    } catch (error) {
       clearAuthAndRedirect();
       throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
}

export async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorText = typeof body?.error === "string" ? body.error : "Request failed";
    throw new Error(errorText);
  }
  return body as T;
}
