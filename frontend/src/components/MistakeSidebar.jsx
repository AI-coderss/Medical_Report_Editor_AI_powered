// src/components/MistakeSidebar.js
import React from "react";
import "../styles/MistakeSidebar.css";
import { Close, Visibility, VisibilityOff } from "@mui/icons-material";
import { useLanguage } from "./LanguageContext";

// Function to detect and highlight AI-suggested grammar/spelling mistakes
const errorStrategy = (text) => {
  const regex = /\*\*(.*?)\*\*\s\((.*?)\)/g; // Matches **mistake** (correction)
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before the mistake
    parts.push(text.substring(lastIndex, match.index));

    // Push mistake with red underline
    parts.push(
      <span
        key={match.index}
        className="error-span"
        title={`Correction: ${match[2]}`}
      >
        {match[1]}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  // Push remaining text
  parts.push(text.substring(lastIndex));
  return parts;
};

const MistakeSidebar = ({ mistakes, onClose, isOpen, onToggle }) => {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  return (
    <div
      className={`mistake-sidebar ${isOpen ? "open" : ""}`}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="mistake-header">
        <h3>{isArabic ? "اقتراحات القواعد" : "Grammar Suggestions"}</h3>

        {/* Toggle Sidebar Button */}
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? <VisibilityOff /> : <Visibility />}
        </button>

        {/* Close Button */}
        <button className="close-btn" onClick={onClose}>
          <Close />
        </button>
      </div>

      {/* Mistake List with Highlighting */}
      <div className="mistake-content">
        {mistakes ? (
          <div className="mistake-text">{errorStrategy(mistakes)}</div>
        ) : (
          <p>{isArabic ? "لا توجد أخطاء." : "No mistakes found."}</p>
        )}
      </div>
    </div>
  );
};

export default MistakeSidebar;
