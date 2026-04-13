import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { STORAGE_KEYS } from "../lib/constants";
import * as authService from "../services/auth.service";
import type { AuthTokens, User } from "../types/auth.types";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isBooting: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persist(tokens: AuthTokens) {
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(tokens.user));
}

function clearPersisted() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cachedAccess = localStorage.getItem(STORAGE_KEYS.accessToken);
    const cachedRefresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const cachedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (cachedAccess && cachedRefresh && cachedUser) {
      setAccessToken(cachedAccess);
      setRefreshToken(cachedRefresh);
      try {
        setUser(JSON.parse(cachedUser) as User);
      } catch {
        clearPersisted();
      }
    }
    setIsBooting(false);
  }, []);

  async function signIn(username: string, password: string) {
    setError(null);
    try {
      const tokens = await authService.login(username, password);
      persist(tokens);
      setUser(tokens.user);
      setAccessToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    }
  }

  async function signOut() {
    setError(null);
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    } finally {
      clearPersisted();
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    }
  }

  async function refreshSession() {
    if (!refreshToken) {
      throw new Error("No refresh token");
    }
    const tokens = await authService.refresh(refreshToken);
    persist(tokens);
    setUser(tokens.user);
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isBooting,
      error,
      signIn,
      signOut,
      refreshSession
    }),
    [accessToken, error, isBooting, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
