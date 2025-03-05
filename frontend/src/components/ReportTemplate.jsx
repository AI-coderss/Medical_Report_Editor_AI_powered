// src/components/ReportTemplate.js
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import "../styles/ReportTemplate.css";

function ReportTemplate() {
  const [formData, setFormData] = useState({
    patientName: "",
    age: "",
    chiefComplaint: "",
    historyOfPresentIllness: "",
    pastMedicalHistory: "",
    familyHistory: "",
    medications: "",
    allergies: "",
    reviewOfSystems: "",
    physicalExamination: "",
    investigations: "",
    assessmentPlan: "",
    doctorSignature: "",
  });

  const [compiledReport, setCompiledReport] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if any required fields are empty
    for (const key in formData) {
      if (!formData[key].trim()) {
        alert(`Please fill in the ${key.replace(/([A-Z])/g, " $1").trim()} field.`);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/compile-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setCompiledReport(data.compiled_report);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Failed to connect to the backend.");
    }

    setLoading(false);
  };

  const handleClear = () => {
    setFormData({
      patientName: "",
      age: "",
      chiefComplaint: "",
      historyOfPresentIllness: "",
      pastMedicalHistory: "",
      familyHistory: "",
      medications: "",
      allergies: "",
      reviewOfSystems: "",
      physicalExamination: "",
      investigations: "",
      assessmentPlan: "",
      doctorSignature: "",
    });
    setCompiledReport(""); // Clear generated report
  };

  return (
    <div className="report-container">
      {/* Fixed Toolbar Below Navbar */}
      <div className="toolbar">
        <h2>Medical Report Editor</h2>
        <div className="toolbar-buttons">
          <button className={`generate-btn ${loading ? "loading" : ""}`} onClick={handleSubmit} disabled={loading}>
            {loading ? "Start Generating..." : "Generate Report"}
          </button>
          <button className="clear-btn" onClick={handleClear}>Clear Fields</button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="page-content">
        {/* Left Column - Form */}
        <div className="report-form-container">
          <form className="report-form">
            {Object.keys(formData).map((key) => (
              <div key={key}>
                <label>{key.replace(/([A-Z])/g, " $1").trim()}:</label>
                <textarea name={key} value={formData[key]} onChange={handleChange} required />
              </div>
            ))}
          </form>
        </div>

        {/* Right Column - AI Generated Report */}
        {compiledReport && (
          <div className="compiled-report">
            <h3>Compiled Medical Report</h3>
            <ReactMarkdown>{compiledReport}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportTemplate;








