import React, { useState, useEffect, useMemo } from "react";
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
import ReactMarkdown from "react-markdown"; // ✅ ReactMarkdown is now correctly used!
import "../styles/ReportEditor.css";
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

// ✅ Local Storage Keys
const REPORT_STORAGE_KEY = "savedReportContent";
const FORMATTED_STORAGE_KEY = "savedFormattedMarkdown";
const MISTAKES_STORAGE_KEY = "savedMistakes";

// ✅ Error detection strategy
const errorStrategy = (contentBlock, callback) => {
  const text = contentBlock.getText();
  const regex = /\*\*(.*?)\*\*\s\((.*?)\)/g;
  let matchArr;
  while ((matchArr = regex.exec(text)) !== null) {
    callback(matchArr.index, matchArr.index + matchArr[1].length);
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
        { strategy: errorStrategy, component: ErrorSpan },
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

  // ✅ Restore saved report from LocalStorage when component loads
  useEffect(() => {
    const savedContent = localStorage.getItem(REPORT_STORAGE_KEY);
    const savedFormatted = localStorage.getItem(FORMATTED_STORAGE_KEY);
    const savedMistakes = localStorage.getItem(MISTAKES_STORAGE_KEY);

    if (savedContent) {
      const restoredContent = convertFromRaw(JSON.parse(savedContent));
      setEditorState(EditorState.createWithContent(restoredContent, decorator));
    }

    if (savedFormatted) setFormattedMarkdown(savedFormatted);
    if (savedMistakes) setMistakes(JSON.parse(savedMistakes));
  }, [decorator]);

  // ✅ Save report content in LocalStorage on changes
  useEffect(() => {
    const contentState = editorState.getCurrentContent();
    const rawContent = JSON.stringify(convertToRaw(contentState));
    localStorage.setItem(REPORT_STORAGE_KEY, rawContent);
    localStorage.setItem(FORMATTED_STORAGE_KEY, formattedMarkdown);
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(mistakes));
  }, [editorState, formattedMarkdown, mistakes]);

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
  const handleClearReport = () => {
    setEditorState(EditorState.createEmpty(new CompositeDecorator([
      { strategy: errorStrategy, component: ErrorSpan }
    ]))); // Reset with a new decorator instance
    setFormattedMarkdown(""); // Clear formatted Markdown preview
    setMistakes(null); // Clear mistakes
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

    try {
      // 1️⃣ Correct the text first (updates editor content)
      const correctResponse = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/correct-text",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: plainText }),
        }
      );

      const correctData = await correctResponse.json();

      if (correctResponse.ok) {
        const correctedContent = ContentState.createFromText(
          correctData.corrected_text
        );
        setEditorState(
          EditorState.createWithContent(correctedContent, decorator)
        );
        setFormattedMarkdown(correctData.corrected_text); // Save Markdown content
      } else {
        alert("Error: " + correctData.error);
        setLoading(false);
        return;
      }

      // 2️⃣ Then detect mistakes (show in sidebar)
      const mistakeResponse = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/identify-mistakes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: correctData.corrected_text }),
        }
      );

      const mistakeData = await mistakeResponse.json();

      if (mistakeResponse.ok) {
        setMistakes(mistakeData.highlighted_text);
        setSidebarOpen(true);
      } else {
        alert("Error: " + mistakeData.error);
      }
    } catch (error) {
      alert("Failed to connect to the backend.");
    }

    setLoading(false);
  };

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
          <button className="edit-btn clear-btn" onClick={handleClearReport}>
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
      {/* Editor or Markdown Preview */}
      <div className="word-editor" style={{ fontFamily: selectedFont }}>
        {formattedMarkdown ? (
          <ReactMarkdown>{formattedMarkdown}</ReactMarkdown>
        ) : (
          <Editor
            editorState={editorState}
            onChange={handleEditorChange}
            placeholder="Write your medical report here..."
          />
        )}
      </div>

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
