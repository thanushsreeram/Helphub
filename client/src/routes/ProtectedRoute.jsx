import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute({ allowedRole, allowedRoles }) {
  const location = useLocation();

  const token = localStorage.getItem("helphub_token");
  const userRaw = localStorage.getItem("helphub_user");

  // Not logged in
  if (!token || !userRaw) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  let user;

  try {
    user = JSON.parse(userRaw);
  } catch {
    localStorage.removeItem("helphub_token");
    localStorage.removeItem("helphub_user");
    localStorage.removeItem("helphub_roles");
    localStorage.removeItem("helphub_has_both_accounts");

    return <Navigate to="/login" replace />;
  }

  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  const rolesToCheck = allowedRoles
    ? allowedRoles
    : allowedRole
      ? [allowedRole]
      : null;

  // Wrong role protection
  if (rolesToCheck && !rolesToCheck.includes(user.role)) {
    if (user.role === "worker") {
      return <Navigate to="/worker/dashboard" replace />;
    }

    if (user.role === "client") {
      return <Navigate to="/client/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
