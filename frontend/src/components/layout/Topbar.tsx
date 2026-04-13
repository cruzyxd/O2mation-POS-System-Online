import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { STORAGE_KEYS } from "../../lib/constants";
import { closeRegisterSession } from "../../services/sales.service";
import { useAuth } from "../../store/auth.store";
import { toaster } from "../ui/toaster";

function AvatarCircle({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--color-oxygen-100)] text-[var(--color-oxygen-700)] flex items-center justify-center text-xs font-bold select-none">
      {initials}
    </div>
  );
}

interface CheckoutRuntimeMetadata {
  cartItemCount: number;
  registerSessionId: string | null;
  registerExpectedCash: number | null;
}

function readCheckoutRuntimeMetadata(): CheckoutRuntimeMetadata {
  try {
    const rawCartCount = localStorage.getItem(STORAGE_KEYS.checkoutRuntimeCartItemCount);
    const rawSessionId = localStorage.getItem(STORAGE_KEYS.checkoutRuntimeRegisterSessionId);
    const rawExpectedCash = localStorage.getItem(STORAGE_KEYS.checkoutRuntimeRegisterExpectedCash);

    const parsedCartCount = Number.parseInt(rawCartCount ?? "0", 10);
    const parsedExpectedCash = Number.parseFloat(rawExpectedCash ?? "");

    return {
      cartItemCount: Number.isFinite(parsedCartCount) ? Math.max(0, parsedCartCount) : 0,
      registerSessionId: rawSessionId?.trim() ? rawSessionId : null,
      registerExpectedCash: Number.isFinite(parsedExpectedCash) ? parsedExpectedCash : null,
    };
  } catch {
    return {
      cartItemCount: 0,
      registerSessionId: null,
      registerExpectedCash: null,
    };
  }
}

function clearCheckoutRuntimeMetadata() {
  try {
    localStorage.removeItem(STORAGE_KEYS.checkoutRuntimeCartItemCount);
    localStorage.removeItem(STORAGE_KEYS.checkoutRuntimeRegisterSessionId);
    localStorage.removeItem(STORAGE_KEYS.checkoutRuntimeRegisterExpectedCash);
  } catch {
    // Ignore storage errors so logout flow remains usable.
  }
}

export function Topbar() {
  const { t } = useTranslation("layout");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const roleLabelMap = useMemo(
    () => ({
      owner_admin: t("topbar.role.ownerAdmin"),
      manager: t("topbar.role.manager"),
      cashier: t("topbar.role.cashier"),
    }),
    [t]
  );

  const displayName = user?.username ?? t("topbar.guestUser");
  const displayRole = user ? roleLabelMap[user.role] : t("topbar.guestUser");

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsMenuOpen(false);

    const metadata = readCheckoutRuntimeMetadata();
    if (metadata.cartItemCount > 0) {
      toaster.create({ title: t("topbar.menu.logoutBlockedCart"), type: "error" });
      return;
    }

    setIsLoggingOut(true);
    try {
      if (metadata.registerSessionId && metadata.registerExpectedCash !== null) {
        try {
          await closeRegisterSession(metadata.registerSessionId, metadata.registerExpectedCash);
        } catch (error) {
          const message = (error instanceof Error ? error.message : "").toLowerCase();
          const canContinue =
            message.includes("not found") ||
            message.includes("is not open") ||
            message.includes("not open");

          if (!canContinue) {
            toaster.create({
              title: error instanceof Error ? error.message : t("topbar.menu.logoutCloseFailed"),
              type: "error",
            });
            return;
          }
        }
      }

      clearCheckoutRuntimeMetadata();

      try {
        await signOut();
      } catch {
        // signOut clears auth state in finally, so continue to login.
      }

      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, navigate, signOut, t]);

  return (
    <div className="fixed top-0 start-[280px] end-0 h-20 bg-[var(--bg-surface)] border-b border-[var(--border-muted)] z-10 px-8 flex items-center justify-end">
      <div className="flex items-center gap-6">
        <button
          aria-label={t("topbar.notificationsAria")}
          className="text-[var(--fg-muted)] hover:text-[var(--color-oxygen-600)] transition-colors"
        >
          <Bell size={20} />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label={t("topbar.menu.accountAria")}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1 hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <AvatarCircle name={displayName} />
            <div className="text-sm text-start">
              <div className="font-bold text-[var(--fg-default)]">{displayName}</div>
              <div className="text-xs text-[var(--fg-muted)]">{displayRole}</div>
            </div>
            <ChevronDown size={16} className="text-[var(--fg-subtle)]" />
          </button>

          {isMenuOpen && (
            <div className="absolute end-0 mt-2 w-44 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl z-50 p-1">
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={15} />
                {isLoggingOut ? t("topbar.menu.loggingOut") : t("topbar.menu.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
