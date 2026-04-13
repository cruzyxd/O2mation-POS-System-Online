import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { STORAGE_KEYS, SUPPORTED_LANGUAGES } from "../lib/constants";

import enAuth from "./locales/en/auth.json";
import enInventory from "./locales/en/inventory.json";
import enLayout from "./locales/en/layout.json";
import enSales from "./locales/en/sales.json";
import enSettings from "./locales/en/settings.json";
import enVendors from "./locales/en/vendors.json";
import arAuth from "./locales/ar/auth.json";
import arInventory from "./locales/ar/inventory.json";
import arLayout from "./locales/ar/layout.json";
import arSales from "./locales/ar/sales.json";
import arSettings from "./locales/ar/settings.json";
import arVendors from "./locales/ar/vendors.json";

const resources = {
  en: {
    auth: enAuth,
    inventory: enInventory,
    layout: enLayout,
    sales: enSales,
    settings: enSettings,
    vendors: enVendors,
  },
  ar: {
    auth: arAuth,
    inventory: arInventory,
    layout: arLayout,
    sales: arSales,
    settings: arSettings,
    vendors: arVendors,
  },
} as const;

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.locale);
    return saved && SUPPORTED_LANGUAGES.includes(saved as any) ? saved : "en";
  } catch {
    return "en";
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: ["en", "ar"],
  ns: ["layout", "auth", "inventory", "sales", "settings", "vendors"],
  defaultNS: "layout",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
