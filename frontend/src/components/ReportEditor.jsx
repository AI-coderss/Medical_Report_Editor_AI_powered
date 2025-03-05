// src/components/ReportEditor.js
import React, { useState } from "react";
import {
  Editor,
  EditorState,
  ContentState,
  RichUtils,
  CompositeDecorator,
} from "draft-js";
import "draft-js/dist/Draft.css";
import ReactMarkdown from "react-markdown";
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
  VisibilityOff
} from "@mui/icons-material";
import { MenuItem, Select } from "@mui/material";
import MistakeSidebar from "./MistakeSidebar";

// Error detection strategy
const errorStrategy = (contentBlock, callback) => {
  const text = contentBlock.getText();
  const regex = /\*\*(.*?)\*\*\s\((.*?)\)/g;
  let matchArr;
  while ((matchArr = regex.exec(text)) !== null) {
    callback(matchArr.index, matchArr.index + matchArr[1].length);
  }
};

// Component to underline mistakes
const ErrorSpan = (props) => (
  <span className="error-span" title={`Correction: ${props.children}`}>
    {props.children}
  </span>
);

function ReportEditor() {
  const decorator = new CompositeDecorator([
    { strategy: errorStrategy, component: ErrorSpan },
  ]);

  const [editorState, setEditorState] = useState(
    EditorState.createEmpty(decorator)
  );
  const [selectedFont, setSelectedFont] = useState("Arial");
  const [loading, setLoading] = useState(false);
  const [mistakes, setMistakes] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formattedMarkdown, setFormattedMarkdown] = useState("");

  const handleEditorChange = (state) => {
    setEditorState(state);
  };

  const applyStyle = (style) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  const applyAlignment = (alignment) => {
    let blockType = "unstyled";

    switch (alignment) {
      case "left":
        blockType = "unstyled";
        break;
      case "center":
        blockType = "center-align";
        break;
      case "right":
        blockType = "right-align";
        break;
      case "justify":
        blockType = "justify-align";
        break;
      default:
        blockType = "unstyled";
    }

    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
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
      const correctResponse = await fetch("http://127.0.0.1:5000/correct-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText }),
      });

      const correctData = await correctResponse.json();

      if (correctResponse.ok) {
        const correctedContent = ContentState.createFromText(correctData.corrected_text);
        setEditorState(EditorState.createWithContent(correctedContent, decorator));
        setFormattedMarkdown(correctData.corrected_text); // Save Markdown content
      } else {
        alert("Error: " + correctData.error);
        setLoading(false);
        return;
      }

      // 2️⃣ Then detect mistakes (show in sidebar)
      const mistakeResponse = await fetch("http://127.0.0.1:5000/identify-mistakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: correctData.corrected_text }),
      });

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
          <Select className="font-selector" value={selectedFont} onChange={handleFontChange}>
            <MenuItem value="Arial">Arial</MenuItem>
            <MenuItem value="Times New Roman">Times New Roman</MenuItem>
            <MenuItem value="Calibri">Calibri</MenuItem>
            <MenuItem value="Verdana">Verdana</MenuItem>
          </Select>

          {/* Formatting */}
          <button className="toolbar-btn" onClick={() => applyStyle("BOLD")}>
            <FormatBold />
          </button>
          <button className="toolbar-btn" onClick={() => applyStyle("ITALIC")}>
            <FormatItalic />
          </button>
          <button className="toolbar-btn" onClick={() => applyStyle("UNDERLINE")}>
            <FormatUnderlined />
          </button>

          {/* Alignment */}
          <button className="toolbar-btn" onClick={() => applyAlignment("left")}>
            <FormatAlignLeft />
          </button>
          <button className="toolbar-btn" onClick={() => applyAlignment("center")}>
            <FormatAlignCenter />
          </button>
          <button className="toolbar-btn" onClick={() => applyAlignment("right")}>
            <FormatAlignRight />
          </button>
          <button className="toolbar-btn" onClick={() => applyAlignment("justify")}>
            <FormatAlignJustify />
          </button>

          {/* Edit Button */}
          <button className="edit-btn" onClick={handleEditReport} disabled={loading}>
            {loading ? "Editing..." : "Edit Report"}
          </button>

          {/* Sidebar Toggle Button */}
          <button className="edit-btn toggle-sidebar-btn" onClick={toggleSidebar}>
            {sidebarOpen ? <VisibilityOff /> : <Visibility />}
          </button>
        </div>
      </div>

      {/* Editor with Markdown Display */}
      <div className="word-editor" style={{ fontFamily: selectedFont }}>
        {formattedMarkdown ? (
          <ReactMarkdown>{formattedMarkdown}</ReactMarkdown> // Display Markdown content
        ) : (
          <Editor editorState={editorState} onChange={handleEditorChange} placeholder="Write your medical report here..." />
        )}
      </div>

      {/* Sidebar */}
      <MistakeSidebar mistakes={mistakes} isOpen={sidebarOpen} onToggle={toggleSidebar} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}

export default ReportEditor;

















