import React, { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import "../styles/ReportTemplate.css";
import PDFDownloader from "./PdfDownloader";
import Cookies from "js-cookie";

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
    doctorSignature: "", // Will store Base64 signature
  });

  const [errors, setErrors] = useState({});
  const [compiledReport, setCompiledReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState("");
  const signatureRef = useRef(null);

  const validateForm = () => {
    let newErrors = {};

    if (formData.age && isNaN(formData.age)) {
      newErrors.age = "Age must be a valid number.";
    }

    if (signatureRef.current && signatureRef.current.isEmpty()) {
      newErrors.doctorSignature = "Signature is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: undefined,
      }));
    }
  };

  const handleClearSignature = () => {
    signatureRef.current.clear();
    setFormData((prevData) => ({
      ...prevData,
      doctorSignature: "",
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      doctorSignature: undefined,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const formDataToSend = new FormData();

    // Append form data except the doctorSignature
    Object.keys(formData).forEach((key) => {
      if (key !== "doctorSignature") {
        formDataToSend.append(key, formData[key]);
      }
    });

    // Handle the signature image
    if (signatureRef.current) {
      const signatureDataURL = signatureRef.current.toDataURL("image/png");
      const blob = await (await fetch(signatureDataURL)).blob();
      formDataToSend.append("doctorSignature", blob, "signature.png");
    }

    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureDataURL = signatureRef.current.toDataURL("image/png");
      setSignatureBase64(signatureDataURL); // Update state
    }

    setLoading(true);

    try {
      const token = Cookies.get("token");

      // Request to the second API
      const apiTwoRequest = fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/compile-report",
        {
          method: "POST",
          body: formDataToSend,
          headers: {
            Authorization: `Bearer ${token}`, // Add JWT token in headers
          },
        }
      );

      // Wait for both API requests to finish
      const [apiTwoResponse] = await Promise.all([apiTwoRequest]);

      const signatureDataURL =
        signatureRef.current && !signatureRef.current.isEmpty()
          ? signatureRef.current.toDataURL("image/png")
          : null;
      const signatureImageTag = signatureDataURL
        ? `<img src="${signatureDataURL}" alt="Doctor's Signature" style="height:50px; width:auto; display:block; margin-top:10px;" />`
        : "";
      const apiTwoData = await apiTwoResponse.json();
      if (apiTwoResponse.ok) {
        setCompiledReport(
          (prevCompiledReport) =>
            `${prevCompiledReport}\n\nAI Compiled Report:\n${apiTwoData.compiled_report}\n\nDoctor Signature:\n${signatureImageTag}`
        );
      } else {
        alert("Error: " + apiTwoData.error);
      }
    } catch (error) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        general: "Failed to connect to the backend.",
      }));
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
    setCompiledReport("");
    setErrors({});
    if (signatureRef.current) signatureRef.current.clear();
  };

  return (
    <div className="report-container">
      <div className="toolbar">
        <h2>Medical Report Editor</h2>
        <button
          className="generate-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
        <button className="clear-btn" onClick={handleClear}>
          Clear
        </button>
      </div>

      <div className="report-layout">
        <div className="report-form-container">
          <form className="report-form">
            <label>Patient Name:</label>
            <input
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
            />

            <label>Age:</label>
            <input
              type="text"
              name="age"
              value={formData.age}
              onChange={handleChange}
            />
            {errors.age && (
              <span className="text-red-500 error-message">{errors.age}</span>
            )}

            <label>Chief Complaint:</label>
            <textarea
              name="chiefComplaint"
              value={formData.chiefComplaint}
              onChange={handleChange}
            />

            <label>History of Present Illness:</label>
            <textarea
              name="historyOfPresentIllness"
              value={formData.historyOfPresentIllness}
              onChange={handleChange}
            />

            <label>Past Medical History:</label>
            <textarea
              name="pastMedicalHistory"
              value={formData.pastMedicalHistory}
              onChange={handleChange}
            />

            <label>Family History:</label>
            <textarea
              name="familyHistory"
              value={formData.familyHistory}
              onChange={handleChange}
            />

            <label>Medications:</label>
            <textarea
              name="medications"
              value={formData.medications}
              onChange={handleChange}
            />

            <label>Allergies:</label>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
            />

            <label>Review of Systems:</label>
            <textarea
              name="reviewOfSystems"
              value={formData.reviewOfSystems}
              onChange={handleChange}
            />

            <label>Physical Examination:</label>
            <textarea
              name="physicalExamination"
              value={formData.physicalExamination}
              onChange={handleChange}
            />

            <label>Investigations:</label>
            <textarea
              name="investigations"
              value={formData.investigations}
              onChange={handleChange}
            />

            <label>Assessment & Plan:</label>
            <textarea
              name="assessmentPlan"
              value={formData.assessmentPlan}
              onChange={handleChange}
            />

            <label>Doctor's Signature:</label>
            <div className="signature-container">
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  width: 300,
                  height: 100,
                  className: "signature-pad",
                }}
              />
              <button type="button" onClick={handleClearSignature}>
                Clear Signature
              </button>
            </div>
            {errors.doctorSignature && (
              <span className="text-red-500 error-message">
                {errors.doctorSignature}
              </span>
            )}
          </form>
        </div>

        <div className="compiled-report-container">
          <h3>Compiled Medical Report</h3>
          {compiledReport ? (
            <>
              <div
                className="compiled-report"
                dangerouslySetInnerHTML={{ __html: compiledReport }}
              />
              <PDFDownloader
                content={compiledReport}
                fileName="Medical_Report.pdf"
              />
            </>
          ) : (
            <p className="empty-report">
              The report will be displayed here after generation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportTemplate;
