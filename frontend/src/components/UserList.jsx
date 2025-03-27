import React, { useEffect, useState } from "react";
import Cookies from "js-cookie"; // Import js-cookie to fetch JWT
import Swal from "sweetalert2"; // Import SweetAlert2
import "../styles/UserList.css";

const UserList = () => {
  const [users, setUsers] = useState([]); // Default to an empty array
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = Cookies.get("token"); // Fetch JWT from cookies

      const response = await fetch(
        "https://medical-report-editor-ai-powered-backend.onrender.com/users",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Attach JWT token in the header
          },
        }
      );

      const data = await response.json();

      // Ensure response is an array
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("API response is not an array:", data);
        setUsers([]); // Set to empty array to avoid crashes
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]); // Set to empty array in case of error
    }
  };

  const handleDelete = async (id) => {
    // Show SweetAlert confirmation
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = Cookies.get("token"); // Fetch JWT from cookies

          await fetch(
            `https://medical-report-editor-ai-powered-backend.onrender.com/delete/${id}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`, // Attach JWT token in the header
              },
            }
          );

          setUsers(users.filter((user) => user.id !== id));

          // Show success alert
          Swal.fire("Deleted!", "User has been deleted.", "success");
        } catch (error) {
          console.error("Error deleting user:", error);
          Swal.fire("Error!", "Failed to delete user.", "error");
        }
      }
    });
  };

  // Ensure users is an array before filtering
  const filteredUsers = Array.isArray(users)
    ? users.filter(
        (user) =>
          user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="p-4 w-full">
      {/* Search Bar */}
      <div className="inputdiv">
        <h2 className="text-4xl text-center font-bold text-red-600 mb-4">
          User List
        </h2>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2  w-full rounded user-input"
        />
      </div>

      {/* User Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-blue-500 text-white table-main py-5">
            <th className="border p-2">S. No.</th>
            <th className="border p-2">First Name</th>
            <th className="border p-2">Last Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user, index) => (
              <tr key={user.id} className="text-center border">
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{user.first_name}</td>
                <td className="border p-2">{user.last_name}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center p-4">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
