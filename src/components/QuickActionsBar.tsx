import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Home, MessageSquare, NotebookPen } from 'lucide-react';
import { getCurrentUser } from '../data/organization';

const PIKET_SCHEDULE: { day: string; personnel: string[] }[] = [
  { day: 'Senin', personnel: ['Chusni', 'Whyna', 'Rudi'] },
  { day: 'Selasa', personnel: ['Bidin', 'Bagus', 'Rudi'] },
  { day: 'Rabu', personnel: ['Zakaria', 'Yoko', 'Rudi'] },
  { day: 'Kamis', personnel: ['Chandra', 'Nico', 'Rudi'] },
  { day: 'Jumat', personnel: ['Ayat', 'Amalia', 'Rudi'] },
];

const isUserOnDutyToday = (userName: string) => {
  const todayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date()).toLowerCase();
  const slot = PIKET_SCHEDULE.find((s) => s.day.toLowerCase() === todayLabel);
  if (!slot) return false;
  const nameLower = (userName || '').toLowerCase();
  return slot.personnel.some((p) => nameLower.includes(p.toLowerCase()));
};

const LS_KEY = 'quickbar_visible';

interface Props {
  isLoggedIn: boolean;
}

const QuickActionsBar = ({ isLoggedIn }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Persist visibility in localStorage (default: visible)
  const [visible, setVisible] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY) !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, String(visible)); } catch { /* ignore */ }
  }, [visible]);

  if (pathname === '/login') return null;

  const currentUser = isLoggedIn ? getCurrentUser() : null;
  const onDuty = currentUser ? isUserOnDutyToday(currentUser.nama) : false;
  const isOnDashboard = pathname === '/' || pathname === '';
  const isOnAssistant = pathname.startsWith('/assistant');
  const isOnDutyNotes = pathname.startsWith('/duty-notes');

  const piketTarget = onDuty && !isOnDutyNotes ? '/duty-notes?add=1' : '/duty-notes';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Toggle pill */}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan bar navigasi' : 'Tampilkan bar navigasi'}
        title={visible ? 'Sembunyikan' : 'Tampilkan bar'}
        style={{
          pointerEvents: 'auto',
          background: 'rgba(30,40,60,0.82)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderBottom: visible ? 'none' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: visible ? '10px 10px 0 0' : '10px',
          padding: '3px 14px 2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          transition: 'all 0.2s',
          marginBottom: visible ? 0 : 6,
        }}
      >
        {visible ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        {visible ? 'Sembunyikan' : 'Bar Navigasi'}
      </button>

      {/* Main nav bar — slides down when hidden */}
      <nav
        className="quick-actions-bar"
        aria-label="Navigasi cepat"
        style={{
          pointerEvents: visible ? 'auto' : 'none',
          maxHeight: visible ? 80 : 0,
          opacity: visible ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
          borderRadius: '0 0 18px 18px',
        }}
      >
        <button
          type="button"
          className={`quick-actions-item ${isOnDashboard ? 'is-active' : ''}`}
          onClick={() => navigate('/')}
          aria-label="Home Dashboard"
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`quick-actions-item quick-actions-item--assistant ${isOnAssistant ? 'is-active' : ''}`}
          onClick={() => navigate('/assistant')}
          aria-label="Buka Asisten Sarmok"
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>

        {isLoggedIn && (
          <button
            type="button"
            className={`quick-actions-item quick-actions-item--piket ${isOnDutyNotes ? 'is-active' : ''} ${onDuty ? 'is-spotlight' : ''}`}
            onClick={() => navigate(piketTarget)}
            aria-label={onDuty ? 'Tambah Catatan Piket' : 'Buka Catatan Piket'}
          >
            <NotebookPen size={20} />
            <span>Note Piket</span>
            {onDuty && <span className="quick-actions-dot" aria-hidden="true" />}
          </button>
        )}
      </nav>
    </div>
  );
};

export default QuickActionsBar;
