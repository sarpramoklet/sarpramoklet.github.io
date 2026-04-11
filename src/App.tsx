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
import Finance from './pages/Finance';
import OperationalCash from './pages/OperationalCash';
import ACCash from './pages/ACCash';
import ACMonitor from './pages/ACMonitor';
import Assignment from './pages/Assignment';
import Performance from './pages/Performance';
import Utilities from './pages/Utilities';
import AccessLogs from './pages/AccessLogs';
import DutyNotes from './pages/DutyNotes';
import CapexBudget from './pages/CapexBudget';
import ClassroomMonitor from './pages/ClassroomMonitor';
import Login from './pages/Login';
import { getCurrentUser } from './data/organization';
import { NAVIGATION } from './navigation';
import { logAccess } from './utils/logger';

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

const getPageNameFromPath = (pathname: string) => {
  const matchedRoute = NAVIGATION.find((item) => item.path === pathname);
  if (matchedRoute) return matchedRoute.name;
  if (pathname === '/login') return 'Login';
  if (pathname === '/') return 'Dashboard';
  return pathname.replace('/', '').replace(/-/g, ' ') || 'Dashboard';
};

const RouteActivityTracker = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isLoggedIn || pathname === '/login') return;
    const currentUser = getCurrentUser();
    logAccess(currentUser, getPageNameFromPath(pathname), pathname);
  }, [isLoggedIn, pathname]);

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
    const email = localStorage.getItem('userEmail');
    const allowed = [
      'hadi@smktelkom-mlg.sch.id', 
      'chusni@smktelkom-mlg.sch.id', 
      'whyna@smktelkom-mlg.sch.id', 
      'ekon.a.poernomo@smktelkom-mlg.sch.id', 
      'amalia@smktelkom-mlg.sch.id',
      'rudimistriono@smktelkom-mlg.sch.id',
      'zainul@smktelkom-mlg.sch.id',
      'yoko@smktelkom-mlg.sch.id',
      'nico@smktelkom-mlg.sch.id',
      'zakaria@smktelkom-mlg.sch.id',
      'bagus@smktelkom-mlg.sch.id',
      'chandra@smktelkom-mlg.sch.id',
      'ayat@smktelkom-mlg.sch.id'
    ];
    return allowed.includes(email || '');
  });
  const [userPicture, setUserPicture] = useState(() => {
    return localStorage.getItem('userPicture') || '';
  });
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!localStorage.getItem('loginSessionSeed')) {
      localStorage.setItem('loginSessionSeed', `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    }
  }, [isLoggedIn]);

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
      <RouteActivityTracker isLoggedIn={isLoggedIn} />
      <div className="app-layout">
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isLightMode={isLightMode} 
          setIsLightMode={setIsLightMode}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          userPicture={userPicture}
          setUserPicture={setUserPicture}
        />
        
        <main className="main-content">
          <div className="bg-glow"></div>
          
          <div className="mobile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={24} />
              </button>
              <h1 className="mobile-title gradient-text" style={{ margin: 0 }}>Sarpramoklet</h1>
            </div>
            <img src="./logo_telkom.png" alt="Logo Telkom" className="theme-aware-logo" style={{ height: '24px', objectFit: 'contain', marginLeft: 'auto' }} />
          </div>
          
          <div className="content-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <Login onLogin={(email, picture) => { 
                  localStorage.setItem('userEmail', email); 
                  if (picture) localStorage.setItem('userPicture', picture);
                  localStorage.setItem('loginSessionSeed', `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
                  setIsLoggedIn(true); 
                  if (picture) setUserPicture(picture);
                }} />
              } />
              <Route path="/" element={<Dashboard isLoggedIn={isLoggedIn} userPicture={userPicture} />} />
              <Route path="/meeting" element={<MeetingDashboard />} />
              <Route path="/it" element={<ITPage />} />
              <Route path="/it-net" element={<Navigate to="/it" replace />} />
              <Route path="/net-monitor" element={<Navigate to="/it" replace />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/sarpras" element={<SarprasPage />} />

              {/* Protected Routes */}
              <Route path="/performance" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Performance /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Tickets /></ProtectedRoute>} />
              <Route path="/utilities" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Utilities /></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Assets /></ProtectedRoute>} />
              <Route path="/personnel" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Personnel /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Finance /></ProtectedRoute>} />
              <Route path="/operational-cash" element={<ProtectedRoute isLoggedIn={isLoggedIn}><OperationalCash /></ProtectedRoute>} />
              <Route path="/ac-cash" element={<ProtectedRoute isLoggedIn={isLoggedIn}><ACCash /></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute isLoggedIn={isLoggedIn}><AccessLogs /></ProtectedRoute>} />
              <Route path="/assignment" element={<ProtectedRoute isLoggedIn={isLoggedIn}><Assignment /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Proyek & Pengembangan" /></ProtectedRoute>} />
              <Route path="/sop" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="SOP & Dokumen" /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Notifikasi Pribadi" /></ProtectedRoute>} />
              <Route path="/duty-notes" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DutyNotes /></ProtectedRoute>} />
              <Route path="/classroom-monitor" element={<ProtectedRoute isLoggedIn={isLoggedIn}><ClassroomMonitor /></ProtectedRoute>} />
              <Route path="/maintenance" element={<ProtectedRoute isLoggedIn={isLoggedIn}><DummyPage title="Jadwal Maintenance" /></ProtectedRoute>} />
              <Route path="/ac-monitor" element={<ProtectedRoute isLoggedIn={isLoggedIn}><ACMonitor /></ProtectedRoute>} />
              <Route path="/capex" element={<ProtectedRoute isLoggedIn={isLoggedIn}><CapexBudget /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Footer */}
            <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>
                ATTITUDE IS EVERYTHING
              </p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', opacity: 0.5 }}>
                Sarpramoklet v2.0 &copy; 2026 • SMK Telkom Malang
              </p>
            </footer>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
