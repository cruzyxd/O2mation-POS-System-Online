import type { LucideIcon } from "lucide-react";
import { Package as LuPackage, Settings as LuSettings, Tags as LuTags, Truck as LuTruck, ShoppingCart as LuShoppingCart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("layout");
  const isInventoryRoute = location.pathname === "/";
  const isCategoriesRoute = location.pathname.startsWith("/categories");
  const isVendorsRoute = location.pathname.startsWith("/vendors");
  const isCheckoutRoute = location.pathname.startsWith("/checkout");
  const isSettingsRoute = location.pathname.startsWith("/settings");

  return (
    <div className="w-[280px] bg-[var(--bg-surface)] border-e border-[var(--border-muted)] fixed top-0 start-0 h-screen py-8 px-6 flex flex-col">
      {/* Logo */}
      <div className="flex items-baseline gap-2 mb-16">
        <span className="text-2xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">
          {t("brand.name")}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-oxygen-500)] self-center" />
        <span className="text-2xl font-normal font-[var(--font-heading)] tracking-tight text-[var(--fg-subtle)]">
          {t("brand.suffix")}
        </span>
      </div>

      {/* Section Label */}
      <p className="text-xs font-bold tracking-widest uppercase text-[var(--nav-section-label)] mb-4">
        {t("sidebar.mainMenu")}
      </p>

      {/* Nav Items */}
      <nav className="flex flex-col gap-2">
        <NavItem icon={LuShoppingCart} label={t("sidebar.checkout") || "Cashier"} isActive={isCheckoutRoute} onClick={() => navigate("/checkout")} />
        <NavItem icon={LuPackage} label={t("sidebar.inventory")} isActive={isInventoryRoute} onClick={() => navigate("/")} />
        <NavItem icon={LuTags} label={t("sidebar.categories")} isActive={isCategoriesRoute} onClick={() => navigate("/categories")} />
        <NavItem icon={LuTruck} label={t("sidebar.vendors")} isActive={isVendorsRoute} onClick={() => navigate("/vendors")} />
        <NavItem icon={LuSettings} label={t("sidebar.settings")} isActive={isSettingsRoute} onClick={() => navigate("/settings/preferences")} />
      </nav>
    </div>
  );
}

function NavItem({ icon: Icon, label, isActive, onClick }: {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative">
      {isActive && (
        <span className="absolute start-[-24px] top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--color-oxygen-500)] rounded-full" />
      )}
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 text-base cursor-pointer",
          isActive
            ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-color)] font-bold"
            : "text-[var(--nav-inactive-color)] font-medium hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-active-color)]"
        )}
      >
        <Icon strokeWidth={isActive ? 2.5 : 2} size={20} />
        <span>{label}</span>
      </button>
    </div>
  );
}
