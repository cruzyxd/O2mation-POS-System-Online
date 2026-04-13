import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./store/auth.store";
import { AppLayout } from "./components/layout/AppLayout";
import { LocaleProvider } from "./store/locale.store";
import { PreferencesProvider } from "./store/preferences.store";
import { CartProvider } from "./store/cart.store";
import { AppLoadingFallback } from "./components/ui/AppLoadingFallback";

// Lazy Loaded Routes
const InventoryPage = React.lazy(() => import("./pages/InventoryPage").then(m => ({ default: m.InventoryPage })));
const CategoriesPage = React.lazy(() => import("./pages/CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const VendorsPage = React.lazy(() => import("./pages/VendorsPage").then(m => ({ default: m.VendorsPage })));
const CheckoutPage = React.lazy(() => import("./pages/Sales/CheckoutPage").then(m => ({ default: m.default })));
const LoginPage = React.lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const PreferencesTab = React.lazy(() => import("./pages/settings/PreferencesTab").then(m => ({ default: m.PreferencesTab })));
const ManageUsersTab = React.lazy(() => import("./pages/settings/ManageUsersTab").then(m => ({ default: m.ManageUsersTab })));

function AppRoutes() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<InventoryPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="settings" element={<SettingsPage />}>
            <Route index element={<PreferencesTab />} />
            <Route path="preferences" element={<PreferencesTab />} />
            <Route path="manage-users" element={<ManageUsersTab />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <PreferencesProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </PreferencesProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}

