import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import DownloadPDF from "./DownloadPDF";
import "../styles/RetrieveReport.css";
import "./tab.js";

const RetrieveReport = () => {
  const [reports, setReports] = useState([]); // For /doctor-report
  const [editorReports, setEditorReports] = useState([]); // For /editor-report
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(1); // Track the active tab (1 = doctor-report, 2 = editor-report)
  const [selectedDate, setSelectedDate] = useState("");
  const handleShowReport = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  function formatMedicalReport(reportText) {
    const lines = reportText.split(/\r?\n/);
    const elements = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line === "") {
        elements.push(<br key={i} />);
        continue;
      }

      // Headings (markdown-like)
      const headingMatch = line.match(/^\*\*(.+?):?\*\*$/);
      const isLikelyHeading =
        /^[A-Z][A-Za-z\s()&]+$/.test(line) &&
        (!lines[i + 1] || lines[i + 1].trim() === "");

      if (headingMatch) {
        elements.push(
          <h2 key={i} className="mt-4 text-lg font-semibold">
            {headingMatch[1]}
          </h2>
        );
        continue;
      }

      if (isLikelyHeading) {
        elements.push(
          <h2 key={i} className="mt-4 text-lg font-semibold">
            {line}
          </h2>
        );
        continue;
      }

      // Convert inline **bold** within paragraphs
      const parts = line.split(/(\*\*.*?\*\*)/g).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.replace(/\*\*/g, "")}</strong>;
        }
        return part;
      });

      elements.push(
        <p key={i} className="mb-2">
          {parts}
        </p>
      );
    }

    return elements;
  }

  const truncateText = (text, maxLength) => {
    if (!text) return "";

    // Replace bold-like **Title:** with 'Title:\n'
    let cleanedText = text.replace(/\*\*(.+?):\*\*/g, "$1:\n");

    // Replace remaining bold-style **text** with just text
    cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, "$1");

    // Replace patterns like "Chief Complaint:" with line breaks before them (optional enhancement)
    cleanedText = cleanedText.replace(/([A-Za-z ()/&]+:)/g, "\n$1");

    // Normalize spacing
    cleanedText = cleanedText.replace(/ +/g, " ").trim();

    // Truncate if too long
    if (cleanedText.length > maxLength) {
      cleanedText = cleanedText.slice(0, maxLength).trim() + "...";
    }

    return cleanedText;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  useEffect(() => {
    fetchReports();
    fetchEditorReports(); // Fetch the reports from /editor-report
  }, []);

  const fetchReports = async () => {
    try {
      const token = Cookies.get("token");

      const response = await fetch("http://127.0.0.1:5000/doctor-report", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const fetchEditorReports = async () => {
    try {
      const token = Cookies.get("token");

      const response = await fetch("http://127.0.0.1:5000/editor-report", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setEditorReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching editor reports:", error);
    }
  };

  const handleDelete = async (reportId) => {
    const token = Cookies.get("token");

    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `https://medical-report-editor-ai-powered-backend.onrender.com/report-delete/${reportId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            setReports(reports.filter((report) => report.id !== reportId));
            Swal.fire("Deleted!", "The report has been deleted.", "success");
          } else {
            Swal.fire("Error", "Failed to delete report", "error");
          }
        } catch (error) {
          console.error("Error deleting report:", error);
          Swal.fire("Error", "Something went wrong", "error");
        }
      }
    });
  };
  const handleTabChange = (e) => {
    setSelectedTab(e.target.value);
  };
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      (report.patient_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (report.chief_complaint?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      );

    const matchesDate =
      !selectedDate ||
      new Date(report.date_of_report).toISOString().split("T")[0] ===
        selectedDate;

    return matchesSearch && matchesDate;
  });

  const filteredEditorReports = editorReports.filter((report) => {
    const matchesSearch = (report.result?.toLowerCase() || "").includes(
      searchQuery.toLowerCase()
    );

    const matchesDate =
      !selectedDate ||
      new Date(report.date_of_report).toISOString().split("T")[0] ===
        selectedDate;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="container-sec">
      <div className="p-4 w-full">
        {/* Tabs for switching between tables */}

        {/* Search Input */}
        <h2 className="text-4xl text-center font-bold text-red-600 mb-4 py-5 med-header">
          Medical Reports
        </h2>
        <div className="inputdiv">
          <input
            type="text"
            placeholder="Search by Patient Name, Chief Complaint or Result..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border user-input p-2 mb-4 w-full rounded"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border user-input p-2 mb-4 w-full rounded"
          />
          {selectedDate && (
            <p className="mb-2 text-sm text-gray-600">
              Showing reports for: <strong>{selectedDate}</strong>
              <button
                className="ml-4 text-red-500 underline"
                onClick={() => setSelectedDate("")}
              >
                Clear
              </button>
            </p>
          )}
        </div>
        <div className="TabButtons TabsWrapper">
          <button
            className={`tab_rep ${selectedTab === 1 ? "active" : ""}`}
            onClick={() => setSelectedTab(1)}
          >
            Template Reports
          </button>
          <button
            className={`tab_rep ${selectedTab === 2 ? "active" : ""}`}
            onClick={() => setSelectedTab(2)}
          >
            Editor Reports
          </button>
        </div>
        {/* Display Doctor Reports in Tab 1 */}
        {selectedTab === 1 && (
          <div className="overflow-x-auto TabContent ">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-500 text-white table-main">
                  <th className="border p-2">S. No.</th>
                  <th className="border p-2">Patient Name</th>
                  <th className="border p-2">Patient File Number</th>
                  <th className="border p-2">Age</th>
                  <th className="border p-2">Chief Complaint</th>
                  <th className="border p-2">Personal History</th>
                  <th className="border p-2">Medical History</th>
                  <th className="border p-2">Present Illness</th>
                  <th className="border p-2">Past History</th>
                  <th className="border p-2">Family History</th>
                  <th className="border p-2">System Review</th>
                  <th className="border p-2">Date Of Report</th>
                  <th className="border p-2">Doctor's Signature</th>
                  <th className="border p-2">Report</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((report, index) => (
                    <tr key={report.id} className="text-center border">
                      <td className="border p-2">{index + 1}</td>
                      <td className="border p-2">{report.patient_name}</td>
                      <td className="border p-2">{report.id}</td>
                      <td className="border p-2">{report.age}</td>
                      <td className="border p-2">{report.chief_complaint}</td>
                      <td className="border p-2">{report.personal_history}</td>
                      <td className="border p-2">{report.medical_history}</td>
                      <td className="border p-2">{report.present_illness}</td>
                      <td className="border p-2">{report.past_history}</td>
                      <td className="border p-2">{report.family_history}</td>
                      <td className="border p-2">{report.system_review}</td>
                      <td className="border p-2">
                        {
                          new Date(report.date_of_report)
                            .toISOString()
                            .split("T")[0]
                        }
                      </td>
                      <td className="border p-2">
                        {report.doctor_signature ? (
                          <img
                            src={`data:image/png;base64,${report.doctor_signature}`}
                            alt="Doctor Signature"
                            className="h-12 w-auto"
                          />
                        ) : (
                          "No Signature"
                        )}
                      </td>
                      <td className="border p-2">
                        <button
                          onClick={() => handleShowReport(report)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Show Report
                        </button>
                      </td>
                      <td className="border p-2">
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center p-4">
                      No reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Display Editor Reports in Tab 2 */}
        {selectedTab === 2 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-500 text-white table-main">
                  <th className="border p-2">S. No.</th>
                  <th className="border p-2">Date of Report</th>
                  <th className="border p-2">Report</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEditorReports.length > 0 ? (
                  filteredEditorReports.map((report, index) => (
                    <tr key={report.id} className="text-center border">
                      <td className="border p-2">{index + 1}</td>
                      <td className="border p-2">
                        {" "}
                        {
                          new Date(report.date_of_report)
                            .toISOString()
                            .split("T")[0]
                        }
                      </td>
                      <td className="border p-2">
                        {truncateText(report.result, 150)}
                      </td>
                      <td className="border p-2">
                        <button
                          onClick={() => handleShowReport(report)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Show Report
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center p-4">
                      No editor reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal for Compiled Report */}
        {isModalOpen && selectedReport && (
          <div className="fixed inset-0 flex justify-center items-center z-50">
            {/* Modal Background */}
            <div
              className="absolute inset-0 bg-gray-200 opacity-75"
              onClick={closeModal}
            ></div>

            {/* Modal Content */}
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full z-50 relative">
              <div className="flex-sec">
                <h2 className="text-xl font-semibold mb-4 text-center">
                  Medical Report
                </h2>
                <h3 className="text-xl font-semibold mb-4 text-center">
                  Report Id:{selectedReport.id}
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 border rounded space-y-2">
                {formatMedicalReport(
                  selectedReport.compiled_report || selectedReport.result
                )}
              </div>
              <div className="mt-4 flex justify-between">
                <DownloadPDF report={selectedReport} />
                <button
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetrieveReport;
