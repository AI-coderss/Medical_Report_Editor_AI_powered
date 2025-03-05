// src/components/ReportTemplate.js
import React, { useState } from 'react';
import '../styles/ReportTemplate.css';

function ReportTemplate() {
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    symptoms: '',
    diagnosis: '',
    treatment: ''
  });
  const [compiledReport, setCompiledReport] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call: Compile the report from the form data.
    const report = `
Medical Report for ${formData.patientName}
Age: ${formData.age}
Symptoms: ${formData.symptoms}
Diagnosis: ${formData.diagnosis}
Treatment: ${formData.treatment}

Recommendations: Please follow up with a specialist.
    `;
    setCompiledReport(report);
  };

  return (
    <div className="template-container">
      <h2>Medical Report Template</h2>
      <form onSubmit={handleSubmit} className="report-form">
        <label>
          Patient Name:
          <input 
            type="text" 
            name="patientName" 
            value={formData.patientName} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Age:
          <input 
            type="number" 
            name="age" 
            value={formData.age} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Symptoms:
          <textarea 
            name="symptoms" 
            value={formData.symptoms} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Diagnosis:
          <textarea 
            name="diagnosis" 
            value={formData.diagnosis} 
            onChange={handleChange} 
            required 
          />
        </label>
        <label>
          Treatment:
          <textarea 
            name="treatment" 
            value={formData.treatment} 
            onChange={handleChange} 
            required 
          />
        </label>
        <button type="submit">Generate Report</button>
      </form>
      {compiledReport && (
        <div className="compiled-report">
          <h3>Compiled Medical Report</h3>
          <pre>{compiledReport}</pre>
        </div>
      )}
    </div>
  );
}

export default ReportTemplate;

