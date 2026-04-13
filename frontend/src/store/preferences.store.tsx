import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { CHECKOUT_CONSTANTS, STORAGE_KEYS } from "../lib/constants";

const FONT_SIZE_PIXELS = {
  small: 13,
  default: 14,
  large: 15,
  xLarge: 16,
  xxLarge: 17,
  xxxLarge: 18,
} as const;

export type FontSizeOption = keyof typeof FONT_SIZE_PIXELS;
export type CheckoutCompletionKey = string;

interface PreferencesContextValue {
  fontSize: FontSizeOption;
  setFontSize: (fontSize: FontSizeOption) => void;
  checkoutCompletionKey: CheckoutCompletionKey;
  setCheckoutCompletionKey: (key: CheckoutCompletionKey) => void;
  requireManualTendered: boolean;
  setRequireManualTendered: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function isFontSizeOption(value: string | null): value is FontSizeOption {
  return (
    value === "small" ||
    value === "default" ||
    value === "large" ||
    value === "xLarge" ||
    value === "xxLarge" ||
    value === "xxxLarge"
  );
}

function isCheckoutCompletionKey(value: string | null): value is CheckoutCompletionKey {
  return typeof value === "string" && value.length > 0;
}

function applyDocumentFontSize(fontSize: FontSizeOption) {
  document.documentElement.style.fontSize = `${FONT_SIZE_PIXELS[fontSize]}px`;
}

function getInitialFontSize(): FontSizeOption {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.fontSize);
    return isFontSizeOption(saved) ? saved : "default";
  } catch {
    return "default";
  }
}

function getInitialCheckoutCompletionKey(): CheckoutCompletionKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.checkoutCompletionKey);
    return isCheckoutCompletionKey(saved) ? saved : CHECKOUT_CONSTANTS.defaultCompletionKey;
  } catch {
    return CHECKOUT_CONSTANTS.defaultCompletionKey;
  }
}

function getInitialRequireManualTendered(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.checkoutRequireManualTendered);
    if (saved === "true") {
      return true;
    }
    if (saved === "false") {
      return false;
    }
    return CHECKOUT_CONSTANTS.defaultRequireManualTendered;
  } catch {
    return CHECKOUT_CONSTANTS.defaultRequireManualTendered;
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>(getInitialFontSize);
  const [checkoutCompletionKey, setCheckoutCompletionKeyState] = useState<CheckoutCompletionKey>(getInitialCheckoutCompletionKey);
  const [requireManualTendered, setRequireManualTenderedState] = useState<boolean>(getInitialRequireManualTendered);

  useEffect(() => {
    applyDocumentFontSize(fontSize);
  }, []);

  function setFontSize(nextFontSize: FontSizeOption) {
    if (nextFontSize === fontSize) {
      return;
    }

    setFontSizeState(nextFontSize);
    localStorage.setItem(STORAGE_KEYS.fontSize, nextFontSize);
    applyDocumentFontSize(nextFontSize);
  }

  function setCheckoutCompletionKey(nextKey: CheckoutCompletionKey) {
    if (nextKey === checkoutCompletionKey) {
      return;
    }

    setCheckoutCompletionKeyState(nextKey);
    localStorage.setItem(STORAGE_KEYS.checkoutCompletionKey, nextKey);
  }

  function setRequireManualTendered(nextValue: boolean) {
    if (nextValue === requireManualTendered) {
      return;
    }

    setRequireManualTenderedState(nextValue);
    localStorage.setItem(STORAGE_KEYS.checkoutRequireManualTendered, String(nextValue));
  }

  const value = useMemo<PreferencesContextValue>(
    () => ({
      fontSize,
      setFontSize,
      checkoutCompletionKey,
      setCheckoutCompletionKey,
      requireManualTendered,
      setRequireManualTendered,
    }),
    [fontSize, checkoutCompletionKey, requireManualTendered]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}