
import { Server, Wifi, Shield, Database, TriangleAlert } from 'lucide-react';

const ITPage = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">IT Services Dashboard</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pemantauan Infrastruktur, Jaringan, dan Keamanan / PDP</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Uptime Jaringan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Wifi size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">99.8%</div>
            <div className="stat-trend trend-up">Target: 99.5%</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Tiket Baru (Hari Ini)</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <Server size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">12</div>
            <div className="stat-trend trend-down">3 Tiket Kritis Membutuhkan Aksi</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Insiden Keamanan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
              <Shield size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">0</div>
            <div className="stat-trend trend-up">Bebas Insiden 30 Hari Terakhir</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid delay-300" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Status Sistem & Server</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['E-Learning Moodle', 'SIAKAD', 'Database Keuangan', 'Web Profile Utama'].map((sys, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Database size={16} color="var(--accent-blue)" />
                  <span style={{ fontWeight: 500 }}>{sys}</span>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TriangleAlert color="var(--accent-amber)" size={18} /> Peringatan Sistem
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--accent-rose)', background: 'var(--accent-rose-ghost)', borderRadius: '0 8px 8px 0' }}>
              <h4 style={{ marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Storage Server Backup Kritis</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kapasitas storage backup harian mencapai 92%. Lakukan purging atau tambah storage.</p>
            </div>
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--accent-amber)', background: 'var(--accent-amber-ghost)', borderRadius: '0 8px 8px 0' }}>
              <h4 style={{ marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Lisensi SSL Mendekati Kadaluarsa</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SSL certificate untuk siakad.telkom.sch.id berakhir dalam 14 hari.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITPage;
