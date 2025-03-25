import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Dashboard = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="p-4 w-full">
        <Outlet /> {/* This will render the appropriate child component */}
      </div>
    </div>
  );
};

export default Dashboard;
