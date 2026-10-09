import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  FaCapsules,
  FaHome,
  FaPills,
  FaPlus,
  FaBell,
  FaChartBar,
  FaUsers,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import { logout } from "../redux/slices/authSlice";

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <FaCapsules />
        <Link to="/">MediStock</Link>
      </div>

      {token && (
        <>
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

            {/* Reports is hidden for staff */}
            {user?.role === "admin" && (
              <Link to="/reports">
                <FaChartBar />
                Reports
              </Link>
            )}

            {/* User Management is hidden for staff */}
            {user?.role === "admin" && (
              <Link to="/users">
                <FaUsers />
                Users
              </Link>
            )}
          </div>

          <div className="nav-right">
            {user && (
              <div className="user-badge">
                <FaUserCircle />
                <span>{user.name}</span>
                <span className={`role-tag ${user.role}`}>{user.role}</span>
              </div>
            )}

            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
              title="Sign out"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </>
      )}
    </nav>
  );
}

export default Navbar;