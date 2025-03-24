import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReportEditor from './components/ReportEditor';
import Navbar from './components/Navbar';
import ReportTemplate from './components/ReportTemplate';
import UploadReport from './components/UploadReport';
import Signup from './components/signup';
import Login from './components/Login';
import ProtectedRoute from './routeprotection/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="*"
            element={(
              <>
                <Navbar />
                <main>
                  <Routes>
                    <Route path="/editor" element={<ReportEditor />} />
                    <Route path="/template" element={<ReportTemplate />} />
                    <Route path="/upload-report" element={<UploadReport />} />
                    <Route path="/settings" element={<h2>Settings Page</h2>} />
                  </Routes>
                </main>
              </>
            )}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;



// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import ReportEditor from './components/ReportEditor';
// import Navbar from './components/Navbar';
// import ReportTemplate from './components/ReportTemplate';
// import UploadReport from './components/UploadReport';
// import Signup from './components/signup';
// import Login from './components/Login';

// function App() {
//   return (
//     <Router>
//       <Routes>
//         {/* Default route to redirect '/' to '/editor' */}
//         <Route path="/" element={<Navigate to="/login" />} />
//         <Route path="/signup" element={<Signup />} />
//         <Route path="/login" element={<Login />} />
//         <Route
//           path="*"
//           element={(
//             <>
//               <Navbar />
//               <main>
//                 <Routes>
//                   <Route path="/editor" element={<ReportEditor />} />
//                   <Route path="/template" element={<ReportTemplate />} />
//                   <Route path="/upload-report" element={<UploadReport />} />
//                   <Route path="/settings" element={<h2>Settings Page</h2>} />
//                 </Routes>
//               </main>
//             </>
//           )}
//         />
//       </Routes>
//     </Router>
//   );
// }

// export default App;