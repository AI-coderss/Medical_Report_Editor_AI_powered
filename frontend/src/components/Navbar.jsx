// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import "../styles/Navbar.css";

const Navbar = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleTabClick = (tabId, path) => {
    setActiveTab(tabId);
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    Cookies.remove("token");
    navigate("/login");
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="nav">
      <div className="navbar">
        <div className="logo">
          <img src="logo.png" alt="logo" />
        </div>

        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>

        <div className={`tabs menu ${menuOpen ? "show" : ""}`} id="menu">
          <div
            className={`tab ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => handleTabClick("templates", "/template")}
          >
            <i>📋</i>Templates
          </div>
          <div
            className={`tab ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => handleTabClick("editor", "/editor")}
          >
            <i> ✍️</i>Editor
          </div>
          <div
            className={`tab ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => handleTabClick("upload", "/upload-report")}
          >
            <i>📤</i>Upload Report
          </div>
          <div
            className={`tab ${activeTab === "retrieve" ? "active" : ""}`}
            onClick={() => handleTabClick("retrieve", "/retrieve-report")}
          >
            <i>📄</i>Retrieve Report
          </div>
          <div
            className={`tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => handleTabClick("settings", "/settings")}
          >
            <i>⚙️</i>Settings
          </div>
        </div>
        <div className="logout" onClick={handleLogout}>
          <i>📜</i>Logout
        </div>
      </div>
    </div>
  );
};

export default Navbar;
