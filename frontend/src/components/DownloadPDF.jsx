import React, { useState } from "react";
import { jsPDF } from "jspdf";
import Cookies from "js-cookie";

const formatReportForPDF = (rawText) => {
  if (!rawText) return "";

  return rawText
    .replace(/^##\s*(.+)/gm, "**$1**") // Convert headings to bold markdown
    .replace(/\n•/g, "\n-") // Normalize bullets
    .replace(/\r/g, "") // Remove carriage returns
    .trim();
};

const DownloadPDF = ({ report }) => {
  const [loading, setLoading] = useState(false);

  const handleDownloadPDF = async () => {
    setLoading(true); // Show loader

    const doc = new jsPDF();
    const headerImg = "/head.png";
    const footerImg = "/foot.png";

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - 80;

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

    // splitText.forEach((line) => {
    //   if (y + 10 > pageHeight - 40) {
    //     doc.addPage();
    //     addHeaderAndFooter();
    //     y = 50;
    //   }

    //   if (/^\*\*(.*?)\*\*$/.test(line.trim())) {
    //     const boldText = line.trim().replace(/^\*\*|\*\*$/g, "");
    //     doc.setFont("helvetica", "bold");
    //     doc.text(boldText, margin, y);
    //     doc.setFont("helvetica", "normal");
    //   } else {
    //     doc.text(line, margin, y);
    //   }

    //   y += 7;
    // });

    splitText.forEach((line) => {
      if (y + 10 > pageHeight - 40) {
        doc.addPage();
        addHeaderAndFooter();
        y = 50;
      }

      // Handle bullet points
      if (line.trim().startsWith("- ")) {
        line = "• " + line.trim().substring(2);
      }

      // Split line by bold markdown (**) and apply styles
      const parts = line.split(/(\*\*.*?\*\*)/g); // Capture bold sections
      let x = margin;

      parts.forEach((part) => {
        if (!part) return;

        if (part.startsWith("**") && part.endsWith("**")) {
          doc.setFont("helvetica", "bold");
          part = part.slice(2, -2);
        } else {
          doc.setFont("helvetica", "normal");
        }

        const partWidth = doc.getTextWidth(part);
        if (x + partWidth > pageWidth - margin) {
          y += 7;
          x = margin;
          if (y + 10 > pageHeight - 40) {
            doc.addPage();
            addHeaderAndFooter();
            y = 50;
          }
        }

        doc.text(part, x, y);
        x += partWidth;
      });

      y += 7;
    });

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFont("helvetica", "normal");

    // Simulate processing delay (optional, for realism)
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Stamp image settings
    const stampImg = "/stamp.png"; // Update path if needed
    const stampWidth = 40;
    const stampHeight = 40;

    // Check if there's space for the stamp; if not, add new page
    if (y + stampHeight + 10 > pageHeight - 40) {
      doc.addPage();
      addHeaderAndFooter();
      y = 50;
    }

    // Place the stamp at bottom-right corner above footer
    // const stampX = pageWidth - margin - stampWidth;
    // const stampY = pageHeight - 40 - stampHeight - 10; // 40 = footer height
    // Stamp position based on current y
    const stampX = margin; // Or any x-position you want
    const stampY = y;

    doc.addImage(stampImg, "PNG", stampX, stampY, stampWidth, stampHeight);

    doc.save(`Compiled_Report_${report.patient_name}.pdf`);
    setLoading(false); // Hide loader
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
      {loading ? "Generating PDF..." : "Download PDF"}
    </button>
  );
};

export default DownloadPDF;
