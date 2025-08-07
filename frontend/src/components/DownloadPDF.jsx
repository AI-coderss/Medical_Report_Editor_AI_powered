import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { useLanguage } from "./LanguageContext";
import { applyAmiriFont } from "../fonts/Amiri-Regular-normal";

applyAmiriFont(jsPDF);

const formatReportForPDF = (rawText) => {
  if (!rawText) return "";

  return rawText
    .replace(/^##\s*(.+)/gm, "**$1**")
    .replace(/\n•/g, "\n-")
    .replace(/\r/g, "")
    .trim();
};

const DownloadPDF = ({ report }) => {
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const labels = {
    generating: isArabic ? "جارٍ إنشاء ملف PDF..." : "Generating PDF...",
    download: isArabic ? "تحميل التقرير" : "Download PDF",
  };

  const doctorName = localStorage.getItem("doctorName") || "Dr. Test";

  const handleDownloadPDF = async () => {
    setLoading(true);

    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });

    const headerImg = "/head.jpg";
    const footerImg = "/foot.jpg";
    const stampImg = "/stamp.png";

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 7;
    const xPos = isArabic ? pageWidth - margin : margin;
    let y = 50;

    const addHeaderAndFooter = () => {
      doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, 40);
      doc.addImage(footerImg, "JPEG", 0, pageHeight - 40, pageWidth, 40);
    };

    addHeaderAndFooter();

    doc.setFontSize(12);
    doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");

    const rawText = report.compiled_report || report.result;
    const formattedText = formatReportForPDF(rawText);
    const lines = formattedText.split("\n");

    for (const line of lines) {
      if (y + lineHeight > pageHeight - 40) {
        doc.addPage();
        addHeaderAndFooter();
        y = 50;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        y += lineHeight;
        continue;
      }

      const boldMatch = /^\*\*(.*?)\*\*$/.exec(trimmed);
      const textToWrite = boldMatch
        ? boldMatch[1]
        : trimmed.replace(/^\-\s*/, "• ");

      if (boldMatch) {
        doc.setFont(isArabic ? "Amiri" : "helvetica", "bold");
      } else {
        doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");
      }

      const splitLines = doc.splitTextToSize(textToWrite, contentWidth);
      splitLines.forEach((l) => {
        doc.text(l, xPos, y, {
          align: isArabic ? "right" : "left",
          lang: isArabic ? "ar" : "en",
        });
        y += lineHeight;
      });
    }

    // --- Signature Box ---
    const signatureText = isArabic
      ? `تم التوقيع إلكترونيًا بواسطة الدكتور ${doctorName}`
      : `Electronically Signed by Dr. ${doctorName}`;

    const sigBoxX = margin;
    const sigBoxY = y + 10;
    const sigBoxWidth = contentWidth;
    const sigBoxHeight = 10;

    // Background
    doc.setFillColor(230, 244, 234); // #e6f4ea
    doc.rect(sigBoxX, sigBoxY, sigBoxWidth, sigBoxHeight, "F");

    // Border-left
    doc.setDrawColor(46, 125, 50); // #2e7d32
    doc.setLineWidth(1);
    doc.line(sigBoxX, sigBoxY, sigBoxX, sigBoxY + sigBoxHeight);

    // Text
    doc.setTextColor(46, 125, 50); // #2e7d32
    doc.setFont(isArabic ? "Amiri" : "helvetica", "bold");
    doc.text(
      signatureText,
      isArabic ? pageWidth - margin : margin + 2,
      sigBoxY + 7,
      {
        align: isArabic ? "right" : "left",
        lang: isArabic ? "ar" : "en",
      }
    );

    y = sigBoxY + sigBoxHeight + 5;

    // --- Centered Stamp ---
    const stampWidth = 40;
    const stampHeight = 40;
    const stampX = (pageWidth - stampWidth) / 2;
    const stampY = y + 10;

    const padding = 2;
    doc.setFillColor(255, 255, 255); // white background padding
    doc.rect(
      stampX - padding,
      stampY - padding,
      stampWidth + padding * 2,
      stampHeight + padding * 2,
      "F"
    );

    doc.addImage(stampImg, "PNG", stampX, stampY, stampWidth, stampHeight);

    doc.save(`Compiled_Report_${report.patient_name}.pdf`);
    setLoading(false);
  };

  return (
    <button
      onClick={handleDownloadPDF}
      className={`px-4 py-2 rounded text-white ${
        loading
          ? "bg-gray-500 cursor-not-allowed"
          : "bg-green-500 hover:bg-green-700"
      }`}
      disabled={loading}
    >
      {loading ? labels.generating : labels.download}
    </button>
  );
};

export default DownloadPDF;
