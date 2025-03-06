// src/components/ReportTemplate.js
import React, { useState } from "react";
import "../styles/ReportTemplate.css";
import PDFDownloader from "./PdfDownloader";
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

    // Validate fields
    if (Object.values(formData).some((value) => value.trim() === "")) {
      alert("Please fill in all fields before generating the report.");
      return;
    }

    setLoading(true);

    try {
      // Send data to the backend for structured report generation
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
    setCompiledReport(""); // Clear the compiled report as well
  };

  return (
    <div className="report-container">
      {/* Toolbar */}
      <div className="toolbar">
        <h2>Medical Report Editor</h2>
        <button className="generate-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
        <button className="clear-btn" onClick={handleClear}>Clear</button>
      </div>

      {/* Page Layout: Left (Form) & Right (Generated Report) */}
      <div className="report-layout">
        {/* Left: Input Fields */}
        <div className="report-form-container">
          <form className="report-form">
            <label>Patient Name:</label>
            <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} required />

            <label>Age:</label>
            <input type="number" name="age" value={formData.age} onChange={handleChange} required />

            <label>Chief Complaint:</label>
            <textarea name="chiefComplaint" value={formData.chiefComplaint} onChange={handleChange} required />

            <label>History of Present Illness:</label>
            <textarea name="historyOfPresentIllness" value={formData.historyOfPresentIllness} onChange={handleChange} required />

            <label>Past Medical History:</label>
            <textarea name="pastMedicalHistory" value={formData.pastMedicalHistory} onChange={handleChange} required />

            <label>Family History:</label>
            <textarea name="familyHistory" value={formData.familyHistory} onChange={handleChange} required />

            <label>Medications:</label>
            <textarea name="medications" value={formData.medications} onChange={handleChange} required />

            <label>Allergies:</label>
            <textarea name="allergies" value={formData.allergies} onChange={handleChange} required />

            <label>Review of Systems:</label>
            <textarea name="reviewOfSystems" value={formData.reviewOfSystems} onChange={handleChange} required />

            <label>Physical Examination:</label>
            <textarea name="physicalExamination" value={formData.physicalExamination} onChange={handleChange} required />

            <label>Investigations:</label>
            <textarea name="investigations" value={formData.investigations} onChange={handleChange} required />

            <label>Assessment & Plan:</label>
            <textarea name="assessmentPlan" value={formData.assessmentPlan} onChange={handleChange} required />

            <label>Doctor's Signature:</label>
            <input type="text" name="doctorSignature" value={formData.doctorSignature} onChange={handleChange} required />
          </form>
        </div>

        {/* Right: Generated Report */}
        <div className="compiled-report-container">
          <h3>Compiled Medical Report</h3>
          {compiledReport ? (
            <>
              <pre className="compiled-report">{compiledReport}</pre>
              <PDFDownloader content={compiledReport} fileName="Medical_Report.pdf" />
            </>
          ) : (
            <p className="empty-report">The report will be displayed here after generation.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportTemplate;








