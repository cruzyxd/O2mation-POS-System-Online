import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CartTable } from "../../components/sales/CartTable";
import { TransactionSummary } from "../../components/sales/TransactionSummary";
import { toaster } from "../../components/ui/toaster";
import { CHECKOUT_CONSTANTS, STORAGE_KEYS } from "../../lib/constants";
import { centsToMoney, computeCheckoutTotals, moneyToCents, roundMoney } from "../../lib/money";
import { queryKeys } from "../../lib/queryKeys";
import { lookupInventoryItem } from "../../services/inventory.service";
import { checkoutSale, closeRegisterSession, openRegisterSession } from "../../services/sales.service";
import { usePreferences } from "../../store/preferences.store";
import { useCart } from "../../store/cart.store";
import type { CheckoutCartItem, CheckoutTransactionSummary, RegisterSession } from "../../types/sales.types";
import type { InventoryItem } from "../../types/inventory.types";
import { ManualItemSearch } from "../../components/sales/ManualItemSearch";
import { CloseRegisterModal } from "../../components/sales/CloseRegisterModal";

function getCompletionKeyLabel(key: string) {
    if (key === "SHIFT") {
        return "Shift";
    }
    if (key === "ENTER") {
        return "Enter";
    }
    return "Ctrl+Enter";
}

function persistCheckoutRuntimeRegister(session: RegisterSession | null) {
    try {
        if (session && session.status === "OPEN") {
            localStorage.setItem(STORAGE_KEYS.checkoutRuntimeRegisterSessionId, session.id);
            localStorage.setItem(
                STORAGE_KEYS.checkoutRuntimeRegisterExpectedCash,
                String(roundMoney(session.expectedCash))
            );
            return;
        }

        localStorage.removeItem(STORAGE_KEYS.checkoutRuntimeRegisterSessionId);
        localStorage.removeItem(STORAGE_KEYS.checkoutRuntimeRegisterExpectedCash);
    } catch {
        // Ignore storage errors so checkout flow remains usable.
    }
}

