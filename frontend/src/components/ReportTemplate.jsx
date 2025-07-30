import React, { useState, useRef } from "react";
import "../styles/ReportTemplate.css";
import AudioRecorder from "./AudioRecorder";
import PDFDownloader from "./PdfDownloader";
import Cookies from "js-cookie";
import Loader from "../components/Loader";
import { marked } from "marked";
import { useLanguage } from "./LanguageContext"; // ✅ import context
import Swal from "sweetalert2"; // SweetAlert2
import SendPopup from "./SendPopup";

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
  const compiledReportRef = useRef("");
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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const printRef = useRef();
  const [showSendPopup, setShowSendPopup] = useState(false);
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
    approve: language === "en" ? "Approve the Report" : "وافق على التقرير",
    print: language === "en" ? "🖨️ Print Report" : "🖨️ طباعة التقرير",
  };

  const startDictation = (fieldName, language) => {
    if (!SpeechRecognition) {
      alert("Speech Recognition API not supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;

    // ✅ Set language dynamically
    recog.lang = language === "ar" ? "ar-SA" : "en-US";

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
  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=900,height=650");

    if (!win) {
      alert("Popup blocked. Please allow popups for this website.");
      return;
    }

    win.document.write(`
    <html>
      <head>
        <title>Print Report</title>
        <style>
          @media print {
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }

            .compiled-report {
              padding: 1in;
              box-sizing: border-box;
              page-break-inside: avoid;
            }

            img {
              max-width: 100%;
              height: auto;
              page-break-inside: avoid;
              page-break-before: avoid;
              page-break-after: avoid;
            }

            .signature-box {
              margin-top: 2rem;
              font-size: 1rem;
              page-break-inside: avoid;
            }

            .compiled-markdown {
              white-space: pre-wrap;
              min-height: 300px;
              page-break-inside: avoid;
            }

            .w-full {
              width: 100%;
            }

            .mb-4, .mt-4 {
              margin: 1rem 0;
            }

            * {
              page-break-before: avoid;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
     <body onload="window.print(); setTimeout(() => window.close(), 500);">
       ${printContents}
     </body>

    </html>
  `);

    win.document.close();
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
        const cleanedText = fullText
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/#+\s/g, "")
          .replace(/\*\*/g, "");
        compiledReportRef.current = cleanedText;
        setCompiledReport(compiledReportRef.current);

        // setCompiledReport((prev) => prev + chunk);
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
        {compiledReport && (
          <>
            {!isSubmitted ? (
              <button
                className="generate-btn approveBtn"
                onClick={async () => {
                  const result = await Swal.fire({
                    title: "Are you sure?",
                    text: "Once approved, this report cannot be edited.",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes, approve it!",
                    cancelButtonText: "Cancel",
                  });

                  if (result.isConfirmed) {
                    setIsSubmitted(true);
                    setShowSendPopup(true);
                  }
                }}
              >
                {labels.approve}
              </button>
            ) : (
              <button className="generate-btn printBtn" onClick={handlePrint}>
                {labels.print}
              </button>
            )}
            <PDFDownloader
              content={compiledReport}
              fileName="Medical_Report.pdf"
            />
          </>
        )}
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
                          recognition
                            ? stopDictation()
                            : startDictation(field, language)
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
                <div
                  className="compiled-report text-justify px-20 pb-4"
                  ref={printRef}
                >
                  <div className="w-full mb-4">
                    <img
                      src="/head.jpg"
                      alt="Header"
                      className="w-full h-auto"
                    />
                  </div>
                  <div
                    className="compiled-markdown editable-report"
                    contentEditable={!isSubmitted}
                    suppressContentEditableWarning={true}
                    onInput={(e) => {
                      compiledReportRef.current = e.currentTarget.innerText;
                    }}
                    style={{
                      padding: "1rem",
                      minHeight: "300px",
                      whiteSpace: "pre-wrap",
                      outline: "none",
                    }}
                  >
                    {compiledReportRef.current}
                  </div>

                  {isSubmitted && (
                    <div className="signature-box">
                      {language === "ar" ? (
                        <>
                          ✅ تم التوقيع إلكترونيًا بواسطة الدكتور{" "}
                          <strong>{doctorName}</strong>
                        </>
                      ) : (
                        <>
                          ✅ Electronically Signed by Dr.{" "}
                          <strong>{doctorName}</strong>
                        </>
                      )}
                    </div>
                  )}

                  <div className="w-full mt-4">
                    <img
                      src="/foot.jpg"
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
      {showSendPopup && (
        <SendPopup
          compiledReport={compiledReportRef.current}
          doctorName={doctorName}
          onClose={() => setShowSendPopup(false)}
        />
      )}
    </div>
  );
}

export default ReportTemplate;
