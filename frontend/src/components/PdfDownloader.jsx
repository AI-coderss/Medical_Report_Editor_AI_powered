import React, { useState } from "react";
import { jsPDF } from "jspdf";

const PDFDownloader = ({ content, fileName }) => {
  const [loading, setLoading] = useState(false);

  const handleDownloadPDF = async () => {
    setLoading(true); // Start loading

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const headerHeight = 40;
    const footerHeight = 40;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 7;

    const headerImg = "/head.png";
    const footerImg = "/foot.png";

    let y = headerHeight + 10;

    const addHeaderAndFooter = () => {
      doc.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
      doc.addImage(
        footerImg,
        "PNG",
        0,
        pageHeight - footerHeight,
        pageWidth,
        footerHeight
      );
    };

    addHeaderAndFooter();
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    const lines = content.split("\n");

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

      // Bold detection
      const boldMatch = /^\*\*(.*?)\*\*$/.exec(trimmed);
      if (boldMatch) {
        doc.setFont("helvetica", "bold");
        const text = boldMatch[1];
        const split = doc.splitTextToSize(text, contentWidth);
        split.forEach((l) => {
          doc.text(l, margin, y);
          y += lineHeight;
        });
        doc.setFont("helvetica", "normal");
        continue;
      }

      // Bullet points
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
        doc.text(l, margin, y);
        y += lineHeight;
      }
    }

    // Simulate delay (optional)
    await new Promise((resolve) => setTimeout(resolve, 400));
    // Stamp image
    const stampImg = "/stamp.png"; // Replace with your actual stamp path
    const stampWidth = 40;
    const stampHeight = 40;

    // Check if we need a new page to fit the stamp
    if (y + stampHeight + 10 > pageHeight - footerHeight) {
      doc.addPage();
      addHeaderAndFooter();
      y = headerHeight + 10;
    }

    // Add stamp at the bottom-right corner (adjust x/y if needed)
    const stampX = pageWidth - margin - stampWidth;
    const stampY = pageHeight - footerHeight - stampHeight - 10;

    doc.addImage(stampImg, "PNG", stampX, stampY, stampWidth, stampHeight);

    doc.save(fileName || "report.pdf");
    setLoading(false); // Done loading
  };

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
      {loading ? "Generating PDF..." : "Download PDF"}
    </button>
  );
};

export default PDFDownloader;
