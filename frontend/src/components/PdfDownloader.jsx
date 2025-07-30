import React, { useState, useImperativeHandle, forwardRef } from "react";
import { useLanguage } from "./LanguageContext";
import { applyAmiriFont } from "../fonts/Amiri-Regular-normal.js";
import { jsPDF } from "jspdf";

applyAmiriFont(jsPDF);

const formatPDFText = (rawText) => {
  if (!rawText) return "";

  return rawText
    .replace(/^##\s*(.+)/gm, "**$1**")
    .replace(/\n•/g, "\n-")
    .replace(/\r/g, "")
    .trim();
};

const PDFDownloader = forwardRef(({ content, fileName }, ref) => {
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();

  const labels = {
    generating:
      language === "ar" ? "جارٍ إنشاء ملف PDF..." : "Generating PDF...",
    download: language === "ar" ? "تحميل التقرير" : "Download PDF",
  };

  const isArabic = language === "ar";

  const handleDownloadPDF = async () => {
    setLoading(true);
    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const headerHeight = 40;
    const footerHeight = 40;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 7;
    const xPos = isArabic ? pageWidth - margin : margin;

    const headerImg = "/head.jpg";
    const footerImg = "/foot.jpg";

    let y = headerHeight + 10;

    const addHeaderAndFooter = () => {
      doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, headerHeight);
      doc.addImage(
        footerImg,
        "JPEG",
        0,
        pageHeight - footerHeight,
        pageWidth,
        footerHeight
      );
    };

    addHeaderAndFooter();
    doc.setFontSize(12);

    // 👉 Set font depending on language
    if (isArabic) {
      doc.setFont("Amiri");
    } else {
      doc.setFont("helvetica", "normal");
    }

    const formattedContent = formatPDFText(content);
    const lines = formattedContent.split("\n");

    for (const line of lines) {
      if (y + lineHeight > pageHeight - footerHeight) {
        doc.addPage();
        addHeaderAndFooter();
        y = headerHeight + 10;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        y += lineHeight;
        continue;
      }

      const boldMatch = /^\*\*(.*?)\*\*$/.exec(trimmed);
      if (boldMatch) {
        const text = boldMatch[1];
        if (isArabic) doc.setFont("Amiri", "normal");
        else doc.setFont("helvetica", "bold");

        const split = doc.splitTextToSize(text, contentWidth);
        split.forEach((l) => {
          doc.text(l, xPos, y, {
            align: isArabic ? "right" : "left",
            lang: isArabic ? "ar" : "en",
          });
          y += lineHeight;
        });

        if (!isArabic) doc.setFont("helvetica", "normal");
        continue;
      }

      let text = trimmed;
      let prefix = "";
      if (text.startsWith("- ")) {
        prefix = "• ";
        text = text.slice(2);
      }

      const splitLines = doc.splitTextToSize(prefix + text, contentWidth);
      for (const l of splitLines) {
        if (y + lineHeight > pageHeight - footerHeight) {
          doc.addPage();
          addHeaderAndFooter();
          y = headerHeight + 10;
        }
        doc.text(l, xPos, y, {
          align: isArabic ? "right" : "left",
          lang: isArabic ? "ar" : "en",
        });
        y += lineHeight;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 400));

    const stampImg = "/stamp.png";
    const stampWidth = 40;
    const stampHeight = 40;

    if (y + stampHeight + 10 > pageHeight - footerHeight) {
      doc.addPage();
      addHeaderAndFooter();
      y = headerHeight + 10;
    }

    doc.addImage(stampImg, "PNG", margin, y, stampWidth, stampHeight);
    doc.save(fileName || "report.pdf");
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({
    download: handleDownloadPDF,
  }));

  return (
    <button
      onClick={handleDownloadPDF}
      className={`px-4 py-2 rounded text-white ${
        loading
          ? "bg-gray-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-800"
      }`}
      disabled={loading}
    >
      {loading ? labels.generating : labels.download}
    </button>
  );
});

export default PDFDownloader;
