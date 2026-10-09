import { useState, useEffect } from "react";
import { FaUsers, FaUserPlus, FaTimes, FaShieldAlt, FaExclamationCircle } from "react-icons/fa";
import api from "../api/client";
import { useToast } from "../context/useToast";

function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  useEffect(() => {
    let ignore = false;
    api
      .get("/users")
      .then((res) => {
        if (!ignore) {
          setUsers(res.data.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          toast.error(err.response?.data?.message || "Failed to load users");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [refreshCount, toast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await api.post("/users", formData);
      toast.success(`User '${formData.name}' created successfully!`);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "staff",
      });
      setShowAddModal(false);
      setRefreshCount((c) => c + 1);
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Failed to create user";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            <FaUsers />
            User Management
          </h1>
          <p>Manage pharmacy staff and administrator accounts</p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setFormError("");
            setShowAddModal(true);
          }}
        >
          <FaUserPlus />
          Add User
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p>No user accounts found.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id || u._id}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-tag ${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        u.isActive ? "active" : "inactive"
                      }`}
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showAddModal && (
        <div className="edit-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "520px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2>
                <FaShieldAlt style={{ marginRight: "8px", color: "#2563eb" }} />
                Create New User
              </h2>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            {formError && (
              <div className="form-error">
                <FaExclamationCircle />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="name@medistock.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Temporary Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  Must contain 8+ characters, uppercase, lowercase, and a number.
                </p>
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="staff">Staff (Inventory & Alerts)</option>
                  <option value="admin">Admin (Full Access & Reports)</option>
                </select>
              </div>

              <div className="edit-buttons">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="update-btn"
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
