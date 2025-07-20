import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Editor,
  EditorState,
  ContentState,
  RichUtils,
  CompositeDecorator,
  Modifier,
  convertFromRaw,
  convertToRaw,
} from "draft-js";
import "draft-js/dist/Draft.css";
import ReactMarkdown from "react-markdown";
import "../styles/ReportEditor.css";
import AudioRecorderForReportEditor from "./AudioRecorderForReportEditor";
import Swal from "sweetalert2";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { MenuItem, Select } from "@mui/material";
import { FaDownload } from "react-icons/fa";
import MistakeSidebar from "./MistakeSidebar";
import PDFDownloader from "./PdfDownloader";
import SignatureCanvas from "react-signature-canvas";
import Cookies from "js-cookie";
import Loader from "../components/Loader";
import { useLanguage } from "./LanguageContext";

// ✅ Local Storage Keys
const REPORT_STORAGE_KEY = "savedReportContent";
const FORMATTED_STORAGE_KEY = "savedFormattedMarkdown";
const MISTAKES_STORAGE_KEY = "savedMistakes";
const SIGNATURE_STORAGE_KEY = "savedSignature";
const doctorName = localStorage.getItem("doctorName") || "Dr.Test";
const department = localStorage.getItem("department") || "Department-Test";
// ✅ Error detection strategy
const errorStrategy = (contentBlock, callback) => {
  const text = contentBlock.getText();
  const regex = /\*\*(.*?)\*\*\s\((.*?)\)/g;
  let matchArr;

  while ((matchArr = regex.exec(text)) !== null) {
    const [fullMatch, match1] = matchArr;

    if (typeof match1 === "string") {
      const start = matchArr.index;
      const end = start + match1.length;
      callback(start, end);
    }
  }
};

// ✅ Component to underline mistakes
const ErrorSpan = (props) => (
  <span className="error-span" title={`Correction: ${props.children}`}>
    {props.children}
  </span>
);

