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
  const doctorName = localStorage.getItem("doctorName") || "Dr.Test";

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

    // Set font
    doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");

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
        doc.setFont(isArabic ? "Amiri" : "helvetica", "bold");

        const split = doc.splitTextToSize(text, contentWidth);
        for (const l of split) {
          doc.text(l, xPos, y, {
            align: isArabic ? "right" : "left",
            lang: isArabic ? "ar" : "en",
          });
          y += lineHeight;
        }

        doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");
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

    // --- Signature Box ---
    const signatureText = isArabic
      ? `تم التوقيع إلكترونيًا بواسطة الدكتور ${doctorName}`
      : `Electronically Signed by Dr. ${doctorName}`;

    const sigBoxX = margin;
    const sigBoxY = y + 10; // margin-top
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
    const stampImg = "/stamp.png";
    const stampWidth = 40;
    const stampHeight = 40;

    const stampX = (pageWidth - stampWidth) / 2;
    const stampY = y + 10; // margin-top for stamp

    const padding = 2;
    doc.setFillColor(255, 255, 255); // white padding background
    doc.rect(
      stampX - padding,
      stampY - padding,
      stampWidth + padding * 2,
      stampHeight + padding * 2,
      "F"
    );

    doc.addImage(stampImg, "PNG", stampX, stampY, stampWidth, stampHeight);

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
