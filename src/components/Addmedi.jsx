import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaSave, FaExclamationCircle } from "react-icons/fa";
import { addMedicine } from "../redux/slices/mediSlice";
import { useToast } from "../context/useToast";

function Addmedi() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [expiry, setExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!name || price === "" || stock === "" || !category || !expiry) {
      toast.error("Please fill in all fields.");
      return;
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Price must be a valid number greater than or equal to 0.");
      return;
    }

    if (isNaN(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
      toast.error("Stock must be an integer greater than or equal to 0.");
      return;
    }

    setSubmitting(true);

    const newMedicine = {
      name: name.trim(),
      price: numericPrice,
      stock: numericStock,
      category,
      expiry,
    };

    const actionResult = await dispatch(addMedicine(newMedicine));

    if (addMedicine.fulfilled.match(actionResult)) {
      toast.success(`'${name}' added to inventory successfully!`);
      navigate("/medicines");
    } else {
      const errorMsg =
        actionResult.payload || "Failed to add medicine. Please try again.";
      setFormError(errorMsg);
      toast.error(errorMsg);
      setSubmitting(false);
    }
  };

  return (
    <div className="add-medicine-page">
      <div className="add-medicine-card">
        <h1>
          <FaPlus />
          Add Medicine
        </h1>

        <p>Add a new medicine to your inventory</p>

        {formError && (
          <div className="form-error">
            <FaExclamationCircle />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label htmlFor="medi-name">Medicine Name</label>
            <input
              id="medi-name"
              type="text"
              placeholder="e.g. Paracetamol 500mg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="medi-price">Price (₹)</label>
            <input
              id="medi-price"
              type="number"
              placeholder="e.g. 50.00"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="medi-stock">Stock Quantity</label>
            <input
              id="medi-stock"
              type="number"
              placeholder="e.g. 100"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="medi-category">Category</label>
            <select
              id="medi-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              <option value="Tablet">Tablet</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
              <option value="Capsule">Capsule</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="medi-expiry">Expiry Date</label>
            <input
              id="medi-expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="add-medicine-btn"
            disabled={submitting}
          >
            <FaSave />
            {submitting ? "Saving Medicine..." : "Add Medicine"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Addmedi;