function ReportEditor() {
  // ✅ Memoize `decorator` to prevent re-renders
  const decorator = useMemo(
    () =>
      new CompositeDecorator([
        {
          strategy: errorStrategy,
          component: ErrorSpan,
        },
      ]),
    []
  );

  // ✅ Initialize State
  const [editorState, setEditorState] = useState(
    EditorState.createEmpty(decorator)
  );
  const [selectedFont, setSelectedFont] = useState("Arial");
  const [loading, setLoading] = useState(false);
  const [mistakes, setMistakes] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formattedMarkdown, setFormattedMarkdown] = useState("");
  const [signature, setSignature] = useState(null);
  const sigCanvas = useRef(null);
  const [readyToRender, setReadyToRender] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientFileNumber, setpatientFileNumber] = useState("");
  const [downloadAfterEnhance, setDownloadAfterEnhance] = useState(false);
  const [showReportRecorder, setShowReportRecorder] = useState(false);
  // const [viewAsMarkdown, setViewAsMarkdown] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [liveStreamText, setLiveStreamText] = useState("");

  const pdfRef = useRef();
  const printRef = useRef();

  // Live Mic CODE
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const [recognition, setRecognition] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const finalTranscriptRef = useRef("");
  const lastProcessedIndexRef = useRef(0);
  const { language } = useLanguage();
  const labels = {
    patientInfo: language === "en" ? "Patient Information" : "معلومات المريض",
    audioTranscription: language === "en" ? "Audio Transcription" : "نسخ صوتي",
    name: language === "en" ? "Patient Name" : "اسم المريض",
    age: language === "en" ? "Patient Age" : "عمر المريض",
    fileNumber: language === "en" ? "File Number" : "رقم الملف",
    placeholderName:
      language === "en" ? "Enter patient name" : "أدخل اسم المريض",
    placeholderAge: language === "en" ? "Enter patient age" : "أدخل عمر المريض",
    placeholderFile:
      language === "en" ? "Enter patient file number" : "أدخل رقم ملف المريض",
    enhance:
      language === "en"
        ? "Enhance Report with AI"
        : "تحسين التقرير بالذكاء الاصطناعي",
    clear: language === "en" ? "Clear 🧹" : "مسح 🧹",
    medicalReport: language === "en" ? "Medical Report" : "التقرير الطبي",
    placeholderEditor:
      language === "en"
        ? "Write your medical report here..."
        : "اكتب تقريرك الطبي هنا...",
  };
  const startDictation = () => {
    if (!SpeechRecognition) {
      alert("Speech Recognition API not supported in this browser.");
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = language === "ar" ? "ar-SA" : "en-US";
    recog.maxAlternatives = 1;

    // Initialize with current editor content
    finalTranscriptRef.current = editorState.getCurrentContent().getPlainText();
    lastProcessedIndexRef.current = 0;

    recog.onresult = (event) => {
      let newText = "";
      let stableText = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // For final results, replace the interim text
          stableText = finalTranscriptRef.current + transcript + " ";
          finalTranscriptRef.current = stableText;
          newText = stableText;
          lastProcessedIndexRef.current = i + 1;
        } else {
          // For interim results, append to the stable text
          newText = stableText + transcript;
        }
      }

      if (newText) {
        updateEditor(newText);
      }
    };

    recog.onerror = (e) => {
      console.error("Speech recognition error:", e);
    };

    recog.onend = () => {
      if (isRecording && recognition) {
        recog.start();
      }
    };

    recog.start();
    setRecognition(recog);
    setIsRecording(true);
  };

  const stopDictation = () => {
    if (recognition) {
      setIsRecording(false);
      recognition.stop();
      setRecognition(null);
      // Finalize any remaining text
      updateEditor(finalTranscriptRef.current);
    }
  };
  const handleSubmitForApproval = () => {
    if (!editorState.getCurrentContent().hasText()) {
      alert("Cannot submit an empty report.");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "Once submitted, the report cannot be edited.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, submit it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsSubmitted(true);
        Swal.fire(
          "Submitted!",
          "The report has been successfully submitted.",
          "success"
        );
      }
    });
  };

  const updateEditor = (text) => {
    const content = editorState.getCurrentContent();
    const selection = editorState.getSelection();

    const newContent = Modifier.replaceText(
      content,
      selection.merge({
        anchorOffset: 0,
        focusOffset: content.getPlainText().length,
      }),
      text
    );

    const newEditorState = EditorState.push(
      editorState,
      newContent,
      "insert-characters"
    );

    handleEditorChange(newEditorState);
  };
  // ✅ Restore saved report from LocalStorage when component loads
  useEffect(() => {
    const savedContent = localStorage.getItem(REPORT_STORAGE_KEY);
    const savedFormatted = localStorage.getItem(FORMATTED_STORAGE_KEY);
    const savedMistakes = localStorage.getItem(MISTAKES_STORAGE_KEY);
    const savedSignature = localStorage.getItem(SIGNATURE_STORAGE_KEY);

    if (savedContent) {
      const restoredContent = convertFromRaw(JSON.parse(savedContent));
      setEditorState(EditorState.createWithContent(restoredContent, decorator));
    }

    if (savedFormatted) setFormattedMarkdown(savedFormatted);
    if (savedMistakes) setMistakes(JSON.parse(savedMistakes));
    if (savedSignature) setSignature(savedSignature);
  }, [decorator]);

  // ✅ Save report content in LocalStorage on changes
  useEffect(() => {
    const contentState = editorState.getCurrentContent();
    const rawContent = JSON.stringify(convertToRaw(contentState));
    localStorage.setItem(REPORT_STORAGE_KEY, rawContent);
    localStorage.setItem(FORMATTED_STORAGE_KEY, formattedMarkdown);
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(mistakes));
  }, [editorState, formattedMarkdown, mistakes]);

  useEffect(() => {
    if (
      downloadAfterEnhance &&
      formattedMarkdown &&
      formattedMarkdown.trim() !== "" &&
      pdfRef.current
    ) {
      pdfRef.current.download();
      setDownloadAfterEnhance(false); // Reset flag after download
    }
  }, [formattedMarkdown, downloadAfterEnhance]);

  // ✅ Save signature
  const saveSignature = () => {
    if (sigCanvas.current) {
      const dataUrl = sigCanvas.current.toDataURL();
      setSignature(dataUrl);
      localStorage.setItem(SIGNATURE_STORAGE_KEY, dataUrl);
    }
  };

  const insertTextAtCursor = (text) => {
    const contentState = editorState.getCurrentContent();
    const selectionState = editorState.getSelection();
    const newContentState = Modifier.insertText(
      contentState,
      selectionState,
      text
    );
    const newEditorState = EditorState.push(
      editorState,
      newContentState,
      "insert-characters"
    );
    setEditorState(newEditorState);
  };

  // ✅ Clear signature
  const clearSignature = () => {
    sigCanvas.current.clear();
    setSignature(null);
    localStorage.removeItem(SIGNATURE_STORAGE_KEY);
  };

  // ✅ Handle Editor Change
  const handleEditorChange = (state) => {
    setEditorState(state);
  };

  // ✅ Fully Functional Formatting
  const toggleInlineStyle = (style) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  // ✅ Functional Alignment Buttons
  const toggleBlockType = (blockType) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };
  function SafeMarkdown({ content }) {
    if (typeof content !== "string" || content.trim() === "") {
      return null;
    }

    try {
      return <ReactMarkdown>{content}</ReactMarkdown>;
    } catch (err) {
      console.error("Error rendering markdown:", err);
      return <p style={{ color: "red" }}>Markdown render failed.</p>;
    }
  }
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
          body { font-family: Arial, sans-serif; margin: 20px; padding: 10px; }
          .medical { white-space: pre-wrap; }
          .signature-box { margin-top: 20px; font-style: italic; color: green; }
        </style>
      </head>
      <body>
        ${printContents}
        <script>
          setTimeout(function() {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
    </html>
  `);
    win.document.close();
  };

  const clearEditorContent = () => {
    const emptyState = EditorState.createEmpty(decorator);
    setEditorState(emptyState);
    setFormattedMarkdown("");
    setReadyToRender(true);
    setMistakes(null);
    setIsSubmitted(false);
    console.log("Clearing editor with decorator:", decorator);
    if (sigCanvas.current) {
      clearSignature();
    }
    localStorage.removeItem(REPORT_STORAGE_KEY);
    localStorage.removeItem(FORMATTED_STORAGE_KEY);
    localStorage.removeItem(MISTAKES_STORAGE_KEY);
    localStorage.removeItem(SIGNATURE_STORAGE_KEY);
  };

  // ✅ Delete/Backspace Works
  const deleteSelection = () => {
    const selection = editorState.getSelection();
    if (!selection.isCollapsed()) {
      const content = editorState.getCurrentContent();
      const newContentState = Modifier.removeRange(
        content,
        selection,
        "backward"
      );
      setEditorState(
        EditorState.push(editorState, newContentState, "remove-range")
      );
    }
  };

  const handleFontChange = (event) => {
    setSelectedFont(event.target.value);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleEditReport = async () => {
    const content = editorState.getCurrentContent();
    const plainText = content.getPlainText();

    if (!plainText.trim()) {
      alert("The document is empty. Please write something.");
      return;
    }

    setLoading(true);
    setFormattedMarkdown("");
    setEditorState(EditorState.createEmpty(decorator));
    setLiveStreamText(""); // Clear any previous stream

    try {
      const token = Cookies.get("token");

      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/correct-text-stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: plainText,
            patient_name: patientName,
            patient_age: patientAge,
            patient_fileNumber: patientFileNumber,
            doctor_name: doctorName,
            department: department,
            language: language,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      // Stream reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Live update stream text box
        setLiveStreamText((prev) => prev + chunk);
      }

      // Clean final text
      const cleanedText = fullText
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/#+\s/g, "")
        .replace(/\*\*/g, "");

      // Update editor
      const contentState = ContentState.createFromText(cleanedText);
      setEditorState(EditorState.createWithContent(contentState, decorator));

      // Save for download/export
      setFormattedMarkdown(cleanedText);

      // Clear streaming display
      setLiveStreamText("");

      // Mistake detection request (optional)
      const mistakeResponse = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/identify-mistakes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanedText, language: language }),
        }
      );

      const mistakeData = await mistakeResponse.json();
      if (mistakeResponse.ok) {
        setMistakes(mistakeData.highlighted_text);
        setSidebarOpen(true);
      } else {
        alert("Mistake detection failed: " + mistakeData.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="editor-container" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-content">
          <Select
            className="font-selector"
            value={selectedFont}
            onChange={handleFontChange}
          >
            <MenuItem value="Arial">Arial</MenuItem>
            <MenuItem value="Times New Roman">Times New Roman</MenuItem>
            <MenuItem value="Calibri">Calibri</MenuItem>
            <MenuItem value="Verdana">Verdana</MenuItem>
          </Select>

          {/* Formatting */}
          <button
            className="toolbar-btn"
            onClick={() => toggleInlineStyle("BOLD")}
          >
            <FormatBold />
          </button>
          <button
            className="toolbar-btn"
            onClick={() => toggleInlineStyle("ITALIC")}
          >
            <FormatItalic />
          </button>
          <button
            className="toolbar-btn"
            onClick={() => toggleInlineStyle("UNDERLINE")}
          >
            <FormatUnderlined />
          </button>

          {/* Alignment */}
          <button
            className="toolbar-btn"
            onClick={() => toggleBlockType("unstyled")}
          >
            <FormatAlignLeft />
          </button>
          <button
            className="toolbar-btn"
            onClick={() => toggleBlockType("center-align")}
          >
            <FormatAlignCenter />
          </button>
          <button
            className="toolbar-btn"
            onClick={() => toggleBlockType("right-align")}
          >
            <FormatAlignRight />
          </button>
          <button
            className="toolbar-btn"
            onClick={() => toggleBlockType("justify-align")}
          >
            <FormatAlignJustify />
          </button>

          {/* Delete Selection */}
          <button className="toolbar-btn" onClick={deleteSelection}>
            🗑️
          </button>
          {/* ✅ Download Button */}
          <PDFDownloader
            ref={pdfRef}
            content={formattedMarkdown}
            fileName="Medical_Report.pdf"
          >
            <FaDownload />
          </PDFDownloader>
          {!isSubmitted && (
            <button className="edit-btn" onClick={handleSubmitForApproval}>
              Submit for Approval
            </button>
          )}
          {isSubmitted && (
            <button
              className="edit-btn"
              onClick={() => handlePrint()}
              style={{ marginLeft: "10px" }}
            >
              🖨️ Print Report
            </button>
          )}

          <div className="">
            <button
              type="button"
              className={`mic-btn1 ${isRecording ? "recording" : ""}`}
              onClick={() => (isRecording ? stopDictation() : startDictation())}
            >
              {isRecording ? (
                <div className="relative flex items-center justify-center w-10 h-10">
                  <div className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping"></div>
                  <div className="relative w-6 h-6 bg-red-600 rounded-full shadow-lg"></div>
                </div>
              ) : (
                <span className="text-xl">
                  <img src="mic.svg" alt="" />
                </span>
              )}
            </button>
          </div>
          {/* Edit Button */}
          <button
            className="edit-btn"
            onClick={handleEditReport}
            disabled={loading}
          >
            {loading
              ? language === "en"
                ? "Editing..."
                : "جارٍ التحرير..."
              : labels.enhance}
          </button>
          {/* ✅ Clear Button */}
          <button className="edit-btn clear-btn" onClick={clearEditorContent}>
            {labels.clear}
          </button>

          {/* Sidebar Toggle Button */}
          <button
            className="edit-btn toggle-sidebar-btn"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <VisibilityOff /> : <Visibility />}
          </button>
        </div>
      </div>
      <div className="loader-circle">
        {" "}
        {loading && <Loader isLoading={loading} />}
      </div>
      <div className=" mx-auto p-6 bg-white rounded-2xl shadow-lg space-y-8 space-top">
        {/* Top Heading */}

        {/* Form Row: Name & Age */}
        <div className="max-w-4xl mx-auto mt-5 p-8 bg-gradient-to-br from-white to-gray-50 rounded-3xl  space-y-10 ">
          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-800 tracking-tight ">
            {labels.patientInfo}
          </h2>
          <div className="accordion-section">
            <div
              className="accordion-header"
              onClick={() => setShowReportRecorder(!showReportRecorder)}
            >
              <h3>{labels.audioTranscription}</h3>
              <span className="accordion-toggle">
                {showReportRecorder ? "−" : "+"}
              </span>
            </div>

            <div
              className={`accordion-content ${
                showReportRecorder ? "open" : ""
              }`}
            >
              {showReportRecorder && (
                <AudioRecorderForReportEditor
                  setPatientName={setPatientName}
                  setPatientAge={setPatientAge}
                  setPatientFileNumber={setpatientFileNumber}
                  setEditorState={setEditorState} // 👈 pass this down
                />
              )}
            </div>
          </div>

          {/* Patient Details: 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 report-box ">
            <div className="flex flex-col">
              <label className="Small-medium text-gray-700 mb-2">
                {labels.name}
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder={labels.placeholderName}
                className="px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="flex flex-col">
              <label className="Small-medium  font-semibold text-gray-700 mb-2">
                {labels.age}
              </label>
              <input
                type="text"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder={labels.placeholderAge}
                className="px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
            <div className="flex flex-col">
              <label className="Small-medium  font-semibold text-gray-700 mb-2">
                {labels.fileNumber}
              </label>
              <input
                type="text"
                value={patientFileNumber}
                onChange={(e) => setpatientFileNumber(e.target.value)}
                placeholder={labels.placeholderFile}
                className="px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Report Section */}
          <div
            ref={printRef}
            className="space-y-4 border h-screen rounded mt-3 border-gray-300 textareaa"
          >
            <h3 className="Small-medium font-bold text-gray-800 pb-2 report text-center my-[4px]">
              {labels.medicalReport}
            </h3>

            {liveStreamText ? (
              <div className="rounded-xl p-4 bg-white whitespace-pre-wrap">
                {liveStreamText}
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-white medical">
                <Editor
                  editorState={editorState}
                  onChange={handleEditorChange}
                  placeholder={labels.placeholderEditor}
                  textAlignment={language === "ar" ? "right" : "left"}
                  readOnly={isSubmitted}
                />
                {isSubmitted && (
                  <div className="signature-box">
                    ✅ Electronically Signed by Dr.{" "}
                    <strong>{doctorName}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <MistakeSidebar
        mistakes={mistakes}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default ReportEditor;
