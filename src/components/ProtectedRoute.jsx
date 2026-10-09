import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { token, initialLoading } = useSelector((state) => state.auth);

  if (initialLoading) {
    return (
      <div className="loading-state">
        <p>Restoring session, please wait...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
