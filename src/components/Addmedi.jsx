import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { AddMedicine } from "../redux/slices/mediSlice";

import {
  FaPlus,
  FaSave,
} from "react-icons/fa";

function Addmedi() {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [expiry, setExpiry] = useState("");

  const handleAdd = () => {

    if (
      !name ||
      !price ||
      !stock ||
      !category ||
      !expiry
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const newMedicine = {
      id: Date.now(),
      name: name,
      price: Number(price),
      stock: Number(stock),
      category: category,
      expiry: expiry,
    };

    dispatch(AddMedicine(newMedicine));

    alert("Medicine added successfully!");

    setName("");
    setPrice("");
    setStock("");
    setCategory("");
    setExpiry("");

    navigate("/medicines");
  };

  return (
    <div className="add-medicine-page">

      <div className="add-medicine-card">

        <h1>
          <FaPlus />
          Add Medicine
        </h1>

        <p>
          Add a new medicine to your inventory
        </p>

        <div className="form-group">
          <label>Medicine Name</label>

          <input
            type="text"
            placeholder="Enter medicine name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label>Price</label>

          <input
            type="number"
            placeholder="Enter price"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label>Stock</label>

          <input
            type="number"
            placeholder="Enter stock"
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label>Category</label>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            <option value="">
              Select Category
            </option>

            <option value="Tablet">
              Tablet
            </option>

            <option value="Syrup">
              Syrup
            </option>

            <option value="Injection">
              Injection
            </option>

            <option value="Capsule">
              Capsule
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Expiry Date</label>

          <input
            type="date"
            value={expiry}
            onChange={(e) =>
              setExpiry(e.target.value)
            }
          />
        </div>

        <button
          className="add-medicine-btn"
          onClick={handleAdd}
        >
          <FaSave />
          Add Medicine
        </button>

      </div>

    </div>
  );
}

export default Addmedi;