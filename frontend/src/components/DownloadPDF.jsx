import React, { useState } from "react";
import { jsPDF } from "jspdf";
import Cookies from "js-cookie";
import { useLanguage } from "./LanguageContext";

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

    const headerImg = "/head.png";
    const footerImg = "/foot.png";
    const stampImg = "/stamp.png";

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    let y = 50;

    const addHeaderAndFooter = () => {
      doc.addImage(headerImg, "PNG", 0, 0, pageWidth, 40);
      doc.addImage(footerImg, "PNG", 0, pageHeight - 40, pageWidth, 40);
    };

    addHeaderAndFooter();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const rawText = report.compiled_report || report.result;
    const formattedText = formatReportForPDF(rawText);
    const splitText = doc.splitTextToSize(formattedText, contentWidth);

    splitText.forEach((line) => {
      if (y + 10 > pageHeight - 40) {
        doc.addPage();
        addHeaderAndFooter();
        y = 50;
      }

      if (line.trim().startsWith("- ")) {
        line = "• " + line.trim().substring(2);
      }

      const parts = line.split(/(\*\*.*?\*\*)/g); // bold sections
      let x = isArabic ? pageWidth - margin : margin;

      parts.forEach((part) => {
        if (!part) return;

        if (part.startsWith("**") && part.endsWith("**")) {
          doc.setFont("helvetica", "bold");
          part = part.slice(2, -2);
        } else {
          doc.setFont("helvetica", "normal");
        }

        const partWidth = doc.getTextWidth(part);
        if (isArabic) x -= partWidth;

        if (
          (isArabic && x < margin) ||
          (!isArabic && x + partWidth > pageWidth - margin)
        ) {
          y += 7;
          x = isArabic ? pageWidth - margin : margin;

          if (y + 10 > pageHeight - 40) {
            doc.addPage();
            addHeaderAndFooter();
            y = 50;
          }
        }

        doc.text(part, x, y, { align: isArabic ? "right" : "left" });

        if (!isArabic) x += partWidth;
        else x -= 2; // spacing for next part in RTL
      });

      y += 7;
    });

    await new Promise((res) => setTimeout(res, 500));

    const stampWidth = 40;
    const stampHeight = 40;

    if (y + stampHeight + 10 > pageHeight - 40) {
      doc.addPage();
      addHeaderAndFooter();
      y = 50;
    }

    const stampX = margin;
    const stampY = y;
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
