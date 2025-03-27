import { jsPDF } from "jspdf";
import Cookies from "js-cookie";

const DownloadPDF = ({ report }) => {
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Get doctor details from cookies
    const firstName = Cookies.get("FirstName") || "Unknown";
    const lastName = Cookies.get("LastName") || "Doctor";
    const doctorDepartment = Cookies.get("department") || "Unknown Department";

    // Load logo
    const logoUrl = "/logo.png"; // Replace with actual logo

    // Add logo at the top-right
    const imgWidth = 60,
      imgHeight = 20;
    const pageWidth = doc.internal.pageSize.width;
    doc.addImage(
      logoUrl,
      "PNG",
      pageWidth - imgWidth - 10,
      5,
      imgWidth,
      imgHeight
    );

    // Set compiled report content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    let y = 30;
    const margin = 10;
    const pageHeight = doc.internal.pageSize.height;
    const maxHeight = pageHeight - 50; // Leave space for doctor details

    // Split and add report text with auto pagination
    const splitText = doc.splitTextToSize(report.compiled_report, 180);
    splitText.forEach((line) => {
      if (y + 10 > maxHeight) {
        doc.addPage();
        doc.addImage(
          logoUrl,
          "PNG",
          pageWidth - imgWidth - 10,
          5,
          imgWidth,
          imgHeight
        );
        y = 30;
      }
      doc.text(line, 10, y);
      y += 7;
    });

    // Add Doctor Details at the Bottom
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Doctor Details:", 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Doctor Name: ${firstName} ${lastName}`, 10, y + 10);
    doc.text(`Doctor Department: ${doctorDepartment}`, 10, y + 20);

    // Add Doctor Signature (if available)
    if (report.doctor_signature) {
      const signatureImg = `data:image/png;base64,${report.doctor_signature}`;
      doc.addImage(signatureImg, "PNG", 150, y, 40, 20);
      doc.text("Signature:", 150, y - 5);
    }

    // Save PDF
    doc.save(`Compiled_Report_${report.patient_name}.pdf`);
  };

  return (
    <button
      onClick={handleDownloadPDF}
      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      Download PDF
    </button>
  );
};

export default DownloadPDF;
