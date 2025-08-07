import React, { useState } from "react";
import "../styles/SendPopup.css";
import Swal from "sweetalert2";
import { useLanguage } from "../components/LanguageContext";
import { generatePDFBlob } from "./pdfGenerator";

const countryCodes = [
  { code: "+93", label: " 🇦🇫" },
  { code: "+355", label: " 🇦🇱" },
  { code: "+213", label: " 🇩🇿" },
  { code: "+376", label: " 🇦🇩" },
  { code: "+244", label: " 🇦🇴" },
  { code: "+54", label: " 🇦🇷" },
  { code: "+374", label: " 🇦🇲" },
  { code: "+61", label: " 🇦🇺" },
  { code: "+43", label: " 🇦🇹" },
  { code: "+994", label: " 🇦🇿" },
  { code: "+973", label: " 🇧🇭" },
  { code: "+880", label: " 🇧🇩" },
  { code: "+375", label: " 🇧🇾" },
  { code: "+32", label: " 🇧🇪" },
  { code: "+55", label: " 🇧🇷" },
  { code: "+1", label: " 🇨🇦" },
  { code: "+86", label: " 🇨🇳" },
  { code: "+20", label: " 🇪🇬" },
  { code: "+33", label: " 🇫🇷" },
  { code: "+49", label: " 🇩🇪" },
  { code: "+91", label: " 🇮🇳" },
  { code: "+62", label: " 🇮🇩" },
  { code: "+98", label: " 🇮🇷" },
  { code: "+964", label: " 🇮🇶" },
  { code: "+39", label: " 🇮🇹" },
  { code: "+81", label: " 🇯🇵" },
  { code: "+962", label: " 🇯🇴" },
  { code: "+254", label: " 🇰🇪" },
  { code: "+965", label: " 🇰🇼" },
  { code: "+961", label: " 🇱🇧" },
  { code: "+218", label: " 🇱🇾" },
  { code: "+60", label: " 🇲🇾" },
  { code: "+52", label: " 🇲🇽" },
  { code: "+212", label: " 🇲🇦" },
  { code: "+31", label: " 🇳🇱" },
  { code: "+234", label: " 🇳🇬" },
  { code: "+92", label: " 🇵🇰" },
  { code: "+63", label: " 🇵🇭" },
  { code: "+974", label: " 🇶🇦" },
  { code: "+7", label: " 🇷🇺" },
  { code: "+966", label: "  🇸🇦" },
  { code: "+65", label: " 🇸🇬" },
  { code: "+27", label: "  🇿🇦" },
  { code: "+82", label: "  🇰🇷" },
  { code: "+34", label: " 🇪🇸" },
  { code: "+249", label: " 🇸🇩" },
  { code: "+46", label: " 🇸🇪" },
  { code: "+963", label: " 🇸🇾" },
  { code: "+90", label: " 🇹🇷" },
  { code: "+380", label: " 🇺🇦" },
  { code: "+971", label: "   🇦🇪" },
  { code: "+44", label: "  🇬🇧" },
  { code: "+1", label: "  🇺🇸" },
  { code: "+967", label: " 🇾🇪" },
];

function SendPopup({ onClose, compiledReport, doctorName }) {
  const [countryCode, setCountryCode] = useState("+966");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gmail, setGmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const labels = {
    share: isArabic ? "اتصال بالمريض" : "Patient Contact",
    whatsapp: isArabic ? "رقم الواتساب" : "WhatsApp Number",
    required: isArabic ? "*" : "*",
    email: isArabic
      ? "البريد الإلكتروني (اختياري)"
      : "Email Address (optional)",
    placeholderPhone: isArabic ? "٠١٢٣٤٥٦٧٨٩" : "1234567890",
    placeholderEmail: isArabic ? "example@gmail.com" : "example@gmail.com",
    send: isArabic ? "إرسال" : "Send",
    sending: isArabic ? "جارٍ الإرسال..." : "Sending...",
    successTitle: isArabic ? "تم الإرسال" : "Success",
    successText: isArabic
      ? "تم إرسال التقرير بنجاح!"
      : "Report sent successfully!",
    errorTitle: isArabic ? "خطأ" : "Error",
    errorText: isArabic
      ? "فشل إرسال التقرير. حاول مرة أخرى."
      : "Failed to send report. Try again.",
    invalidTitle: isArabic ? "رقم غير صالح" : "Invalid",
    invalidText: isArabic
      ? "يرجى إدخال رقم واتساب صحيح."
      : "Please enter a valid WhatsApp number.",
  };

  const isValidPhone = (number) => /^\+?\d{10,14}$/.test(number);

  const handleSend = async () => {
    const fullPhone = `${countryCode}${phoneNumber}`;
    if (!isValidPhone(fullPhone)) {
      Swal.fire(labels.invalidTitle, labels.invalidText, "error");
      return;
    }

    setLoading(true);
    try {
      const pdfBase64 = await generatePDFBlob(
        compiledReport,
        language,
        doctorName
      );
      const response = await fetch(
        "https://n8n-latest-h3pu.onrender.com/webhook/cd5f113e-9c5a-4fd2-a0c1-28ff0afc94d4",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            whatsapp: fullPhone,
            gmail,
            language: language,
            report: pdfBase64,
          }),
        }
      );

      if (!response.ok) throw new Error("Webhook failed");

      Swal.fire(labels.successTitle, labels.successText, "success");
      onClose();
    } catch (err) {
      Swal.fire(labels.errorTitle, labels.errorText, "error");
    }
    setLoading(false);
  };

  return (
    <div className="send-popup">
      <div className="send-popup-content">
        <div className="send-popup-header">
          <h3>{labels.share}</h3>

          <button className="btn-close" onClick={onClose}>
            ✖️
          </button>
        </div>

        <div className="send-popup-body">
          <label>
            {labels.whatsapp}{" "}
            <span className="required">{labels.required}</span>
          </label>
          <div className="phone-input">
            <select
              className="country-select"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {countryCodes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.label}
                </option>
              ))}
            </select>
            <input
              className="phone-number"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={labels.placeholderPhone}
              required
            />
          </div>

          <label>{labels.email}</label>
          <input
            type="email"
            value={gmail}
            onChange={(e) => setGmail(e.target.value)}
            placeholder={labels.placeholderEmail}
          />
        </div>
        <div className="text-center">
          <button className="send-btn" onClick={handleSend} disabled={loading}>
            {loading ? labels.sending : labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SendPopup;
