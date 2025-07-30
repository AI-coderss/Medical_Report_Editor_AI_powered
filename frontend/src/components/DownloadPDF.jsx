import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { useLanguage } from "./LanguageContext";
import { applyAmiriFont } from "../fonts/Amiri-Regular-normal";

// ✅ Register Amiri font globally
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
    doc.setFont(isArabic ? "amiri" : "helvetica", "normal");

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
        doc.setFont(
          isArabic ? "amiri" : "helvetica",
          isArabic ? "normal" : "bold"
        );
      } else {
        doc.setFont(isArabic ? "amiri" : "helvetica", "normal");
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

    await new Promise((res) => setTimeout(res, 300));

    if (y + 40 > pageHeight - 40) {
      doc.addPage();
      addHeaderAndFooter();
      y = 50;
    }

    doc.addImage(stampImg, "PNG", margin, y, 40, 40);
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
