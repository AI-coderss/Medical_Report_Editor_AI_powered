import React, { useState } from "react";
import axios from "axios";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateEmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    let newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email))
      newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/login",
        formData
      );
      setMessage(response.data.message || "Login successful!");
      Cookies.set("token", response.data.access_token, { expires: 7 });
      Cookies.set("department", response.data.user.department, { expires: 7 });
      Cookies.set("FirstName", response.data.user.firstName, { expires: 7 });
      Cookies.set("LastName", response.data.user.lastName, { expires: 7 });
      // Check if the email is the admin email
      if (formData.email === "admin.samirabbashospital@gmail.com") {
        navigate("/dashboard/users"); // Navigate to the dashboard if the email is admin
      } else {
        navigate("/editor"); // Otherwise, navigate to the editor
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-lg login-form">
      <div className="logo-img">
        <img src="logo.png" alt="" />
      </div>
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      {message && <p className="mb-4 text-red-500">{message}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 border rounded mb-2"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 pr-10 border rounded mb-4"
          />
          <button
            type="button"
            className="absolute right-3  eye-btn1"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded submit-btn"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
