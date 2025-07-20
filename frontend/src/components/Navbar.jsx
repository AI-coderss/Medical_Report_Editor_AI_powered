// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import "../styles/Navbar.css";
import { useLanguage } from "./LanguageContext"; // ✅ import context
import LanguageDropdown from "./LanguageDropdown";
const Navbar = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage(); // ✅ get selected language

  // 🔤 Translations for English and Arabic
  const labels = {
    templates: language === "en" ? "Templates" : "النماذج",
    editor: language === "en" ? "Editor" : "المحرر",
    upload: language === "en" ? "Upload Report" : "رفع التقرير",
    retrieve: language === "en" ? "Retrieve Report" : "استرجاع التقرير",
    settings: language === "en" ? "Settings" : "الإعدادات",
    logout: language === "en" ? "Logout" : "تسجيل الخروج",
  };
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
            <i>📋</i> {labels.templates}
          </div>
          <div
            className={`tab ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => handleTabClick("editor", "/editor")}
          >
            <i>✍️</i> {labels.editor}
          </div>
          <div
            className={`tab ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => handleTabClick("upload", "/upload-report")}
          >
            <i>📤</i> {labels.upload}
          </div>
          <div
            className={`tab ${activeTab === "retrieve" ? "active" : ""}`}
            onClick={() => handleTabClick("retrieve", "/retrieve-report")}
          >
            <i>📄</i> {labels.retrieve}
          </div>
          <div
            className={`tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => handleTabClick("settings", "/settings")}
          >
            <i>⚙️</i> {labels.settings}
          </div>
        </div>
        <div class="dropdown-container">
          <input type="checkbox" id="dropdown-toggle" class="dropdown-toggle" />
          <label for="dropdown-toggle" class="btn">
            ⋮
          </label>
          <div class="dropdown">
            {/* Language Toggle Switch */}
            <LanguageDropdown language={language} onChange={toggleLanguage} />

            <div className="logout" onClick={handleLogout}>
              <i className="fa fa-sign-out" aria-hidden="true"></i>
              <span className="logout-label">{labels.logout}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
