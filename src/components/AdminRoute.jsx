import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

function AdminRoute({ children }) {
  const { token, user, initialLoading } = useSelector((state) => state.auth);

  if (initialLoading) {
    return (
      <div className="loading-state">
        <p>Checking permissions...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect staff away from admin-only routes
  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

export default AdminRoute;
