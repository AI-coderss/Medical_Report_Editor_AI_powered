// src/components/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import ReportEditor from './components/ReportEditor';
import Navbar from './components/Navbar';
import ReportTemplate from './components/ReportTemplate';
import UploadReport from './components/UploadReport';

function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          <Route path="/editor" element={<ReportEditor />} />
          <Route path="/template" element={<ReportTemplate />} />
          <Route path="/upload-report" element={<UploadReport />} />
          <Route path="/settings" element={<h2>Settings Page</h2>} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;

