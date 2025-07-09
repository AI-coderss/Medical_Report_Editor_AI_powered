import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReportEditor from './components/ReportEditor';
import Navbar from './components/Navbar';
import ReportTemplate from './components/ReportTemplate';
import UploadReport from './components/UploadReport';
import Signup from './components/signup';
import Login from './components/Login';
import ProtectedRoute from './routeprotection/ProtectedRoute';
import Dashboard from './components/AdminDashboard';
import UserList from "./components/UserList";
import MedicalReports from './components/Reports';
import RetrieveReport from './components/RetrieveReport';
import Setting from './components/Setting';
import { LanguageProvider } from './components/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route path="add-user" element={<Signup />} />
              <Route path="users" element={<UserList />} />
              <Route path="reports" element={<MedicalReports />} />
            </Route>
            <Route path="/editor" element={<><Navbar /><ReportEditor /></>} />
            <Route path="/retrieve-report" element={<><Navbar /><RetrieveReport /></>} />
            <Route path="/template" element={<><Navbar /><ReportTemplate /></>} />
            <Route path="/upload-report" element={<><Navbar /><UploadReport /></>} />
            <Route path="/settings" element={<><Navbar /><Setting /></>} />
          </Route>

          {/* Catch-All Route: Redirects unknown routes to /login */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
