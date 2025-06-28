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

  const pdfRef = useRef();
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

  const clearEditorContent = () => {
    const emptyState = EditorState.createEmpty(decorator);
    setEditorState(emptyState);
    setFormattedMarkdown("");
    setReadyToRender(true);
    setMistakes(null);
    console.log("Clearing editor with decorator:", decorator);
    if (sigCanvas.current) {
      clearSignature();
    }
    localStorage.removeItem(REPORT_STORAGE_KEY);
    localStorage.removeItem(FORMATTED_STORAGE_KEY);
    localStorage.removeItem(MISTAKES_STORAGE_KEY);
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
    setFormattedMarkdown(""); // Clear old text
    setEditorState(EditorState.createEmpty(decorator)); // Optional: clear editor

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
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      // 🔄 STREAM the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Live update markdown preview
        setFormattedMarkdown((prev) => prev + chunk);
      }

      // Final update to the editor content
      const correctedContent = ContentState.createFromText(fullText);
      setEditorState(
        EditorState.createWithContent(correctedContent, decorator)
      );

      setDownloadAfterEnhance(true);

      // 🧠 Mistake detection (if needed)
      const mistakeResponse = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/identify-mistakes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fullText }),
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

  // const handleEditReport = async () => {
  //   const content = editorState.getCurrentContent();
  //   const plainText = content.getPlainText();

  //   if (!plainText.trim()) {
  //     alert("The document is empty. Please write something.");
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     const token = Cookies.get("token");

  //     // 1️⃣ Correct the text first (updates editor content)
  //     const correctResponse = await fetch(
  //       "https://medical-report-editor-ai-powered-backend.onrender.com/correct-text",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({
  //           text: plainText,
  //           patient_name: patientName,
  //           patient_age: patientAge,
  //           patient_fileNumber: patientFileNumber,
  //           doctor_name: doctorName,
  //           department: department,
  //         }),
  //       }
  //     );

  //     const correctData = await correctResponse.json();

  //     if (correctResponse.ok) {
  //       const correctedContent = ContentState.createFromText(
  //         correctData.corrected_text
  //       );
  //       setEditorState(
  //         EditorState.createWithContent(correctedContent, decorator)
  //       );
  //       setFormattedMarkdown(correctData.corrected_text); // Save Markdown content
  //       setDownloadAfterEnhance(true);
  //       // if (pdfRef.current) {
  //       //   pdfRef.current.download();
  //       // }
  //     } else {
  //       alert("Error: " + correctData.error);
  //       setLoading(false);
  //       return;
  //     }

  //     // 2️⃣ Then detect mistakes (show in sidebar)
  //     const mistakeResponse = await fetch(
  //       "https://medical-report-editor-ai-powered-backend.onrender.com/identify-mistakes",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ text: correctData.corrected_text }),
  //       }
  //     );

  //     const mistakeData = await mistakeResponse.json();

  //     if (mistakeResponse.ok) {
  //       setMistakes(mistakeData.highlighted_text);
  //       setSidebarOpen(true);
  //     } else {
  //       alert("Error: " + mistakeData.error);
  //     }
  //   } catch (error) {
  //     alert("Failed to connect to the backend.");
  //   }

  //   setLoading(false);
  // };

  return (
    <div className="editor-container">
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
          {/* Edit Button */}
          <button
            className="edit-btn"
            onClick={handleEditReport}
            disabled={loading}
          >
            {loading ? "Editing..." : "Enhance Report with AI"}
          </button>
          {/* ✅ Clear Button */}
          <button className="edit-btn clear-btn" onClick={clearEditorContent}>
            Clear 🧹
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
            Patient <span>Information</span>
          </h2>
          <AudioRecorderForReportEditor
            setPatientName={setPatientName}
            setPatientAge={setPatientAge}
            setPatientFileNumber={setpatientFileNumber}
            setMedicalReportText={setFormattedMarkdown}
          />
          {/* Patient Details: 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 report-box ">
            <div className="flex flex-col">
              <label className="Small-medium text-gray-700 mb-2">
                Patient Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter patient name"
                className="px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            <div className="flex flex-col">
              <label className="Small-medium  font-semibold text-gray-700 mb-2">
                Patient Age
              </label>
              <input
                type="text"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="Enter patient Age"
                className="px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
            <div className="flex flex-col">
              <label className="Small-medium  font-semibold text-gray-700 mb-2">
                Patient File Number
              </label>
              <input
                type="text"
                value={patientFileNumber}
                onChange={(e) => setpatientFileNumber(e.target.value)}
                placeholder="Enter patient file Number"
                className="px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Report Section */}
          <div className="space-y-4 border h-screen rounded mt-3 border-gray-300 textareaa">
            <h3 className="Small-medium font-bold text-gray-800 pb-2 report text-center my-[4px]">
              Medical Report
            </h3>

            {readyToRender &&
              (typeof formattedMarkdown === "string" &&
              formattedMarkdown.trim().length > 0 ? (
                <div className="prose max-w-none  p-4  bg-white">
                  <SafeMarkdown content={formattedMarkdown} />
                </div>
              ) : (
                <div className="rounded-xl p-4 bg-white medical">
                  <Editor
                    editorState={editorState}
                    onChange={handleEditorChange}
                    placeholder="Write your medical report here..."
                  />
                </div>
              ))}
          </div>
        </div>

        {/* Report Editor Row */}
        {/* <div className="space-y-4">
          {loading && <Loader isLoading={loading} />}

          {readyToRender &&
            (typeof formattedMarkdown === "string" &&
            formattedMarkdown.trim().length > 0 ? (
              <div className="prose max-w-none border border-gray-200 p-4 rounded-xl bg-gray-50">
                <SafeMarkdown content={formattedMarkdown} />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-xl p-4 shadow-sm bg-white">
                <Editor
                  editorState={editorState}
                  onChange={handleEditorChange}
                  placeholder="Write your medical report here..."
                />
              </div>
            ))}
        </div> */}
      </div>

      {/* Editor or Markdown Preview */}
      {/* <div className="word-editor" style={{ fontFamily: selectedFont }}>
        {loading && <Loader isLoading={loading} />}
        {readyToRender &&
          (typeof formattedMarkdown === "string" &&
          formattedMarkdown.trim().length > 0 ? (
            <SafeMarkdown content={formattedMarkdown} />
          ) : (
            <Editor
              editorState={editorState}
              onChange={handleEditorChange}
              placeholder="Write your medical report here..."
            />
          ))}

        {signature && (
          <div className="signature-display">
            <p>
              <strong>Doctor Name:</strong> {firstName} {lastName}
            </p>
            <p>
              <strong>Department:</strong> {department}
            </p>
            <p>
              <strong>Signature:</strong>
            </p>
            <img
              src={signature}
              alt="Saved Signature"
              className="saved-signature"
            />
          </div>
        )}
      </div> */}

      {/* Sidebar */}
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
