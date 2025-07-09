import React, { useState } from "react";
import "draft-js/dist/Draft.css";
import "../styles/UploadReport.css";
import { FaUpload, FaTrash, FaDownload, FaLanguage } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import PDFDownloader from "../components/PdfDownloader";
import Loader from "../components/Loader";
import { useLanguage } from "./LanguageContext";

const UploadReport = () => {
  const [structuredReport, setStructuredReport] = useState("");
  const [translatedReport, setTranslatedReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // Default: English
  const { language } = useLanguage();
  const labels = {
    upload: language === "en" ? "Upload Report" : "رفع التقرير",
    clear: language === "en" ? "Clear" : "مسح",
    translate: language === "en" ? "Translate To" : "ترجمة إلى",
    placeholder:
      language === "en"
        ? "Structured report will appear here..."
        : "سيظهر التقرير المنظم هنا...",
    download: language === "en" ? "Download" : "تحميل",
  };
  // Handle PDF Upload
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/process-pdf",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStructuredReport(data.structured_text);
        setTranslatedReport("");
      } else {
        alert("Error processing file: " + data.error);
      }
    } catch (error) {
      alert("Failed to connect to the AI backend.");
    }

    setLoading(false);
  };

  // Handle Report Translation
  const handleTranslate = async () => {
    if (!structuredReport) {
      alert("No report to translate.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/translate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: structuredReport,
            target_language: selectedLanguage,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTranslatedReport(data.translated_text);
      } else {
        alert("Translation error: " + data.error);
      }
    } catch (error) {
      alert("Failed to connect to the AI backend.");
    }

    setLoading(false);
  };

  // Handle Clear Report
  const handleClear = () => {
    setStructuredReport("");
    setTranslatedReport("");
  };

  return (
    <div className="upload-container" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <div className="toolbar">
        <label className="upload-btn">
          <FaUpload /> {labels.upload}
          <input
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            hidden
          />
        </label>

        <button className="clear-btn" onClick={handleClear}>
          <FaTrash /> {labels.clear}
        </button>

        {/* ✅ Translate To Button & Language Selector */}
        <div className="select-menu">
          <button className="translate-btn" onClick={handleTranslate}>
            <FaLanguage /> {labels.translate}
          </button>
          <select
            className="select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
          </select>
        </div>

        {structuredReport && (
          <PDFDownloader
            content={translatedReport || structuredReport}
            fileName="Structured_Report.pdf"
          >
            <FaDownload /> {labels.download}
          </PDFDownloader>
        )}
      </div>

      {/* ✅ Loader during processing */}
      {loading && <Loader isLoading={loading} />}

      {/* ✅ Structured Report Preview using ReactMarkdown */}
      <div className="word-like-editor">
        {translatedReport ? (
          <ReactMarkdown>{translatedReport}</ReactMarkdown>
        ) : structuredReport ? (
          <ReactMarkdown>{structuredReport}</ReactMarkdown>
        ) : (
          <p className="placeholder-text">{labels.placeholder}</p>
        )}
      </div>
    </div>
  );
};

export default UploadReport;
