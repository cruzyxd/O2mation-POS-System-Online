import { useTranslation } from "react-i18next";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SlidersHorizontal as LuSlidersHorizontal, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/store/auth.store";

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const hasUserManagementAccess = user?.role === "owner_admin" || user?.role === "manager";

  const navItems = [
    {
      value: "preferences",
      label: t("tabs.preferences", "Preferences"),
      icon: <LuSlidersHorizontal size={18} />,
    },
    ...(hasUserManagementAccess ? [{
      value: "manage-users",
      label: t("tabs.manageUsers", "Manage Users"),
      icon: <Users size={18} />,
    }] : []),
  ];

  const currentPath = location.pathname.split("/").pop() || "preferences";

  return (
    <div className="bg-[var(--bg-page)] min-h-screen pb-10">
      {/* Header */}
      <div className="pt-10 pb-8 px-8 lg:px-16">
        <h1 className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)] mb-2">
          {t("header.title", "Settings")}
        </h1>
        <p className="text-[var(--fg-muted)] text-base">
          {t("header.subtitle", "Manage your workspace preferences and system configuration.")}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 px-8 lg:px-16 max-w-7xl">
        {/* Sidebar Nav */}
        <div className="pt-4">
          <p className="text-xs font-bold text-[var(--fg-subtle)] mb-4 px-4 tracking-widest uppercase">{t("sidebar.configuration")}</p>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => navigate(`/settings/${item.value}`)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full text-start",
                    isActive
                      ? "bg-[var(--bg-surface)] shadow-sm text-[var(--nav-active-color)] font-bold"
                      : "text-[var(--fg-muted)] hover:bg-[var(--nav-hover-bg)]"
                  )}
                >
                  <span className={isActive ? "text-[var(--color-oxygen-700)] dark:text-[var(--color-oxygen-500)]" : "text-[var(--fg-subtle)]"}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
