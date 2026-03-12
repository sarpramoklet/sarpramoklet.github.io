import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../navigation';
import { Activity, UserCircle2 } from 'lucide-react';
import { CURRENT_USER } from '../data/organization';

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ padding: '8px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', borderRadius: '12px', color: 'white' }}>
          <Activity size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0 }} className="gradient-text">Sarpramoklet</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Command Center</span>
        </div>
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0 0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          Menu Utama
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {NAVIGATION.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ padding: '6px', background: 'var(--bg-card)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}>
          <UserCircle2 size={32} color="var(--text-secondary)" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{CURRENT_USER.nama}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{CURRENT_USER.jabatan}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
