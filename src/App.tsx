import { useState, useEffect } from 'react';
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

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <ScrollToTop />
      <div className="app-layout">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/meeting" element={<MeetingDashboard />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/it" element={<ITPage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/sarpras" element={<SarprasPage />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/personnel" element={<Personnel />} />
              <Route path="/assignment" element={<Assignment />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/utilities" element={<Utilities />} />
              {/* Dummy pages for the rest */}
              <Route path="/maintenance" element={<DummyPage title="Jadwal Maintenance" />} />
              <Route path="/rooms" element={<DummyPage title="Gedung & Ruang" />} />
              <Route path="/projects" element={<DummyPage title="Proyek & Pengembangan" />} />
              <Route path="/sop" element={<DummyPage title="SOP & Dokumen" />} />
              <Route path="/notifications" element={<DummyPage title="Notifikasi Pribadi" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
