import React from "react";
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

function Dashboard() {

  const medicines = useSelector(
    (state) => state.medicines.medicines
  );

  // Total medicines
  const totalMedicines = medicines.length;

  // Total stock
  const totalStock = medicines.reduce(
    (total, medicine) => total + Number(medicine.stock),
    0
  );

  // Low stock
  const lowStock = medicines.filter(
    (medicine) =>
      Number(medicine.stock) > 0 &&
      Number(medicine.stock) <= 10
  ).length;

  // Out of stock
  const outOfStock = medicines.filter(
    (medicine) => Number(medicine.stock) === 0
  ).length;

  // Inventory value
  const inventoryValue = medicines.reduce(
    (total, medicine) =>
      total +
      Number(medicine.price) * Number(medicine.stock),
    0
  );

  // Available units
  const availableUnits = medicines.filter(
    (medicine) => Number(medicine.stock) > 0
  ).length;

  // Attention required
  const attentionRequired = lowStock + outOfStock;

  // Recent medicines
  const recentMedicines = medicines.slice(-5).reverse();

  // Expiry alerts
  const today = new Date();

  const expiryAlerts = medicines.filter((medicine) => {
    const expiryDate = new Date(medicine.expiry);
    const difference =
      (expiryDate - today) /
      (1000 * 60 * 60 * 24);

    return difference <= 90;
  });

  // Categories
  const categories = {};

  medicines.forEach((medicine) => {
    if (categories[medicine.category]) {
      categories[medicine.category]++;
    } else {
      categories[medicine.category] = 1;
    }
  });

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome to your medicine inventory dashboard
          </p>
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
            <h2>{totalMedicines}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <FaBoxes />
          </div>

          <div>
            <p>Total Stock</p>
            <h2>{totalStock}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FaExclamationTriangle />
          </div>

          <div>
            <p>Low Stock</p>
            <h2>{lowStock}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <FaTimesCircle />
          </div>

          <div>
            <p>Out of Stock</p>
            <h2>{outOfStock}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <FaRupeeSign />
          </div>

          <div>
            <p>Inventory Value</p>
            <h2>₹{inventoryValue}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">
            <FaClipboardCheck />
          </div>

          <div>
            <p>Available Units</p>
            <h2>{availableUnits}</h2>
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
            {attentionRequired} medicine(s) need your
            attention.
          </p>
        </div>

        <Link to="/alerts">
          View Alerts
        </Link>

      </div>

      {/* Quick Actions */}
      <section className="section">

        <h2>Quick Actions</h2>

        <div className="quick-actions">

          <Link to="/add" className="action-card">
            <FaPlus />
            <span>Add Medicine</span>
          </Link>

          <Link
            to="/medicines"
            className="action-card"
          >
            <FaEye />
            <span>View Medicines</span>
          </Link>

          <Link
            to="/alerts"
            className="action-card"
          >
            <FaBell />
            <span>View Alerts</span>
          </Link>

          <Link
            to="/reports"
            className="action-card"
          >
            <FaChartBar />
            <span>View Reports</span>
          </Link>

        </div>

      </section>

      {/* Bottom section */}
      <div className="dashboard-bottom">

        {/* Recent medicines */}
        <section className="panel">

          <div className="panel-header">
            <h2>Recent Medicines</h2>

            <Link to="/medicines">
              View All
            </Link>
          </div>

          {recentMedicines.length === 0 ? (
            <p>No medicines available.</p>
          ) : (
            <div className="medicine-list">

              {recentMedicines.map((medicine) => (
                <div
                  className="medicine-row"
                  key={medicine.id}
                >

                  <div>
                    <h4>{medicine.name}</h4>
                    <p>{medicine.category}</p>
                  </div>

                  <div>
                    <strong>
                      {medicine.stock}
                    </strong>

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
            <h2>Expiry Alerts</h2>

            <Link to="/alerts">
              View All
            </Link>
          </div>

          {expiryAlerts.length === 0 ? (
            <p>No expiry alerts.</p>
          ) : (
            <div className="medicine-list">

              {expiryAlerts.slice(0, 5).map(
                (medicine) => (
                  <div
                    className="medicine-row"
                    key={medicine.id}
                  >

                    <div>
                      <h4>{medicine.name}</h4>
                      <p>
                        Expires: {medicine.expiry}
                      </p>
                    </div>

                    <FaExclamationTriangle />

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* Categories */}
        <section className="panel">

          <div className="panel-header">
            <h2>Medicine Categories</h2>
          </div>

          {Object.keys(categories).map(
            (category) => (
              <div
                className="category-row"
                key={category}
              >

                <span>{category}</span>

                <strong>
                  {categories[category]}
                </strong>

              </div>
            )
          )}

        </section>

      </div>

    </div>
  );
}

export default Dashboard;