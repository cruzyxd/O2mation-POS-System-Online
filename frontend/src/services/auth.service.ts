import { DEFAULT_API_BASE } from "../lib/constants";
import type { AuthTokens, User } from "../types/auth.types";

const API_BASE = `${(import.meta.env.VITE_API_BASE as string | undefined) ?? DEFAULT_API_BASE}/api/auth`;

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const errorText = typeof body?.error === "string" ? body.error : "Request failed";
    throw new Error(errorText);
  }
  return body as T;
}

export async function login(username: string, password: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return readJson<AuthTokens>(response);
}

export async function me(accessToken: string): Promise<User> {
  const response = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return readJson<User>(response);
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  return readJson<AuthTokens>(response);
}

export async function logout(refreshToken: string): Promise<void> {
  const response = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  await readJson<{ success: boolean }>(response);
}
