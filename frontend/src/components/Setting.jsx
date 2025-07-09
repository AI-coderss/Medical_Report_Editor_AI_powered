import React, { useState, useEffect } from "react";
import Swal from "sweetalert2"; // Import SweetAlert
import "../styles/setting.css";
import { useLanguage } from "./LanguageContext";

const Setting = () => {
  const [doctorName, setDoctorName] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);

  const { language, toggleLanguage } = useLanguage(); // ✅ Access the language context

  useEffect(() => {
    const storedDoctorName = localStorage.getItem("doctorName");
    const storedDepartment = localStorage.getItem("department");

    if (storedDoctorName) setDoctorName(storedDoctorName);
    if (storedDepartment) setDepartment(storedDepartment);
  }, []);

  useEffect(() => {
    fetch("/departments.json")
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error("Failed to fetch departments:", err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("doctorName", doctorName);
    localStorage.setItem("department", department);

    Swal.fire({
      icon: "success",
      title: language === "en" ? "Saved Successfully!" : "تم الحفظ بنجاح!",
      text:
        language === "en"
          ? "Your details have been saved."
          : "تم حفظ التفاصيل الخاصة بك.",
      confirmButtonColor: "#3085d6",
    });
  };

  return (
    <div className="outer" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="card shadow-lg p-4 rounded-4 setting-top">
        {/* Language Toggle Switch */}
        <div className="text-end mb-3">
          <div className="language-toggle">
            <span className="label">
              {language === "en" ? "English" : "العربية"}
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={language === "ar"}
                onChange={toggleLanguage}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            <div className="col-md-6">
              <label htmlFor="doctorName" className="form-label fw-semibold">
                {language === "en" ? "Doctor Name" : "اسم الطبيب"}
              </label>
              <input
                type="text"
                className="form-control form-control-lg rounded-3"
                id="doctorName"
                placeholder={
                  language === "en"
                    ? "Enter doctor's full name"
                    : "ادخل الاسم الكامل للطبيب"
                }
                value={doctorName}
                dir={language === "ar" ? "rtl" : "ltr"}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="department" className="form-label fw-semibold">
                {language === "en" ? "Department" : "القسم"}
              </label>
              <select
                className="form-select form-select-lg rounded-3"
                id="department"
                value={department}
                dir={language === "ar" ? "rtl" : "ltr"}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="" disabled hidden>
                  {language === "en" ? "Select Department" : "اختر القسم"}
                </option>
                {departments.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center mt-4">
            <button
              type="submit"
              className="btn btn-primary btn-lg rounded-pill px-5"
            >
              {language === "en" ? "Save" : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Setting;
