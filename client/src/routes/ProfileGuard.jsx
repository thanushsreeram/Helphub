import { Navigate } from "react-router-dom";

function ProfileGuard() {
  const token = localStorage.getItem("helphub_token");
  const userRaw = localStorage.getItem("helphub_user");

  if (!token || !userRaw) {
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "worker") {
    return <Navigate to="/worker/profile" replace />;
  }

  if (user?.role === "client") {
    return <Navigate to="/client/profile" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default ProfileGuard;
