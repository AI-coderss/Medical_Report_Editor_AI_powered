import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Cookies from "js-cookie";

const ProtectedRoute = () => {
  const token = Cookies.get("token"); // Retrieve JWT token from cookies

  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
