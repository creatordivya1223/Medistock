import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import MediList from "./components/MediList";
import Addmedi from "./components/Addmedi";
import Alerts from "./components/Alerts";
import Reports from "./components/Reports";
import Users from "./components/Users";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { ToastProvider } from "./context/ToastContext";
import { fetchMe } from "./redux/slices/authSlice";
import "./App.css";

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  // Restore authenticated session on initial app load if token exists
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Navbar />

        <main className="main-content">
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes for all authenticated users (admin & staff) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medicines"
              element={
                <ProtectedRoute>
                  <MediList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add"
              element={
                <ProtectedRoute>
                  <Addmedi />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />

            {/* Admin-only routes (staff are redirected away) */}
            <Route
              path="/reports"
              element={
                <AdminRoute>
                  <Reports />
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <Users />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;