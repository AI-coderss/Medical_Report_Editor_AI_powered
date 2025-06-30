import React, { useState } from "react";
import "../styles/ReportTemplate.css";
import AudioRecorder from "./AudioRecorder";
import PDFDownloader from "./PdfDownloader";
import Cookies from "js-cookie";
import Loader from "../components/Loader";
import { marked } from "marked";

function ReportTemplate() {
  const [formData, setFormData] = useState({
    patientName: "",
    age: "",
    fileNumber: "",
    chiefComplaint: "",
    personalHistory: "",
    presentIllness: "",
    medicalHistory: "",
    pastHistory: "",
    familyHistory: "",
    systemReview: "",
  });

  const [errors, setErrors] = useState({});
  const [compiledReport, setCompiledReport] = useState("");
  const [loading, setLoading] = useState(false);

  const doctorName = localStorage.getItem("doctorName") || "Dr.Test";
  const department = localStorage.getItem("department") || "Department-Test";

  const validateForm = () => {
    let newErrors = {};
    if (formData.age && isNaN(formData.age)) {
      newErrors.age = "Age must be a valid number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      formDataToSend.append(key, formData[key]);
    });
    formDataToSend.append("doctor_name", doctorName);
    formDataToSend.append("department", department);

    setLoading(true);
    setCompiledReport(""); // Clear previous report

    try {
      const token = Cookies.get("token");
      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/compile-report-stream",
        {
          method: "POST",
          body: formDataToSend,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Update the UI with each chunk
        setCompiledReport((prev) => prev + chunk);
      }

      // Optional: Do something with the complete report
      console.log("Complete report:", fullText);
    } catch (error) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        general: error.message || "Failed to connect to the backend.",
      }));
    }

    setLoading(false);
  };

  const handleClear = () => {
    setFormData({
      patientName: "",
      age: "",
      fileNumber: "",
      chiefComplaint: "",
      personalHistory: "",
      presentIllness: "",
      medicalHistory: "",
      pastHistory: "",
      familyHistory: "",
      systemReview: "",
    });
    setCompiledReport("");
    setErrors({});
  };

  return (
    <div className="report-container">
      <div className="loader-circle">
        {loading && <Loader isLoading={loading} />}
      </div>
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
      <div className="flex_sec">
        <div
          className={`one report-detail ${
            compiledReport ? "report-generated" : ""
          }`}
        >
          <AudioRecorder setFormData={setFormData} />
          <div className="report-form-container">
            <form className="report-form">
              {/* Form Fields */}
              {[
                "patientName",
                "age",
                "fileNumber",
                "chiefComplaint",
                "presentIllness",
                "medicalHistory",
                "pastHistory",
                "familyHistory",
                "personalHistory",
                "systemReview",
              ].map((field) => (
                <React.Fragment key={field}>
                  <label>{field.replace(/([A-Z])/g, " $1")}:</label>
                  {field === "chiefComplaint" ||
                  field === "presentIllness" ||
                  field === "medicalHistory" ||
                  field === "pastHistory" ||
                  field === "familyHistory" ||
                  field === "personalHistory" ||
                  field === "systemReview" ? (
                    <textarea
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                    />
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                    />
                  )}
                </React.Fragment>
              ))}
            </form>
          </div>
        </div>

        <div className="report-layout one">
          <div className="compiled-report-container">
            <h3>Compiled Medical Report</h3>
            {compiledReport ? (
              <>
                <PDFDownloader
                  content={compiledReport}
                  fileName="Medical_Report.pdf"
                />
                <div className="compiled-report text-justify px-20 pb-4">
                  <div className="w-full mb-4">
                    <img
                      src="/head.png"
                      alt="Header"
                      className="w-full h-auto"
                    />
                  </div>
                  <pre className="pretag">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: marked(compiledReport),
                      }}
                    />
                  </pre>
                  <div className="w-full mt-4">
                    <img
                      src="/foot.png"
                      alt="Footer"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="empty-report">
                The report will be displayed here after generation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportTemplate;
