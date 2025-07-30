import { jsPDF } from "jspdf";
import { applyAmiriFont } from "../fonts/Amiri-Regular-normal";

applyAmiriFont(jsPDF);

const formatPDFText = (rawText) => {
  if (!rawText) return "";

  return rawText
    .replace(/^##\s*(.+)/gm, "**$1**")
    .replace(/\n•/g, "\n-")
    .replace(/\r/g, "")
    .trim();
};

export const generatePDFBlob = async (content, language) => {
  const isArabic = language === "ar";

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

  const stampImg = "/stamp.png";
  const stampWidth = 40;
  const stampHeight = 40;

  if (y + stampHeight + 10 > pageHeight - footerHeight) {
    doc.addPage();
    addHeaderAndFooter();
    y = headerHeight + 10;
  }

  doc.addImage(stampImg, "PNG", margin, y, stampWidth, stampHeight);

  // Wait to simulate font rendering
  await new Promise((res) => setTimeout(res, 300));

  return doc.output("datauristring"); // base64 PDF string
};
