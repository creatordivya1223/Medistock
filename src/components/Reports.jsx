import React from "react";
import { useSelector } from "react-redux";

import {
  FaChartBar,
  FaPills,
  FaBoxes,
  FaRupeeSign,
} from "react-icons/fa";

function Reports() {

  const medicines = useSelector(
    (state) => state.medicines.medicines
  );

  const totalStock = medicines.reduce(
    (total, medicine) =>
      total + Number(medicine.stock),
    0
  );

  const inventoryValue = medicines.reduce(
    (total, medicine) =>
      total +
      Number(medicine.price) *
        Number(medicine.stock),
    0
  );

  return (
    <div className="page">

      <div className="page-header">

        <div>
          <h1>
            <FaChartBar />
            Reports
          </h1>

          <p>
            Overview of your medicine inventory
          </p>
        </div>

      </div>

      <div className="report-grid">

        <div className="report-card">
          <FaPills />
          <h3>Total Medicines</h3>
          <h2>{medicines.length}</h2>
        </div>

        <div className="report-card">
          <FaBoxes />
          <h3>Total Stock</h3>
          <h2>{totalStock}</h2>
        </div>

        <div className="report-card">
          <FaRupeeSign />
          <h3>Inventory Value</h3>
          <h2>₹{inventoryValue}</h2>
        </div>

      </div>

      <div className="report-table">

        <h2>Medicine Report</h2>

        <table>

          <thead>
            <tr>
              <th>Medicine</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Value</th>
            </tr>
          </thead>

          <tbody>

            {medicines.map((medicine) => (
              <tr key={medicine.id}>

                <td>{medicine.name}</td>

                <td>{medicine.category}</td>

                <td>{medicine.stock}</td>

                <td>
                  ₹
                  {medicine.price *
                    medicine.stock}
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