export default function CheckoutPage() {
    const { t } = useTranslation("sales");
    const queryClient = useQueryClient();
    const {
        checkoutCompletionKey,
        requireManualTendered,
    } = usePreferences();

    const {
        items,
        selectedIndex,
        tenderedAmount,
        setSelectedIndex,
        setTenderedAmount,
        updateQuantity,
        removeItem,
        clearCart,
        addItemToCart: storeAddItemToCart,
    } = useCart();

    const [registerSession, setRegisterSession] = useState<RegisterSession | null>(null);
    const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);

    const scanBufferRef = useRef<string>("");
    const lastBufferAtRef = useRef<number>(0);
    const hasAttemptedAutoOpenRef = useRef<boolean>(false);

    const totals = useMemo(() => computeCheckoutTotals(items), [items]);
    const subtotal = totals.subtotal;
    const taxAmount = totals.taxAmount;
    const taxRate = subtotal > 0 ? roundMoney((taxAmount / subtotal) * 100) : 0;
    const total = totals.total;

    const summary: CheckoutTransactionSummary = {
        subtotal,
        taxAmount,
        taxRate,
        total,
        amountTendered: roundMoney(requireManualTendered ? tenderedAmount : total),
    };

    const selectedItemId = items[selectedIndex]?.inventoryItemId ?? null;
    const completionKeyLabel = getCompletionKeyLabel(checkoutCompletionKey);
    const hasOpenRegister = registerSession?.status === "OPEN";
    const canCloseRegister = hasOpenRegister && items.length === 0;

    const registerMutation = useMutation({
        mutationFn: () => openRegisterSession(0),
        retry: false,
        onSuccess: (result) => {
            setRegisterSession(result.session);
            toaster.create({
                title: result.alreadyOpen ? t("messages.registerActive") : t("messages.registerOpened"),
                type: "success",
            });
        },
        onError: (error) => {
            const title = error instanceof Error ? error.message : t("messages.registerError");
            toaster.create({ title, type: "error" });
        },
    });

    const checkoutMutation = useMutation({
        mutationFn: checkoutSale,
    });

    const closeRegisterMutation = useMutation({
        mutationFn: ({ sessionId, countedCash }: { sessionId: string; countedCash: number }) =>
            closeRegisterSession(sessionId, countedCash),
    });

    useEffect(() => {
        persistCheckoutRuntimeRegister(registerSession);
    }, [registerSession]);

    useEffect(() => {
        if (registerSession || hasAttemptedAutoOpenRef.current) {
            return;
        }

        hasAttemptedAutoOpenRef.current = true;
        void registerMutation.mutateAsync().catch(() => {
            // Error feedback is already handled by onError.
        });
    }, [registerSession, registerMutation]);

    const ensureRegisterSession = useCallback(async (): Promise<RegisterSession | null> => {
        if (registerSession && registerSession.status === "OPEN") {
            return registerSession;
        }

        try {
            const result = await registerMutation.mutateAsync();
            return result.session;
        } catch {
            return null;
        }
    }, [registerMutation, registerSession]);

    const handleOpenRegister = useCallback(async () => {
        await registerMutation.mutateAsync().catch(() => {
            // Error feedback is already handled by onError.
        });
    }, [registerMutation]);

    const addItemToCart = useCallback((item: InventoryItem) => {
        storeAddItemToCart(item);
        toaster.create({ title: t("messages.scanAdded", { name: item.name }), type: "success" });
    }, [storeAddItemToCart, t]);

    const addScannedItem = useCallback(async (scanValue: string) => {
        const normalized = scanValue.trim();
        if (!normalized) {
            return;
        }

        try {
            const item = await lookupInventoryItem(normalized);
            addItemToCart(item);
        } catch (error) {
            const title = error instanceof Error ? error.message : t("messages.scanFailed");
            toaster.create({ title, type: "error" });
        }
    }, [addItemToCart, t]);

    const handleRequestCloseRegister = useCallback(() => {
        if (!hasOpenRegister) {
            toaster.create({ title: t("messages.sessionMissing"), type: "error" });
            return;
        }

        if (items.length > 0) {
            toaster.create({ title: t("messages.registerCloseRequiresEmptyCart"), type: "error" });
            return;
        }

        setCloseModalOpen(true);
    }, [hasOpenRegister, items.length, t]);

    const handleConfirmCloseRegister = useCallback(async (countedCash: number) => {
        if (!registerSession || registerSession.status !== "OPEN") {
            toaster.create({ title: t("messages.sessionMissing"), type: "error" });
            return;
        }

        if (items.length > 0) {
            toaster.create({ title: t("messages.registerCloseRequiresEmptyCart"), type: "error" });
            return;
        }

        try {
            const closedSession = await closeRegisterMutation.mutateAsync({
                sessionId: registerSession.id,
                countedCash: roundMoney(countedCash),
            });

            setCloseModalOpen(false);
            setRegisterSession(null);

            await queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
            await queryClient.invalidateQueries({ queryKey: queryKeys.sales.registerSession });

            const variance = roundMoney(closedSession.variance ?? 0);
            const varianceLabel = variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2);

            toaster.create({
                title: t("messages.registerClosed"),
                description: t("messages.registerClosedDescription", { variance: varianceLabel }),
                type: "success",
            });
        } catch (error) {
            const title = error instanceof Error ? error.message : t("messages.registerCloseFailed");
            toaster.create({ title, type: "error" });
        }
    }, [closeRegisterMutation, items.length, queryClient, registerSession, t]);

    const handleComplete = useCallback(async () => {
        if (items.length === 0) {
            toaster.create({ title: t("messages.cartEmpty"), type: "error" });
            return;
        }

        const session = await ensureRegisterSession();
        if (!session) {
            toaster.create({ title: t("messages.sessionMissing"), type: "error" });
            return;
        }

        const normalizedTenderedCents = moneyToCents(tenderedAmount);
        const finalTenderedCents = requireManualTendered ? normalizedTenderedCents : totals.totalCents;

        if (requireManualTendered && finalTenderedCents < totals.totalCents) {
            toaster.create({ title: t("messages.manualTenderedRequired"), type: "error" });
            return;
        }

        try {
            const result = await checkoutMutation.mutateAsync({
                sessionId: session.id,
                items: items.map((item) => ({
                    inventoryItemId: item.inventoryItemId,
                    quantity: item.quantity,
                })),
                tenderedAmount: centsToMoney(finalTenderedCents),
            });

            setRegisterSession((prev) => {
                if (!prev) {
                    return prev;
                }
                return {
                    ...prev,
                    expectedCash: centsToMoney(moneyToCents(prev.expectedCash) + moneyToCents(result.sale.grandTotal)),
                };
            });

            clearCart();
            scanBufferRef.current = "";
            lastBufferAtRef.current = 0;

            await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
            await queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });

            toaster.create({
                title: t("messages.completeSuccessTitle"),
                description: t("messages.completeSuccessDescription", { receiptNumber: result.sale.receiptNumber }),
                type: "success",
            });
        } catch (error) {
            const title = error instanceof Error ? error.message : t("messages.completeFailed");
            toaster.create({ title, type: "error" });
        }
    }, [checkoutMutation, clearCart, ensureRegisterSession, items, queryClient, requireManualTendered, t, tenderedAmount, totals.totalCents]);

    useEffect(() => {
        if (!isScanningActive) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;

            if (event.key.toLowerCase() === checkoutCompletionKey.toLowerCase() && !isModifierKey) {
                event.preventDefault();
                void handleComplete();
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                const buffered = scanBufferRef.current.trim();
                if (buffered.length > 0) {
                    scanBufferRef.current = "";
                    lastBufferAtRef.current = 0;
                    void addScannedItem(buffered);
                    return;
                }

                if (checkoutCompletionKey.toLowerCase() === "enter") {
                    void handleComplete();
                    return;
                }

                return;
            }

            if (items.length > 0) {
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.max(0, prev - 1));
                    return;
                }

                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
                    return;
                }

                const selectedId = items[selectedIndex]?.inventoryItemId;
                if (selectedId && event.key === "ArrowLeft") {
                    event.preventDefault();
                    updateQuantity(selectedId, -1);
                    return;
                }

                if (selectedId && event.key === "ArrowRight") {
                    event.preventDefault();
                    updateQuantity(selectedId, 1);
                    return;
                }

                if (selectedId && event.key === "Delete") {
                    event.preventDefault();
                    removeItem(selectedId);
                    return;
                }
            }

            if (event.key.length === 1 && !isModifierKey) {
                event.preventDefault();
                const now = Date.now();
                if (now - lastBufferAtRef.current > CHECKOUT_CONSTANTS.scannerBufferTimeoutMs) {
                    scanBufferRef.current = "";
                }
                scanBufferRef.current += event.key;
                lastBufferAtRef.current = now;
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [
        addScannedItem,
        checkoutCompletionKey,
        handleComplete,
        isScanningActive,
        items,
        removeItem,
        selectedIndex,
        updateQuantity,
    ]);

    const handleScanToggle = () => {
        setIsScanningActive((prev) => !prev);
        scanBufferRef.current = "";
        lastBufferAtRef.current = 0;
    };

    return (
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h1 className="text-[28px] font-bold font-[var(--font-heading)] text-[var(--fg-heading)] tracking-tight">
                        {t("checkout.title")}
                    </h1>
                    <p className="text-[14px] text-slate-400 mt-0.5">
                        {t("checkout.subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ManualItemSearch onSelect={addItemToCart} />
                    <button
                        onClick={handleScanToggle}
                        className={`px-4 py-2.5 font-bold text-[14px] rounded-lg transition-colors flex items-center gap-2 pr-5 ${isScanningActive
                            ? "bg-[var(--color-oxygen-500)] hover:bg-[var(--color-oxygen-600)] text-white"
                            : "bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] text-[var(--fg-muted)]"
                            }`}
                    >
                        <span className="text-sm leading-none font-semibold">
                            {isScanningActive ? "●" : "▶"}
                        </span>
                        {isScanningActive ? t("checkout.scan.active") : t("checkout.scan.start")}
                    </button>
                </div>
            </div>

            <p className="text-[13px] text-[var(--fg-subtle)] mb-4">
                {t("checkout.scan.hint")}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Cart Items */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-[var(--bg-muted)] text-[11px] font-bold text-[var(--fg-subtle)] tracking-wider uppercase border-b border-[var(--border-default)]">
                            <div className="col-span-5">{t("checkout.table.itemName")}</div>
                            <div className="col-span-2 text-center">{t("checkout.table.price")}</div>
                            <div className="col-span-2 text-center">{t("checkout.table.quantity")}</div>
                            <div className="col-span-2 text-right">{t("checkout.table.subtotal")}</div>
                            <div className="col-span-1 text-center">{t("checkout.table.action")}</div>
                        </div>

                        <CartTable
                            items={items}
                            selectedItemId={selectedItemId}
                            onSelectItem={(id) => {
                                const nextIndex = items.findIndex((entry) => entry.inventoryItemId === id);
                                if (nextIndex >= 0) {
                                    setSelectedIndex(nextIndex);
                                }
                            }}
                            onUpdateQuantity={updateQuantity}
                            onRemoveItem={removeItem}
                        />
                    </div>

                </div>

                {/* Right Column: Summary */}
                <div className="lg:col-span-4 sticky top-6">
                    <TransactionSummary
                        summary={summary}
                        requireManualTendered={requireManualTendered}
                        onTenderedChange={setTenderedAmount}
                        onComplete={() => {
                            void handleComplete();
                        }}
                    />

                    <div className="mt-6 bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-default)] px-5 py-4 text-[13px] text-[var(--fg-subtle)]">
                        <p className="font-semibold text-[var(--fg-heading)] mb-1">{t("checkout.keyboard.title")}</p>
                        <p>{t("checkout.keyboard.navigation")}</p>
                        <p>{t("checkout.keyboard.quantity")}</p>
                        <p>{t("checkout.keyboard.remove")}</p>
                        <p>{t("checkout.keyboard.complete", { keyLabel: completionKeyLabel })}</p>
                    </div>

                    <div className="mt-6 bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-default)] px-5 py-4 text-[13px]">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-[var(--fg-heading)]">{t("register.title")}</p>
                            <span className={hasOpenRegister
                                ? "text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold"
                                : "text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--fg-muted)] font-semibold"}
                            >
                                {hasOpenRegister ? t("register.statusOpen") : t("register.statusClosed")}
                            </span>
                        </div>

                        {hasOpenRegister ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[var(--fg-muted)]">
                                    <span>{t("register.expectedCash")}</span>
                                    <span className="font-semibold text-[var(--fg-default)]">${roundMoney(registerSession?.expectedCash ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-[var(--fg-muted)]">
                                    <span>{t("register.openedAt")}</span>
                                    <span className="font-semibold text-[var(--fg-default)]">
                                        {registerSession?.openedAt ? new Date(registerSession.openedAt).toLocaleTimeString() : "-"}
                                    </span>
                                </div>

                                <button
                                    onClick={handleRequestCloseRegister}
                                    disabled={!canCloseRegister || closeRegisterMutation.isPending}
                                    className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t("register.closeShift")}
                                </button>

                                <p className="text-xs text-[var(--fg-subtle)]">
                                    {canCloseRegister ? t("register.closeEnabledHint") : t("register.closeDisabledHint")}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[var(--fg-muted)]">{t("register.openHint")}</p>
                                <button
                                    onClick={() => {
                                        void handleOpenRegister();
                                    }}
                                    disabled={registerMutation.isPending}
                                    className="w-full py-2 rounded-lg bg-[var(--color-oxygen-500)] text-white text-sm font-semibold hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-50"
                                >
                                    {t("register.openShift")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CloseRegisterModal
                open={closeModalOpen}
                expectedCash={registerSession?.expectedCash ?? 0}
                isSubmitting={closeRegisterMutation.isPending}
                onOpenChange={setCloseModalOpen}
                onConfirm={handleConfirmCloseRegister}
            />
        </div>
    );
}
