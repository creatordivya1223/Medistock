import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaTrash,
  FaPills,
  FaEdit,
  FaSearch,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  fetchMedicines,
  deleteMedicine,
  editMedicine,
} from "../redux/slices/mediSlice";
import { useToast } from "../context/useToast";
import ConfirmModal from "./ConfirmModal";

function MediList() {
  const dispatch = useDispatch();
  const toast = useToast();

  const { medicines, pagination, loading, error } = useSelector(
    (state) => state.medicines
  );
  const { user } = useSelector((state) => state.auth);

  // Search, filter, pagination query state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Edit medicine modal state
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editError, setEditError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch medicines whenever search, filter, or page changes
  const loadData = useCallback(() => {
    const params = {
      page: currentPage,
      limit: pageSize,
    };
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }
    if (categoryFilter) {
      params.category = categoryFilter;
    }

    dispatch(fetchMedicines(params));
  }, [dispatch, currentPage, debouncedSearch, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Edit Submission
  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError("");

    const numericPrice = Number(editingMedicine.price);
    const numericStock = Number(editingMedicine.stock);

    if (isNaN(numericPrice) || numericPrice < 0) {
      setEditError("Price must be a valid number >= 0");
      return;
    }
    if (isNaN(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
      setEditError("Stock must be an integer >= 0");
      return;
    }

    setUpdating(true);

    const targetId = editingMedicine.id || editingMedicine._id;

    const actionResult = await dispatch(
      editMedicine({
        id: targetId,
        name: editingMedicine.name.trim(),
        price: numericPrice,
        stock: numericStock,
        category: editingMedicine.category,
        expiry: editingMedicine.expiry,
      })
    );

    setUpdating(false);

    if (editMedicine.fulfilled.match(actionResult)) {
      toast.success("Medicine updated successfully!");
      setEditingMedicine(null);
      loadData();
    } else {
      const msg = actionResult.payload || "Failed to update medicine";
      setEditError(msg);
      toast.error(msg);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id || deleteTarget._id;
    const actionResult = await dispatch(deleteMedicine(targetId));

    if (deleteMedicine.fulfilled.match(actionResult)) {
      toast.success(`'${deleteTarget.name}' deleted successfully.`);
      setDeleteTarget(null);
      loadData();
    } else {
      toast.error(actionResult.payload || "Failed to delete medicine.");
      setDeleteTarget(null);
    }
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
          <p>Manage your medicine inventory and stock levels</p>
        </div>

        <Link to="/add" className="primary-btn">
          <FaPlus />
          Add Medicine
        </Link>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search medicines by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Categories</option>
          <option value="Tablet">Tablet</option>
          <option value="Syrup">Syrup</option>
          <option value="Injection">Injection</option>
          <option value="Capsule">Capsule</option>
        </select>
      </div>

      {error && (
        <div className="form-error">
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}

      {/* MEDICINE TABLE */}
      <div className="table-container">
        {loading && medicines.length === 0 ? (
          <div className="loading-state">
            <p>Loading medicines...</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className="empty-state">
            <p>No medicines matched your criteria.</p>
          </div>
        ) : (
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
              {medicines.map((medicine) => {
                const medId = medicine.id || medicine._id;
                return (
                  <tr key={medId}>
                    <td>
                      <strong>{medicine.name}</strong>
                    </td>
                    <td>₹{Number(medicine.price).toFixed(2)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: "bold",
                          color:
                            medicine.stock === 0
                              ? "#dc2626"
                              : medicine.stock <= 10
                              ? "#ea580c"
                              : "#16a34a",
                        }}
                      >
                        {medicine.stock}
                      </span>
                    </td>
                    <td>{medicine.category}</td>
                    <td>
                      {medicine.expiry
                        ? new Date(medicine.expiry).toISOString().split("T")[0]
                        : "—"}
                    </td>

                    <td>
                      {/* EDIT BUTTON */}
                      <button
                        type="button"
                        className="edit-btn"
                        title="Edit medicine"
                        onClick={() => {
                          setEditError("");
                          setEditingMedicine({
                            ...medicine,
                            expiry: medicine.expiry
                              ? new Date(medicine.expiry)
                                  .toISOString()
                                  .split("T")[0]
                              : "",
                          });
                        }}
                      >
                        <FaEdit />
                      </button>

                      {/* DELETE BUTTON: Hidden for staff role */}
                      {user?.role === "admin" && (
                        <button
                          type="button"
                          className="delete-btn"
                          title="Delete medicine"
                          onClick={() => setDeleteTarget(medicine)}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* PAGINATION CONTROLS */}
        {pagination && pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing page {pagination.page} of {pagination.totalPages} (
              {pagination.total} total items)
            </span>

            <div className="pagination-controls">
              <button
                type="button"
                className="page-btn"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              <button
                type="button"
                className="page-btn"
                disabled={
                  currentPage >= pagination.totalPages || loading
                }
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, pagination.totalPages)
                  )
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingMedicine && (
        <div className="edit-overlay" onClick={() => setEditingMedicine(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Medicine</h2>

            {editError && (
              <div className="form-error">
                <FaExclamationCircle />
                <span>{editError}</span>
              </div>
            )}

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
                <label>Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
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
                <label>Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
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
                  required
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
                  onClick={() => setEditingMedicine(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="update-btn"
                  disabled={updating}
                >
                  {updating ? "Updating..." : "Update Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Medicine"
        message={`Are you sure you want to permanently delete '${deleteTarget?.name}'? This action cannot be undone.`}
        confirmText="Delete"
        confirmType="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default MediList;