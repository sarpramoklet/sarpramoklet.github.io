import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, NotebookPen } from 'lucide-react';
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

interface Props {
  isLoggedIn: boolean;
}

const QuickActionsBar = ({ isLoggedIn }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!isLoggedIn) return null;
  if (pathname === '/login') return null;

  const currentUser = getCurrentUser();
  const onDuty = currentUser ? isUserOnDutyToday(currentUser.nama) : false;
  const isOnDashboard = pathname === '/' || pathname === '';
  const isOnDutyNotes = pathname.startsWith('/duty-notes');

  if (isOnDashboard && !onDuty) return null;
  if (isOnDashboard && onDuty && isOnDutyNotes) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0) + 1rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 950,
        display: 'flex',
        gap: '0.5rem',
        padding: '0.4rem',
        borderRadius: '999px',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset',
      }}
    >
      {!isOnDashboard && (
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 0.95rem',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(59,130,246,0.18)',
            color: '#93c5fd',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'background 0.18s, transform 0.18s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          aria-label="Buka Dashboard"
          title="Buka Dashboard"
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>
      )}

      {onDuty && !isOnDutyNotes && (
        <button
          type="button"
          onClick={() => navigate('/duty-notes?add=1')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1.05rem',
            borderRadius: '999px',
            border: '1px solid rgba(16,185,129,0.45)',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.95))',
            color: 'white',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(16,185,129,0.4)',
            transition: 'transform 0.18s, box-shadow 0.18s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 22px rgba(16,185,129,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.4)'; }}
          aria-label="Tambah Catatan Piket"
          title="Tambah Catatan Piket hari ini"
        >
          <NotebookPen size={15} />
          <span>Catatan Piket</span>
        </button>
      )}
    </div>
  );
};

export default QuickActionsBar;
