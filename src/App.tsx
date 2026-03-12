import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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


function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="bg-glow"></div>
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
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
