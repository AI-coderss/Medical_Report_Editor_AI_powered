import React from "react";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { FaDownload } from "react-icons/fa"; // Import Font Awesome download icon

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 12,
    lineHeight: 1.4,
  },
  header: {
    fontSize: 14,
    marginBottom: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
  bold: {
    fontWeight: "bold",
  },
  section: {
    marginBottom: 8,
  },
  listItem: {
    marginLeft: 15,
    marginBottom: 5,
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 10,
    color: "#666",
  },
});

// Helper function to render markdown-like text with bold formatting
const renderMarkdown = (line) => {
  const regex = /(\*\*.*?\*\*)|([^*]+)/g; // Matches **bold** and regular text
  const parts = line.match(regex) || []; // Ensure parts is an array

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={index} style={styles.bold}>
          {part.slice(2, -2)} {/* Remove the ** markers */}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>; // Render regular text
  });
};

// Helper function to parse and render lines
const renderContent = (text) => {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    if (line.startsWith("- ")) {
      // Handle list items
      return (
        <Text key={index} style={styles.listItem}>
          • {renderMarkdown(line.slice(2))}
        </Text>
      );
    }
    return (
      <Text key={index} style={styles.section}>
        {renderMarkdown(line)}
      </Text>
    );
  });
};

const PDFDownloader = ({ content, fileName }) => (
  <PDFDownloadLink
    className="pdf-download-link"
    document={
      <Document>
        <Page style={styles.page}>
          <Text className="header" style={styles.header}></Text>
          <View>{renderContent(content)}</View>
          <Text style={styles.footer}>
            Generated on {new Date().toLocaleDateString()}.
          </Text>
        </Page>
      </Document>
    }
    fileName={fileName}
    style={{
      textDecoration: "none",
      color: "#007bff",
      fontSize: "0.9rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem", // Adding spacing between icon and text
    }}
  >
    <FaDownload /> Download PDF
  </PDFDownloadLink>
);

export default PDFDownloader;
