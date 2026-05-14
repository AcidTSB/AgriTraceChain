import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ForbiddenPage } from "../pages/shared/ForbiddenPage";

function normalizeRole(role) {
  if (!role) {
    return "";
  }
  return role.toUpperCase().replace(/^ROLE_/, "");
}

export function RoleGuard({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = normalizeRole(user?.role);
  const accepted = allowedRoles.map((role) => normalizeRole(role));

  if (!accepted.includes(normalizedUserRole)) {
    return <ForbiddenPage />;
  }

  return children;
}
