// Sidebar.jsx
import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../styles/sidebar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faPhone,
  faCalendarCheck,
  faGem,
  faRightFromBracket,
  faBars,
  faChevronLeft,
  faChevronRight,
  faTimes,
  faUserPlus,
  faUsers,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const indicator = document.getElementById("indicator");
    const menuItems = document.querySelectorAll(".sidebar ul li");

    menuItems.forEach((item) => {
      item.addEventListener("mouseover", () => {
        const itemHeight = item.offsetHeight;
        const offsetTop = item.offsetTop;
        indicator.style.top = `${offsetTop}px`;
        indicator.style.height = `${itemHeight}px`;
      });
    });
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar-wrapper ${isOpen ? "open" : ""}`}>
      {/* Sidebar Content */}
      <div className={`sidebar ${isOpen ? "open" : ""}`} id="sidebar">
        <ul>
          {/* Profile Section */}
          <div className="profile">
            <img src="/logo.png" alt="profile pic" />
          </div>

          <div className="indicator" id="indicator"></div>

          {/* ✅ Glassmorphic NavLinks with Active Styling */}
          <li>
            <NavLink
              to="/dashboard/add-user"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {/* <FontAwesomeIcon icon={faPhone} className="icon" /> */}
              <FontAwesomeIcon icon={faUserPlus} className="icon" />
              <span> Add User</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/users"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FontAwesomeIcon icon={faCalendarCheck} className="icon" />
              <span>User List</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dashboard/reports"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {/* <FontAwesomeIcon icon={faGem} className="icon" /> */}
              <FontAwesomeIcon icon={faFileAlt} className="icon" />
              <span>Reports</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/logout"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="icon" />
              <span>Logout</span>
            </NavLink>
          </li>
        </ul>
      </div>

      {/* ✅ Toggle Button: Hamburger for Mobile, Chevron for Desktop */}
      <button className="toggle-btn" onClick={handleToggle}>
        {isMobile ? (
          isOpen ? (
            <FontAwesomeIcon icon={faTimes} />
          ) : (
            <FontAwesomeIcon icon={faBars} />
          )
        ) : (
          <FontAwesomeIcon icon={isOpen ? faChevronLeft : faChevronRight} />
        )}
      </button>
    </div>
  );
};

export default Sidebar;
