import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";

import {
  FaPlus,
  FaTrash,
  FaPills,
  FaEdit,
} from "react-icons/fa";

import {
  DelMedicine,
  EditMedicine,
} from "../redux/slices/mediSlice";

function MediList() {

  const medicines = useSelector(
    (state) => state.medicines.medicines
  );

  const dispatch = useDispatch();

  // Edit medicine
  const [editingMedicine, setEditingMedicine] = useState(null);

  const handleDelete = (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this medicine?"
      )
    ) {
      dispatch(DelMedicine(id));
    }
  };

  const handleEdit = (medicine) => {
    setEditingMedicine({ ...medicine });
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    dispatch(
      EditMedicine({
        id: editingMedicine.id,
        name: editingMedicine.name,
        price: Number(editingMedicine.price),
        stock: Number(editingMedicine.stock),
        category: editingMedicine.category,
        expiry: editingMedicine.expiry,
      })
    );

    setEditingMedicine(null);
  };

  return (
    <div className="page">

      {/* PAGE HEADER */}

      <div className="page-header">

        <div>
          <h1>
            <FaPills />
            Medicines
          </h1>

          <p>
            Manage your medicine inventory
          </p>
        </div>

        <Link
          to="/add"
          className="primary-btn"
        >
          <FaPlus />
          Add Medicine
        </Link>

      </div>

      {/* MEDICINE TABLE */}

      <div className="table-container">

        <table>

          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Category</th>
              <th>Expiry</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {medicines.map((medicine) => (
              <tr key={medicine.id}>

                <td>
                  {medicine.name}
                </td>

                <td>
                  ₹{medicine.price}
                </td>

                <td>
                  {medicine.stock}
                </td>

                <td>
                  {medicine.category}
                </td>

                <td>
                  {medicine.expiry}
                </td>

                <td>

                  {/* EDIT BUTTON */}

                  <button
                    className="edit-btn"
                    onClick={() =>
                      handleEdit(medicine)
                    }
                  >
                    <FaEdit />
                  </button>

                  {/* DELETE BUTTON */}

                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDelete(medicine.id)
                    }
                  >
                    <FaTrash />
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* EDIT FORM */}

      {editingMedicine && (
        <div className="edit-overlay">

          <div className="edit-modal">

            <h2>Edit Medicine</h2>

            <form onSubmit={handleUpdate}>

              <div className="form-group">
                <label>Medicine Name</label>

                <input
                  type="text"
                  value={editingMedicine.name}
                  onChange={(e) =>
                    setEditingMedicine({
                      ...editingMedicine,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Price</label>

                <input
                  type="number"
                  value={editingMedicine.price}
                  onChange={(e) =>
                    setEditingMedicine({
                      ...editingMedicine,
                      price: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock</label>

                <input
                  type="number"
                  value={editingMedicine.stock}
                  onChange={(e) =>
                    setEditingMedicine({
                      ...editingMedicine,
                      stock: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>

                <select
                  value={editingMedicine.category}
                  onChange={(e) =>
                    setEditingMedicine({
                      ...editingMedicine,
                      category: e.target.value,
                    })
                  }
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Capsule">Capsule</option>
                </select>
              </div>

              <div className="form-group">
                <label>Expiry Date</label>

                <input
                  type="date"
                  value={editingMedicine.expiry}
                  onChange={(e) =>
                    setEditingMedicine({
                      ...editingMedicine,
                      expiry: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="edit-buttons">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setEditingMedicine(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="update-btn"
                >
                  Update Medicine
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default MediList;