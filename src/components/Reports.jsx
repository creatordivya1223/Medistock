import { useState, useEffect } from "react";
import {
  FaChartBar,
  FaPills,
  FaBoxes,
  FaRupeeSign,
  FaExclamationTriangle,
  FaLayerGroup,
} from "react-icons/fa";
import api from "../api/client";

function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchValuation = async () => {
      try {
        setLoading(true);
        const res = await api.get("/reports/valuation");
        if (isMounted) {
          setReport(res.data.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || "Failed to load valuation report"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchValuation();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <p>Generating valuation report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="form-error" style={{ margin: "30px" }}>
        <FaExclamationTriangle />
        <span>{error || "Unable to load reports"}</span>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            <FaChartBar />
            Inventory Valuation Report
          </h1>
          <p>Financial valuation and asset distribution (Admin Only)</p>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <FaPills />
          <h3>Total Items (SKUs)</h3>
          <h2>{report.totalItems}</h2>
        </div>

        <div className="report-card">
          <FaBoxes />
          <h3>Total Units in Stock</h3>
          <h2>{report.totalUnits}</h2>
        </div>

        <div className="report-card">
          <FaRupeeSign />
          <h3>Total Inventory Value</h3>
          <h2>₹{report.totalInventoryValue?.toLocaleString()}</h2>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN */}
      {report.categoryValuation && report.categoryValuation.length > 0 && (
        <div className="table-container" style={{ marginBottom: "25px" }}>
          <h2 style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaLayerGroup style={{ color: "#2563eb" }} />
            Valuation by Category
          </h2>

          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Units in Stock</th>
                <th>Total Value</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryValuation.map((cat) => {
                const share =
                  report.totalInventoryValue > 0
                    ? ((cat.totalValue / report.totalInventoryValue) * 100).toFixed(1)
                    : 0;

                return (
                  <tr key={cat.category}>
                    <td>
                      <strong>{cat.category}</strong>
                    </td>
                    <td>{cat.totalStock} units</td>
                    <td>₹{cat.totalValue?.toLocaleString()}</td>
                    <td>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PER-MEDICINE VALUATION */}
      <div className="report-table">
        <h2>Per-Medicine Valuation (Ranked by Value)</h2>

        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Stock</th>
              <th>Total Value</th>
            </tr>
          </thead>

          <tbody>
            {report.medicines?.map((m) => (
              <tr key={m.id || m._id}>
                <td>
                  <strong>{m.name}</strong>
                </td>
                <td>{m.category}</td>
                <td>₹{m.price}</td>
                <td>{m.stock}</td>
                <td>
                  <strong>₹{m.totalValue?.toLocaleString()}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;