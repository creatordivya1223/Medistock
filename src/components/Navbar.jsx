import React from "react";
import { Link } from "react-router-dom";

import {
  FaCapsules,
  FaHome,
  FaPills,
  FaPlus,
  FaBell,
  FaChartBar,
} from "react-icons/fa";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        <FaCapsules />
        <span>MediStock</span>
      </div>

      <div className="nav-links">

        <Link to="/">
          <FaHome />
          Dashboard
        </Link>

        <Link to="/medicines">
          <FaPills />
          Medicines
        </Link>

        <Link to="/add">
          <FaPlus />
          Add Medicine
        </Link>

        <Link to="/alerts">
          <FaBell />
          Alerts
        </Link>

        <Link to="/reports">
          <FaChartBar />
          Reports
        </Link>

      </div>

    </nav>
  );
}

export default Navbar;