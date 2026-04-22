import { USERS, getCurrentUser, ROLES } from '../data/organization';
import { Briefcase, Search, AlertTriangle, CheckSquare, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import UserAvatar from '../components/UserAvatar';

// Simple seeded pseudo-random to avoid impure Math.random() during render
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const Assignment = () => {
  const currentUser = getCurrentUser();
  const [searchTerm, setSearchTerm] = useState('');
  const profileThumbByEmail = useProfileThumbByEmail();

  const isKaur = currentUser.roleAplikasi.includes('Koordinator');
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;

  const filteredAssignments = useMemo(() => {
    return USERS.filter(u => {
      if (u.atasanLangsung === null && !isPimpinan) return false;
      if (isPimpinan) {
        return u.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
               u.unit.toLowerCase().includes(searchTerm.toLowerCase());
      }
      if (u.unit === currentUser.unit) {
        return u.nama.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    }).map((user, idx) => {
      const seed = idx * 4;
      return {
        ...user,
        aktif: Math.floor(seededRandom(seed) * 5) + 1,
        selesai: Math.floor(seededRandom(seed + 1) * 20) + 5,
        overdue: Math.floor(seededRandom(seed + 2) * 3),
        loadKerja: Math.floor(seededRandom(seed + 3) * 60) + 40
      };
    });
  }, [searchTerm, isPimpinan, currentUser.unit]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Penugasan & Beban Kerja {currentUser.unit !== 'Semua Unit' ? `- Unit ${currentUser.unit}` : ''}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pantau distribusi pekerjaan, load dan overtime personil</p>
        </div>
        {isKaur && (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} title="Beri tugas baru ke personil">
            <Plus size={18} /> <span className="mobile-hide">Beri Tugas Baru</span><span style={{ display: 'none' }} className="mobile-show">Tugas</span>
          </button>
        )}
      </div>

      <div className="glass-panel delay-100 flex-row-responsive" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari Nama PIC..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-responsive"
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="mobile-hide">
          Memantau {filteredAssignments.length} Anggota Tim
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredAssignments.map((assignment, idx) => (
          <div key={assignment.id} className={`glass-panel delay-${(idx % 5) * 100}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <UserAvatar
                  name={assignment.nama}
                  email={assignment.email}
                  photoUrl={assignment.fotoProfil}
                  profileThumbByEmail={profileThumbByEmail}
                  size={40}
                  border={`1px solid ${assignment.loadKerja > 85 ? 'var(--accent-rose)' : 'var(--accent-blue)'}`}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{assignment.nama}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{assignment.jabatan}</div>
                </div>
              </div>
              <span className={`badge ${assignment.loadKerja > 85 ? 'badge-danger' : assignment.loadKerja > 60 ? 'badge-warning' : 'badge-success'}`}>
                Load: {assignment.loadKerja}%
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Kapasitas Beban Kerja</span>
                <span style={{ fontWeight: 600, color: assignment.loadKerja > 85 ? 'var(--accent-rose)' : 'var(--text-primary)' }}>{assignment.loadKerja}%</span>
              </div>
              <div className="progress-bar-bg" style={{ height: '6px' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${assignment.loadKerja}%`, 
                    background: assignment.loadKerja > 85 ? 'var(--accent-rose)' : assignment.loadKerja > 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
                  }}
                ></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '8px' }}>
                <Briefcase size={14} color="var(--accent-blue)" style={{ marginBottom: '0.25rem' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{assignment.aktif}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Aktif</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '8px' }}>
                <CheckSquare size={14} color="var(--accent-emerald)" style={{ marginBottom: '0.25rem' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{assignment.selesai}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Selesai</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '8px' }}>
                <AlertTriangle size={14} color={assignment.overdue > 0 ? "var(--accent-rose)" : "var(--text-muted)"} style={{ marginBottom: '0.25rem' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: assignment.overdue > 0 ? "var(--accent-rose)" : "inherit" }}>{assignment.overdue}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overdue</span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default Assignment;
