import React from "react";
import { useSelector } from "react-redux";

import {
  FaBell,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa";

function Alerts() {

  const medicines = useSelector(
    (state) => state.medicines.medicines
  );

  const lowStock = medicines.filter(
    (medicine) =>
      medicine.stock > 0 &&
      medicine.stock <= 10
  );

  const outOfStock = medicines.filter(
    (medicine) => medicine.stock === 0
  );

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>
            <FaBell />
            Alerts
          </h1>

          <p>
            Medicines that need attention
          </p>
        </div>
      </div>

      <div className="alert-section">

        <h2>
          <FaExclamationTriangle />
          Low Stock
        </h2>

        {lowStock.length === 0 ? (
          <p>No low stock medicines.</p>
        ) : (
          lowStock.map((medicine) => (
            <div
              className="alert-item warning"
              key={medicine.id}
            >
              <strong>
                {medicine.name}
              </strong>

              <span>
                Only {medicine.stock} units left
              </span>
            </div>
          ))
        )}

      </div>

      <div className="alert-section">

        <h2>
          <FaTimesCircle />
          Out of Stock
        </h2>

        {outOfStock.length === 0 ? (
          <p>No out of stock medicines.</p>
        ) : (
          outOfStock.map((medicine) => (
            <div
              className="alert-item danger"
              key={medicine.id}
            >
              <strong>
                {medicine.name}
              </strong>

              <span>
                Out of stock
              </span>
            </div>
          ))
        )}

      </div>

    </div>
  );
}

export default Alerts;