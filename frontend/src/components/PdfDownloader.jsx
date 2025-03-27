import React, { useState, useEffect } from "react";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { FaDownload } from "react-icons/fa";
import Cookies from "js-cookie"; // Install via npm install js-cookie

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
  doctorSection: {
    marginTop: 20,
    textAlign: "left",
  },
  signature: {
    width: 200,
    height: 100,
    alignSelf: "left",
  },
});

// Helper function to extract doctor details from cookies
const getDoctorDetails = () => {
  return {
    firstname: Cookies.get("FirstName") || "",
    lastname: Cookies.get("LastName") || "",
    department: Cookies.get("department") || "General Medicine",
  };
};

// Helper function to parse and render content
const renderMarkdown = (line) => {
  const regex = /(\*\*.*?\*\*)|([^*]+)/g;
  const parts = line.match(regex) || [];
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={index} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

const renderContent = (text) => {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    if (line.startsWith("- ")) {
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

const PDFDownloader = ({ content, fileName, signature }) => {
  const [doctor, setDoctor] = useState(getDoctorDetails());

  useEffect(() => {
    setDoctor(getDoctorDetails());
  }, []);

  return (
    <PDFDownloadLink
      className="pdf-download-link"
      document={
        <Document>
          <Page style={styles.page}>
            <Text style={styles.header}></Text>
            <View>{renderContent(content)}</View>

            {/* Doctor Details */}
            <View style={styles.doctorSection}>
              <Text style={styles.bold}>
                Doctor Name: {doctor.firstname} {doctor.lastname}
              </Text>
              <Text style={styles.bold}>Department: {doctor.department}</Text>

              {/* Signature Image */}
              <Text style={styles.bold}>Signature:</Text>
              {signature && <Image style={styles.signature} src={signature} />}
            </View>

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
        gap: "0.5rem",
      }}
    >
      <FaDownload /> Download PDF
    </PDFDownloadLink>
  );
};

export default PDFDownloader;
