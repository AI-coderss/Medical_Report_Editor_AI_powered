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
import "../styles/ReportEditor.css";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
} from "@mui/icons-material";
import { MenuItem, Select } from "@mui/material";

// Strategy function: Finds "teh" and highlights it as an error.
const errorStrategy = (contentBlock, callback) => {
  const text = contentBlock.getText();
  const regex = /teh/g;
  let matchArr, start;
  while ((matchArr = regex.exec(text)) !== null) {
    start = matchArr.index;
    callback(start, start + matchArr[0].length);
  }
};

// Component to render error words with red underline.
const ErrorSpan = (props) => (
  <span className="error-span" title="Suggestion: the">
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

  const handleEditorChange = (state) => {
    setEditorState(state);
  };

  const applyStyle = (style) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  // Function to toggle text alignment
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

  const handleEditReport = async () => {
    const content = editorState.getCurrentContent();
    const plainText = content.getPlainText();

    if (!plainText.trim()) {
      alert("The document is empty. Please write something.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/correct-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText }),
      });

      const data = await response.json();

      if (response.ok) {
        const correctedContent = ContentState.createFromText(data.corrected_text);
        setEditorState(EditorState.createWithContent(correctedContent, decorator));
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Failed to connect to the backend.");
    }

    setLoading(false);
  };

  return (
    <div className="editor-container">
      {/* Fixed Toolbar Below Navbar */}
      <div className="toolbar">
        <div className="toolbar-content">
          {/* Font Selector */}
          <Select className="font-selector" value={selectedFont} onChange={handleFontChange}>
            <MenuItem value="Arial">Arial</MenuItem>
            <MenuItem value="Times New Roman">Times New Roman</MenuItem>
            <MenuItem value="Calibri">Calibri</MenuItem>
            <MenuItem value="Verdana">Verdana</MenuItem>
          </Select>

          {/* Text Formatting Buttons */}
          <button className="toolbar-btn" onClick={() => applyStyle("BOLD")}>
            <FormatBold />
          </button>
          <button className="toolbar-btn" onClick={() => applyStyle("ITALIC")}>
            <FormatItalic />
          </button>
          <button className="toolbar-btn" onClick={() => applyStyle("UNDERLINE")}>
            <FormatUnderlined />
          </button>

          {/* Alignment Options (Now Functional) */}
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

          {/* "Edit Report" Button in the Toolbar */}
          <button className="edit-btn" onClick={handleEditReport} disabled={loading}>
            {loading ? "Editing..." : "Enhance The Report With AI"}
          </button>
        </div>
      </div>

      {/* A4-styled Document Editor */}
      <div className="word-editor" style={{ fontFamily: selectedFont }}>
        <Editor editorState={editorState} onChange={handleEditorChange} placeholder="Write your medical report here..." className="draft-editor" />
      </div>
    </div>
  );
}

export default ReportEditor;









