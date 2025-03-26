import React, { useState } from "react";
import axios from "axios";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import "../styles/signup.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Radiology",
    "General Surgery",
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateEmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const validatePassword = (password) => {
    return (
      password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    let newErrors = {};

    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email))
      newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    else if (!validatePassword(formData.password)) {
      newErrors.password =
        "Password must be at least 8 characters long, include a capital letter and a number";
    }

    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Confirm Password is required";
    else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.department) newErrors.department = "Department is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const response = await axios.post(
        "https://medical-report-editor-ai-powered-dsah.onrender.com/register",
        formData
      );
      setMessage(response.data.message || "Signup successful!");
    } catch (error) {
      setMessage(error.response?.data?.message || "Signup failed. Try again.");
    }
  };

  return (
    <div>
      <h2 className="text-4xl text-center font-bold text-red-600 mb-4 mt-5">
        Add Users
      </h2>
      <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg sign-form ">
        <div className="logo-img">
          <img src="logo.png" alt="" />
        </div>
        {message && <p className="mb-4 text-red-500">{message}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-2"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm">{errors.firstName}</p>
          )}

          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-2"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm">{errors.lastName}</p>
          )}

          <input
            type="text"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-2"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email}</p>
          )}
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="">Select Department</option>
            {departments.map((dept, index) => (
              <option key={index} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          {errors.department && (
            <p className="text-red-500 text-sm">{errors.department}</p>
          )}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />
            <button
              type="button"
              className="absolute right-3 top-3 eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password}</p>
          )}

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-4"
            />
            <button
              type="button"
              className="absolute right-3 top-3 eye-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded submit-btn"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
