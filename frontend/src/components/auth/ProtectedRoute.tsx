import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../store/auth.store";
import type { Role } from "../../types/auth.types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isBooting } = useAuth();
  const location = useLocation();
  const { t } = useTranslation("layout");

  if (isBooting) {
    return <div className="center-screen">{t("common.loadingSession")}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
