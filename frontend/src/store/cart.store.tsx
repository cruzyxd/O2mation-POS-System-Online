import React, { createContext, useContext, useEffect, useState } from "react";
import { STORAGE_KEYS } from "../lib/constants";
import type { CheckoutCartItem } from "../types/sales.types";
import type { InventoryItem } from "../types/inventory.types";
import { toaster } from "../components/ui/toaster";

interface CartContextType {
    items: CheckoutCartItem[];
    selectedIndex: number;
    tenderedAmount: number;
    addItemToCart: (item: InventoryItem) => void;
    updateQuantity: (inventoryItemId: string, delta: number) => void;
    removeItem: (inventoryItemId: string) => void;
    clearCart: () => void;
    setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
    setTenderedAmount: React.Dispatch<React.SetStateAction<number>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getInitialState<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        }
    } catch (e) {
        console.warn(`Failed to parse ${key} from local storage`, e);
    }
    return defaultValue;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CheckoutCartItem[]>(() =>
        getInitialState(STORAGE_KEYS.checkoutCartItems, [])
    );
    const [selectedIndex, setSelectedIndex] = useState<number>(() =>
        getInitialState(STORAGE_KEYS.checkoutSelectedIndex, 0)
    );
    const [tenderedAmount, setTenderedAmount] = useState<number>(() =>
        getInitialState(STORAGE_KEYS.checkoutTenderAmount, 0)
    );

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.checkoutCartItems, JSON.stringify(items));
            localStorage.setItem(STORAGE_KEYS.checkoutRuntimeCartItemCount, String(items.length));
        } catch (e) {
            console.warn("Could not save cart items to local storage", e);
        }
    }, [items]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.checkoutSelectedIndex, JSON.stringify(selectedIndex));
        } catch (e) {
            console.warn("Could not save selected index to local storage", e);
        }
    }, [selectedIndex]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.checkoutTenderAmount, JSON.stringify(tenderedAmount));
        } catch (e) {
            console.warn("Could not save tendered amount to local storage", e);
        }
    }, [tenderedAmount]);

    const addItemToCart = (item: InventoryItem) => {
        setItems((prev) => {
            const existingIndex = prev.findIndex((i) => i.inventoryItemId === item.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1,
                };
                return updated;
            }

            const nextItem: CheckoutCartItem = {
                inventoryItemId: item.id,
                name: item.name,
                sku: item.sku,
                unitPrice: Number(item.sellingPrice ?? item.price),
                quantity: 1,
                taxPercentage: Number(item.taxPercentage ?? 0),
                taxEnabled: Boolean(item.taxEnabled),
            };

            return [nextItem, ...prev];
        });
        setSelectedIndex(0);
    };

    const updateQuantity = (inventoryItemId: string, delta: number) => {
        setItems((prev) => {
            return prev.map((item) => {
                if (item.inventoryItemId === inventoryItemId) {
                    const newQuant = item.quantity + delta;
                    if (newQuant > 0) {
                        return { ...item, quantity: newQuant };
                    }
                }
                return item;
            });
        });
    };

    const removeItem = (inventoryItemId: string) => {
        setItems((prev) => {
            const next = prev.filter((i) => i.inventoryItemId !== inventoryItemId);
            if (next.length === 0) setSelectedIndex(0);
            return next;
        });
    };

    const clearCart = () => {
        setItems([]);
        setTenderedAmount(0);
        setSelectedIndex(0);
    };

    return (
        <CartContext.Provider
            value={{
                items,
                selectedIndex,
                tenderedAmount,
                addItemToCart,
                updateQuantity,
                removeItem,
                clearCart,
                setSelectedIndex,
                setTenderedAmount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
