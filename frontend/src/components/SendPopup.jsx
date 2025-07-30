import React, { useState } from "react";
import "../styles/SendPopup.css";
import Swal from "sweetalert2";
import { useLanguage } from "../components/LanguageContext";
import { generatePDFBlob } from "./pdfGenerator";

const countryCodes = [
  { code: "+93", label: "Afghanistan 🇦🇫" },
  { code: "+355", label: "Albania 🇦🇱" },
  { code: "+213", label: "Algeria 🇩🇿" },
  { code: "+376", label: "Andorra 🇦🇩" },
  { code: "+244", label: "Angola 🇦🇴" },
  { code: "+54", label: "Argentina 🇦🇷" },
  { code: "+374", label: "Armenia 🇦🇲" },
  { code: "+61", label: "Australia 🇦🇺" },
  { code: "+43", label: "Austria 🇦🇹" },
  { code: "+994", label: "Azerbaijan 🇦🇿" },
  { code: "+973", label: "Bahrain 🇧🇭" },
  { code: "+880", label: "Bangladesh 🇧🇩" },
  { code: "+375", label: "Belarus 🇧🇾" },
  { code: "+32", label: "Belgium 🇧🇪" },
  { code: "+55", label: "Brazil 🇧🇷" },
  { code: "+1", label: "Canada 🇨🇦" },
  { code: "+86", label: "China 🇨🇳" },
  { code: "+20", label: "Egypt 🇪🇬" },
  { code: "+33", label: "France 🇫🇷" },
  { code: "+49", label: "Germany 🇩🇪" },
  { code: "+91", label: "India 🇮🇳" },
  { code: "+62", label: "Indonesia 🇮🇩" },
  { code: "+98", label: "Iran 🇮🇷" },
  { code: "+964", label: "Iraq 🇮🇶" },
  { code: "+39", label: "Italy 🇮🇹" },
  { code: "+81", label: "Japan 🇯🇵" },
  { code: "+962", label: "Jordan 🇯🇴" },
  { code: "+254", label: "Kenya 🇰🇪" },
  { code: "+965", label: "Kuwait 🇰🇼" },
  { code: "+961", label: "Lebanon 🇱🇧" },
  { code: "+218", label: "Libya 🇱🇾" },
  { code: "+60", label: "Malaysia 🇲🇾" },
  { code: "+52", label: "Mexico 🇲🇽" },
  { code: "+212", label: "Morocco 🇲🇦" },
  { code: "+31", label: "Netherlands 🇳🇱" },
  { code: "+234", label: "Nigeria 🇳🇬" },
  { code: "+92", label: "Pakistan 🇵🇰" },
  { code: "+63", label: "Philippines 🇵🇭" },
  { code: "+974", label: "Qatar 🇶🇦" },
  { code: "+7", label: "Russia 🇷🇺" },
  { code: "+966", label: "Saudi Arabia 🇸🇦" },
  { code: "+65", label: "Singapore 🇸🇬" },
  { code: "+27", label: "South Africa 🇿🇦" },
  { code: "+82", label: "South Korea 🇰🇷" },
  { code: "+34", label: "Spain 🇪🇸" },
  { code: "+249", label: "Sudan 🇸🇩" },
  { code: "+46", label: "Sweden 🇸🇪" },
  { code: "+963", label: "Syria 🇸🇾" },
  { code: "+90", label: "Turkey 🇹🇷" },
  { code: "+380", label: "Ukraine 🇺🇦" },
  { code: "+971", label: "United Arab Emirates 🇦🇪" },
  { code: "+44", label: "United Kingdom 🇬🇧" },
  { code: "+1", label: "United States 🇺🇸" },
  { code: "+967", label: "Yemen 🇾🇪" },
];

function SendPopup({ onClose, compiledReport, doctorName }) {
  const [countryCode, setCountryCode] = useState("+966");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gmail, setGmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const labels = {
    share: isArabic ? "مشاركة عبر" : "Share on",
    whatsapp: isArabic ? "رقم الواتساب" : "WhatsApp Number",
    required: isArabic ? "*" : "*",
    email: isArabic
      ? "البريد الإلكتروني (اختياري)"
      : "Gmail Address (optional)",
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
      const pdfBase64 = await generatePDFBlob(compiledReport, language);
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
