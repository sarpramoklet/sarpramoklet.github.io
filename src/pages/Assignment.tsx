import { USERS } from '../data/organization';
import { Briefcase, Search, Filter, AlertTriangle, CheckSquare, UserCheck2 } from 'lucide-react';

const mockAssignments = USERS.filter(u => u.atasanLangsung !== null).map((user) => {
  return {
    ...user,
    aktif: Math.floor(Math.random() * 5) + 1,
    selesai: Math.floor(Math.random() * 20) + 5,
    overdue: Math.floor(Math.random() * 3),
    loadKerja: Math.floor(Math.random() * 60) + 40 // 40-100%
  };
});

const Assignment = () => {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Penugasan & Beban Kerja</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pantau distribusi pekerjaan, load dan overtime personil</p>
        </div>
      </div>

      <div className="glass-panel delay-100" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari PIC..." 
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)', padding: '0.5rem 1rem 0.5rem 2.2rem', 
                borderRadius: '8px', outline: 'none', width: '300px'
              }} 
            />
          </div>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} /> Filter Unit
          </button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {mockAssignments.map((assignment, idx) => (
          <div key={assignment.id} className={`glass-panel delay-${(idx % 5) * 100}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}>
                  <UserCheck2 size={24} color={assignment.loadKerja > 85 ? 'var(--accent-rose)' : 'var(--accent-blue)'} />
                </div>
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
