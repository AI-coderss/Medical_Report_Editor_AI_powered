import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import DownloadPDF from "./DownloadPDF";
import Loader from "./Loader";

const MedicalReports = () => {
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleShowReport = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true); // Start loader
      const token = Cookies.get("token");

      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/reports",
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
      setLoading(false); // Stop loader
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
  const filteredReports = reports.filter(
    (report) =>
      (report.patient_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (report.chief_complaint?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      )
  );

  return (
    <div className="p-4 w-full">
      <div className="inputdiv">
        <h2 className="text-4xl text-center font-bold text-red-600 mb-4">
          Medical Reports
        </h2>

        <input
          type="text"
          placeholder="Search by Patient Name or Chief Complaint..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border user-input p-2 mb-4 w-full rounded"
        />
      </div>
      {loading ? (
        <div className="loader">
          <Loader />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-500 text-white table-main">
                <th className="border p-2">S. No.</th>
                <th className="border p-2">Patient Name</th>
                <th className="border p-2">Age</th>
                <th className="border p-2">Chief Complaint</th>
                <th className="border p-2">Medical History</th>
                <th className="border p-2">Medications</th>
                <th className="border p-2">Allergies</th>
                <th className="border p-2">Assessment Plan</th>
                <th className="border p-2">Doctor's Signature</th>
                <th className="border p-2">Report</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr
                    key={report.id || report._id}
                    className="text-center border"
                  >
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{report.patient_name}</td>
                    <td className="border p-2">{report.age}</td>
                    <td className="border p-2">{report.chief_complaint}</td>
                    <td className="border p-2">
                      {report.past_medical_history}
                    </td>
                    <td className="border p-2">{report.medications}</td>
                    <td className="border p-2">{report.allergies}</td>
                    <td className="border p-2">{report.assessment_plan}</td>
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
                  <td colSpan="10" className="text-center p-4">
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>

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
                  <h2 className="text-xl font-semibold mb-4 text-center">
                    Compiled Report
                  </h2>
                  <div className="max-h-96 overflow-y-auto p-4 border rounded">
                    <p className="whitespace-pre-wrap">
                      {selectedReport.compiled_report ||
                        "No compiled report available"}
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
          </table>
        </div>
      )}
    </div>
  );
};

export default MedicalReports;
