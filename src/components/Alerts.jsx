import { useState, useEffect } from "react";
import {
  FaBell,
  FaExclamationTriangle,
  FaTimesCircle,
  FaHourglassHalf,
  FaCalendarTimes,
} from "react-icons/fa";
import api from "../api/client";

function Alerts() {
  const [alerts, setAlerts] = useState({
    lowStock: [],
    outOfStock: [],
    expiringSoon: [],
    expired: [],
  });
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/alerts?days=${days}`);
        if (isMounted) {
          setAlerts(res.data.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load alerts");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAlerts();
    return () => {
      isMounted = false;
    };
  }, [days]);

  if (loading) {
    return (
      <div className="loading-state">
        <p>Loading inventory alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-error" style={{ margin: "30px" }}>
        <FaExclamationTriangle />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            <FaBell />
            Alerts
          </h1>
          <p>Medicines requiring urgent attention</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label htmlFor="expiry-days" style={{ fontSize: "14px", color: "#666" }}>
            Expiry Horizon:
          </label>
          <select
            id="expiry-days"
            className="filter-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={30}>Next 30 Days</option>
            <option value={60}>Next 60 Days</option>
            <option value={90}>Next 90 Days</option>
            <option value={180}>Next 180 Days</option>
          </select>
        </div>
      </div>

      {/* Out of Stock */}
      <div className="alert-section">
        <h2>
          <FaTimesCircle style={{ color: "#dc2626" }} />
          Out of Stock ({alerts.outOfStock.length})
        </h2>

        {alerts.outOfStock.length === 0 ? (
          <p style={{ color: "#777" }}>No out of stock medicines.</p>
        ) : (
          alerts.outOfStock.map((medicine) => (
            <div className="alert-item danger" key={medicine.id || medicine._id}>
              <div>
                <strong>{medicine.name}</strong>
                <span style={{ fontSize: "13px", marginLeft: "8px", opacity: 0.8 }}>
                  ({medicine.category})
                </span>
              </div>
              <span>0 units left</span>
            </div>
          ))
        )}
      </div>

      {/* Low Stock */}
      <div className="alert-section">
        <h2>
          <FaExclamationTriangle style={{ color: "#ea580c" }} />
          Low Stock ({alerts.lowStock.length})
        </h2>

        {alerts.lowStock.length === 0 ? (
          <p style={{ color: "#777" }}>No low stock medicines.</p>
        ) : (
          alerts.lowStock.map((medicine) => (
            <div className="alert-item warning" key={medicine.id || medicine._id}>
              <div>
                <strong>{medicine.name}</strong>
                <span style={{ fontSize: "13px", marginLeft: "8px", opacity: 0.8 }}>
                  ({medicine.category})
                </span>
              </div>
              <span>Only {medicine.stock} units left</span>
            </div>
          ))
        )}
      </div>

      {/* Expiring Soon */}
      <div className="alert-section">
        <h2>
          <FaHourglassHalf style={{ color: "#f59e0b" }} />
          Expiring Soon (Within {days} days) ({alerts.expiringSoon.length})
        </h2>

        {alerts.expiringSoon.length === 0 ? (
          <p style={{ color: "#777" }}>No medicines expiring soon.</p>
        ) : (
          alerts.expiringSoon.map((medicine) => (
            <div
              className="alert-item warning"
              key={medicine.id || medicine._id}
              style={{ background: "#fefce8", color: "#854d0e" }}
            >
              <div>
                <strong>{medicine.name}</strong>
                <span style={{ fontSize: "13px", marginLeft: "8px", opacity: 0.8 }}>
                  ({medicine.category})
                </span>
              </div>
              <span>
                Expires: {new Date(medicine.expiry).toLocaleDateString()} ({medicine.stock} in stock)
              </span>
            </div>
          ))
        )}
      </div>

      {/* Already Expired */}
      {alerts.expired && alerts.expired.length > 0 && (
        <div className="alert-section">
          <h2>
            <FaCalendarTimes style={{ color: "#b91c1c" }} />
            Expired Medicines ({alerts.expired.length})
          </h2>

          {alerts.expired.map((medicine) => (
            <div className="alert-item danger" key={medicine.id || medicine._id}>
              <div>
                <strong>{medicine.name}</strong>
                <span style={{ fontSize: "13px", marginLeft: "8px", opacity: 0.8 }}>
                  ({medicine.category})
                </span>
              </div>
              <span>
                Expired on {new Date(medicine.expiry).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Alerts;