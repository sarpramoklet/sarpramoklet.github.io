import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MeetingDashboard from './pages/MeetingDashboard';
import Tickets from './pages/Tickets';
import ITPage from './pages/ITPage';
import LabPage from './pages/LabPage';
import SarprasPage from './pages/SarprasPage';
import Assets from './pages/Assets';
import DummyPage from './pages/DummyPage';
import Personnel from './pages/Personnel';
import Assignment from './pages/Assignment';
import Performance from './pages/Performance';
import Utilities from './pages/Utilities';
import Login from './pages/Login';

// Scroll to top component when route changes
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Also scroll the main content area
    const mainContent = document.querySelector('.content-container');
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Protected Route Component
const ProtectedRoute = ({ isLoggedIn, children }: { isLoggedIn: boolean, children: React.ReactNode }) => {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('userEmail') === 'hadi@smktelkom-mlg.sch.id';
  });
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  return (
    <Router>
      <ScrollToTop />
      <div className="app-layout">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isLightMode={isLightMode} 
          setIsLightMode={setIsLightMode}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
        />
        
        <main className="main-content">
          <div className="bg-glow"></div>
          
          <div className="mobile-header">
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 className="mobile-title gradient-text">Sarpramoklet</h1>
          </div>
          
          <div className="content-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login onLogin={(email) => { localStorage.setItem('userEmail', email); setIsLoggedIn(true); }} />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/meeting" element={<MeetingDashboard />} />
              <Route path="/it" element={<ITPage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/sarpras" element={<SarprasPage />} />
              <Route path="/performance" element={<Performance />} />

              {/* Protected Routes */}
              <Route path="/tickets" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Tickets /></ProtectedRoute>} />
              <Route path="/utilities" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Utilities /></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Assets /></ProtectedRoute>} />
              <Route path="/personnel" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Personnel /></ProtectedRoute>} />
              <Route path="/assignment" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Assignment /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Proyek & Pengembangan" /></ProtectedRoute>} />
              <Route path="/sop" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="SOP & Dokumen" /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Notifikasi Pribadi" /></ProtectedRoute>} />
              <Route path="/maintenance" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Jadwal Maintenance" /></ProtectedRoute>} />
              <Route path="/rooms" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Gedung & Ruang" /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
