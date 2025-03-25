// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Howl } from "howler"; // Import Howler.js
import Cookies from "js-cookie"; // Import js-cookie
import "../styles/Navbar.css";

const Navbar = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate(); // For redirection

  // Navigation sound effect
  const navSound = new Howl({
    src: ["/nav.wav"], // Path to the sound file
    volume: 0.05, // Set volume
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleNavigation = (index) => {
    setActiveIndex(index);
    setMenuOpen(false);
    navSound.play();
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };
  const handleLogout = () => {
    Cookies.remove("token"); // Remove the authentication token from cookies
    navigate("/login"); // Redirect to the login page
  };

  return (
    <div className="nav">
      <div className="navLogo">
        <img
          src="/logo.png"
          alt="Medical Report Editor Logo"
          height="50px"
          width="auto"
        />
      </div>
      {isMobile ? (
        <div className="burgerMenu">
          <div className="burgerIcon" onClick={toggleMenu}>
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
          {menuOpen && (
            <div className="dropdownMenu">
              {[
                "Editor ✍️",
                "Templates 📋",
                "Upload Report 📤",
                "Settings ⚙️",
              ].map((label, index) => (
                <Link
                  to={
                    index === 0
                      ? "/editor"
                      : index === 1
                      ? "/template"
                      : index === 2
                      ? "/upload-report"
                      : "/settings"
                  }
                  key={index}
                  className={`mobileNavItem ${
                    activeIndex === index ? "active" : ""
                  }`}
                  onClick={() => handleNavigation(index)}
                >
                  {label}
                </Link>
              ))}
              <button className="logout-btn mobile" onClick={handleLogout}>
                Logout 🚪
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="navItemContainer">
          {["Editor ✍️", "Templates 📋", "Upload Report 📤", "Settings ⚙️"].map(
            (label, index) => (
              <Link
                to={
                  index === 0
                    ? "/editor"
                    : index === 1
                    ? "/template"
                    : index === 2
                    ? "/upload-report"
                    : "/settings"
                }
                key={index}
                className={`navItem ${activeIndex === index ? "active" : ""}`}
                onClick={() => handleNavigation(index)}
              >
                {label}
              </Link>
            )
          )}
          <div
            className="navItemActiveContainer"
            style={{ transform: `translateX(${activeIndex * 200}px)` }}
          >
            <div className="navItemActive">
              <div className="navItemActiveLeft"></div>
              <div className="navItemActiveCenter"></div>
              <div className="navItemActiveRight"></div>
            </div>
            <div className="navItemActive">
              <div className="navItemActiveCopyLeft"></div>
              <div className="navItemActiveCopyCenter"></div>
              <div className="navItemActiveCopyRight"></div>
            </div>
          </div>
        </div>
      )}
      {!isMobile && (
        <div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout 🚪
          </button>
        </div>
      )}
    </div>
  );
};

export default Navbar;
