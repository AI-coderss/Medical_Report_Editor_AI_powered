import React from "react";
import { NavLink } from "react-router-dom";
import "../styles/sidebar.css";

const Sidebar = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-5 flex flex-col main-sidebar">
        <div className="mb-6 logo-icon">
          <img src="/logo.png" alt="Logo" className="w-32 mx-auto" />
        </div>
        <nav className="flex flex-col space-y-4">
          <NavLink
            to="/dashboard/add-user"
            className={({ isActive }) =>
              `font-semibold px-4 py-2 tabs rounded  ${
                isActive ? "bg-blue-500 active" : ""
              }`
            }
          >
            Add User
          </NavLink>
          <NavLink
            to="/dashboard/users"
            className={({ isActive }) =>
              `font-semibold px-4 py-2 tabs rounded ${
                isActive ? "bg-blue-500 active" : ""
              }`
            }
          >
            User List
          </NavLink>
          <NavLink
            to="/dashboard/reports"
            className={({ isActive }) =>
              `font-semibold px-4 py-2 tabs rounded ${
                isActive ? "bg-blue-500  active" : ""
              }`
            }
          >
            Reports
          </NavLink>
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
