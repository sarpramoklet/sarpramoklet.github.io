import { useLocation, useNavigate } from 'react-router-dom';
import { Home, NotebookPen } from 'lucide-react';
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

  const piketTarget = onDuty && !isOnDutyNotes ? '/duty-notes?add=1' : '/duty-notes';

  return (
    <nav className="quick-actions-bar" aria-label="Navigasi cepat">
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
        className={`quick-actions-item quick-actions-item--piket ${isOnDutyNotes ? 'is-active' : ''} ${onDuty ? 'is-spotlight' : ''}`}
        onClick={() => navigate(piketTarget)}
        aria-label={onDuty ? 'Tambah Catatan Piket' : 'Buka Catatan Piket'}
      >
        <NotebookPen size={20} />
        <span>Note Piket</span>
        {onDuty && <span className="quick-actions-dot" aria-hidden="true" />}
      </button>
    </nav>
  );
};

export default QuickActionsBar;
