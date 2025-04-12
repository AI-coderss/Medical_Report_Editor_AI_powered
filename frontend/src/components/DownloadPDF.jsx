import React, { useState } from "react";
import { jsPDF } from "jspdf";
import Cookies from "js-cookie";

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

    const textToSplit = report.compiled_report || report.result;
    const splitText = doc.splitTextToSize(textToSplit, contentWidth);

    splitText.forEach((line) => {
      if (y + 10 > pageHeight - 40) {
        doc.addPage();
        addHeaderAndFooter();
        y = 50;
      }

      if (/^\*\*(.*?)\*\*$/.test(line.trim())) {
        const boldText = line.trim().replace(/^\*\*|\*\*$/g, "");
        doc.setFont("helvetica", "bold");
        doc.text(boldText, margin, y);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(line, margin, y);
      }

      y += 7;
    });

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFont("helvetica", "normal");

    // Simulate processing delay (optional, for realism)
    await new Promise((resolve) => setTimeout(resolve, 500));

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
