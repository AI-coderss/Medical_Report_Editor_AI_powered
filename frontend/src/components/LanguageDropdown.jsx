import React, { useState, useRef, useEffect } from "react";
import "../styles/LanguageDropdown.css"; // Optional external CSS

const options = [
  { value: "en", label: "English", icon: "/globe.svg" },
  { value: "ar", label: "العربية", icon: "/globe.svg" },
];

export default function LanguageDropdown({ language, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  const toggleDropdown = () => setIsOpen(!isOpen);
  const handleSelect = (value) => {
    onChange(value);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === language);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div className="selected-option" onClick={toggleDropdown}>
        <img src={selectedOption.icon} alt="" className="icon" />
        <span>{selectedOption.label}</span>
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <ul className="dropdown-options">
          {options.map((option) => (
            <li
              key={option.value}
              className="dropdown-option"
              onClick={() => handleSelect(option.value)}
            >
              <img src={option.icon} alt="" className="icon" />
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
