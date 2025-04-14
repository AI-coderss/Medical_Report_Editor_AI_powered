import React, { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import DownloadPDF from "./DownloadPDF";
import Loader from "./Loader";
import "../styles/RetrieveReport.css";

const MedicalReports = () => {
  const [reports, setReports] = useState([]); // Doctor reports
  const [editorReports, setEditorReports] = useState([]); // Editor reports
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("doctor"); // 'doctor' or 'editor'
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleShowReport = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true); // Open modal when a report is selected
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null); // Reset selected report when modal is closed
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
  // Fetch doctor reports
  const fetchDoctorReports = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("token");

      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/doctor-report",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch editor reports
  const fetchEditorReports = async () => {
    try {
      const token = Cookies.get("token");

      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/all-editor-report",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      setEditorReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching editor reports:", error);
    }
  };

  useEffect(() => {
    fetchDoctorReports();
    fetchEditorReports();
  }, []);

  const handleDelete = async (reportId, isEditorReport) => {
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
          const url = isEditorReport
            ? `https://medical-report-editor-ai-powered-backend.onrender.com/editor-report-delete/${reportId}`
            : `https://medical-report-editor-ai-powered-backend.onrender.com/report-delete/${reportId}`;

          console.log("Deleting from:", url);

          const response = await fetch(url, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            if (isEditorReport) {
              setEditorReports(editorReports.filter((r) => r.id !== reportId));
            } else {
              setReports(reports.filter((r) => r.id !== reportId));
            }
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
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const reportDate = new Date(report.date_of_report)
        .toISOString()
        .split("T")[0];

      const matchesSearch =
        (report.patient_name?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (report.chief_complaint?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (report.fileName?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (report.fileNumber?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        );

      const matchesDate =
        (!fromDate && !toDate) ||
        (fromDate && !toDate && reportDate === fromDate) ||
        (fromDate && toDate && reportDate >= fromDate && reportDate <= toDate);

      return matchesSearch && matchesDate;
    });
  }, [reports, searchQuery, fromDate, toDate]);

  const filteredEditorReports = useMemo(() => {
    return editorReports.filter((report) => {
      const reportDate = new Date(report.date_of_report)
        .toISOString()
        .split("T")[0];

      const matchesSearch =
        (report.result?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (report.fileName?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (report.fileNumber?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        );

      const matchesDate =
        (!fromDate && !toDate) ||
        (fromDate && !toDate && reportDate === fromDate) ||
        (fromDate && toDate && reportDate >= fromDate && reportDate <= toDate);

      return matchesSearch && matchesDate;
    });
  }, [editorReports, searchQuery, fromDate, toDate]);

  return (
    <div className="p-4 w-full">
      <div className="medi-header">
        <h2 className="text-4xl text-center font-bold text-red-600 mb-4">
          Medical Reports
        </h2>
      </div>
      <div className="inputdiv">
        <input
          type="text"
          placeholder="Search Report..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border user-input p-2 mb-4 w-full rounded"
        />
        <div className="flex gap-2 mb-4">
          <p className=" text-xl text-gray-600">From Date:</p>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border user-input datepick p-2 w-full rounded"
            placeholder="From Date"
          />
          <p className=" text-xl text-gray-600">To Date:</p>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border user-input datepick p-2 w-full rounded"
            placeholder="To Date"
          />
        </div>
        {(fromDate || toDate) && (
          <p className="mb-2 text-sm text-gray-600">
            Showing reports for:
            <strong className="ml-1">
              {fromDate && !toDate
                ? ` ${fromDate}`
                : fromDate && toDate
                ? ` ${fromDate} to ${toDate}`
                : ` ${toDate}`}
            </strong>
            <button
              className="ml-4 text-red-500 underline"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Clear
            </button>
          </p>
        )}
      </div>
      {loading ? (
        <div className="loader" style={{ marginTop: "100px" }}>
          <Loader />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-500 text-white table-main">
                <th className="border p-2">S. No.</th>
                <th className="border p-2">File No.</th>
                <th className="border p-2">Patient Name</th>
                <th className="border p-2">Patient Age</th>
                <th className="border p-2">Doctor Name</th>
                <th className="border p-2">Doctor Department</th>
                <th className="border p-2">Date of Report</th>
                <th className="border p-2">Source</th>
                <th className="border p-2">Report</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...filteredReports.map((r) => ({
                  ...r,
                  isEditorReport: false,
                })),
                ...filteredEditorReports.map((r) => ({
                  ...r,
                  isEditorReport: true,
                })),
              ].map((report, index) => (
                <tr key={report.id || index} className="text-center border">
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">
                    {report.fileName || report.fileNumber || "-"}
                  </td>
                  <td className="border p-2">{report.patient_name}</td>
                  <td className="border p-2">{report.patient_age}</td>
                  <td className="border p-2">{report.doctor_name}</td>
                  <td className="border p-2">{report.department}</td>
                  <td className="border p-2">
                    {
                      new Date(report.date_of_report)
                        .toISOString()
                        .split("T")[0]
                    }
                  </td>
                  <td className="border p-2">{report.generatedBy || "-"}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleShowReport(report)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Show
                    </button>
                  </td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() =>
                        handleDelete(report.id, report.isEditorReport)
                      }
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Compiled Report */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <div
            className="absolute inset-0 bg-gray-200 opacity-75"
            onClick={closeModal}
          ></div>
          <div
            className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full z-50 relative"
            style={{
              padding: "36px 31px",
              border: "1px solid #c9d1d9",
              marginTop: "148px",
              marginBottom: "33px", // 'margint' was likely a typo
            }}
          >
            <div className="flex-sec">
              <h2 className="text-xl font-semibold mb-4 text-center">
                Medical Report
              </h2>
              <h3 className="text-xl font-semibold mb-4 text-center">
                Report Id: {selectedReport.id || selectedReport._id}
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 ">
              <p className="whitespace-pre-wrap">
                {formatMedicalReport(
                  selectedReport.compiled_report ||
                    selectedReport.result ||
                    "No compiled report available"
                )}
              </p>
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
  );
};

export default MedicalReports;
