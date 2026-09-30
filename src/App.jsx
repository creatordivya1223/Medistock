import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import { useSelector } from "react-redux";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import MediList from "./components/MediList";
import Addmedi from "./components/Addmedi";
import Alerts from "./components/Alerts";
import Reports from "./components/Reports";
import "./App.css"

function App() {
  const medicines = useSelector(
    (state) => state.medicines.medicines
  );

  // Save medicines to localStorage
  useEffect(() => {
    localStorage.setItem(
      "medicines",
      JSON.stringify(medicines)
    );
  }, [medicines]);

  return (
    <BrowserRouter>
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medicines" element={<MediList />} />
          <Route path="/add" element={<Addmedi />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;