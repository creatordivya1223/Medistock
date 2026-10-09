import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FaPills,
  FaBoxes,
  FaExclamationTriangle,
  FaTimesCircle,
  FaRupeeSign,
  FaClipboardCheck,
  FaPlus,
  FaEye,
  FaBell,
  FaChartBar,
} from "react-icons/fa";
import api from "../api/client";

function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dashboard/stats");
        if (isMounted) {
          setStats(res.data.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || "Failed to load dashboard statistics"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <p>Loading dashboard statistics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="form-error" style={{ margin: "30px" }}>
        <FaExclamationTriangle />
        <span>{error || "Unable to display statistics"}</span>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to your medicine inventory dashboard</p>
        </div>

        <Link to="/add" className="primary-btn">
          <FaPlus />
          Add Medicine
        </Link>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FaPills />
          </div>
          <div>
            <p>Total Medicines</p>
            <h2>{stats.totalMedicines}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FaBoxes />
          </div>
          <div>
            <p>Total Stock</p>
            <h2>{stats.totalStock}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FaExclamationTriangle />
          </div>
          <div>
            <p>Low Stock</p>
            <h2>{stats.lowStock}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <FaTimesCircle />
          </div>
          <div>
            <p>Out of Stock</p>
            <h2>{stats.outOfStock}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FaRupeeSign />
          </div>
          <div>
            <p>Inventory Value</p>
            <h2>₹{stats.inventoryValue?.toLocaleString()}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">
            <FaClipboardCheck />
          </div>
          <div>
            <p>Available Units</p>
            <h2>{stats.availableUnits}</h2>
          </div>
        </div>
      </div>

      {/* Attention */}
      <div className="attention-card">
        <div className="attention-icon">
          <FaExclamationTriangle />
        </div>
        <div>
          <h3>Attention Required</h3>
          <p>
            {stats.attentionRequired} medicine(s) need your attention.
          </p>
        </div>
        <Link to="/alerts">View Alerts</Link>
      </div>

      {/* Quick Actions */}
      <section className="section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/add" className="action-card">
            <FaPlus />
            <span>Add Medicine</span>
          </Link>

          <Link to="/medicines" className="action-card">
            <FaEye />
            <span>View Medicines</span>
          </Link>

          <Link to="/alerts" className="action-card">
            <FaBell />
            <span>View Alerts</span>
          </Link>

          {user?.role === "admin" && (
            <Link to="/reports" className="action-card">
              <FaChartBar />
              <span>View Reports</span>
            </Link>
          )}
        </div>
      </section>

      {/* Bottom section */}
      <div className="dashboard-bottom">
        {/* Recent medicines */}
        <section className="panel">
          <div className="panel-header">
            <h2>Recent Medicines</h2>
            <Link to="/medicines">View All</Link>
          </div>

          {stats.recentMedicines?.length === 0 ? (
            <p>No medicines available.</p>
          ) : (
            <div className="medicine-list">
              {stats.recentMedicines.map((medicine) => (
                <div
                  className="medicine-row"
                  key={medicine.id || medicine._id}
                >
                  <div>
                    <h4>{medicine.name}</h4>
                    <p>{medicine.category}</p>
                  </div>
                  <div>
                    <strong>{medicine.stock}</strong>
                    <span> units</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expiry alerts */}
        <section className="panel">
          <div className="panel-header">
            <h2>Expiring Soon</h2>
            <Link to="/alerts">View All</Link>
          </div>

          {stats.expiringSoon?.length === 0 ? (
            <p>No expiring medicines.</p>
          ) : (
            <div className="medicine-list">
              {stats.expiringSoon.map((medicine) => (
                <div
                  className="medicine-row"
                  key={medicine.id || medicine._id}
                >
                  <div>
                    <h4>{medicine.name}</h4>
                    <p>
                      Expires:{" "}
                      {new Date(medicine.expiry).toLocaleDateString()}
                    </p>
                  </div>
                  <FaExclamationTriangle />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        <section className="panel">
          <div className="panel-header">
            <h2>Medicine Categories</h2>
          </div>

          {stats.categoryBreakdown?.length === 0 ? (
            <p>No categories found.</p>
          ) : (
            stats.categoryBreakdown.map((item) => (
              <div className="category-row" key={item.category}>
                <span>{item.category}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;