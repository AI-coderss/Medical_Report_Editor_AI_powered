import React, { useState } from "react";
import "../styles/ReportTemplate.css";
import AudioRecorder from "./AudioRecorder";
import PDFDownloader from "./PdfDownloader";
import Cookies from "js-cookie";
import Loader from "../components/Loader";
import { marked } from "marked";
import { useLanguage } from "./LanguageContext"; // ✅ import context

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
  const [showRecorder, setShowRecorder] = useState(false);
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const doctorName = localStorage.getItem("doctorName") || "Dr.Test";
  const department = localStorage.getItem("department") || "Department-Test";
  const [activeField, setActiveField] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const dictationBufferRef = React.useRef({});
  const { language } = useLanguage(); // ✅ use language context

  const labels = {
    generateReport: language === "en" ? "Generate Report" : "إنشاء التقرير",
    clear: language === "en" ? "Clear" : "مسح",
    audioTranscription: language === "en" ? "Audio Transcription" : "نسخ الصوت",
    medicalReport: language === "en" ? "Medical Report" : "التقرير الطبي",
    fields: {
      patientName: language === "en" ? "Patient Name" : "اسم المريض",
      age: language === "en" ? "Age" : "العمر",
      fileNumber: language === "en" ? "File Number" : "رقم الملف",
      chiefComplaint: language === "en" ? "Chief Complaint" : "الشكوى الرئيسية",
      personalHistory:
        language === "en" ? "Personal History" : "التاريخ الشخصي",
      presentIllness: language === "en" ? "Present Illness" : "المرض الحالي",
      medicalHistory: language === "en" ? "Medical History" : "التاريخ الطبي",
      pastHistory: language === "en" ? "Past History" : "التاريخ السابق",
      familyHistory: language === "en" ? "Family History" : "التاريخ العائلي",
      systemReview: language === "en" ? "System Review" : "مراجعة النظام",
    },
  };

  const startDictation = (fieldName) => {
    if (!SpeechRecognition) {
      alert("Speech Recognition API not supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    dictationBufferRef.current[fieldName] = formData[fieldName] || "";

    recog.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = dictationBufferRef.current[fieldName] || "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      const combinedTranscript = finalTranscript + interimTranscript;

      setFormData((prevData) => ({
        ...prevData,
        [fieldName]: combinedTranscript,
      }));

      dictationBufferRef.current[fieldName] = finalTranscript;
    };

    recog.onerror = (e) => console.error("Speech recognition error:", e);
    recog.onend = () => console.log("Dictation ended.");
    recog.start();
    setRecognition(recog);
  };

  const stopDictation = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (formData.age && isNaN(formData.age)) {
      newErrors.age =
        language === "en"
          ? "Age must be a valid number."
          : "يجب أن يكون العمر رقماً صحيحاً.";
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
    Object.keys(formData).forEach((key) =>
      formDataToSend.append(key, formData[key])
    );
    formDataToSend.append("doctor_name", doctorName);
    formDataToSend.append("department", department);
    formDataToSend.append("language", language);

    setLoading(true);
    setCompiledReport("");

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setCompiledReport((prev) => prev + chunk);
      }
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
    <div className="report-container" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="loader-circle">
        {loading && <Loader isLoading={loading} />}
      </div>
      <div className="toolbar">
        <button
          className="generate-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? language === "en"
              ? "Generating..."
              : "جارٍ الإنشاء..."
            : labels.generateReport}
        </button>
        <button className="clear-btn" onClick={handleClear}>
          {labels.clear}
        </button>
      </div>
      <div className="flex_sec">
        <div
          className={`one report-detail ${
            compiledReport ? "report-generated" : ""
          }`}
        >
          <div className="accordion-section">
            <div
              className="accordion-header"
              onClick={() => setShowRecorder(!showRecorder)}
            >
              <h3>{labels.audioTranscription}</h3>
              <span className="accordion-toggle">
                {showRecorder ? "−" : "+"}
              </span>
            </div>
            <div className={`accordion-content ${showRecorder ? "open" : ""}`}>
              {showRecorder && <AudioRecorder setFormData={setFormData} />}
            </div>
          </div>

          <div className="report-form-container">
            <form className="report-form">
              {Object.keys(labels.fields).map((field) => (
                <React.Fragment key={field}>
                  <label>{labels.fields[field]}:</label>
                  <div className="field-with-mic">
                    {[
                      "chiefComplaint",
                      "presentIllness",
                      "medicalHistory",
                      "pastHistory",
                      "familyHistory",
                      "personalHistory",
                      "systemReview",
                    ].includes(field) ? (
                      <textarea
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        onFocus={() => setActiveField(field)}
                        onBlur={(e) => {
                          if (
                            e.relatedTarget &&
                            e.currentTarget.parentNode.contains(e.relatedTarget)
                          )
                            return;
                          if (recognition) stopDictation();
                          setActiveField(null);
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        onFocus={() => setActiveField(field)}
                        onBlur={(e) => {
                          if (
                            e.relatedTarget &&
                            e.currentTarget.parentNode.contains(e.relatedTarget)
                          )
                            return;
                          if (recognition) stopDictation();
                          setActiveField(null);
                        }}
                      />
                    )}
                    {activeField === field && (
                      <button
                        type="button"
                        className={`mic-btn ${recognition ? "recording" : ""}`}
                        onClick={() =>
                          recognition ? stopDictation() : startDictation(field)
                        }
                      >
                        🎙️
                      </button>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </form>
          </div>
        </div>

        <div className="report-layout one">
          <div className="compiled-report-container">
            <h3>{labels.medicalReport}</h3>
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
                  <div
                    className="compiled-markdown"
                    dangerouslySetInnerHTML={{
                      __html: marked(
                        compiledReport.replace(
                          /^\[Medical Report\]\s*-*\s*/i,
                          ""
                        )
                      ),
                    }}
                  />
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
              <p className="empty-report"></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportTemplate;
