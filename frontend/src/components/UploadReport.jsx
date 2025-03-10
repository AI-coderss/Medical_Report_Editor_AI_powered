import React, { useState } from "react";
import "draft-js/dist/Draft.css";
import "../styles/UploadReport.css";
import { FaUpload, FaTrash, FaDownload} from "react-icons/fa";
import ReactMarkdown from "react-markdown"; // ✅ Import ReactMarkdown
import PDFDownloader from "../components/PdfDownloader";
import Loader from "../components/Loader"; // ✅ Import Loader component

const UploadReport = () => {
  const [structuredReport, setStructuredReport] = useState("");
  const [loading, setLoading] = useState(false); // ✅ Used for loading state

  // Handle PDF Upload
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true); // ✅ Start loading indicator
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://medical-report-editor-ai-powered-backend.onrender.com/process-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStructuredReport(data.structured_text);
      } else {
        alert("Error processing file: " + data.error);
      }
    } catch (error) {
      alert("Failed to connect to the AI backend.");
    }

    setLoading(false); // ✅ Stop loading indicator
  };

  // Handle Clear Report
  const handleClear = () => {
    setStructuredReport("");
  };

  return (
    <div className="upload-container">
      {/* Toolbar */}
      <div className="toolbar">
        <label className="upload-btn">
          <FaUpload /> Upload Report
          <input
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            hidden
          />
        </label>

        <button className="clear-btn" onClick={handleClear}>
          <FaTrash /> Clear
        </button>

        {structuredReport && (
          <PDFDownloader content={structuredReport} fileName="Structured_Report.pdf">
            <FaDownload /> Download
          </PDFDownloader>
        )}
      </div>

         {/* ✅ Loader during processing */}
      {loading && <Loader isLoading={loading} />}

      {/* Structured Report Preview using ReactMarkdown */}
      <div className="word-like-editor">
        {structuredReport ? (
          <ReactMarkdown>{structuredReport}</ReactMarkdown>
        ) : (
          <p className="placeholder-text">Structured report will appear here...</p>
        )}
      </div>
    </div>
  );
};

export default UploadReport;

