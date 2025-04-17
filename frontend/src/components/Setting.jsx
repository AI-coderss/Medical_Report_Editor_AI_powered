import React, { useState, useEffect } from "react";
import Swal from "sweetalert2"; // Import SweetAlert
import "../styles/setting.css";

const Setting = () => {
  const [doctorName, setDoctorName] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);

  // Load stored values
  useEffect(() => {
    const storedDoctorName = localStorage.getItem("doctorName");
    const storedDepartment = localStorage.getItem("department");

    if (storedDoctorName) setDoctorName(storedDoctorName);
    if (storedDepartment) setDepartment(storedDepartment);
  }, []);

  // Load departments from JSON file in public folder
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
      title: "Saved Successfully!",
      text: "Your details have been saved.",
      confirmButtonColor: "#3085d6",
    });
  };

  return (
    <div className="outer">
      <div className="card shadow-lg p-4 rounded-4 setting-top">
        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            {/* Doctor Name Field */}
            <div className="col-md-6">
              <label htmlFor="doctorName" className="form-label fw-semibold">
                Doctor Name
              </label>
              <input
                type="text"
                className="form-control form-control-lg rounded-3"
                id="doctorName"
                placeholder="Enter doctor's full name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>

            {/* Department Field as Dynamic Select */}
            <div className="col-md-6">
              <label htmlFor="department" className="form-label fw-semibold">
                Department
              </label>
              <select
                className="form-select form-select-lg rounded-3"
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="" disabled hidden>
                  Select Department
                </option>
                {departments.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center mt-4">
            <button
              type="submit"
              className="btn btn-primary btn-lg rounded-pill px-5"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Setting;
